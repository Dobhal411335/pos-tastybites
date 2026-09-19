"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRestaurantPublic } from "@/context/RestaurantPublicContext";
import { publicApiBase, getPublicRestaurantSlug } from "@/lib/public/clientConfig";

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTodayLabel(iso) {
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

export default function BookTableForm() {
  const { restaurant, slug: ctxSlug } = useRestaurantPublic();
  const slug = ctxSlug || getPublicRestaurantSlug();
  const today = useMemo(() => todayLocalISO(), []);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: today,
    time: "",
    guests: "2",
  });

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
          name: form.name.trim(),
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
    if (!form.name.trim() || !form.phone.trim() || !form.time) {
      toast.error("Please fill in name, phone, and arrival time.");
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
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          date: form.date || today,
          time: form.time,
          guests: Number(form.guests) || 2,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Could not submit reservation");
      }
      toast.success(
        "Reservation sent! The restaurant will confirm shortly."
      );
      setForm({
        name: "",
        phone: "",
        email: "",
        time: "",
        guests: "2",
        date: today,
      });
      setOtp("");
      setOtpSent(false);
      setEmailVerified(false);
    } catch (err) {
      toast.error(err.message || "Failed to book a table");
    } finally {
      setSubmitting(false);
    }
  };

  const brandName = restaurant?.name || "Tasty Bites";
  const fieldClass =
    "h-12 rounded-lg border border-[var(--border)]/40 bg-[var(--customer-surface-low)] text-[var(--customer-ink)] placeholder:text-[var(--customer-muted)] focus-visible:border-primary focus-visible:ring-primary/20";

  return (
    <section
      id="reservations"
      className="relative w-full overflow-hidden bg-[var(--customer-surface)] py-14 md:py-16"
      aria-labelledby="reserve-heading"
    >
      <div className="mx-auto max-w-[1320px] px-5 lg:px-12">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]/20 bg-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="flex flex-col justify-center gap-4 bg-[var(--ink)] p-8 text-white sm:p-10 lg:col-span-5">
              <span className="inline-flex self-start rounded-full bg-primary/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                Reservations
              </span>
              <h2
                id="reserve-heading"
                className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
              >
                Book a table at {brandName}
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Same-day seating only. Verify your email, then we&apos;ll hold
                your request for the sales desk to confirm.
              </p>
              <ul className="mt-2 space-y-2 text-xs text-white/60">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Email verification required
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Staff confirms — you get an email when accepted
                </li>
              </ul>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 lg:col-span-7 lg:p-10"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-name"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <User className="h-3.5 w-3.5" aria-hidden />
                    Your name
                  </Label>
                  <Input
                    id="reserve-name"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="John Doe"
                    className={fieldClass}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-phone"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Phone number
                  </Label>
                  <Input
                    id="reserve-phone"
                    type="tel"
                    value={form.phone}
                    onChange={update("phone")}
                    placeholder="(519) 000-0000"
                    className={fieldClass}
                    autoComplete="tel"
                  />
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
                    max={today}
                    readOnly
                    className={fieldClass}
                  />
                  <p className="text-[11px] text-[var(--customer-muted)]">
                    Today only · {formatTodayLabel(today)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="reserve-time"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    Time for arrival
                  </Label>
                  <Input
                    id="reserve-time"
                    type="time"
                    value={form.time}
                    onChange={update("time")}
                    className={fieldClass}
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="reserve-guests"
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"
                  >
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    Total guests
                  </Label>
                  <select
                    id="reserve-guests"
                    value={form.guests}
                    onChange={update("guests")}
                    className={`flex w-full px-3 text-sm ${fieldClass}`}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        {n} {n === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </select>
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
