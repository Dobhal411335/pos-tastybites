"use client";

import React, { createContext, useContext } from "react";

const AuthContext = createContext({ user: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ user, children }) => {
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};
