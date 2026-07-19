"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UtensilsCrossed, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch("/api/employee/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Login successful");
        router.push("/employee/orders/create");
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch (err) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 font-sans text-zinc-900">
      
      <div className="mb-8 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-orange-600 mb-2">
          <UtensilsCrossed className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">TASTY BITES</h1>
      </div>

      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-[14px] shadow-sm border border-zinc-200">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">Restaurant Order Login</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-zinc-600 font-medium">User</Label>
            <select 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-zinc-200 rounded-[10px] text-zinc-900 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
            >
              <option value="" disabled>Select a user</option>
              <option value="john.doe@tastybites.com">John Doe (Cashier)</option>
              <option value="sarah.smith@tastybites.com">Sarah Smith (Server)</option>
              <option value="mike.jones@tastybites.com">Mike Jones (Manager)</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-zinc-600 font-medium">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-[10px] focus-visible:ring-orange-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-600 font-medium">Date</Label>
            <Input 
              disabled
              value={currentTime.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })}
              className="h-11 rounded-[10px] bg-zinc-50 text-zinc-500 font-medium border-zinc-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-600 font-medium">Time</Label>
            <Input 
              disabled
              value={currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              className="h-11 rounded-[10px] bg-zinc-50 text-zinc-500 font-medium border-zinc-200"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 mt-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-[10px] transition-colors"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Login"}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-zinc-500">
          Not a staff member? <Link href="/admin/login" className="text-orange-600 hover:underline">Admin Login</Link>
        </div>
      </div>
      
    </div>
  );
}
