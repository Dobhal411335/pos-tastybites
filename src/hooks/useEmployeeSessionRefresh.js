'use client';

import { useEffect } from 'react';
import { refreshEmployeeSession } from '@/lib/employeeFetch';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

export function useEmployeeSessionRefresh({ enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return;

    const refresh = async () => {
      const ok = await refreshEmployeeSession();
      if (!ok) {
        window.location.assign('/sales/login');
      }
    };

    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled]);
}
