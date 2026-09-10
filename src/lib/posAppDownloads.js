/**
 * Central config for Tasty Bites POS client installers.
 *
 * Paste your Google Drive share links into `downloadUrl` below.
 * Later you can swap these for CDN / server / GitHub Release URLs
 * without changing the Downloads UI.
 */

/** @typedef {'android' | 'windows'} PosDownloadPlatformId */

/**
 * @typedef {Object} PosAppDownload
 * @property {PosDownloadPlatformId} id
 * @property {string} title
 * @property {string} platformLabel
 * @property {string} description
 * @property {string} version
 * @property {string} fileName
 * @property {string} downloadUrl
 * @property {string} releaseDate
 * @property {string} fileSize
 * @property {string} fileType
 * @property {string} requirements
 * @property {string[]} installSteps
 * @property {boolean} available
 */

/**
 * Edit this object when you ship a new APK / EXE.
 * `downloadUrl` = Google Drive share link (or any public file URL).
 */
export const appDownloads = {
  android: {
    version: '1.0.0',
    fileName: 'TastyBites-POS-Android.apk',
    releaseDate: '2026-09-08',
    fileSize: '',
    downloadUrl:
      'https://drive.google.com/drive/folders/1vsfGeZx-faPI4jo-cOYT5cNAzoUNMa6i?usp=sharing',
  },
  windows: {
    version: '1.0.0',
    fileName: 'Tasty-Bites-POS-Setup.exe',
    releaseDate: '2026-09-08',
    fileSize: '',
    downloadUrl:
      'https://drive.google.com/drive/folders/1vsfGeZx-faPI4jo-cOYT5cNAzoUNMa6i?usp=sharing',
  },
};

/**
 * @returns {PosAppDownload}
 */
function buildAndroid() {
  const { version, fileName, releaseDate, fileSize, downloadUrl } =
    appDownloads.android;
  const url = typeof downloadUrl === 'string' ? downloadUrl.trim() : '';

  return {
    id: 'android',
    title: 'Tasty Bites POS for Android',
    platformLabel: 'Android Tablet',
    description: 'Install the Tasty Bites POS on supported Android tablets.',
    version,
    fileName,
    downloadUrl: url,
    releaseDate,
    fileSize,
    fileType: 'APK',
    requirements: 'Requires Android 8.0 or later',
    installSteps: [
      'Tap Download APK — Google Drive will open.',
      'Download the APK file from Google Drive to your tablet.',
      'Open the APK from Files / Downloads.',
      'Allow installation from the browser or file manager if Android asks, then install and sign in.',
    ],
    available: Boolean(url),
  };
}

/**
 * @returns {PosAppDownload}
 */
function buildWindows() {
  const { version, fileName, releaseDate, fileSize, downloadUrl } =
    appDownloads.windows;
  const url = typeof downloadUrl === 'string' ? downloadUrl.trim() : '';

  return {
    id: 'windows',
    title: 'Tasty Bites POS for Windows',
    platformLabel: 'Windows',
    description: 'Install the Tasty Bites POS on supported Windows computers.',
    version,
    fileName,
    downloadUrl: url,
    releaseDate,
    fileSize,
    fileType: 'EXE',
    requirements: 'Requires Windows 10 or Windows 11',
    installSteps: [
      'Click Download for Windows — Google Drive will open.',
      'Download the EXE installer from Google Drive.',
      'Open the installer from your Downloads folder.',
      'Follow the installation steps, then launch Tasty Bites POS and sign in.',
    ],
    available: Boolean(url),
  };
}

/**
 * @returns {{ android: PosAppDownload, windows: PosAppDownload, platforms: PosAppDownload[] }}
 */
export function getPosAppDownloads() {
  const android = buildAndroid();
  const windows = buildWindows();
  return {
    android,
    windows,
    platforms: [android, windows],
  };
}

/**
 * @param {string} value
 */
export function formatReleaseDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
