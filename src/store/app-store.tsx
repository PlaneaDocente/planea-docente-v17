
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";

export type ActiveSection =
  | "inicio"
  | "alumnos"
  | "asistencia"
  | "planeacion"
  | "actividades"
  | "evaluaciones"
  | "evidencias"
  | "reportes"
  | "padres"
  | "configuracion"
  | "descargas"
  | "herramientas-ia"
  | "suscripcion"
  | "afiliados";

interface AppStoreState {
  activeSection: ActiveSection;
  sidebarOpen: boolean;
  currentUser: User | null;
  setActiveSection: (section: ActiveSection) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentUser: (user: User | null) => void;
}

const AppStoreContext = createContext<AppStoreState | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSectionState] = useState<ActiveSection>("inicio");
  const [sidebarOpen, setSidebarOpenState] = useState(true);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const setActiveSection = useCallback((section: ActiveSection) => {
    setActiveSectionState(section);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => !prev);
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
  }, []);

  return (
    <AppStoreContext.Provider
      value={{
        activeSection,
        sidebarOpen,
        currentUser,
        setActiveSection,
        toggleSidebar,
        setSidebarOpen,
        setCurrentUser,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreState {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return ctx;
}
