"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Search,
  ShoppingCart,
  Users,
  ChefHat,
  Package,
  CalendarDays,
  TicketPercent,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Check,
  CheckCheck
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const INITIAL_NOTIFICATIONS = [
  {
    id: "1",
    type: "Order",
    title: "New Order",
    description: "Table 14 placed a new order.",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "Inventory",
    title: "Inventory Alert",
    description: "Chicken Stock below threshold.",
    time: "8 minutes ago",
    read: false,
  },
  {
    id: "3",
    type: "Staff",
    title: "Staff Login",
    description: "John Smith started his shift.",
    time: "14 minutes ago",
    read: true,
  },
  {
    id: "4",
    type: "Kitchen",
    title: "Kitchen Ready",
    description: "Order #245 is ready.",
    time: "25 minutes ago",
    read: true,
  },
  {
    id: "5",
    type: "System",
    title: "Restaurant Closed",
    description: "Automatic holiday closure enabled.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "6",
    type: "Payment",
    title: "Payment Failed",
    description: "Card declined for Order #241.",
    time: "Yesterday",
    read: true,
  }
];

const TYPE_ICONS = {
  Order: ShoppingCart,
  Staff: Users,
  Kitchen: ChefHat,
  Inventory: Package,
  Reservation: CalendarDays,
  Coupon: TicketPercent,
  Payment: CreditCard,
  System: ShieldCheck,
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      setLoading(true);
      const timer = setTimeout(() => {
        setNotifications(INITIAL_NOTIFICATIONS);
        setLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, notifications.length]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchesTab = activeTab === "All" || n.type === activeTab;
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-12 w-12 rounded-xl border border-stone-200 bg-white hover:bg-stone-100"
        >
          <Bell className="h-6 w-6 text-zinc-700" />

          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[420px] max-h-[520px] p-0 rounded-[16px] border-[#E7E5E4] shadow-sm bg-[#FFFFFF] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-[#18181B]">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-[#F7F6F3] text-[#71717A] text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-[#71717A] hover:text-[#18181B] h-8 px-2 text-xs font-medium"
            >
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Mark all as read
            </Button>
          )}
        </div>

        <Separator className="bg-[#E7E5E4]" />

        {/* Search */}
        <div className="p-3 bg-[#FFFFFF]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#71717A]" />
            <Input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#F7F6F3] border-transparent focus-visible:ring-1 focus-visible:ring-[#F97316] h-9 text-sm rounded-lg"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-3 pb-2 bg-[#FFFFFF]">
          <Tabs defaultValue="All" value={activeTab} onValueChange={setActiveTab}>
            <ScrollArea className="w-full whitespace-nowrap" type="scroll">
              <TabsList className="bg-transparent h-8 p-0 gap-1 flex">
                {["All", "Orders", "Staff", "Inventory", "System", "Kitchen"].map((tab) => {
                  const mappedTab = tab === "Orders" ? "Order" : tab;
                  return (
                    <TabsTrigger
                      key={tab}
                      value={mappedTab}
                      className="rounded-full px-3 py-1 text-xs font-medium data-[state=active]:bg-[#18181B] data-[state=active]:text-white text-[#71717A] bg-[#F7F6F3] hover:text-[#18181B]"
                    >
                      {tab}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </ScrollArea>
          </Tabs>
        </div>

        <Separator className="bg-[#E7E5E4]" />

        {/* Body */}
        <ScrollArea className="flex-1 bg-[#FFFFFF] max-h-[280px]">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-[#F7F6F3] flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-[#71717A]" />
              </div>
              <p className="text-[15px] font-medium text-[#18181B] mb-1">No notifications</p>
              <p className="text-sm text-[#71717A]">You&apos;re all caught up.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleMarkRead(notification.id)}
                    className={`group relative flex items-start gap-3 p-4 hover:bg-[#F7F6F3] cursor-pointer transition-colors border-l-4 ${!notification.read ? "border-[#F97316] bg-orange-50/30" : "border-transparent"
                      }`}
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7F6F3] border border-[#E7E5E4] text-[#18181B]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 pr-6">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${!notification.read ? 'font-semibold text-[#18181B]' : 'font-medium text-[#18181B]'}`}>
                          {notification.title}
                        </span>
                        <span className="text-[11px] font-medium text-[#71717A]">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] leading-relaxed">
                        {notification.description}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="absolute right-4 top-5 h-2 w-2 rounded-full bg-[#F97316]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[#E7E5E4] p-2 bg-[#F7F6F3]">
          <Button variant="ghost" className="w-full text-sm font-medium text-[#18181B] hover:bg-[#E7E5E4] h-9">
            View All Notifications
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
