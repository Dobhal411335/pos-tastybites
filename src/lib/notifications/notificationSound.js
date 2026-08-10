const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Prefer re-encoded MP3; WAV is the universal browser fallback. */
const BELL_SOURCES = ["/notification_bell.mp3", "/notification_bell.wav"];

const playedIds = new Set();
let sharedAudio = null;
let activeSrc = BELL_SOURCES[0];
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

function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  try {
    audio.load();
  } catch {
    /* ignore */
  }
  return audio;
}

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = createAudio(activeSrc);
  }
  return sharedAudio;
}

function switchAudioSource(src) {
  activeSrc = src;
  if (sharedAudio) {
    try {
      sharedAudio.pause();
    } catch {
      /* ignore */
    }
  }
  sharedAudio = createAudio(src);
  return sharedAudio;
}

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

async function playWithElement(audio) {
  audio.pause();
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore seek while loading */
  }
  audio.volume = 1;
  await audio.play();
}

/** Try each audio source until one plays successfully. */
async function playHtmlBell({ allowFallback = true } = {}) {
  let audio = getAudio();
  if (!audio) throw new Error("Audio not available");

  try {
    await playWithElement(audio);
    return;
  } catch (firstErr) {
    if (!allowFallback) throw firstErr;

    for (const src of BELL_SOURCES) {
      if (src === activeSrc) continue;
      try {
        audio = switchAudioSource(src);
        await playWithElement(audio);
        return;
      } catch {
        /* try next */
      }
    }
    throw firstErr;
  }
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
 * Must run inside a real click/tap. Plays notification_bell via HTMLAudio.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;
  lastUnlockError = null;

  try {
    try {
      await resumeAudioContext();
    } catch {
      /* HTMLAudio may still work from this gesture */
    }

    const audio = getAudio();
    if (!audio) throw new Error("Audio not available");

    if (playPreview) {
      await playHtmlBell({ allowFallback: true });
    } else {
      audio.volume = 0.001;
      try {
        await audio.play();
      } catch {
        // Try fallback sources for silent unlock too
        await playHtmlBell({ allowFallback: true });
        audio.pause();
      }
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
      err?.message ||
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

    const playPromise = playHtmlBell({ allowFallback: true });
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
