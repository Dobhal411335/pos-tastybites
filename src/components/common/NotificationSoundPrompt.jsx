"use client";

import React, { useEffect, useState } from "react";
import { BellRing, Volume2, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  unlockNotificationAudio,
  setNotificationSoundEnabled,
  installNotificationAudioUnlockOnGesture,
  getNotificationSoundUnlockError,
  needsNotificationSoundUnlock,
  isNotificationAudioUnlocked,
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

const SOUND_HELP =
  "Address bar → lock/tune icon → Sound → Allow (and Autoplay if you see it). Then tap Enable sound again.";

/**
 * Ask for in-page alert sound (Web Audio unlock) + browser Notifications.
 * Browsers have no Sound.requestPermission() — Sound is a site setting only.
 */
export default function NotificationSoundPrompt() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [permission, setPermission] = useState(() =>
    typeof window !== "undefined" ? getSystemNotificationPermission() : "default"
  );
  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    const cleanupGesture = installNotificationAudioUnlockOnGesture();

    const timer = setTimeout(() => {
      const perm = getSystemNotificationPermission();
      setPermission(perm);

      // After Allow / Not now, don't nag every refresh — gesture unlock handles sound
      if (wasSystemNotificationPromptDismissed()) {
        setVisible(false);
        return;
      }
      if (perm === "default" || perm === "denied" || needsNotificationSoundUnlock()) {
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
    setSoundBlocked(false);
    try {
      setNotificationSoundEnabled(true);

      // Sound FIRST while the click gesture is fresh (critical on Brave/prod)
      const soundOk = await unlockNotificationAudio({ playPreview: true });
      if (!soundOk) {
        setSoundBlocked(true);
        toast.error(getNotificationSoundUnlockError() || SOUND_HELP);
        // Still try notifications so they don't have to click twice later
      }

      let systemResult = {
        ok: getSystemNotificationPermission() === "granted",
        permission: getSystemNotificationPermission(),
      };

      if (needsSystemNotificationPermission()) {
        systemResult = await requestSystemNotificationPermission();
      }

      setPermission(systemResult.permission);

      if (soundOk && (systemResult.permission === "granted" || systemResult.permission === "unsupported")) {
        markAlertsSetupDone();
        setVisible(false);
        toast.success("Sound + system notifications enabled for new orders");
      } else if (soundOk && systemResult.permission === "denied") {
        markAlertsSetupDone();
        toast.message(
          "Sound works. Notifications blocked — lock icon → Notifications → Allow."
        );
        setVisible(false);
      } else if (soundOk) {
        markAlertsSetupDone();
        setVisible(false);
        toast.success("Alert sound enabled — you should have heard a beep");
      } else if (systemResult.permission === "granted") {
        toast.message(`Notifications allowed, but sound is blocked. ${SOUND_HELP}`);
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleRecheckPermission = async () => {
    setEnabling(true);
    try {
      setNotificationSoundEnabled(true);
      const soundOk = await unlockNotificationAudio({ playPreview: true });
      const next = getSystemNotificationPermission();
      setPermission(next);
      setSoundBlocked(!soundOk);

      if (soundOk && (next === "granted" || next === "unsupported" || next === "default")) {
        if (next === "default") {
          const systemResult = await requestSystemNotificationPermission();
          setPermission(systemResult.permission);
        }
        markAlertsSetupDone();
        setVisible(false);
        toast.success("Alerts ready");
      } else if (!soundOk) {
        toast.error(getNotificationSoundUnlockError() || SOUND_HELP);
      } else if (next === "denied") {
        toast.message(
          "Still blocked. Lock/tune icon → Site settings → Notifications → Allow."
        );
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

  const denied = permission === "denied" || isSystemNotificationDenied();
  const needSystem = needsSystemNotificationPermission();
  const needSound = !isNotificationAudioUnlocked();

  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-40 w-[min(calc(100%-1.5rem),28rem)] -translate-x-1/2">
      <div className="pointer-events-auto rounded-2xl border border-orange-200 bg-white shadow-lg p-4 flex gap-3 items-start">
        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <Volume2 className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">
            {soundBlocked || (denied && needSound)
              ? "Allow sound for order alerts"
              : denied
                ? "Notifications are blocked"
                : "Enable order alert sound?"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug">
            {soundBlocked
              ? SOUND_HELP
              : denied
                ? "Lock icon → Notifications → Allow. Also set Sound → Allow so the bell can play."
                : "Tap Enable — you should hear a short beep. Your browser may also ask for Notifications (new orders only). There is no separate Sound popup; if silent, allow Sound in site settings."}
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {denied || soundBlocked ? (
              <Button
                size="sm"
                onClick={handleRecheckPermission}
                disabled={enabling}
                className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                <Settings className="h-3.5 w-3.5 mr-1.5" />
                {enabling ? "Checking…" : "Enable sound"}
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
                {enabling
                  ? "Enabling…"
                  : needSystem
                    ? "Enable sound & notifications"
                    : "Enable sound"}
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
