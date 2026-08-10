"use client";

import React, { useEffect, useState } from "react";
import { BellRing, Volume2, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  unlockNotificationAudio,
  setNotificationSoundEnabled,
  installNotificationAudioUnlockOnGesture,
} from "@/lib/notifications/notificationSound";
import {
  needsSystemNotificationPermission,
  requestSystemNotificationPermission,
  wasSystemNotificationPromptDismissed,
  dismissSystemNotificationPrompt,
  markAlertsSetupDone,
  getSystemNotificationPermission,
  isSystemNotificationDenied,
} from "@/lib/notifications/systemNotifications";

/**
 * Ask once for browser Notifications permission (new orders only).
 * Sound unlocks silently on the next click anywhere — no nag banner every refresh.
 */
export default function NotificationSoundPrompt() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [permission, setPermission] = useState(() =>
    typeof window !== "undefined" ? getSystemNotificationPermission() : "default"
  );

  useEffect(() => {
    const cleanupGesture = installNotificationAudioUnlockOnGesture();

    const timer = setTimeout(() => {
      const perm = getSystemNotificationPermission();
      setPermission(perm);

      // Only show when we still need the browser permission dialog,
      // or once when previously denied (so staff can unblock).
      // Do NOT show just because audio needs unlock — gesture handler covers that.
      if (wasSystemNotificationPromptDismissed()) {
        setVisible(false);
        return;
      }
      if (perm === "default" || perm === "denied") {
        setVisible(true);
      }
    }, 700);

    return () => {
      clearTimeout(timer);
      cleanupGesture();
    };
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      setNotificationSoundEnabled(true);

      // Unlock audio FIRST while the click gesture is still valid
      const soundOk = await unlockNotificationAudio({ playPreview: true });

      let systemResult = {
        ok: getSystemNotificationPermission() === "granted",
        permission: getSystemNotificationPermission(),
      };

      if (needsSystemNotificationPermission()) {
        systemResult = await requestSystemNotificationPermission();
      }

      setPermission(systemResult.permission);

      if (systemResult.permission === "granted" || systemResult.permission === "unsupported") {
        markAlertsSetupDone();
        setVisible(false);
        toast.success(
          soundOk
            ? "Alerts enabled — sound + system notifications for new orders"
            : "System notifications allowed for new orders"
        );
      } else if (systemResult.permission === "denied") {
        // Remember they responded so we don't re-open every refresh;
        // they can still use Check again this session if they unblock.
        toast.message(
          "Notifications blocked. Address bar → lock icon → Notifications → Allow, then tap Check again."
        );
      } else if (soundOk) {
        markAlertsSetupDone();
        setVisible(false);
        toast.success("Notification sound enabled");
      } else {
        toast.error("Could not enable alerts. Try again or check browser site settings.");
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleRecheckPermission = async () => {
    const next = getSystemNotificationPermission();
    setPermission(next);
    if (next === "granted") {
      setNotificationSoundEnabled(true);
      await unlockNotificationAudio({ playPreview: true });
      markAlertsSetupDone();
      setVisible(false);
      toast.success("System notifications allowed — new orders will alert you");
    } else if (next === "denied") {
      toast.message(
        "Still blocked. Address bar → lock/tune icon → Site settings → Notifications → Allow."
      );
    } else {
      void handleEnable();
    }
  };

  const handleNotNow = () => {
    dismissSystemNotificationPrompt();
    setVisible(false);
  };

  if (!visible) return null;

  const denied = permission === "denied" || isSystemNotificationDenied();
  const needSystem = needsSystemNotificationPermission();

  return (
    // Narrow fixed chip only — never a full-width overlay that freezes the nav/logout
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 w-[min(calc(100%-1.5rem),28rem)] -translate-x-1/2">
      <div className="pointer-events-auto rounded-2xl border border-orange-200 bg-white shadow-lg p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <BellRing className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">
            {denied ? "Notifications are blocked" : "Allow alerts for new orders?"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
            {denied
              ? "Click the lock icon next to the URL → Notifications → Allow. Logout and other buttons stay usable while this is open."
              : needSystem
                ? "Your browser will ask for Notifications. We only use system alerts for new orders, plus an in-page bell sound."
                : "Tap once to unlock notification sound."}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {denied ? (
              <Button
                size="sm"
                onClick={handleRecheckPermission}
                disabled={enabling}
                className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                Check again
              </Button>
            ) : (
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
                {enabling ? "Enabling…" : needSystem ? "Allow notifications" : "Enable sound"}
              </Button>
            )}
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
