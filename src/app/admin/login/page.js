"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
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

      toast.success("Login successful! Redirecting...");

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

      {/* Mini Navbar */}
      <div className="absolute top-0 right-0 p-6 z-50 flex items-center justify-end w-full pointer-events-none">
        <div className="pointer-events-auto">
          <NotificationBell />
        </div>
      </div>

      {/* Left side: Premium food background image */}
      <div className="hidden md:flex relative w-full md:w-1/2 h-[300px] md:h-auto bg-zinc-950 items-center justify-center overflow-hidden shrink-0">
        <Image
          src="/AdminLoginImage.png"
          alt="Tasty Bites Gourmet Preparation"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Right side: Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8 bg-white border border-[#ECECEC] p-8 md:p-10 rounded-2xl shadow-sm">

          <div className="text-center space-y-2">
            <span className="text-3xl font-extrabold italic tracking-wide text-yellow-500 font-serif block select-none">
              Tasty Bites
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-serif">
              Admin Login
            </h1>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
              Enter your admin email and password
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Mail className="h-3.5 w-3.5 text-[#F97316]" />
                Your Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tastybites.com"
                className="bg-white border-zinc-200 rounded-none h-11 focus:ring-[#F97316] text-sm"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email format",
                  },
                })}
              />
              {errors.email && (
                <span className="text-xs text-rose-500 font-medium pl-1 block">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Lock className="h-3.5 w-3.5 text-[#F97316]" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-white border-zinc-200 rounded-none h-11 focus:ring-[#F97316] text-sm pr-10"
                  {...register("password", { required: "Password is required" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-rose-500 font-medium pl-1 block">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-6 text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 transition-all shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <ArrowRight className="h-4 w-4 text-white" />
                  </>
                )}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm text-zinc-500">
              Not a Admin? <Link href="/employee/login" className="text-orange-600 hover:underline">Employee Login</Link>
            </div>

          </form>

          <div className="text-center pt-2">
            <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase block">
              &copy; {new Date().getFullYear()} Tasty Bites System Admin.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
