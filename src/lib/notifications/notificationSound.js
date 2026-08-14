import { BELL_MP3_DATA_URL } from "@/lib/notifications/bellSoundData";

const SOUND_PREF_KEY = "tastybites_notification_sound";

/**
 * Prefer embedded MP3 (always available). Public paths are secondary for cache/CDN.
 * "The element has no supported sources" usually means the URL 404'd or MIME failed.
 */
const BELL_SOURCES = [
  BELL_MP3_DATA_URL,
  "/notification_bell.mp3",
  "/notification_bell.wav",
];

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

function resolveSrc(src) {
  if (!src || src.startsWith("data:")) return src;
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function createAudio(src) {
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = resolveSrc(src);
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
      sharedAudio.removeAttribute("src");
      sharedAudio.load();
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

function waitForCanPlay(audio, timeoutMs = 4000) {
  if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("error", onError);
      clearTimeout(timer);
      fn(value);
    };
    const onReady = () => finish(resolve);
    const onError = () => {
      const mediaMsg = audio.error?.message || "The element has no supported sources.";
      finish(reject, new Error(mediaMsg));
    };
    const timer = setTimeout(() => {
      if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(resolve);
      else finish(reject, new Error("Timed out loading notification sound"));
    }, timeoutMs);

    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("loadeddata", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
    try {
      audio.load();
    } catch {
      /* ignore */
    }
  });
}

async function playWithElement(audio) {
  audio.volume = 1;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore seek while loading */
  }

  try {
    // Prefer immediate play while the user gesture is still valid
    await audio.play();
    return;
  } catch (err) {
    // Not loaded yet or transient error — wait, then retry once
    await waitForCanPlay(audio);
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    await audio.play();
  }
}

/** Try each audio source until one plays successfully. */
async function playHtmlBell() {
  let lastErr = null;

  // Always try active source first, then the rest
  const ordered = [activeSrc, ...BELL_SOURCES.filter((s) => s !== activeSrc)];

  for (const src of ordered) {
    try {
      const audio = src === activeSrc && sharedAudio ? sharedAudio : switchAudioSource(src);
      await playWithElement(audio);
      return;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Could not play notification sound");
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
 * Must run inside a real click/tap. Plays the notification bell.
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

    if (playPreview) {
      await playHtmlBell();
    } else {
      // Silent unlock: near-silent play then pause (keeps autoplay unlock)
      const audio = getAudio();
      await waitForCanPlay(audio);
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

  const type = notification?.type;
  const shouldPlay =
    notification?.playSound === true ||
    notification?.priority === "high" ||
    type === "EMPLOYEE_LOGIN";
  if (!shouldPlay) return;

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
