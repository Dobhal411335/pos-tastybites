"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Lock, Mail, Loader2, ArrowRight, Eye, EyeOff, UserCircle } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState("admin"); // 'admin' | 'employee'

  // Employee specific states
  const [rememberDevice, setRememberDevice] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    register: registerAdmin,
    handleSubmit: handleSubmitAdmin,
    formState: { errors: errorsAdmin },
  } = useForm({ defaultValues: { email: "", password: "" } });

  const {
    register: registerEmployee,
    handleSubmit: handleSubmitEmployee,
    setValue: setEmployeeValue,
    formState: { errors: errorsEmployee },
  } = useForm({ defaultValues: { employeeId: "", password: "" } });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Load remembered ID if exists for employee
    const savedId = localStorage.getItem("rememberedEmployeeId");
    if (savedId) {
      setEmployeeValue("employeeId", savedId);
      setRememberDevice(true);
    }

    return () => clearInterval(timer);
  }, [setEmployeeValue]);

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

  const onEmployeeSubmit = async (data) => {
    setLoading(true);
    try {
      // Auto-generate browser fingerprint to identify the registered terminal/device
      const browserFingerprint = btoa(navigator.userAgent + navigator.language).substring(0, 32).toLowerCase();

      const res = await fetch("/api/employee/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: data.employeeId,
          password: data.password,
          browserFingerprint
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Welcome back, ${json.data.employee.firstName}`);

        if (rememberDevice) {
          localStorage.setItem("rememberedEmployeeId", data.employeeId);
        } else {
          localStorage.removeItem("rememberedEmployeeId");
        }

        setTimeout(() => {
          router.push("/employee/dashboard");
        }, 1000);
      } else {
        throw new Error(json.message || "Authentication failed");
      }
    } catch (err) {
      toast.error(err.message || "Network error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col md:flex-row antialiased text-[#1F2937] font-sans relative">

      {/* Left side: Premium food background image */}
      <div className="hidden md:flex relative w-full md:w-1/2 h-75 md:h-auto bg-zinc-950 items-center justify-center overflow-hidden shrink-0">
        <Image
          src="/AdminLoginImage.png"
          alt="Tasty Bites Gourmet Preparation"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Right side: Login Panel */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">

        {/* Mini Navbar */}
        <div className="flex justify-end p-6 w-full shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded shadow-md border border-slate-200">
              <span className="hidden sm:inline-block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500">
                {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="font-mono font-bold text-xs sm:text-sm text-zinc-800 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-105 space-y-4 bg-white border border-[#ECECEC] p-6 sm:p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">

            <div className="text-center space-y-1">
              <Image src="/TransparentBannerImage.png" alt="Tasty Bites Logo" width={400} height={200} className="h-24"/>
              <p className="text-xs text-zinc-800 pt-2 font-medium uppercase tracking-wider">
                Select your login type below
              </p>
            </div>

            <Tabs value={loginType} onValueChange={setLoginType} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 h-12">
                <TabsTrigger value="admin" className="rounded-md py-3 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white data-[state=active]:text-[#F97316] data-[state=active]:shadow-sm transition-all">
                  Admin
                </TabsTrigger>
                <TabsTrigger value="employee" className="rounded-md py-3 text-xs uppercase tracking-widest font-bold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all">
                  Employee
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="pt-2 transition-all duration-300">
              {/* ADMIN FORM */}
              {loginType === "admin" && (
                <form onSubmit={handleSubmitAdmin(onAdminSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                      <Mail className="h-3.5 w-3.5 text-[#F97316]" /> Your Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@tastybites.com"
                      className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-[#F97316] focus:border-[#F97316] text-sm font-medium"
                      {...registerAdmin("email", {
                        required: "Email is required",
                        pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" },
                      })}
                    />
                    {errorsAdmin.email && <span className="text-xs text-rose-500 font-medium pl-1 block">{errorsAdmin.email.message}</span>}
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
                        {...registerAdmin("password", { required: "Password is required" })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#F97316] transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errorsAdmin.password && <span className="text-xs text-rose-500 font-medium pl-1 block">{errorsAdmin.password.message}</span>}
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
              )}

              {/* EMPLOYEE FORM */}
              {loginType === "employee" && (
                <form onSubmit={handleSubmitEmployee(onEmployeeSubmit)} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-1.5">
                    <Label htmlFor="employeeId" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                      <UserCircle className="h-3.5 w-3.5 text-blue-600" /> Employee ID
                    </Label>
                    <Input
                      id="employeeId"
                      type="text"
                      placeholder="e.g. EMP-001"
                      className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium uppercase"
                      {...registerEmployee("employeeId", { required: "Employee ID is required" })}
                    />
                    {errorsEmployee.employeeId && <span className="text-xs text-rose-500 font-medium pl-1 block">{errorsEmployee.employeeId.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1">
                      <Label htmlFor="emp-password" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-blue-600" /> PIN / Password
                      </Label>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase cursor-not-allowed">Forgot?</span>
                    </div>
                    <div className="relative">
                      <Input
                        id="emp-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium pr-10"
                        {...registerEmployee("password", { required: "Password is required" })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errorsEmployee.password && <span className="text-xs text-rose-500 font-medium pl-1 block">{errorsEmployee.password.message}</span>}
                  </div>

                  <div className="flex items-center space-x-2 pl-1 pt-1">
                    <Checkbox
                      id="remember"
                      checked={rememberDevice}
                      onCheckedChange={(checked) => setRememberDevice(checked)}
                      className="border-zinc-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded"
                    />
                    <label htmlFor="remember" className="text-xs font-semibold text-zinc-500 cursor-pointer select-none uppercase tracking-wide">
                      Remember me on this terminal
                    </label>
                  </div>


                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin text-white" /><span>Authenticating...</span></>
                      ) : (
                        <><ArrowRight className="h-4 w-4" /><span>Clock In</span></>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>

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
