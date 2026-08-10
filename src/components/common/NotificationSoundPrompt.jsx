"use client";

import React, { useEffect, useState } from "react";
import { BellRing, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  needsNotificationSoundUnlock,
  unlockNotificationAudio,
  setNotificationSoundEnabled,
  subscribeNotificationSoundUnlock,
  getNotificationSoundEnabled,
  isNotificationAudioUnlocked,
} from "@/lib/notifications/notificationSound";
import {
  needsSystemNotificationPermission,
  requestSystemNotificationPermission,
  wasSystemNotificationPromptDismissed,
  dismissSystemNotificationPrompt,
  getSystemNotificationPermission,
} from "@/lib/notifications/systemNotifications";

/**
 * On load: ask to enable in-page sound + browser system notification permission
 * (browser URL permission dialog for Notifications).
 */
export default function NotificationSoundPrompt() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const shouldShow = () => {
    if (wasSystemNotificationPromptDismissed()) {
      return needsNotificationSoundUnlock();
    }
    const needSound = needsNotificationSoundUnlock();
    const needSystem = needsSystemNotificationPermission();
    return needSound || needSystem;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShow()) setVisible(true);
    }, 700);

    const unsubscribe = subscribeNotificationSoundUnlock(() => {
      if (shouldShow()) setVisible(true);
      else setVisible(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      setNotificationSoundEnabled(true);

      const soundOk = await unlockNotificationAudio({ playPreview: true });

      let systemResult = { ok: true, permission: getSystemNotificationPermission() };
      if (needsSystemNotificationPermission()) {
        // This triggers the browser's Notifications permission UI (site settings)
        systemResult = await requestSystemNotificationPermission();
      }

      if (soundOk && systemResult.permission === "granted") {
        setVisible(false);
        toast.success("Alerts enabled — sound + system notifications");
      } else if (soundOk && systemResult.permission === "denied") {
        setVisible(false);
        toast.message(
          "Sound enabled. System notifications were blocked — allow Notifications in site settings."
        );
      } else if (soundOk) {
        setVisible(false);
        toast.success("Notification sound enabled");
      } else if (systemResult.ok) {
        setVisible(false);
        toast.success("System notifications allowed");
      } else {
        toast.error("Could not enable alerts. Try again or check browser site settings.");
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleNotNow = () => {
    dismissSystemNotificationPrompt();
    setVisible(false);
  };

  if (!visible) return null;

  const needSystem = needsSystemNotificationPermission();
  const needSound = !isNotificationAudioUnlocked() && getNotificationSoundEnabled();

  return (
    <div className="fixed inset-x-0 bottom-16 sm:bottom-20 z-50 flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-orange-200 bg-white shadow-lg p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <BellRing className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">Allow alerts for this site?</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
            {needSystem
              ? "Your browser will ask for Notifications permission (same place as Location / Sound in site settings). We also unlock the alert bell sound."
              : "Tap once to unlock notification sound for this session."}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={enabling}
              className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {needSystem ? (
                <BellRing className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              )}
              {enabling
                ? "Enabling…"
                : needSystem
                  ? "Allow notifications"
                  : "Enable sound"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNotNow}
              disabled={enabling}
              className="h-9 text-zinc-600"
            >
              Not now
            </Button>
          </div>
          {needSound && needSystem && (
            <p className="text-[10px] text-zinc-400 mt-2">
              After you allow, you&apos;ll hear a short confirmation sound.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleNotNow}
          className="text-zinc-400 hover:text-zinc-600 p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
