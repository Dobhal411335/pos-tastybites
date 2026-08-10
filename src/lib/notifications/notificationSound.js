const SOUND_PREF_KEY = "tastybites_notification_sound";
const SOUND_UNLOCKED_KEY = "tastybites_notification_sound_unlocked";
/** Filename matches the asset in /public (including spelling). */
const BELL_SRC = "/notifiication_bell.mp3";

const playedIds = new Set();
let sharedAudio = null;
let lastPlayedAt = 0;
const PLAY_COOLDOWN_MS = 600;

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(BELL_SRC);
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function markUnlocked() {
  localStorage.setItem(SOUND_UNLOCKED_KEY, "1");
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

export function isNotificationAudioUnlocked() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_UNLOCKED_KEY) === "1";
}

/**
 * Unlock browser autoplay from a real user gesture (sound toggle).
 * Plays an audible confirmation so unlock is reliable.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;

  const audio = getAudio();
  if (!audio) return false;

  try {
    // Ensure the file is ready before play() — avoids false unlock failures
    if (audio.readyState < 2) {
      await new Promise((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("Audio failed to load"));
        };
        const cleanup = () => {
          audio.removeEventListener("canplaythrough", onReady);
          audio.removeEventListener("error", onError);
        };
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
      const prev = audio.volume;
      audio.volume = 0.001;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = prev || 1;
    }

    markUnlocked();
    return true;
  } catch {
    // Fallback: AudioContext resume also counts as unlock in many browsers
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") await ctx.resume();
        await ctx.close();
        markUnlocked();
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
        // Autoplay blocked — fail silently
      });
    }
  } catch {
    // Never break notifications for audio failures
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
