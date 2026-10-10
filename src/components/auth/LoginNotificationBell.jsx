"use client";

import React from "react";
import NotificationBell from "@/components/common/NotificationBell";
import { SocketProvider } from "@/components/providers/SocketProvider";

const LOGIN_PAGE_SUPPRESS_ALERTS = ["EMPLOYEE_LOGIN"];

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

  // Login page already shows "Welcome back" — don't also toast/sound EMPLOYEE_LOGIN here.
  const bell = (
    <NotificationBell
      showViewAll={false}
      suppressAlertTypes={LOGIN_PAGE_SUPPRESS_ALERTS}
    />
  );

  if (!restaurantId) return bell;

  return <SocketProvider restaurantId={restaurantId}>{bell}</SocketProvider>;
}
