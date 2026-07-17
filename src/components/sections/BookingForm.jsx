"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Calendar, Clock, Users, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function BookingForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      date: "",
      time: "",
      guests: "",
    },
  });

  const onSubmit = async (data) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    toast.success("Table reserved successfully! A confirmation has been sent to your email.");
    reset();
  };

  return (
    <section id="booking" className="mx-auto max-w-7xl px-6 py-16 sm:px-8">
      <div className="rounded-xl bg-[#1C1E21] text-white p-8 md:p-12 shadow-md relative overflow-hidden">
        
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#12A594]">
            Reservations
          </span>
          <h2 className="text-3xl font-normal tracking-tight sm:text-4xl font-serif">
            Secure Your Table at the Heart of Exeter.
          </h2>
          <div className="w-12 h-px bg-zinc-700 mx-auto"></div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto font-light">
            &ldquo;Big flavors, better memories, and the best deals in town! We&apos;re happy to offer you an exclusive discount on your next reservation.&rdquo;
          </p>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <User className="h-3.5 w-3.5 text-[#12A594]" />
                Your Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-550 rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A]"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.name.message}</span>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Phone className="h-3.5 w-3.5 text-[#12A594]" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(519) 000-0000"
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-550 rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A]"
                {...register("phone", {
                  required: "Phone number is required",
                  pattern: {
                    value: /^\+?[0-9\s-()]+$/,
                    message: "Invalid phone number format",
                  },
                })}
              />
              {errors.phone && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.phone.message}</span>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Mail className="h-3.5 w-3.5 text-[#12A594]" />
                Your Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-550 rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A]"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email format",
                  },
                })}
              />
              {errors.email && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.email.message}</span>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Calendar className="h-3.5 w-3.5 text-[#12A594]" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                className="bg-zinc-800/50 border-zinc-700 text-white rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A] block w-full cursor-pointer"
                {...register("date", { required: "Date is required" })}
              />
              {errors.date && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.date.message}</span>
              )}
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Clock className="h-3.5 w-3.5 text-[#12A594]" />
                Time For Arrive
              </Label>
              <Input
                id="time"
                type="time"
                className="bg-zinc-800/50 border-zinc-700 text-white rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A] block w-full cursor-pointer"
                {...register("time", { required: "Time is required" })}
              />
              {errors.time && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.time.message}</span>
              )}
            </div>

            {/* Guests */}
            <div className="space-y-2">
              <Label htmlFor="guests" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                <Users className="h-3.5 w-3.5 text-[#12A594]" />
                Total Person
              </Label>
              <Input
                id="guests"
                type="number"
                min="1"
                placeholder="4"
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-550 rounded-none h-11 focus:ring-[#0F6B7A] focus:border-[#0F6B7A]"
                {...register("guests", { required: "Guest count is required" })}
              />
              {errors.guests && (
                <span className="text-xs text-rose-400 font-medium pl-1">{errors.guests.message}</span>
              )}
            </div>

          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#12A594] hover:bg-[#0e8274] text-white font-bold py-6 rounded-none shadow-md transition-all text-xs uppercase tracking-widest"
            >
              <span>{isSubmitting ? "Processing..." : "Book A Table Now"}</span>
            </Button>
          </div>

        </form>
      </div>
    </section>
  );
}
