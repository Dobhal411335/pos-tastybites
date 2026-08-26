"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children, restaurantId, floorId, employeeId }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect on the client side
    const socketInstance = io(window.location.origin, {
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected:", socketInstance.id);
      
      // Join relevant rooms
      if (restaurantId) socketInstance.emit("join", `restaurant:${restaurantId}`);
      if (floorId) socketInstance.emit("join", `floor:${floorId}`);
      if (employeeId) socketInstance.emit("join", `employee:${employeeId}`);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socketInstance.on("auth:force-logout", (payload) => {
      if (
        payload?.restaurantId &&
        restaurantId &&
        String(payload.restaurantId) !== String(restaurantId)
      ) {
        return;
      }
      window.location.assign("/sales/login");
    });

    // Reconnect recovery: we might want to tell listeners a reconnect happened
    // so they can refetch stale data.
    socketInstance.on("reconnect", () => {
      // Re-join rooms just in case, though socket.io handles standard rooms if using the same instance
      if (restaurantId) socketInstance.emit("join", `restaurant:${restaurantId}`);
      if (floorId) socketInstance.emit("join", `floor:${floorId}`);
      if (employeeId) socketInstance.emit("join", `employee:${employeeId}`);
      
      // Emit a local client event to trigger refetches
      window.dispatchEvent(new Event('socket:reconnect'));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [restaurantId, floorId, employeeId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
