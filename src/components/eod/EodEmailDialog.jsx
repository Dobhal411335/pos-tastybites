"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {{ open: boolean, onOpenChange: (v:boolean)=>void, businessDate: string, defaultEmail?: string, fetchFn?: typeof fetch }} props
 */
export default function EodEmailDialog({
  open,
  onOpenChange,
  businessDate,
  defaultEmail = "",
  fetchFn = fetch,
}) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (open) setEmail(defaultEmail || "");
  }, [open, defaultEmail]);

  const handleSend = async () => {
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const res = await fetchFn("/api/eod/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ date: businessDate, to, preferSaved: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send email");
      }
      toast.success(`Report sent to ${to}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send End-of-Day Report</DialogTitle>
          <DialogDescription>
            Email PDF and Excel for {businessDate}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="eod-email-to">To</Label>
            <Input
              id="eod-email-to"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@restaurant.com"
              disabled={sending}
            />
          </div>
          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            <p className="font-medium mb-1">Attachments</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>End-of-Day-{businessDate}.pdf</li>
              <li>End-of-Day-{businessDate}.xlsx</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
