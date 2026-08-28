"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Lock, Loader2, ArrowRight, Eye, EyeOff, UserCircle, KeyRound } from "lucide-react";
import LoginNotificationBell from "@/components/auth/LoginNotificationBell";
import NotificationSoundPrompt from "@/components/common/NotificationSoundPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  installNotificationAudioUnlockOnGesture,
  playNotificationSoundPreview,
  getNotificationSoundEnabled,
} from "@/lib/notifications/notificationSound";

export default function SalesLoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("rememberedEmployeeId"));
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
  } = useForm({ defaultValues: { employeeId: "", password: "" } });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const savedId = localStorage.getItem("rememberedEmployeeId");
    if (savedId) {
      setValue("employeeId", savedId);
    }

    fetch("/api/employee/auth/device-status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json?.registered) setDeviceRegistered(true);
      })
      .catch(() => {});

    // Unlock audio on first tap so login alerts can ring on this device
    const cleanupGesture = installNotificationAudioUnlockOnGesture();

    return () => {
      clearInterval(timer);
      cleanupGesture();
    };
  }, [setValue]);

  const redirectAfterLogin = () => {
    const onSalesHost = window.location.hostname.includes("sales");
    window.location.assign(onSalesHost ? "/floor" : "/floor");
  };

  const finishSuccessfulLogin = (firstName, employeeId) => {
    toast.success(`Welcome back, ${firstName}`);

    if (getNotificationSoundEnabled()) {
      void playNotificationSoundPreview();
    }

    if (rememberDevice && employeeId) {
      localStorage.setItem("rememberedEmployeeId", employeeId);
    } else if (!rememberDevice) {
      localStorage.removeItem("rememberedEmployeeId");
    }

    setTimeout(redirectAfterLogin, 1000);
  };

  const loginWithPasscode = async () => {
    const browserFingerprint = btoa(navigator.userAgent + navigator.language).substring(0, 32).toLowerCase();
    const res = await fetch("/api/employee/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passcode: passcode.trim(),
        browserFingerprint,
      }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      finishSuccessfulLogin(json.data.employee.firstName, json.data.employee.id);
      return;
    }
    throw new Error(json.message || "Authentication failed");
  };

  const loginWithEmployeeId = async (data) => {
    const browserFingerprint = btoa(navigator.userAgent + navigator.language).substring(0, 32).toLowerCase();
    const res = await fetch("/api/employee/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.employeeId,
        password: data.password,
        browserFingerprint,
      }),
    });

    const json = await res.json();
    if (res.ok && json.success) {
      finishSuccessfulLogin(json.data.employee.firstName, data.employeeId);
      return;
    }
    if (json.action === "DEVICE_ACTIVATION_REQUIRED") {
      setPendingCredentials({ employeeId: data.employeeId, password: data.password });
      setShowActivationDialog(true);
      return;
    }
    throw new Error(json.message || "Authentication failed");
  };

  const onClockIn = async (data) => {
    const usingPasscode = deviceRegistered && passcode.trim();
    if (!usingPasscode && (!data.employeeId?.trim() || !data.password)) {
      toast.error("Enter your Employee ID and password, or your passcode.");
      return;
    }

    setLoading(true);
    try {
      if (usingPasscode) {
        await loginWithPasscode();
      } else {
        await loginWithEmployeeId(data);
      }
    } catch (err) {
      toast.error(err.message || "Network error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onEmployeeSubmit = async (data) => {
    setLoading(true);
    try {
      await loginWithEmployeeId(data);
    } catch (err) {
      toast.error(err.message || "Network error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    if (!activationCode.trim()) {
      toast.error("Please enter an activation code");
      return;
    }

    setActivating(true);
    try {
      const res = await fetch("/api/employee/auth/activate-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: pendingCredentials.employeeId,
          password: pendingCredentials.password,
          activationCode: activationCode.trim().toUpperCase(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Device activated successfully! Completing login...");
        setShowActivationDialog(false);
        setActivationCode("");
        setDeviceRegistered(true);
        await onEmployeeSubmit(pendingCredentials);
      } else {
        throw new Error(json.message || "Activation failed");
      }
    } catch (err) {
      toast.error(err.message || "Network error occurred during activation. Please try again.");
    } finally {
      setActivating(false);
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
                Clock in to start your shift
              </p>
            </div>

            <form onSubmit={handleSubmit(onClockIn)} className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                  <UserCircle className="h-3.5 w-3.5 text-blue-600" /> Employee ID
                </Label>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="e.g. EMP-001"
                  className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium uppercase"
                  {...register("employeeId")}
                />
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
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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

              {deviceRegistered && (
                <>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-zinc-200" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-800">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="passcode" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                      <KeyRound className="h-3.5 w-3.5 text-blue-600" /> Enter your passcode
                    </Label>
                    <div className="relative">
                      <Input
                        id="passcode"
                        type={showPasscode ? "text" : "password"}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        className="bg-zinc-50 border-zinc-200 rounded-lg h-11 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium tracking-widest pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasscode(!showPasscode)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-blue-600 transition-colors focus:outline-none"
                        aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                      >
                        {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

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

            <div className="text-center pt-2">
              <span className="text-[12px] text-zinc-900 font-semibold tracking-wider uppercase block">
                &copy; {new Date().getFullYear()} Tasty Bites POS System
              </span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showActivationDialog} onOpenChange={setShowActivationDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-900">Activate POS Device</DialogTitle>
            <DialogDescription className="text-zinc-500 font-medium pt-1">
              This device has not yet been registered. Please enter the activation code provided by your administrator.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActivationSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="activationCode" className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
                Activation Code
              </Label>
              <Input
                id="activationCode"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="EMP-XXXX-XXXX"
                className="bg-zinc-50 border-zinc-200 h-12 uppercase tracking-widest font-mono text-center text-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowActivationDialog(false)}
                disabled={activating}
                className="rounded-lg h-10 font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={activating}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 font-bold"
              >
                {activating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Activating...</>
                ) : (
                  "Activate Device"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
