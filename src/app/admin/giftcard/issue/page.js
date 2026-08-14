"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Gift, CreditCard, User, Mail, Phone, Calendar, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { countryCodes } from "@/utils/countryCodes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function IssueGiftCardPage() {
  const [formData, setFormData] = useState({
    code: "",
    issueDate: new Date(),
    value: "",
    recipientName: "",
    countryCode: "+1",
    phoneNumber: "",
    recipientEmail: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [giftcards, setGiftcards] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [codeLookup, setCodeLookup] = useState({
    status: "idle", // idle | checking | valid | invalid
    message: "",
    card: null,
  });
  const lookupTimerRef = useRef(null);
  const lastLookupCodeRef = useRef("");

  const fetchGiftcards = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/menu/giftcards?view=flat&limit=50");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGiftcards(data.data.giftcards);
        }
      }
    } catch (err) {
      console.error("Failed to fetch giftcards", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchGiftcards();
  }, []);

  const lookupGiftCard = useCallback(async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setCodeLookup({ status: "idle", message: "", card: null });
      setFormData((prev) => ({ ...prev, value: "" }));
      return;
    }

    setCodeLookup({ status: "checking", message: "Checking gift card...", card: null });

    try {
      const res = await fetch(
        `/api/menu/giftcards?code=${encodeURIComponent(code)}&purpose=issue`,
      );
      const data = await res.json();

      if (res.ok && data.success) {
        lastLookupCodeRef.current = code;
        const card = data.data;
        setCodeLookup({
          status: "valid",
          message: card.name
            ? `Valid — ${card.name} ($${Number(card.value).toFixed(2)})`
            : `Valid — $${Number(card.value).toFixed(2)}`,
          card,
        });
        setFormData((prev) => ({
          ...prev,
          code,
          value: String(card.value ?? ""),
        }));
      } else {
        lastLookupCodeRef.current = code;
        setCodeLookup({
          status: "invalid",
          message: data.message || "Invalid or unavailable gift card",
          card: null,
        });
        setFormData((prev) => ({ ...prev, value: "" }));
      }
    } catch {
      setCodeLookup({
        status: "invalid",
        message: "Could not verify gift card. Try again.",
        card: null,
      });
    }
  }, []);

  const scheduleLookup = (code) => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupTimerRef.current = setTimeout(() => lookupGiftCard(code), 500);
  };

  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "code") {
      const nextCode = value.toUpperCase();
      setFormData((prev) => ({ ...prev, code: nextCode }));
      setCodeLookup({ status: "idle", message: "", card: null });
      lastLookupCodeRef.current = "";
      scheduleLookup(nextCode);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCodeBlur = () => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    lookupGiftCard(formData.code);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (codeLookup.status !== "valid") {
      setErrorMsg("Please enter a valid, unissued gift card number.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        value: Number(formData.value),
        recipientName: formData.recipientName,
        recipientPhone: `${formData.countryCode} ${formData.phoneNumber}`,
        recipientEmail: formData.recipientEmail,
        issueDate: formData.issueDate ? formData.issueDate.toISOString() : new Date().toISOString(),
      };

      const res = await fetch("/api/menu/giftcards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const emailed = data.data?.emailSent;
        setSuccessMsg(
          emailed
            ? "Gift card issued successfully! Details emailed to the recipient."
            : formData.recipientEmail
              ? "Gift card issued, but the email could not be sent."
              : "Gift card issued successfully!",
        );
        setFormData({
          code: "",
          issueDate: new Date(),
          value: "",
          recipientName: "",
          countryCode: "+1",
          phoneNumber: "",
          recipientEmail: "",
        });
        setCodeLookup({ status: "idle", message: "", card: null });
        lastLookupCodeRef.current = "";
        fetchGiftcards();
      } else {
        setErrorMsg(data.message || "Failed to issue gift card");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Issue New Gift Card</h1>
        <p className="text-sm text-gray-500 mt-1">
          Allocate a gift card to a specific customer with an initial balance.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3 border border-red-100">
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gift Card Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 uppercase tracking-wider">
                Card Details
              </h3>
              
              <div>
                <Label className="mb-2 block">Giftcard Number <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleChange}
                    onBlur={handleCodeBlur}
                    placeholder="Enter gift card code"
                    className={`pl-10 ${
                      codeLookup.status === "valid"
                        ? "border-emerald-500 focus-visible:ring-emerald-500"
                        : codeLookup.status === "invalid"
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                    }`}
                  />
                  {codeLookup.status === "checking" && (
                    <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {codeLookup.status === "valid" && (
                    <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-emerald-600" />
                  )}
                  {codeLookup.status === "invalid" && (
                    <AlertCircle className="absolute right-3 top-2.5 h-4 w-4 text-red-500" />
                  )}
                </div>
                {codeLookup.message && (
                  <p
                    className={`mt-1.5 text-xs font-medium ${
                      codeLookup.status === "valid"
                        ? "text-emerald-700"
                        : codeLookup.status === "invalid"
                          ? "text-red-600"
                          : "text-gray-500"
                    }`}
                  >
                    {codeLookup.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Amount <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 sm:text-sm">$</span>
                  <Input
                    type="number"
                    name="value"
                    required
                    min="1"
                    step="0.01"
                    value={formData.value}
                    readOnly={codeLookup.status === "valid"}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`pl-8 ${codeLookup.status === "valid" ? "bg-gray-50" : ""}`}
                  />
                </div>
                {codeLookup.status === "valid" && (
                  <p className="mt-1.5 text-xs text-gray-500">
                    Amount loaded from gift card — cannot be changed.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Issue Date <span className="text-red-500">*</span></Label>
                <DatePicker 
                  value={formData.issueDate} 
                  onChange={(date) => setFormData((prev) => ({ ...prev, issueDate: date || new Date() }))}
                />
              </div>
            </div>

            {/* Recipient Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 uppercase tracking-wider">
                Recipient Details
              </h3>
              
              <div>
                <Label className="mb-2 block">Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    name="recipientName"
                    required
                    value={formData.recipientName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <Select
                      value={formData.countryCode}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, countryCode: val }))}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((cc) => (
                          <SelectItem key={`${cc.code}-${cc.country}`} value={cc.code}>
                            {cc.country} ({cc.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-2/3 relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="1234567890"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    name="recipientEmail"
                    value={formData.recipientEmail}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={loading || codeLookup.status !== "valid"}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              {loading ? "Issuing..." : "Save & Issue Gift Card"}
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">Allocated Gift Cards</h2>
          <p className="text-sm text-gray-500">A history of all gift cards issued to customers.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fetching ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading records...
                    </td>
                  </tr>
                ) : giftcards.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No gift cards have been issued yet.
                    </td>
                  </tr>
                ) : (
                  giftcards.map((gc) => (
                    <tr key={gc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {gc.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {gc.recipientName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {gc.recipientEmail} {gc.recipientEmail && gc.recipientPhone ? "•" : ""} {gc.recipientPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${(gc.value || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {gc.issueDate ? format(new Date(gc.issueDate), "MMM d, yyyy") : format(new Date(gc.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${gc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {gc.status || "Active"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
