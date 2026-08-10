'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { refreshEmployeeSession } from '@/lib/employeeFetch';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

async function isAccessTokenValid() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.success && data.data);
  } catch {
    return false;
  }
}

export function useEmployeeSessionRefresh({ enabled = true } = {}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const refresh = async () => {
      const ok = await refreshEmployeeSession();
      if (ok) return;

      const stillValid = await isAccessTokenValid();
      if (!stillValid) {
        router.replace('/login');
      }
    };

    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, router]);
}
