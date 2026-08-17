"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import EodReportPage from "@/components/eod/EodReportPage";
import { AdminNote } from "./adminReportUi";

const STATUS_CLASS = {
  Closed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  "Ready to Close": "bg-amber-50 text-amber-800 border-amber-200",
  Open: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function EodSection() {
  const [saved, setSaved] = useState(false);
  const [businessDate, setBusinessDate] = useState(todayLocalISO());
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/employees/close-restaurant", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!cancelled && json.success) {
          setCanClose(Boolean(json.data?.canClose));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReportMeta = useCallback(
    ({ businessDate: nextDate, saved: nextSaved }) => {
      if (nextDate) setBusinessDate(nextDate);
      setSaved(Boolean(nextSaved));
    },
    []
  );

  const isToday = businessDate === todayLocalISO();
  const status = saved
    ? "Closed"
    : isToday && canClose
      ? "Ready to Close"
      : "Open";

  return (
    <div className="space-y-6">
      <Card className="rounded-lg border-zinc-200 shadow-sm">
        <CardContent className="p-6 flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-semibold uppercase tracking-wide text-zinc-500">
            EOD status
          </span>
          <Badge variant="outline" className={STATUS_CLASS[status]}>
            {status}
          </Badge>
        </CardContent>
      </Card>
      <AdminNote>
        Uses the existing day-closing report. Opening float and physical till
        count are not recorded. Expected cash is cash tenders from paid orders.
        Enter an actual deposit when saving to compute over/short.
      </AdminNote>
      <EodReportPage
        fetchFn={fetch}
        showHistory
        title="End of Day"
        onReportMeta={handleReportMeta}
      />
    </div>
  );
}
