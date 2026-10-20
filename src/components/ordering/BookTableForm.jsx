"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  PartyPopper,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { publicApiBase, getPublicRestaurantSlug } from "@/lib/public/clientConfig";
import { getTodayRestaurantHours } from "@/lib/public/restaurantHours";
import {
  getRestaurantTimezone,
  todayRestaurantISO,
} from "@/lib/restaurantTime";
import { countryCodes } from "@/utils/countryCodes";
import { REASON_FOR_VISIT_OPTIONS } from "@/lib/public/reservationOptions";
import Image from "next/image"
function formatDateLabel(iso) {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Same slot labels as CartDrawer / online order modal. */
function formatSlotLabel(hours, minutes) {
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * 15-min slots from a day's open/close hours (future dates).
 * Matches CartDrawer.buildFutureDaySlots.
 */
function buildDaySlots(dayHours) {
  if (dayHours?.closed) return [];
  const openRaw = String(dayHours?.open || "09:00");
  const closeRaw = String(dayHours?.close || "22:00");
  const parseMin = (t) => {
    const m = String(t).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  let openMin = parseMin(openRaw) ?? 9 * 60;
  let closeMin = parseMin(closeRaw) ?? 22 * 60;
  if (dayHours?.is24Hours) {
    openMin = 0;
    closeMin = 23 * 60 + 45;
  } else {
    closeMin = Math.max(openMin, closeMin - 15);
  }
  const aligned = Math.ceil(openMin / 15) * 15;
  const slots = [];
  for (let mins = aligned; mins <= closeMin; mins += 15) {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 23) break;
    const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    slots.push({ value, label: formatSlotLabel(hours, minutes) });
  }
  return slots;
}

/** Midday probe so weekday resolves correctly in the restaurant timezone. */
function dateProbeFromISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return new Date();
  return new Date(`${iso}T12:00:00`);
}

const emptyForm = (today) => ({
  firstName: "",
  lastName: "",
  countryCode: "+1",
  phone: "",
  email: "",
  date: today,
  time: "",
  guests: "2",
  reasonForVisit: "",
  specialRequest: "",
});

function fullNameFromForm(form) {
  return [form.firstName, form.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

export default function BookTableForm() {
  const { restaurant, slug: ctxSlug } = useRestaurantPublic();
  const slug = ctxSlug || getPublicRestaurantSlug();
  const today = useMemo(() => todayRestaurantISO(), []);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState(() => emptyForm(today));
  /** Bump to remount the form DOM after a successful booking (clears autofill too). */
  const [formKey, setFormKey] = useState(0);

  const resetBookingForm = () => {
    setForm(emptyForm(todayRestaurantISO()));
    setOtp("");
    setOtpSent(false);
    setEmailVerified(false);
    setFormKey((k) => k + 1);
  };

  const todaySlots = restaurant?.pickupSlots || [];
  const todayHours = restaurant?.todayHours || null;
  const hoursConfig = restaurant?.restaurantHours || null;

  // Today → live pickup slots; future → that weekday's restaurant hours (same idea as order modal).
  const activeSlots = useMemo(() => {
    const dateStr = form.date || today;
    if (!dateStr || dateStr === today) return todaySlots;
    const dayHours = hoursConfig
      ? getTodayRestaurantHours(
          hoursConfig,
          dateProbeFromISO(dateStr),
          getRestaurantTimezone(),
        )
      : todayHours;
    return buildDaySlots(dayHours);
  }, [form.date, today, todaySlots, todayHours, hoursConfig]);

  const selectedDayHours = useMemo(() => {
    const dateStr = form.date || today;
    if (!dateStr || dateStr === today) return todayHours;
    if (!hoursConfig) return todayHours;
    return getTodayRestaurantHours(
      hoursConfig,
      dateProbeFromISO(dateStr),
      getRestaurantTimezone(),
    );
  }, [form.date, today, todayHours, hoursConfig]);

  // Keep arrival time valid when switching dates (slots change).
  useEffect(() => {
    if (!form.time) return;
    const stillValid = activeSlots.some((s) => s.value === form.time);
    if (!stillValid) {
      setForm((prev) => ({ ...prev, time: "" }));
    }
  }, [activeSlots, form.time]);

  const update = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "email") {
      setOtpSent(false);
      setEmailVerified(false);
      setOtp("");
    }
  };

  const handleSendOtp = async () => {
    if (!form.email.trim() || !form.email.includes("@")) {
      toast.error("Enter a valid email first.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/reservations/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          name: fullNameFromForm(form),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to send code");
      }
      setOtpSent(true);
      setEmailVerified(false);
      setOtp("");
      if (json.data?.devOtp) {
        toast.success(`Dev OTP: ${json.data.devOtp}`);
      } else {
        toast.success("Verification code sent to your email");
      }
    } catch (err) {
      toast.error(err.message || "Could not send verification code");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter the code from your email.");
      return;
    }
    setVerifyingOtp(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/reservations/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          otp: otp.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Invalid code");
      }
      setEmailVerified(true);
      toast.success("Email verified — you can book now");
    } catch (err) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = fullNameFromForm(form);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim() || !form.time) {
      toast.error("Please fill in first name, last name, phone, and arrival time.");
      return;
    }
    if (!form.reasonForVisit) {
      toast.error("Please select a reason for visit.");
      return;
    }
    const guestCount = Number(form.guests);
    if (!Number.isFinite(guestCount) || guestCount < 1) {
      toast.error("Please enter at least 1 guest.");
      return;
    }
    if (!emailVerified) {
      toast.error("Verify your email before booking.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${publicApiBase(slug)}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          countryCode: form.countryCode || "+1",
          phone: form.phone.trim(),
          email: form.email.trim(),
          date: form.date || today,
          time: form.time,
          guests: guestCount,
          reasonForVisit: form.reasonForVisit,
          specialRequest: form.specialRequest.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not submit reservation");
      }
      toast.success(
        "Reservation sent! The restaurant will confirm shortly."
      );
      resetBookingForm();
    } catch (err) {
      toast.error(err.message || "Failed to book a table");
    } finally {
      setSubmitting(false);
    }
  };

  const brandName = restaurant?.name || "Tasty Bites";
  const fieldClass =
    "h-12 rounded-lg border border-[var(--border)]/40 bg-[var(--customer-surface-low)] text-[var(--customer-ink)] placeholder:text-[var(--customer-muted)] focus-visible:border-primary focus-visible:ring-primary/20";
  const selectClass = `flex w-full px-3 text-sm ${fieldClass}`;

  return (
    <section
      id="reservations"
      className="relative w-full overflow-hidden bg-[var(--customer-surface)] py-14 md:py-16"
      aria-labelledby="reserve-heading"
    >
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]/20 bg-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="relative overflow-hidden lg:col-span-5">
              <Image
                width={500}
                height={500}
                src="/TableReservation.png"
                alt="Book a table at the restaurant — elegant dining setup"
                className="h-full w-full object-cover"
                style={{ minHeight: '320px' }}
              />
            </div>

            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 lg:col-span-7 lg:p-10"
              autoComplete="off"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-first-name"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    First name
                  </Label>
                  <Input
                    id="reserve-first-name"
                    value={form.firstName}
                    onChange={update("firstName")}
                    placeholder="John"
                    className={fieldClass}
                    autoComplete="given-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-last-name"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Last name
                  </Label>
                  <Input
                    id="reserve-last-name"
                    value={form.lastName}
                    onChange={update("lastName")}
                    placeholder="Doe"
                    className={fieldClass}
                    autoComplete="family-name"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="reserve-phone"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Phone number
                  </Label>
                  <div className="flex min-w-0 items-stretch gap-2">
                    <select
                      id="reserve-country-code"
                      value={form.countryCode}
                      onChange={update("countryCode")}
                      className={`w-[7.75rem] shrink-0 truncate px-2 text-sm sm:w-[9.5rem] sm:px-3 ${fieldClass}`}
                      aria-label="Country code"
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.country})
                        </option>
                      ))}
                    </select>
                    <Input
                      id="reserve-phone"
                      type="tel"
                      value={form.phone}
                      onChange={update("phone")}
                      placeholder="Phone number"
                      className={`${fieldClass} w-auto min-w-0 flex-1`}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="reserve-email"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    Your email
                  </Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="reserve-email"
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      placeholder="john@example.com"
                      className={`${fieldClass} flex-1`}
                      autoComplete="email"
                      disabled={emailVerified}
                    />
                    <Button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || emailVerified || !form.email.trim()}
                      className="h-12 shrink-0 rounded-lg bg-[var(--ink)] px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-[var(--ink)]/90 disabled:opacity-60"
                    >
                      {emailVerified
                        ? "Verified"
                        : sendingOtp
                          ? "Sending…"
                          : otpSent
                            ? "Resend code"
                            : "Verify email"}
                    </Button>
                  </div>
                </div>

                {otpSent && !emailVerified ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="reserve-otp"
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                      Enter verification code
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="reserve-otp"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="4-digit code"
                        className={`${fieldClass} flex-1 tracking-[0.35em]`}
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={verifyingOtp || otp.length < 4}
                        className="h-12 shrink-0 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-wide text-white hover:bg-primary-hover disabled:opacity-60"
                      >
                        {verifyingOtp ? "Checking…" : "Confirm code"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {emailVerified ? (
                  <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Email verified — complete your booking details below
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-date"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Date
                  </Label>
                  <Input
                    id="reserve-date"
                    type="date"
                    value={form.date}
                    min={today}
                    onChange={update("date")}
                    className={fieldClass}
                    required
                  />
                  <p className="text-[11px] text-[var(--customer-muted)]">
                    Today or later · {formatDateLabel(form.date || today)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-time"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    {form.date && form.date !== today
                      ? "Arrival time"
                      : "Arrival time today"}
                  </Label>
                  {activeSlots.length === 0 ? (
                    <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                      {form.date && form.date !== today
                        ? selectedDayHours?.closed
                          ? "Restaurant is closed on this date. Please pick another day."
                          : "No arrival times available for this date."
                        : "Online booking is closed for today. Please try a future date or restaurant hours."}
                    </p>
                  ) : (
                    <select
                      id="reserve-time"
                      value={form.time}
                      onChange={update("time")}
                      className={selectClass}
                      required
                    >
                      <option value="">Select a time</option>
                      {activeSlots.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedDayHours?.label && activeSlots.length > 0 ? (
                    <p className="text-[11px] text-[var(--customer-muted)]">
                      {form.date && form.date !== today
                        ? `${selectedDayHours.dayLabel || "Hours"} · ${selectedDayHours.label}`
                        : `Today · ${selectedDayHours.label}`}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-guests"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    Total guests
                  </Label>
                  <Input
                    id="reserve-guests"
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={form.guests}
                    onChange={update("guests")}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-reason"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <PartyPopper className="h-3.5 w-3.5" aria-hidden />
                    Reason for visit
                  </Label>
                  <select
                    id="reserve-reason"
                    value={form.reasonForVisit}
                    onChange={update("reasonForVisit")}
                    className={selectClass}
                    required
                  >
                    <option value="">Select a reason</option>
                    {REASON_FOR_VISIT_OPTIONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="reserve-special"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                    Special request{" "}
                    <span className="font-medium normal-case tracking-normal text-[var(--customer-muted)]">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="reserve-special"
                    value={form.specialRequest}
                    onChange={update("specialRequest")}
                    placeholder="Allergies, high chair, quiet table, celebration cake…"
                    rows={3}
                    className="min-h-[88px] rounded-lg border border-[var(--border)]/40 bg-[var(--customer-surface-low)] text-[var(--customer-ink)] placeholder:text-[var(--customer-muted)] focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !emailVerified}
                className="mt-8 h-12 w-full rounded-lg bg-primary text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting
                  ? "Submitting…"
                  : emailVerified
                    ? "Book a Table Now"
                    : "Verify email to book"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
