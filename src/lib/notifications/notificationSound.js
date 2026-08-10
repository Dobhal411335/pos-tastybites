const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Prefer correctly spelled asset; keep typo filename as fallback for older deploys. */
const BELL_SOURCES = ["/notification_bell.mp3"];

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
    let data = null;
    let lastStatus = 0;
    for (const src of BELL_SOURCES) {
      const res = await fetch(src, { cache: "force-cache" });
      lastStatus = res.status;
      if (res.ok) {
        data = await res.arrayBuffer();
        break;
      }
    }
    if (!data) throw new Error(`Bell sound missing (${lastStatus})`);
    // slice() avoids detach issues on some browsers
    bellBuffer = await ctx.decodeAudioData(data.slice(0));
    return bellBuffer;
  })().catch((err) => {
    bellLoadPromise = null;
    throw err;
  });

  return bellLoadPromise;
}

/** Guaranteed audible cue via oscillators (no network). */
function playTone(ctx, { volume = 0.18, duration = 0.22 } = {}) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  master.connect(ctx.destination);

  const freqs = [880, 1174];
  for (const freq of freqs) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + duration);
  }
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
 * Must run inside a real click/tap. Uses Web Audio (works better than HTMLAudio
 * on Brave/production). There is no browser Sound permission dialog — if the
 * site Sound setting is Block, play fails and we surface that to the UI.
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;
  lastUnlockError = null;

  try {
    const ctx = await resumeContext();

    // Kick off MP3 decode, but never block the gesture on network
    const bufferPromise = loadBellBuffer(ctx).catch((err) => {
      lastUnlockError = err?.message || "Bell file failed to load";
      return null;
    });

    if (playPreview) {
      // Immediate tone so the user always hears confirmation on Enable
      playTone(ctx, { volume: 0.16, duration: 0.18 });
      const buffer = await bufferPromise;
      if (buffer) {
        // Slight delay so tone + bell don't fully collide
        window.setTimeout(() => {
          try {
            if (audioCtx?.state === "running") playBuffer(audioCtx, buffer, 1);
          } catch {
            /* ignore */
          }
        }, 160);
      }
    } else {
      await bufferPromise;
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

  // Buffer still loading — audible fallback so the order isn't silent
  playTone(ctx, { volume: 0.2, duration: 0.28 });
  void loadBellBuffer(ctx).catch(() => {});
  return true;
}

function playBell() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
    lastPlayedAt = now;

    if (playBellThroughContext()) return;

    // Context not running — try resume (may fail without gesture)
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
