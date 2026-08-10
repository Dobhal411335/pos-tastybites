const DISMISS_KEY = "tastybites_system_notif_prompt_dismissed";

export function isSystemNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getSystemNotificationPermission() {
  if (!isSystemNotificationSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export function needsSystemNotificationPermission() {
  if (!isSystemNotificationSupported()) return false;
  return Notification.permission === "default";
}

export function wasSystemNotificationPromptDismissed() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISMISS_KEY) === "1";
}

export function dismissSystemNotificationPrompt() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISMISS_KEY, "1");
}

/**
 * Must be called from a user gesture to show the browser permission dialog
 * (appears under site settings → Notifications).
 */
export async function requestSystemNotificationPermission() {
  if (!isSystemNotificationSupported()) {
    return { ok: false, permission: "unsupported" };
  }

  if (Notification.permission === "granted") {
    return { ok: true, permission: "granted" };
  }

  if (Notification.permission === "denied") {
    return { ok: false, permission: "denied" };
  }

  try {
    const permission = await Notification.requestPermission();
    return { ok: permission === "granted", permission };
  } catch {
    return { ok: false, permission: Notification.permission };
  }
}

/**
 * Show an OS/browser system notification (when permission is granted).
 */
export function showSystemNotification(notification) {
  if (!isSystemNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    // Still show for high-priority so staff notice even with tab focused
    if (notification?.priority !== "high" && !notification?.playSound) return;
  }

  try {
    const title = notification?.title || "Tasty Bites";
    const body = notification?.message || "";
    const n = new Notification(title, {
      body,
      icon: "/BannerImage.png",
      badge: "/favicon/favicon-32x32.png",
      tag: String(notification?.id || notification?._id || `tb-${Date.now()}`),
      renotify: true,
    });

    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}
