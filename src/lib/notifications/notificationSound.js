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
 * Call from a user gesture (sound toggle) to unlock browser audio autoplay.
 */
export async function unlockNotificationAudio() {
  if (typeof window === "undefined") return false;
  try {
    const audio = getAudio();
    if (!audio) return false;
    // Silent play/pause unlocks autoplay without an extra audible ring
    const prev = audio.volume;
    audio.volume = 0;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = prev || 1;
    localStorage.setItem(SOUND_UNLOCKED_KEY, "1");
    return true;
  } catch {
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
    // Avoid restarting mid-play (which can sound like a double ring)
    if (!audio.paused && !audio.ended && audio.currentTime > 0.05) return;

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
