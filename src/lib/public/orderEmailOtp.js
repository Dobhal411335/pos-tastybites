import crypto from "crypto";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import OrderEmailOtp from "@/models/OrderEmailOtp";
import { hashPassword, comparePassword } from "@/utils/password";
import { sendOTP } from "@/lib/brevo/sendOTP";
import { logger } from "@/utils/logger";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function toObjectId(restaurantId) {
  if (restaurantId instanceof mongoose.Types.ObjectId) return restaurantId;
  return new mongoose.Types.ObjectId(String(restaurantId));
}

export function generateOtpCode(digits = 4) {
  const max = 10 ** digits;
  return crypto.randomInt(0, max).toString().padStart(digits, "0");
}

/**
 * Create and email a pickup-order verification OTP.
 * Stored in MongoDB so send-otp and place-order share the same code
 * across Next.js route modules / workers.
 */
export async function sendOrderEmailOtp({
  restaurantId,
  email,
  guestName,
  restaurantName,
}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const err = new Error("A valid email address is required");
    err.status = 400;
    throw err;
  }

  await connectDB();

  const code = generateOtpCode(4);
  const hash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const expiresInMinutes = Math.floor(OTP_TTL_MS / 60000);
  const rid = toObjectId(restaurantId);

  await OrderEmailOtp.findOneAndUpdate(
    { restaurantId: rid, email: normalized },
    {
      restaurantId: rid,
      email: normalized,
      hash,
      expiresAt,
      attempts: 0,
      verifiedAt: null,
      guestName: String(guestName || "").trim() || null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const hasBrevo = Boolean(process.env.BREVO_API_KEY);
  let emailed = false;

  if (hasBrevo) {
    try {
      await sendOTP(normalized, code, {
        guestName,
        restaurantName,
        expiresInMinutes,
      });
      emailed = true;
    } catch (err) {
      await OrderEmailOtp.deleteOne({ restaurantId: rid, email: normalized });
      if (typeof logger?.error === "function") {
        logger.error("Failed to send order OTP email", err);
      } else {
        console.error("Failed to send order OTP email", err);
      }
      const sendErr = new Error(
        "Could not send verification email. Please try again or contact the restaurant."
      );
      sendErr.status = 502;
      throw sendErr;
    }
  } else if (process.env.NODE_ENV !== "production") {
    const msg = `[dev] Order OTP for ${normalized}: ${code} (BREVO_API_KEY not set)`;
    if (typeof logger?.warn === "function") logger.warn(msg);
    else console.warn(msg);
  } else {
    await OrderEmailOtp.deleteOne({ restaurantId: rid, email: normalized });
    const err = new Error("Email verification is temporarily unavailable");
    err.status = 503;
    throw err;
  }

  return {
    email: normalized,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    emailed,
    ...(process.env.NODE_ENV !== "production" && !hasBrevo ? { devOtp: code } : {}),
  };
}

/**
 * Verify OTP for an email.
 * @param {"consume"|"mark"} [mode="consume"]
 *   - consume: delete the OTP (online order place)
 *   - mark: keep a short-lived verified receipt (table booking before submit)
 */
export async function verifyOrderEmailOtp({
  restaurantId,
  email,
  otp,
  mode = "consume",
}) {
  const normalized = normalizeEmail(email);
  const code = String(otp || "").trim();

  if (!normalized || !code) {
    const err = new Error("Email and verification code are required");
    err.status = 400;
    throw err;
  }

  await connectDB();
  const rid = toObjectId(restaurantId);
  const entry = await OrderEmailOtp.findOne({
    restaurantId: rid,
    email: normalized,
  });

  if (!entry || !entry.hash) {
    const err = new Error("No verification code pending. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (entry.expiresAt.getTime() <= Date.now()) {
    await OrderEmailOtp.deleteOne({ _id: entry._id });
    const err = new Error("Verification code expired. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    await OrderEmailOtp.deleteOne({ _id: entry._id });
    const err = new Error("Too many attempts. Please request a new code.");
    err.status = 429;
    throw err;
  }

  const match = await comparePassword(code, entry.hash);
  if (!match) {
    entry.attempts += 1;
    await entry.save();
    const err = new Error("Invalid verification code");
    err.status = 400;
    throw err;
  }

  if (mode === "mark") {
    entry.hash = null;
    entry.verifiedAt = new Date();
    entry.attempts = 0;
    // Keep receipt usable for booking submit for the remaining OTP window (or 30m).
    const keepUntil = Math.max(
      entry.expiresAt.getTime(),
      Date.now() + 30 * 60 * 1000
    );
    entry.expiresAt = new Date(keepUntil);
    await entry.save();
    return { email: normalized, verified: true };
  }

  await OrderEmailOtp.deleteOne({ _id: entry._id });
  return { email: normalized, verified: true };
}

/**
 * Require a recently verified email receipt (from mode:"mark"), then consume it.
 */
export async function assertAndConsumeEmailVerified({
  restaurantId,
  email,
  maxAgeMs = 30 * 60 * 1000,
}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const err = new Error("A verified email address is required");
    err.status = 400;
    throw err;
  }

  await connectDB();
  const rid = toObjectId(restaurantId);
  const entry = await OrderEmailOtp.findOne({
    restaurantId: rid,
    email: normalized,
  });

  if (!entry?.verifiedAt) {
    const err = new Error("Please verify your email before booking.");
    err.status = 403;
    throw err;
  }

  const age = Date.now() - new Date(entry.verifiedAt).getTime();
  if (age > maxAgeMs || entry.expiresAt.getTime() <= Date.now()) {
    await OrderEmailOtp.deleteOne({ _id: entry._id });
    const err = new Error("Email verification expired. Please verify again.");
    err.status = 403;
    throw err;
  }

  await OrderEmailOtp.deleteOne({ _id: entry._id });
  return { email: normalized };
}
