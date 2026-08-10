"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Check,
  CheckCheck,
  Loader2,
  ShoppingCart,
  CreditCard,
  Grid2X2,
  Users,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getNotificationSoundEnabled,
  setNotificationSoundEnabled,
  unlockNotificationAudio,
  isNotificationAudioUnlocked,
} from "@/lib/notifications/notificationSound";
import { employeeFetch } from "@/lib/employeeFetch";
import {
  notificationMetaLine,
  notificationMessageLine,
  notificationTimeLabel,
} from "@/lib/notifications/displayHelpers";

const FILTERS = [
  "All",
  "Unread",
  "Orders",
  "Payments",
  "Tables",
  "Employees",
  "System",
];

const CAT_ICON = {
  Orders: ShoppingCart,
  Payments: CreditCard,
  Tables: Grid2X2,
  Employees: Users,
  System: ShieldCheck,
};

function relativeTime(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString();
}

function hrefFor(n) {
  if (n.tableSessionId) return `/sales/orders/${n.tableSessionId}`;
  if (n.printJobId) return `/sales/print-jobs/${n.printJobId}`;
  if (n.type?.startsWith("TABLE")) return "/sales/floor";
  if (n.type === "EMPLOYEE_LOGIN" || n.type === "EMPLOYEE_LOGOUT") return null;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");
  const [filter, setFilter] = useState("All");
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const seenRef = useRef(new Set());

  useEffect(() => {
    setSoundOn(getNotificationSoundEnabled());
  }, []);

  const fetchPage = useCallback(
    async (pageNum = 1, { append = false } = {}) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const apiFilter = filter === "Unread" ? "UNREAD" : filter === "All" ? "ALL" : filter;
        const res = await employeeFetch(
          `/api/sales/notifications?filter=${encodeURIComponent(apiFilter)}&page=${pageNum}&limit=30`
        );
        const json = await res.json();
        if (!json.success) {
          toast.error(json.message || "Failed to load notifications");
          return;
        }
        const nextItems = (json.data.items || []).map((n) => ({
          ...n,
          id: String(n.id || n._id),
        }));
        setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
        setUnreadCount(json.data.unreadCount || 0);
        setHasMore(!!json.data.hasMore);
        setPage(pageNum);
        nextItems.forEach((n) => seenRef.current.add(n.id));
      } catch {
        toast.error("Failed to load notifications");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  useEffect(() => {
    const onReconnect = () => fetchPage(1);
    window.addEventListener("socket:reconnect", onReconnect);
    return () => window.removeEventListener("socket:reconnect", onReconnect);
  }, [fetchPage]);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload) => {
      const id = String(payload.id || payload._id);
      if (seenRef.current.has(id)) return;
      if (
        payload.recipientScope === "USER" &&
        payload.recipientId &&
        currentUserId &&
        String(payload.recipientId) !== currentUserId
      ) {
        return;
      }
      seenRef.current.add(id);
      setItems((prev) => {
        if (prev.some((n) => n.id === id)) return prev;
        return [{ ...payload, id, isRead: false }, ...prev];
      });
      setUnreadCount((c) => c + 1);
      // Sound is handled only by NotificationBell in the top nav to avoid double play
    };

    const onRead = (payload) => {
      if (currentUserId && payload?.userId && String(payload.userId) !== currentUserId) {
        return;
      }
      const id = String(payload?.id || "");
      if (!id) return;
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    };

    const onReadAll = (payload) => {
      if (currentUserId && payload?.userId && String(payload.userId) !== currentUserId) {
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };

    socket.on("notification.created", onCreated);
    socket.on("notification.read", onRead);
    socket.on("notification.read_all", onReadAll);
    return () => {
      socket.off("notification.created", onCreated);
      socket.off("notification.read", onRead);
      socket.off("notification.read_all", onReadAll);
    };
  }, [socket, currentUserId]);

  const markRead = async (n) => {
    if (n.isRead) {
      const href = hrefFor(n);
      if (href) router.push(href);
      return;
    }
    try {
      await employeeFetch(`/api/sales/notifications/${n.id}`, { method: "PATCH" });
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* ignore */
    }
    const href = hrefFor(n);
    if (href) router.push(href);
  };

  const markAll = async () => {
    try {
      const res = await employeeFetch("/api/sales/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("All marked as read");
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    setNotificationSoundEnabled(next);
    if (next) {
      const ok = await unlockNotificationAudio({ playPreview: true });
      if (ok) {
        toast.success("Notification sound enabled");
      } else {
        toast.message("Sound enabled — tap Sound again if you do not hear the bell");
      }
    } else {
      toast.message("Notification sound off");
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-zinc-50 p-4 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/sales/floor")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-orange-500" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white border-0 text-[10px]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">Today only · resets at midnight</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className="h-9 text-xs"
            >
              {soundOn ? (
                <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 mr-1.5" />
              )}
              Sound {soundOn ? "ON" : "OFF"}
              {soundOn && !isNotificationAudioUnlocked() ? " · tap" : ""}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAll}
                className="h-9 text-xs"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-zinc-200 text-zinc-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">
              No notifications today
              {filter !== "All" ? ` in ${filter}` : ""}.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((n) => {
                const Icon = CAT_ICON[n.category] || BellRing;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markRead(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-zinc-50 transition-colors border-l-4 ${
                        !n.isRead
                          ? "border-orange-500 bg-orange-50/30"
                          : "border-transparent"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-zinc-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm ${
                              !n.isRead
                                ? "font-semibold text-zinc-900"
                                : "font-medium text-zinc-800"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-zinc-500 shrink-0">
                            {notificationTimeLabel(n) || relativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {notificationMetaLine(n)}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                          {notificationMessageLine(n)}
                        </p>
                      </div>
                      {!n.isRead ? (
                        <span className="h-2 w-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-zinc-300 mt-1.5 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => fetchPage(page + 1, { append: true })}
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
