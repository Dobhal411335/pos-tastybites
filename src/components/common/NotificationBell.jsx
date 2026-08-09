"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  ShoppingCart,
  Users,
  ChefHat,
  CreditCard,
  ShieldCheck,
  Grid2X2,
  ArrowRight,
  CheckCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSocket } from "@/components/providers/SocketProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getNotificationSoundEnabled,
  setNotificationSoundEnabled,
  unlockNotificationAudio,
  isNotificationAudioUnlocked,
  playNotificationSound,
} from "@/lib/notifications/notificationSound";

const TYPE_ICONS = {
  Orders: ShoppingCart,
  Payments: CreditCard,
  Tables: Grid2X2,
  Employees: Users,
  System: ShieldCheck,
  Kitchen: ChefHat,
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

function notificationHref(n) {
  if (n.tableSessionId) return `/sales/orders/${n.tableSessionId}`;
  if (n.printJobId) return `/sales/print-jobs/${n.printJobId}`;
  if (n.type?.startsWith("TABLE")) return "/sales/floor";
  return "/sales/notifications";
}

export default function NotificationBell({ viewAllHref = "/sales/notifications" }) {
  const router = useRouter();
  const { socket } = useSocket();
  const { user } = useAuth();
  const currentUserId = String(user?._id || user?.id || "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [soundOn, setSoundOn] = useState(() => getNotificationSoundEnabled());
  const [audioUnlocked, setAudioUnlocked] = useState(() => isNotificationAudioUnlocked());
  const seenIdsRef = useRef(new Set());
  const didFetchRef = useRef(false);

  const mergeIncoming = useCallback((incoming, { playSound = true } = {}) => {
    const id = String(incoming.id || incoming._id);
    if (!id || seenIdsRef.current.has(id)) return;

    if (
      incoming.recipientScope === "USER" &&
      incoming.recipientId &&
      currentUserId &&
      String(incoming.recipientId) !== currentUserId
    ) {
      return;
    }

    seenIdsRef.current.add(id);
    setNotifications((prev) => {
      if (prev.some((n) => String(n.id || n._id) === id)) return prev;
      return [{ ...incoming, id, isRead: !!incoming.isRead }, ...prev].slice(0, 50);
    });

    if (!incoming.isRead) {
      setUnreadCount((c) => c + 1);
    }

    if (playSound) {
      playNotificationSound(incoming);
      if (incoming.priority === "high" || incoming.playSound) {
        toast.message(incoming.title, { description: incoming.message });
      }
    }
  }, [currentUserId]);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/sales/notifications?limit=40&filter=ALL");
      const json = await res.json();
      if (!json.success) return;

      const items = (json.data.items || []).map((n) => ({
        ...n,
        id: String(n.id || n._id),
      }));
      setNotifications(items);
      setUnreadCount(json.data.unreadCount || 0);
      items.forEach((n) => seenIdsRef.current.add(String(n.id)));
    } catch {
      // keep existing state
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const onReconnect = () => fetchNotifications({ silent: true });
    window.addEventListener("socket:reconnect", onReconnect);
    return () => window.removeEventListener("socket:reconnect", onReconnect);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload) => mergeIncoming(payload, { playSound: true });

    const onRead = (payload) => {
      if (currentUserId && payload?.userId && String(payload.userId) !== currentUserId) {
        return;
      }
      const id = String(payload?.id || "");
      if (!id) return;
      setNotifications((prev) =>
        prev.map((n) =>
          String(n.id) === id ? { ...n, isRead: true, readAt: payload.readAt } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    };

    const onReadAll = (payload) => {
      if (currentUserId && payload?.userId && String(payload.userId) !== currentUserId) {
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
  }, [socket, mergeIncoming, currentUserId]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/sales/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleOpenNotification = async (n) => {
    if (!n.isRead) {
      try {
        await fetch(`/api/sales/notifications/${n.id}`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    setIsOpen(false);
    router.push(notificationHref(n));
  };

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    setNotificationSoundEnabled(next);
    if (next) {
      const ok = await unlockNotificationAudio();
      setAudioUnlocked(ok);
      if (ok) {
        playNotificationSound({
          id: `unlock-${Date.now()}`,
          playSound: true,
          priority: "high",
        });
        toast.success("Notification sound enabled");
      } else {
        toast.message("Tap again after interacting with the page to unlock sound");
      }
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const cat = n.category || "System";
      const matchesTab =
        activeTab === "All" ||
        (activeTab === "Unread" && !n.isRead) ||
        cat === activeTab ||
        (activeTab === "Orders" && cat === "Orders");
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        String(n.metadata?.orderNumber || "").includes(q);
      return matchesTab && matchesSearch;
    });
  }, [notifications, activeTab, searchQuery]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl border border-stone-200 bg-white hover:bg-stone-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-zinc-700" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {badgeLabel}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(100vw-1.5rem,400px)] max-h-[520px] p-0 rounded-2xl border-stone-200 shadow-md bg-white flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-stone-100 text-zinc-600 text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-8 px-2 text-xs text-zinc-600"
              title={
                soundOn
                  ? audioUnlocked
                    ? "Sound on"
                    : "Sound on — tap to unlock audio"
                  : "Sound off"
              }
            >
              {soundOn ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span className="ml-1 hidden sm:inline">{soundOn ? "ON" : "OFF"}</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-zinc-600 h-8 px-2 text-xs"
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Read all
              </Button>
            )}
          </div>
        </div>

        <Separator />

        <div className="p-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 bg-stone-50 border-transparent h-9 text-sm rounded-lg"
            />
          </div>
        </div>

        <div className="px-2.5 pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <ScrollArea className="w-full whitespace-nowrap" type="scroll">
              <TabsList className="bg-transparent h-8 p-0 gap-1 flex">
                {["All", "Unread", "Orders", "Payments", "Tables", "System"].map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium data-[state=active]:bg-zinc-900 data-[state=active]:text-white text-zinc-500 bg-stone-100"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>

        <Separator />

        <ScrollArea className="flex-1 max-h-[280px]">
          {loading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="h-6 w-6 text-zinc-400 mb-2" />
              <p className="text-sm font-medium text-zinc-900">No notifications</p>
              <p className="text-xs text-zinc-500">You&apos;re all caught up.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((n) => {
                const Icon = TYPE_ICONS[n.category] || Bell;
                const metaBits = [
                  n.metadata?.orderNumber ? `Order #${n.metadata.orderNumber}` : null,
                  n.metadata?.tableNo ? `Table ${n.metadata.tableNo}` : null,
                ].filter(Boolean);
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className={`group relative flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-stone-50 transition-colors border-l-4 w-full ${
                      !n.isRead
                        ? "border-orange-500 bg-orange-50/40"
                        : "border-transparent"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 border border-stone-200">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0 pr-4">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-xs ${
                            !n.isRead
                              ? "font-semibold text-zinc-900"
                              : "font-medium text-zinc-800"
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {relativeTime(n.createdAt)}
                        </span>
                      </div>
                      {metaBits.length > 0 && (
                        <p className="text-[11px] font-medium text-zinc-600 truncate">
                          {metaBits.join(" • ")}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-500 leading-snug line-clamp-2">
                        {n.message}
                        {n.metadata?.actorName
                          ? ` · ${n.metadata.actorName}`
                          : ""}
                      </p>
                    </div>
                    {!n.isRead && (
                      <div className="absolute right-3 top-3.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-stone-200 p-2 bg-stone-50">
          <Button
            asChild
            variant="ghost"
            className="w-full text-xs font-medium text-zinc-900 hover:bg-stone-200 h-9"
          >
            <Link href={viewAllHref} onClick={() => setIsOpen(false)}>
              View All Notifications
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
