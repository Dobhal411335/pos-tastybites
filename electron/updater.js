/**
 * Future auto-update hook (electron-updater).
 *
 * When ready to enable:
 * 1. npm install electron-updater
 * 2. Configure build.publish in package.json (generic S3/CDN or GitHub releases)
 * 3. Call initAutoUpdater(mainWindow) from main.js after createWindow()
 *
 * Do not bundle update credentials in the app — use a public release feed URL only.
 */

export function initAutoUpdater(_mainWindow) {
  if (!process.env.ELECTRON_AUTO_UPDATE) {
    return;
  }
  // Placeholder — wire electron-updater here in a future release phase.
  console.log('[updater] Auto-update not configured yet.');
}
