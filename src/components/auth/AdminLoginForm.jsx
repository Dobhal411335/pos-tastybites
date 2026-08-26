"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import LoginNotificationBell from "@/components/auth/LoginNotificationBell";
import NotificationSoundPrompt from "@/components/common/NotificationSoundPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Shared admin login UI used by /login and /admin/login (PWA in-scope entry).
 */
export default function AdminLoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: "", password: "" } });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const onAdminSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Invalid credentials");
      }

      toast.success("Admin login successful! Redirecting...");
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1000);
    } catch (err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col md:flex-row antialiased text-[#1F2937] font-sans relative">
      <div className="hidden md:flex relative w-full md:w-1/2 h-75 md:h-auto bg-zinc-950 items-center justify-center overflow-hidden shrink-0">
        <Image
          src="/AdminLoginImage.png"
          alt="Tasty Bites Gourmet Preparation"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="flex justify-end p-6 w-full shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded shadow-md border border-slate-200">
              <span className="hidden sm:inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">
                {currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="font-mono font-bold text-xs sm:text-sm text-zinc-800 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
            <LoginNotificationBell />
          </div>
        </div>

        <NotificationSoundPrompt />

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-105 space-y-4 bg-white border border-[#ECECEC] p-6 sm:p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="text-center space-y-1">
              <Image src="/TransparentBannerImage.png" alt="Tasty Bites Logo" width={400} height={200} className="h-24" />
              <p className="text-xs text-zinc-800 pt-2 font-medium uppercase tracking-wider">
                Administrator sign in
              </p>
            </div>

            <form onSubmit={handleSubmit(onAdminSubmit)} className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                  <Mail className="h-3.5 w-3.5 text-[#F97316]" /> Your Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tastybites.com"
                  className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-[#F97316] focus:border-[#F97316] text-sm font-medium"
                  {...register("email", {
                    required: "Email is required",
                    pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" },
                  })}
                />
                {errors.email && <span className="text-xs text-rose-500 font-medium pl-1 block">{errors.email.message}</span>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                  <Lock className="h-3.5 w-3.5 text-[#F97316]" /> Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-[#F97316] focus:border-[#F97316] text-sm font-medium pr-10"
                    {...register("password", { required: "Password is required" })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#F97316] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <span className="text-xs text-rose-500 font-medium pl-1 block">{errors.password.message}</span>}
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-xl h-12 text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-white" /><span>Authenticating...</span></>
                  ) : (
                    <><Lock className="h-4 w-4" /><span>Admin Login</span></>
                  )}
                </Button>
              </div>
            </form>

            <div className="text-center pt-2">
              <span className="text-[12px] text-zinc-900 font-semibold tracking-wider uppercase block">
                &copy; {new Date().getFullYear()} Tasty Bites POS System
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
