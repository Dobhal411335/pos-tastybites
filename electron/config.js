import { app } from 'electron';

/**
 * Desktop POS load URL and navigation allowlist.
 *
 * Development (unpackaged): http://localhost:3000/sales/login
 * Production (packaged):    https://sales.tastybitesrestaurant.com/sales/login
 *
 * Override anytime with ELECTRON_POS_URL (e.g. for staging).
 * Set ELECTRON_PRODUCTION_URL at build time to change the packaged default.
 */

const DEV_PORT = process.env.PORT || 3000;

export const PRODUCTION_POS_URL =
  process.env.ELECTRON_PRODUCTION_URL ||
  'https://sales.tastybitesrestaurant.com/sales/login';

const DEV_POS_URL =
  process.env.ELECTRON_DEV_URL ||
  `http://localhost:${DEV_PORT}/sales/login`;

export function isPackagedApp() {
  return app.isPackaged;
}

export function getLoadUrl() {
  if (process.env.ELECTRON_POS_URL) {
    return process.env.ELECTRON_POS_URL;
  }
  return isPackagedApp() ? PRODUCTION_POS_URL : DEV_POS_URL;
}

/** Origins the main window may navigate to without opening externally. */
export function getAllowedOrigins(loadUrl) {
  const origins = new Set();
  try {
    origins.add(new URL(loadUrl).origin);
  } catch {
    // ignore invalid override
  }

  if (!isPackagedApp()) {
    origins.add(`http://localhost:${DEV_PORT}`);
    origins.add(`http://127.0.0.1:${DEV_PORT}`);
  }

  try {
    origins.add(new URL(PRODUCTION_POS_URL).origin);
  } catch {
    // ignore
  }

  return origins;
}

export function isAllowedNavigation(targetUrl, allowedOrigins) {
  try {
    const { origin, protocol } = new URL(targetUrl);
    if (protocol === 'file:' || protocol === 'about:') return true;
    return allowedOrigins.has(origin);
  } catch {
    return false;
  }
}
