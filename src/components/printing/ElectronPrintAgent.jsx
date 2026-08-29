"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/SocketProvider";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  buildTestTicket,
  buildTicketFromJob,
} from "@/lib/printing/escpos";
import { toast } from "sonner";

function isElectronDesktop() {
  return (
    typeof window !== "undefined" &&
    window.electronPOS?.isDesktop &&
    typeof window.electronPOS?.printRaw === "function"
  );
}

/**
 * Listens for print jobs on the sales Socket.IO connection and sends
 * ESC/POS bytes to configured LAN printers via Electron IPC.
 * No-op in a normal browser.
 */
export default function ElectronPrintAgent() {
  const { socket } = useSocket();
  const printersRef = useRef([]);
  const processingRef = useRef(new Set());

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

    const findPrinter = (target) =>
      printersRef.current.find(
        (p) => p.enabled !== false && p.target === target,
      );

    const sendToPrinter = async (printer, dataBase64) => {
      return window.electronPOS.printRaw({
        host: printer.host,
        port: printer.port,
        dataBase64,
      });
    };

    const handleTest = async (payload) => {
      const printer =
        printersRef.current.find((p) => p._id === payload?.printerId) ||
        printersRef.current.find((p) => p.target === payload?.target) ||
        payload;

      if (!printer?.host) {
        toast.error("No printer configured for test print");
        return;
      }

      const dataBase64 = buildTestTicket({
        name: printer.name || payload?.name,
        target: printer.target || payload?.target,
        host: printer.host,
        port: printer.port || payload?.port || 9100,
      });

      const result = await sendToPrinter(printer, dataBase64);
      if (result?.success) {
        toast.success(`Test print sent to ${printer.name}`);
      } else {
        toast.error(result?.error || "Test print failed");
      }
    };

    const processJob = async (payload) => {
      const jobId = payload?.printJobId;
      if (!jobId || processingRef.current.has(jobId)) return;

      processingRef.current.add(jobId);

      try {
        if (!printersRef.current.length) {
          const res = await employeeFetch("/api/sales/printers");
          const json = await res.json();
          if (json.success) printersRef.current = json.data || [];
        }

        const printer = findPrinter(payload?.printerTarget);
        if (!printer) {
          await employeeFetch(`/api/sales/print-jobs/${jobId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              success: false,
              errorMessage: `No enabled printer for target ${payload?.printerTarget}`,
            }),
          });
          return;
        }

        const detailRes = await employeeFetch(`/api/sales/print-jobs/${jobId}`);
        const detailJson = await detailRes.json();
        if (!detailJson.success) {
          throw new Error(detailJson.message || "Failed to load print job");
        }

        const { job, order, kotItems, restaurant, serverName, guestCount } =
          detailJson.data;

        const dataBase64 = buildTicketFromJob({
          job,
          order,
          kotItems,
          restaurantName: restaurant?.name || job?.metadata?.restaurantName,
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

    const onNewJob = (payload) => {
      if (payload?.status && payload.status !== "QUEUED") return;
      processJob(payload);
    };

    socket.on("NEW_PRINT_JOB", onNewJob);
    socket.on("PRINTER_TEST", handleTest);

    return () => {
      socket.off("NEW_PRINT_JOB", onNewJob);
      socket.off("PRINTER_TEST", handleTest);
    };
  }, [socket]);

  return null;
}
