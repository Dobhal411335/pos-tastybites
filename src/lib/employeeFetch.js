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

/**
 * Fetch wrapper for sales/employee routes.
 * Retries once after silently refreshing the access token on 401.
 */
export async function employeeFetch(input, init = {}) {
  const options = { ...init, credentials: init.credentials ?? 'include' };
  const doFetch = () => fetch(input, options);

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshEmployeeSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  return res;
}
