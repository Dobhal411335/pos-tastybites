const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Only this file — no generated beeps. */
const BELL_SRC = "/notification_bell.mp3";

const playedIds = new Set();
let audioCtx = null;
let bellBuffer = null;
let bellLoadPromise = null;
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

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

async function resumeContext() {
  const ctx = getAudioContext();
  if (!ctx) throw new Error("Web Audio is not supported in this browser");
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  if (ctx.state !== "running") {
    throw new Error("Audio context still suspended — allow Sound in site settings");
  }
  return ctx;
}

function loadBellBuffer(ctx) {
  if (bellBuffer) return Promise.resolve(bellBuffer);
  if (bellLoadPromise) return bellLoadPromise;

  bellLoadPromise = (async () => {
    const res = await fetch(BELL_SRC, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Bell sound missing (${res.status})`);
    const data = await res.arrayBuffer();
    // slice() avoids detach issues on some browsers
    bellBuffer = await ctx.decodeAudioData(data.slice(0));
    return bellBuffer;
  })().catch((err) => {
    bellLoadPromise = null;
    throw err;
  });

  return bellLoadPromise;
}

function playBuffer(ctx, buffer, volume = 1) {
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = volume;
  src.buffer = buffer;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start(0);
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
  return unlockedThisSession && audioCtx?.state === "running";
}

export function getNotificationSoundUnlockError() {
  return lastUnlockError;
}

export function needsNotificationSoundUnlock() {
  if (typeof window === "undefined") return false;
  return getNotificationSoundEnabled() && !isNotificationAudioUnlocked();
}

export function subscribeNotificationSoundUnlock(callback) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => callback(Boolean(e.detail?.unlocked), e.detail?.error || null);
  window.addEventListener(UNLOCK_EVENT, handler);
  return () => window.removeEventListener(UNLOCK_EVENT, handler);
}

/**
 * Must run inside a real click/tap. Plays only /notification_bell.mp3.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;
  lastUnlockError = null;

  try {
    const ctx = await resumeContext();
    const buffer = await loadBellBuffer(ctx);

    if (playPreview) {
      playBuffer(ctx, buffer, 1);
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
 * Resume AudioContext on first gesture so later order alerts can play.
 * Safe to call from multiple components — ref-counted.
 */
export function installNotificationAudioUnlockOnGesture() {
  if (typeof window === "undefined") return () => {};

  gestureUnlockRefCount += 1;

  if (!gestureUnlockInstalled) {
    gestureUnlockInstalled = true;

    const onGesture = () => {
      if (!getNotificationSoundEnabled() || isNotificationAudioUnlocked()) return;
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

function playBellThroughContext() {
  const ctx = audioCtx;
  if (!ctx || ctx.state !== "running") return false;

  if (bellBuffer) {
    playBuffer(ctx, bellBuffer, 1);
    return true;
  }

  // Load MP3 then play — no custom tone fallback
  void loadBellBuffer(ctx)
    .then((buffer) => {
      if (audioCtx?.state === "running" && buffer) {
        playBuffer(audioCtx, buffer, 1);
      }
    })
    .catch(() => {});
  return true;
}

function playBell() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
    lastPlayedAt = now;

    if (playBellThroughContext()) return;

    const ctx = getAudioContext();
    if (!ctx) {
      unlockedThisSession = false;
      notifyUnlockListeners();
      return;
    }
    ctx
      .resume()
      .then(() => {
        if (ctx.state === "running") {
          unlockedThisSession = true;
          playBellThroughContext();
          notifyUnlockListeners();
        } else {
          unlockedThisSession = false;
          lastUnlockError = "Sound blocked in site settings";
          notifyUnlockListeners();
        }
      })
      .catch(() => {
        unlockedThisSession = false;
        lastUnlockError = "Sound blocked in site settings";
        notifyUnlockListeners();
      });
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
