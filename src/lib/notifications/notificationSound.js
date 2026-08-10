const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Filename matches the asset in /public (including spelling). */
const BELL_SRC = "/notifiication_bell.mp3";

const playedIds = new Set();
let sharedAudio = null;
let lastPlayedAt = 0;
/** Browser autoplay unlock only lasts for the current document/session. */
let unlockedThisSession = false;
const PLAY_COOLDOWN_MS = 600;
const UNLOCK_EVENT = "tastybites:notification-sound-unlock";

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(BELL_SRC);
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function notifyUnlockListeners() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, { detail: { unlocked: unlockedThisSession } }));
}

export function getNotificationSoundEnabled() {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SOUND_PREF_KEY);
  return v !== "off";
}

export function setNotificationSoundEnabled(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off");
}

/** True only after a successful unlock gesture in this page session. */
export function isNotificationAudioUnlocked() {
  return unlockedThisSession;
}

export function needsNotificationSoundUnlock() {
  if (typeof window === "undefined") return false;
  return getNotificationSoundEnabled() && !unlockedThisSession;
}

export function subscribeNotificationSoundUnlock(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => callback(Boolean(e.detail?.unlocked));
  window.addEventListener(UNLOCK_EVENT, handler);
  return () => window.removeEventListener(UNLOCK_EVENT, handler);
}

/**
 * Unlock browser autoplay from a real user gesture (sound toggle / enable banner).
 * Plays an audible confirmation so unlock is reliable.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;

  const audio = getAudio();
  if (!audio) return false;

  try {
    if (audio.readyState < 2) {
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn(value);
        };
        const onReady = () => finish(resolve);
        const onError = () => finish(reject, new Error("Audio failed to load"));
        const cleanup = () => {
          audio.removeEventListener("canplaythrough", onReady);
          audio.removeEventListener("error", onError);
          clearTimeout(timer);
        };
        const timer = setTimeout(() => {
          if (audio.readyState >= 2) finish(resolve);
          else finish(reject, new Error("Audio load timeout"));
        }, 4000);
        audio.addEventListener("canplaythrough", onReady, { once: true });
        audio.addEventListener("error", onError, { once: true });
        audio.load();
      });
    }

    audio.volume = 1;
    audio.currentTime = 0;
    if (playPreview) {
      await audio.play();
    } else {
      audio.volume = 0.001;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
    }

    unlockedThisSession = true;
    notifyUnlockListeners();
    return true;
  } catch {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") await ctx.resume();
        await ctx.close();
        unlockedThisSession = true;
        notifyUnlockListeners();
        if (playPreview) {
          try {
            audio.volume = 1;
            audio.currentTime = 0;
            await audio.play();
          } catch {
            /* preference unlocked; preview optional */
          }
        }
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}

function playBell() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
    lastPlayedAt = now;

    const audio = getAudio();
    if (!audio) return;
    if (!audio.paused && !audio.ended && audio.currentTime > 0.05) return;

    audio.volume = 1;
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // Autoplay blocked again — require a fresh unlock gesture
        unlockedThisSession = false;
        notifyUnlockListeners();
      });
    }
  } catch {
    unlockedThisSession = false;
    notifyUnlockListeners();
  }
}

/**
 * Play bell once per notification id when enabled, unlocked, and high-priority.
 */
export function playNotificationSound(notification) {
  if (typeof window === "undefined") return;
  if (!getNotificationSoundEnabled()) return;
  if (!isNotificationAudioUnlocked()) return;
  if (!notification?.playSound && notification?.priority !== "high") return;

  const id = String(notification.id || notification._id || "");
  if (!id || playedIds.has(id)) return;
  playedIds.add(id);
  if (playedIds.size > 200) {
    const first = playedIds.values().next().value;
    playedIds.delete(first);
  }
  playBell();
}
