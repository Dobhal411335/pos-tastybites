'use client';

let refreshPromise = null;

export async function refreshEmployeeSession() {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/employee/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    }).finally(() => {
      refreshPromise = null;
    });
  }

  const res = await refreshPromise;
  return res.ok;
}

async function clearEmployeeCookies() {
  try {
    await fetch('/api/employee/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    /* cookies may still clear via Set-Cookie if the request reached the server */
  }
}

/**
 * Fetch wrapper for sales/employee routes.
 * Retries once after silently refreshing the access token on 401.
 * If refresh also fails, logout so stale cookies cannot trap the POS on /floor.
 */
export async function employeeFetch(input, init = {}) {
  const options = { ...init, credentials: init.credentials ?? 'include' };
  const doFetch = () => fetch(input, options);

  let res = await doFetch();
  if (res.status === 401) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/api/employee/auth/logout') || url.includes('/api/employee/auth/refresh')) {
      return res;
    }

    const refreshed = await refreshEmployeeSession();
    if (refreshed) {
      res = await doFetch();
    } else {
      await clearEmployeeCookies();
    }
  }

  return res;
}
