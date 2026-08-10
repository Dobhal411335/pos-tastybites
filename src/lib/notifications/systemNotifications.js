const DISMISS_KEY = "tastybites_system_notif_prompt_dismissed";
/** Persist across refreshes so we don't nag after Allow / Not now. */
const SETUP_DONE_KEY = "tastybites_alerts_setup_done";

/** Browser/OS system notifications are reserved for new orders only. */
export const SYSTEM_NOTIFICATION_TYPES = new Set(["NEW_ORDER"]);

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

export function isSystemNotificationDenied() {
  return getSystemNotificationPermission() === "denied";
}

export function wasSystemNotificationPromptDismissed() {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(SETUP_DONE_KEY) === "1" ||
    sessionStorage.getItem(DISMISS_KEY) === "1"
  );
}

export function dismissSystemNotificationPrompt() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISMISS_KEY, "1");
  localStorage.setItem(SETUP_DONE_KEY, "1");
}

export function markAlertsSetupDone() {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETUP_DONE_KEY, "1");
  sessionStorage.setItem(DISMISS_KEY, "1");
}

export function shouldShowAsSystemNotification(notification) {
  return SYSTEM_NOTIFICATION_TYPES.has(notification?.type);
}

function absoluteAssetUrl(path) {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return path;
  }
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
 * Show an OS/browser system notification for new orders only (when permission is granted).
 */
export function showSystemNotification(notification) {
  if (!isSystemNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!shouldShowAsSystemNotification(notification)) return;

  try {
    const title = notification?.title || "New Order";
    const body = notification?.message || "";
    const n = new Notification(title, {
      body,
      icon: absoluteAssetUrl("/favicon/android-chrome-192x192.png"),
      badge: absoluteAssetUrl("/favicon/favicon-32x32.png"),
      tag: String(notification?.id || notification?._id || `tb-order-${Date.now()}`),
      renotify: true,
      requireInteraction: true,
    });

    n.onclick = () => {
      try {
        window.focus();
        const sessionId = notification?.tableSessionId;
        if (sessionId) {
          window.location.href = `/sales/orders/${sessionId}`;
        } else {
          window.location.href = "/sales/notifications";
        }
      } catch {
        /* ignore */
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}
