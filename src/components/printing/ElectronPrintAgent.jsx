"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  buildTestTicket,
  buildTicketFromJob,
} from "@/lib/printing/escpos";
import { toast } from "sonner";

const HEALTH_INTERVAL_MS = 90_000;

function isElectronDesktop() {
  return (
    typeof window !== "undefined" &&
    window.electronPOS?.isDesktop &&
    typeof window.electronPOS?.printRaw === "function"
  );
}

function canProbePrinter() {
  return (
    isElectronDesktop() &&
    typeof window.electronPOS?.probePrinter === "function"
  );
}

function isNetworkPrinter(printer) {
  const type = String(printer?.connectionType || "LAN").toUpperCase();
  return (
    printer?.enabled !== false &&
    (type === "LAN" || type === "NETWORK") &&
    Boolean(String(printer?.host || "").trim())
  );
}

/**
 * Exactly one enabled network printer → use for any target.
 * Multiple → match by target (and optional printerId).
 */
function pickNetworkPrinter(printers, { printerId, printerTarget } = {}) {
  const enabledNet = (printers || []).filter((p) => isNetworkPrinter(p));
  if (!enabledNet.length) return null;
  if (printerId) {
    const byId = enabledNet.find((p) => String(p._id) === String(printerId));
    if (byId) return byId;
  }
  if (enabledNet.length === 1) return enabledNet[0];
  if (printerTarget) {
    return enabledNet.find((p) => p.target === printerTarget) || null;
  }
  return null;
}

/**
 * Listens for print jobs on the sales Socket.IO connection and sends
 * ESC/POS bytes to configured LAN/NETWORK printers via Electron IPC.
 * USB jobs are handled by the local Windows print-bridge — skipped here.
 * Drains QUEUED jobs on mount, visibility restore, and printer-online.
 * No-op in a normal browser.
 */
