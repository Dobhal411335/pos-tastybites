"use client";

import React from "react";
import NotificationBell from "@/components/common/NotificationBell";
import { SocketProvider } from "@/components/providers/SocketProvider";

export default function LoginNotificationBell() {
  const [restaurantId, setRestaurantId] = React.useState(null);

  React.useEffect(() => {
    fetch("/api/device/context", { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.restaurantId) {
          setRestaurantId(json.data.restaurantId);
        }
      })
      .catch(() => {});
  }, []);

  const bell = <NotificationBell showViewAll={false} />;

  if (!restaurantId) return bell;

  return <SocketProvider restaurantId={restaurantId}>{bell}</SocketProvider>;
}
