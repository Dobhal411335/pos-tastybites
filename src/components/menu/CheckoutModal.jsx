"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Minus, Trash2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import Image from "next/image";

export default function CheckoutModal({ isOpen, onClose }) {
  const router = useRouter();
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();
  const [step, setStep] = useState(1); // 1: Cart Summary, 2: Info Form, 3: Verification (OTP), 4: Confirmation
  const [otp, setOtp] = useState(["", "", "", ""]);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.13;
  const total = subtotal + tax;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      date: "",
      time: "",
      timePeriod: "am",
      address: "",
      pinCode: "",
      message: "",
      terms: false,
    },
  });

  const handleNextStep = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    setStep(2);
  };

  const handleFormSubmit = (data) => {
    // Generate simulation OTP and proceed to Step 3
    setStep(3);
    toast.info("A 4-digit code has been sent to your email (use 1234 to verify).");
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePlaceOrder = () => {
    const code = otp.join("");
    if (code !== "1234") {
      toast.error("Invalid verification code. Please try again.");
      return;
    }

    toast.success("Verification successful!");
    clearCart();
    setStep(4);
    setOtp(["", "", "", ""]);
  };

  const handleOrderAgain = () => {
    setStep(1);
    onClose();
    router.replace("/");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border border-[#ECECEC] p-0 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Custom rounded header X button layout similar to image */}
        {/* <div className="absolute -top-3 -right-3 z-50">
          <button
            onClick={onClose}
            className="h-8 w-8 bg-red-650 text-white rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md hover:bg-red-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div> */}

        {/* STEP 1: Order Summary */}
        {step === 1 && (
          <div className="flex flex-col h-full">
            {/* Header banner */}
            <div className="bg-[#1C1E21] text-white p-4 font-serif font-bold text-sm tracking-widest flex items-center justify-between">
              <DialogTitle className="text-sm font-bold uppercase tracking-widest font-serif">
                Order Summary 1/2
              </DialogTitle>
            </div>

            {/* Cart Items List */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[380px] space-y-4">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-[#6B7280]">
                  Your cart is empty.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.cartKey} className="flex gap-4 items-start pb-4 border-b border-zinc-100 last:border-0 last:pb-0">
                    {/* Food mini icon/image placeholder */}
                    <div className="relative h-12 w-16 bg-zinc-100 rounded-md overflow-hidden shrink-0">
                      <Image
                      height={150}
                      width={100}
                      src={item.image} alt={item.name} className="object-cover w-full h-full" />
                    </div>
                    {/* Item Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className="text-xs font-bold text-[#1F2937] truncate">{item.name}</h4>
                      <p className="text-[10px] text-[#6B7280]">
                        {item.selectedSize ? `${item.selectedSize}` : "Regular"}
                        {item.selectedAddons && item.selectedAddons.length > 0 && ` + ${item.selectedAddons.join(", ")}`}
                      </p>
                      
                      {/* Quantity selector */}
                      <div className="flex items-center border border-[#ECECEC] bg-zinc-50 w-20 mt-1">
                        <button
                          onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                          className="p-1 hover:bg-zinc-150 text-zinc-500"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center text-[10px] font-bold text-[#1F2937]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                          className="p-1 hover:bg-zinc-150 text-zinc-500"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Price and delete button */}
                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <span className="text-xs font-extrabold text-[#1F2937]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.cartKey)}
                        className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Summary details */}
            <div className="p-6 border-t border-[#ECECEC] bg-zinc-50 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937]">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="h-4 w-4 text-[#F97316] focus:ring-[#F97316]"
                  />
                  <span className="text-[#6B7280] font-light">Fee & Taxes</span>
                </div>
                <span>${tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-[#1F2937] pt-2 border-t border-zinc-200">
                <span>TOTAL</span>
                <span className="text-[#F97316]">${total.toFixed(2)}</span>
              </div>

              <Button
                onClick={handleNextStep}
                className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-6 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"
              >
                <span>Continue Order</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Checkout Form */}
        {step === 2 && (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
            <div className="bg-[#1C1E21] text-white p-4 font-serif font-bold text-sm tracking-widest">
              <DialogTitle className="text-sm font-bold uppercase tracking-widest font-serif">
                Order Summary 2/2
              </DialogTitle>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[380px]">
              
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter full name"
                  className="bg-white border-zinc-200 rounded-none h-10 focus:ring-[#F97316]"
                  {...register("fullName", { required: "Name is required" })}
                />
                {errors.fullName && <span className="text-xs text-red-500">{errors.fullName.message}</span>}
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="tel"
                    placeholder="Phone"
                    className="bg-white border-zinc-200 rounded-none h-10 focus:ring-[#F97316]"
                    {...register("phone", { required: "Phone is required" })}
                  />
                  {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="Email"
                    className="bg-white border-zinc-200 rounded-none h-10 focus:ring-[#F97316]"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    className="bg-white border-zinc-200 rounded-none h-10"
                    {...register("date", { required: "Date is required" })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Time <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      className="bg-white border-zinc-200 rounded-none h-10 flex-1"
                      {...register("time", { required: "Time is required" })}
                    />
                    <select
                      className="bg-white border border-zinc-200 rounded-none h-10 px-2 text-xs font-semibold"
                      {...register("timePeriod")}
                    >
                      <option value="am">am</option>
                      <option value="pm">pm</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address & Pin Code */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Address
                  </Label>
                  <Input
                    type="text"
                    placeholder="Address"
                    className="bg-white border-zinc-200 rounded-none h-10"
                    {...register("address")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Area Pin Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Pin Code"
                    className="bg-white border-zinc-200 rounded-none h-10"
                    {...register("pinCode", { required: "Pin Code is required" })}
                  />
                  {errors.pinCode && <span className="text-xs text-red-500">{errors.pinCode.message}</span>}
                </div>
              </div>

              {/* Any Special Message */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Any Special Message
                </Label>
                <Input
                  type="text"
                  placeholder="Special message"
                  className="bg-white border-zinc-200 rounded-none h-10"
                  {...register("message")}
                />
              </div>

            </div>

            {/* Bottom details & submit */}
            <div className="p-6 border-t border-[#ECECEC] bg-zinc-50 space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-[#1F2937]">
                <span>TOTAL</span>
                <span className="text-[#F97316]">${total.toFixed(2)}</span>
              </div>

              {/* Terms Accept */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="h-4 w-4 text-[#F97316] focus:ring-[#F97316] border-zinc-300 rounded-xs mt-0.5"
                  {...register("terms", { required: true })}
                />
                <label htmlFor="terms" className="text-[11px] text-[#6B7280] font-light leading-relaxed">
                  Accept <span className="text-[#F97316] font-semibold cursor-pointer">Terms.</span>
                </label>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-[#F97316] hover:bg-[#e06510] text-white rounded-none py-6 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                >
                  <span>Submit</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full rounded-none border-zinc-300 text-zinc-700 hover:bg-zinc-100 py-5 text-xs font-bold uppercase tracking-widest"
                >
                  Back
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Verification Check */}
        {step === 3 && (
          <div className="bg-[#b3851b] text-white p-8 space-y-6 text-center">
            
            <div className="space-y-3">
              <DialogTitle className="text-xl font-bold font-serif text-white text-center">
                Verified Check.
              </DialogTitle>
              <p className="text-xs text-zinc-150 leading-relaxed font-light px-4">
                &ldquo;For our security, we have sent a 4-digit verification code to your email address. Please enter the code below to verify your details and successfully place your order.&rdquo;
              </p>
            </div>

            {/* 4 Digit OTP Inputs */}
            <div className="flex justify-center gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  className="h-14 w-14 rounded-lg bg-yellow-450 border-2 border-black text-zinc-900 font-extrabold text-lg text-center focus:ring-2 focus:ring-white outline-none"
                />
              ))}
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={handlePlaceOrder}
                className="w-full bg-white hover:bg-zinc-100 text-[#b3851b] font-bold py-6 rounded-none text-xs uppercase tracking-widest transition-all"
              >
                Place Order Now
              </Button>
              
              <button
                type="button"
                onClick={() => setStep(2)}
                className="block mx-auto text-xs font-bold text-white hover:underline uppercase tracking-wider"
              >
                Back To Recorrect Info
              </button>
            </div>

          </div>
        )}

        {/* STEP 4: Order Confirmed */}
        {step === 4 && (
          <div className="bg-[#B91C1C] text-white p-8 space-y-6 text-center">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
                Order Confirmed!
              </span>
              <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
                Order Number : 001
              </DialogTitle>
              <div className="w-12 h-[1px] bg-white/20 mx-auto"></div>
              <p className="text-xs text-zinc-150 leading-relaxed font-light px-2">
                &ldquo;Thank you for your order! We are delighted to serve you at Tasty Bites. Your meal is being carefully prepared by our team using the finest ingredients, and we look forward to providing you with a delicious experience.&rdquo;
              </p>
            </div>

            {/* Branding & Contact */}
            <div className="space-y-2 py-4">
              <span className="text-3xl font-extrabold italic tracking-wide text-yellow-400 font-serif block">
                Tasty Bites
              </span>
              <span className="text-xl font-bold tracking-wider block">
                (519) 235-0050
              </span>
            </div>

            {/* Order Again Button */}
            <div className="pt-2">
              <Button
                onClick={handleOrderAgain}
                className="w-full bg-white hover:bg-zinc-100 text-[#B91C1C] font-extrabold py-6 rounded-full text-xs uppercase tracking-widest transition-all shadow-md"
              >
                Order Again
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