export default function ElectronPrintAgent() {
  const { socket } = useSocket();
  const printersRef = useRef([]);
  const processingRef = useRef(new Set());
  const probingRef = useRef(new Set());
  const drainingRef = useRef(false);

  useEffect(() => {
    if (!isElectronDesktop()) return undefined;

    let cancelled = false;

    const loadPrinters = async () => {
      try {
        const res = await employeeFetch("/api/sales/printers");
        const json = await res.json();
        if (!cancelled && json.success) {
          printersRef.current = json.data || [];
        }
      } catch {
        // silent — will retry on next job
      }
    };

    loadPrinters();
    const refreshTimer = setInterval(loadPrinters, 60_000);

    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (!socket || !isElectronDesktop()) return undefined;

    const findPrinter = (target, printerId) =>
      pickNetworkPrinter(printersRef.current, {
        printerId,
        printerTarget: target,
      });

    const sendToPrinter = async (printer, dataBase64) => {
      return window.electronPOS.printRaw({
        host: printer.host,
        port: printer.port,
        dataBase64,
      });
    };

    const claimJob = async (jobId) => {
      try {
        const res = await employeeFetch(`/api/sales/print-jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "claim" }),
        });
        const json = await res.json();
        return !!json?.data?.claimed;
      } catch {
        return false;
      }
    };

    const processJob = async (payload) => {
      const jobId = payload?.printJobId;
      if (!jobId || processingRef.current.has(jobId)) return;

      if (
        payload?.connectionType &&
        String(payload.connectionType).toUpperCase() === "USB"
      ) {
        return;
      }

      processingRef.current.add(jobId);

      try {
        try {
          const res = await employeeFetch("/api/sales/printers");
          const json = await res.json();
          if (json.success) printersRef.current = json.data || [];
        } catch {
          // keep cached list if refresh fails
        }

        const printer = findPrinter(
          payload?.printerTarget,
          payload?.printerId,
        );
        if (!printer) {
          return;
        }

        const claimed = await claimJob(jobId);
        if (!claimed) {
          return;
        }

        const detailRes = await employeeFetch(`/api/sales/print-jobs/${jobId}`);
        const detailJson = await detailRes.json();
        if (!detailJson.success) {
          throw new Error(detailJson.message || "Failed to load print job");
        }

        const { job, order, kotItems, restaurant, serverName, guestCount } =
          detailJson.data;

        if (job?.status && job.status !== "PRINTING" && job.status !== "QUEUED") {
          return;
        }

        const dataBase64 = buildTicketFromJob({
          job,
          order,
          kotItems,
          restaurantName: restaurant?.name || job?.metadata?.restaurantName,
          restaurantDetails: restaurant || null,
          serverName,
          guestCount,
        });

        const printResult = await sendToPrinter(printer, dataBase64);

        await employeeFetch(`/api/sales/print-jobs/${jobId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            success: !!printResult?.success,
            errorMessage: printResult?.error,
          }),
        });

        if (!printResult?.success) {
          toast.error(printResult?.error || `Print failed (${printer.name})`);
        }
      } catch (err) {
        try {
          await employeeFetch(`/api/sales/print-jobs/${jobId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: false,
              errorMessage: err?.message || "Electron print agent error",
            }),
          });
        } catch {
          // ignore secondary failure
        }
        toast.error(err?.message || "Auto print failed");
      } finally {
        processingRef.current.delete(jobId);
      }
    };

    const drainQueuedJobs = async () => {
      if (drainingRef.current) return;
      drainingRef.current = true;
      try {
        try {
          const res = await employeeFetch("/api/sales/printers");
          const json = await res.json();
          if (json.success) printersRef.current = json.data || [];
        } catch {
          // keep cache
        }

        const hasNetwork = (printersRef.current || []).some((p) =>
          isNetworkPrinter(p),
        );
        if (!hasNetwork) return;

        const listRes = await employeeFetch(
          "/api/sales/print-jobs?status=QUEUED&limit=20&stats=0",
        );
        const listJson = await listRes.json();
        const jobs = listJson?.data || [];
        for (const job of jobs) {
          const jobId = String(job._id);
          if (processingRef.current.has(jobId)) continue;
          const printer = findPrinter(job.printerTarget, job.printerId);
          if (!printer) continue;
          await processJob({
            printJobId: jobId,
            printType: job.printType,
            printerTarget: job.printerTarget,
            printerId: job.printerId,
            status: "QUEUED",
          });
        }
      } catch (err) {
        console.warn("[ElectronPrintAgent] drain failed:", err);
      } finally {
        drainingRef.current = false;
      }
    };

    const handleTest = async (payload) => {
      if (payload?.connectionType && !isNetworkPrinter(payload)) {
        return;
      }

      const printer =
        pickNetworkPrinter(printersRef.current, {
          printerId: payload?.printerId,
          printerTarget: payload?.target,
        }) ||
        (payload?.host ? payload : null);

      if (!isNetworkPrinter(printer) || !printer?.host) {
        return;
      }

      const dataBase64 = buildTestTicket({
        name: printer.name || payload?.name,
        target: printer.target || payload?.target,
        host: printer.host,
        port: printer.port || payload?.port || 9100,
        connectionType: printer.connectionType || "LAN",
      });

      const result = await sendToPrinter(printer, dataBase64);
      if (result?.success) {
        toast.success(`Test print sent to ${printer.name}`);
      } else {
        toast.error(result?.error || "Test print failed");
      }
    };

    const onNewJob = (payload) => {
      if (payload?.status && payload.status !== "QUEUED") return;
      processJob(payload);
    };

    const handleProbe = async (payload) => {
      if (payload?.connectionType && !isNetworkPrinter(payload)) {
        return;
      }

      const printerId = payload?.printerId;
      if (!printerId || !canProbePrinter()) return;

      const probeKey = payload?.requestId || printerId;
      if (probingRef.current.has(probeKey)) return;
      probingRef.current.add(probeKey);

      try {
        const cached = printersRef.current.find(
          (p) => String(p._id) === String(printerId),
        );
        const host = payload?.host || cached?.host;
        const port = payload?.port || cached?.port || 9100;

        if (!host) {
          await employeeFetch(`/api/admin/printers/${printerId}/probe-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reachable: false,
              error: "No host configured for probe",
              source: "electron",
              requestId: payload?.requestId,
            }),
          });
          return;
        }

        const result = await window.electronPOS.probePrinter({ host, port });
        await employeeFetch(`/api/admin/printers/${printerId}/probe-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reachable: !!result?.success,
            error: result?.error,
            source: "electron",
            requestId: payload?.requestId,
          }),
        });
        if (result?.success) {
          void drainQueuedJobs();
        }
      } catch (err) {
        try {
          await employeeFetch(`/api/admin/printers/${printerId}/probe-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reachable: false,
              error: err?.message || "Electron probe failed",
              source: "electron",
              requestId: payload?.requestId,
            }),
          });
        } catch {
          // ignore
        }
      } finally {
        probingRef.current.delete(probeKey);
      }
    };

    const probeAllLocal = async () => {
      if (!canProbePrinter()) return;
      const network = (printersRef.current || []).filter((p) =>
        isNetworkPrinter(p),
      );
      for (const printer of network) {
        const printerId = String(printer._id);
        if (probingRef.current.has(printerId)) continue;
        probingRef.current.add(printerId);
        try {
          const result = await window.electronPOS.probePrinter({
            host: printer.host,
            port: printer.port || 9100,
          });
          if (result?.success) {
            void drainQueuedJobs();
          }
        } catch {
          // local health only
        } finally {
          probingRef.current.delete(printerId);
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void (async () => {
          await probeAllLocal();
          await drainQueuedJobs();
        })();
      }
    };

    socket.on("NEW_PRINT_JOB", onNewJob);
    socket.on("PRINTER_TEST", handleTest);
    socket.on("PRINTER_PROBE", handleProbe);
    socket.on("connect", drainQueuedJobs);
    document.addEventListener("visibilitychange", onVisibility);

    void drainQueuedJobs();
    void probeAllLocal();
    const healthTimer = setInterval(() => {
      void probeAllLocal();
    }, HEALTH_INTERVAL_MS);

    return () => {
      socket.off("NEW_PRINT_JOB", onNewJob);
      socket.off("PRINTER_TEST", handleTest);
      socket.off("PRINTER_PROBE", handleProbe);
      socket.off("connect", drainQueuedJobs);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(healthTimer);
    };
  }, [socket]);

  return null;
}
