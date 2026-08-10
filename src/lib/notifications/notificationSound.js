const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Only this file — no generated beeps / WebAudio decode (MP3 decode fails in some browsers). */
const BELL_SRC = "/notification_bell.mp3";

const playedIds = new Set();
let sharedAudio = null;
let audioCtx = null;
let lastPlayedAt = 0;
let unlockedThisSession = false;
let gestureUnlockInstalled = false;
let gestureUnlockRefCount = 0;
let lastUnlockError = null;
let removeGestureListeners = null;
const PLAY_COOLDOWN_MS = 500;
const UNLOCK_EVENT = "tastybites:notification-sound-unlock";

function notifyUnlockListeners() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(UNLOCK_EVENT, {
      detail: { unlocked: unlockedThisSession, error: lastUnlockError },
    })
  );
}

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(BELL_SRC);
    sharedAudio.preload = "auto";
    try {
      sharedAudio.load();
    } catch {
      /* ignore */
    }
  }
  return sharedAudio;
}

/** Resume AudioContext so the origin is treated as user-activated for media. */
async function resumeAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  return audioCtx;
}

function playHtmlBell() {
  const audio = getAudio();
  if (!audio) throw new Error("Audio not available");

  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore seek while loading */
  }
  audio.volume = 1;

  const playPromise = audio.play();
  if (playPromise?.then) return playPromise;
  return Promise.resolve();
}

export function getNotificationSoundEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_PREF_KEY) !== "off";
}

export function setNotificationSoundEnabled(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, enabled ? "on" : "off");
}

export function isNotificationAudioUnlocked() {
  return unlockedThisSession;
}

export function getNotificationSoundUnlockError() {
  return lastUnlockError;
}

export function needsNotificationSoundUnlock() {
  if (typeof window === "undefined") return false;
  return getNotificationSoundEnabled() && !unlockedThisSession;
}

export function subscribeNotificationSoundUnlock(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => callback(Boolean(e.detail?.unlocked), e.detail?.error || null);
  window.addEventListener(UNLOCK_EVENT, handler);
  return () => window.removeEventListener(UNLOCK_EVENT, handler);
}

/**
 * Must run inside a real click/tap. Plays /notification_bell.mp3 via HTMLAudio.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;
  lastUnlockError = null;

  try {
    // Warm autoplay policy (helps Brave/Chrome keep later plays working)
    try {
      await resumeAudioContext();
    } catch {
      /* HTMLAudio may still work from this gesture */
    }

    const audio = getAudio();
    if (!audio) throw new Error("Audio not available");

    if (playPreview) {
      // Play immediately in the gesture — browser buffers as needed
      await playHtmlBell();
    } else {
      // Silent unlock: brief near-silent play then pause
      audio.volume = 0.001;
      await audio.play();
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      audio.volume = 1;
    }

    unlockedThisSession = true;
    notifyUnlockListeners();
    return true;
  } catch (err) {
    unlockedThisSession = false;
    lastUnlockError =
      err?.name === "NotSupportedError" || /decode|format/i.test(err?.message || "")
        ? "Could not play notification_bell.mp3 — re-export as a standard MP3 and replace the file in /public"
        : err?.message ||
          "Sound blocked — open the lock icon → Sound → Allow, then tap Enable sound again";
    notifyUnlockListeners();
    return false;
  }
}

/**
 * Resume / unlock on first gesture so later order alerts can play.
 * Safe to call from multiple components — ref-counted.
 */
export function installNotificationAudioUnlockOnGesture() {
  if (typeof window === "undefined") return () => {};

  gestureUnlockRefCount += 1;

  if (!gestureUnlockInstalled) {
    gestureUnlockInstalled = true;

    const onGesture = () => {
      if (!getNotificationSoundEnabled() || unlockedThisSession) return;
      void unlockNotificationAudio({ playPreview: false });
    };

    window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onGesture, { capture: true, passive: true });

    removeGestureListeners = () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
      removeGestureListeners = null;
      gestureUnlockInstalled = false;
    };
  }

  return () => {
    gestureUnlockRefCount = Math.max(0, gestureUnlockRefCount - 1);
    if (gestureUnlockRefCount === 0 && removeGestureListeners) {
      removeGestureListeners();
    }
  };
}

function playBell() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
    lastPlayedAt = now;

    const playPromise = playHtmlBell();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        unlockedThisSession = false;
        lastUnlockError =
          "Sound blocked — tap Sound ON again, or allow Sound in site settings";
        notifyUnlockListeners();
      });
    }
  } catch {
    unlockedThisSession = false;
    notifyUnlockListeners();
  }
}

/**
 * Play once per notification id when enabled, unlocked, and high-priority.
 */
export function playNotificationSound(notification) {
  if (typeof window === "undefined") return;
  if (!getNotificationSoundEnabled()) return;
  if (!unlockedThisSession) return;
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

/** Explicit test sound for the Sound ON toggle. */
export async function playNotificationSoundPreview() {
  return unlockNotificationAudio({ playPreview: true });
}
