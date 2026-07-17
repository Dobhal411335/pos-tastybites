"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast, Toaster } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col md:flex-row antialiased text-[#1F2937] font-sans">
      <Toaster position="top-right" richColors />

      {/* Left side: Premium food background image */}
      <div className="relative w-full md:w-1/2 h-[300px] md:h-auto bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0">
        <Image
          src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop"
          alt="Tasty Bites Gourmet Preparation"
          fill
          priority
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950/80 via-zinc-950/20 to-transparent"></div>
        
        <div className="relative z-10 text-center md:text-left px-8 md:px-12 space-y-3 max-w-lg text-white">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
            Tasty Bites Management
          </span>
          <h2 className="text-3xl md:text-5xl font-normal leading-tight font-serif">
            Crafting Premium Experiences.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 font-light leading-relaxed max-w-sm">
            Access settings, billing reports, staffing charts, and full menu details.
          </p>
        </div>
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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-white border-zinc-200 rounded-none h-11 focus:ring-[#F97316] text-sm"
                {...register("password", { required: "Password is required" })}
              />
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
