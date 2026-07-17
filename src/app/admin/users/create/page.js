"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreateServerAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error("First Name, Last Name, and Email are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role: "WAITER", // default role is WAITER/Server
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to create account");
      }

      toast.success("Server account draft created successfully!");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");

      // Redirect to list page
      setTimeout(() => {
        router.push("/admin/users/list");
      }, 1000);
    } catch (err) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-5xl">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-zinc-100 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 font-serif">
            Create User Account
          </h2>
          <p className="text-xs text-zinc-400">
            Generate new employee server credentials and account entries.
          </p>
        </div>
        
        <Link href="/admin/dashboard">
          <Button className="bg-[#B91C1C] hover:bg-red-700 text-white rounded-[10px] flex items-center gap-1.5 py-5 px-6 font-bold text-xs uppercase tracking-wider">
            <ArrowLeft className="h-4 w-4" />
            <span>Back To Dashboard</span>
          </Button>
        </Link>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 max-w-2xl">
        
        {/* Name Fields */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
            User Name
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
            />
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
            />
          </div>
        </div>

        {/* Email Address */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
            Email Address
          </label>
          <Input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
          />
        </div>

        {/* Phone Contact */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
            Contact Number
          </label>
          <Input
            type="tel"
            placeholder="Call Number Here"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-white border-zinc-200 rounded-[10px] h-11 focus:ring-[#F97316]"
          />
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#12A594] hover:bg-[#0f8b7b] text-white rounded-[10px] py-6 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Create User</span>
          )}
        </Button>
      </form>
    </div>
  );
}
