const SOUND_PREF_KEY = "tastybites_notification_sound";
/** Filename matches the asset in /public (including spelling). */
const BELL_SRC = "/notifiication_bell.mp3";

const playedIds = new Set();
let sharedAudio = null;
let lastPlayedAt = 0;
/** Browser autoplay unlock only lasts for the current document/session. */
let unlockedThisSession = false;
let gestureUnlockInstalled = false;
const PLAY_COOLDOWN_MS = 600;
const UNLOCK_EVENT = "tastybites:notification-sound-unlock";

function getAudio() {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio(BELL_SRC);
    sharedAudio.preload = "auto";
    // Kick off load early so unlock play() is more likely to succeed
    try {
      sharedAudio.load();
    } catch {
      /* ignore */
    }
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
 * Unlock from the current user gesture without awaiting network/load.
 * Awaiting MP3 load before play() loses the gesture (common in production).
 */
export async function unlockNotificationAudio({ playPreview = true } = {}) {
  if (typeof window === "undefined") return false;

  const audio = getAudio();
  if (!audio) return false;

  try {
    audio.volume = playPreview ? 1 : 0.001;
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore seek errors while loading */
    }

    const playPromise = audio.play();
    if (playPromise?.then) await playPromise;

    if (!playPreview) {
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
  } catch {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === "suspended") await ctx.resume();

        // Short click so the context is truly unlocked even if MP3 is blocked
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = playPreview ? 0.05 : 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);

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

/**
 * After sound is preferred ON, unlock on the first real user gesture
 * so refresh does not require the banner every time.
 */
export function installNotificationAudioUnlockOnGesture() {
  if (typeof window === "undefined" || gestureUnlockInstalled) return () => {};
  gestureUnlockInstalled = true;

  const tryUnlock = async () => {
    if (!getNotificationSoundEnabled() || unlockedThisSession) return;
    await unlockNotificationAudio({ playPreview: false });
  };

  const onGesture = () => {
    void tryUnlock();
  };

  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });

  return () => {
    window.removeEventListener("pointerdown", onGesture, { capture: true });
    window.removeEventListener("keydown", onGesture, { capture: true });
    gestureUnlockInstalled = false;
  };
}

function playBell() {
  try {
    const now = Date.now();
    if (now - lastPlayedAt < PLAY_COOLDOWN_MS) return;
    lastPlayedAt = now;

    // Fresh element avoids stuck shared Audio state after unlock/preview
    const audio = new Audio(BELL_SRC);
    audio.volume = 1;
    const playPromise = audio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        // Fall back to shared element; only mark locked if that also fails
        const shared = getAudio();
        if (!shared) {
          unlockedThisSession = false;
          notifyUnlockListeners();
          return;
        }
        shared.volume = 1;
        try {
          shared.currentTime = 0;
        } catch {
          /* ignore */
        }
        const retry = shared.play();
        if (retry?.catch) {
          retry.catch(() => {
            unlockedThisSession = false;
            notifyUnlockListeners();
          });
        }
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
