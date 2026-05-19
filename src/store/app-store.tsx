"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

export interface SubscriptionInfo {
  id: string;
  estado: string;
  plan_id: string;
  plan_name: string | null;
  fecha_fin: string | null;
  fecha_prueba_fin: string | null;
  cancelar_al_periodo_fin: boolean;
}

interface AppStoreState {
  // ── Navegación y UI ──────────────────────────────────────────────────────
  activeSection: ActiveSection;
  sidebarOpen: boolean;

  // ── Autenticación ──────────────────────────────────────────────────────────
  currentUser: User | null;
  isAuthLoading: boolean;
  authError: string | null;

  // ── Suscripción ──────────────────────────────────────────────────────────
  subscription: SubscriptionInfo | null;
  isPremium: boolean;
  trialDaysLeft: number | null;

  // ── Setters ──────────────────────────────────────────────────────────────
  setActiveSection: (section: ActiveSection) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentUser: (user: User | null) => void;

  // ── Acciones ─────────────────────────────────────────────────────────────
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  canUseFeature: (featureName: string) => boolean;
}

const AppStoreContext = createContext<AppStoreState | null>(null);

const LS_KEY_SECTION = "pd_active_section";
const LS_KEY_SIDEBAR = "pd_sidebar_open";

// ── Helper: normalizar texto para comparaciones seguras ──────────────────
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // ── Estados de UI (con persistencia localStorage) ────────────────────────
  const [activeSection, setActiveSectionState] = useState<ActiveSection>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_KEY_SECTION) as ActiveSection | null;
      if (saved) return saved;
    }
    return "inicio";
  });

  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_KEY_SIDEBAR);
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  // ── Estados de autenticación ─────────────────────────────────────────────
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Estados de suscripción ───────────────────────────────────────────────
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Ref para evitar múltiples llamadas concurrentes a refreshSubscription
  const isRefreshingRef = useRef(false);

  // ── Persistencia de UI ───────────────────────────────────────────────────
  const setActiveSection = useCallback((section: ActiveSection) => {
    setActiveSectionState(section);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_SECTION, section);
    }
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY_SIDEBAR, String(open));
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_KEY_SIDEBAR, String(next));
      }
      return next;
    });
  }, []);

  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
  }, []);

  // ── Función interna de refresco de suscripción ───────────────────────────
  // AHORA con token JWT en header Authorization para evitar 401
  const refreshSubscriptionInternal = useCallback(async (userId: string) => {
    if (isRefreshingRef.current) {
      console.log("[AppStore] Refresh already in progress, skipping...");
      return;
    }
    isRefreshingRef.current = true;

    try {
      // Obtener token JWT de la sesión activa
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("[AppStore] Error getting session for subscription refresh:", sessionError);
        setSubscription(null);
        setIsPremium(false);
        setTrialDaysLeft(null);
        return;
      }

      const token = sessionData.session?.access_token;

      if (!token) {
        console.warn("[AppStore] No access token available, skipping subscription refresh");
        setSubscription(null);
        setIsPremium(false);
        setTrialDaysLeft(null);
        return;
      }

      const res = await fetch(`/api/user-subscription`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.warn("[AppStore] Subscription fetch failed:", json.error || `HTTP ${res.status}`);
        setSubscription(null);
        setIsPremium(false);
        setTrialDaysLeft(null);
        return;
      }

      const sub = json.data?.subscription;
      const plan = json.data?.plan;

      if (sub) {
        const info: SubscriptionInfo = {
          id: sub.id,
          estado: sub.estado,
          plan_id: sub.plan_id,
          plan_name: plan?.nombre ?? null,
          fecha_fin: sub.fecha_fin ?? null,
          fecha_prueba_fin: sub.fecha_prueba_fin ?? null,
          cancelar_al_periodo_fin: sub.cancelar_al_periodo_fin ?? false,
        };
        setSubscription(info);

        const hasAccess = ["trialing", "active", "past_due"].includes(sub.estado);
        setIsPremium(hasAccess);

        // Calcular días restantes de trial
        if (sub.estado === "trialing" && sub.fecha_prueba_fin) {
          const end = new Date(sub.fecha_prueba_fin);
          const now = new Date();
          const diffMs = end.getTime() - now.getTime();
          const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          setTrialDaysLeft(diffDays);
        } else {
          setTrialDaysLeft(null);
        }
      } else {
        setSubscription(null);
        setIsPremium(false);
        setTrialDaysLeft(null);
      }
    } catch (err) {
      console.error("[AppStore] Error refreshing subscription:", err);
      setSubscription(null);
      setIsPremium(false);
      setTrialDaysLeft(null);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // ── Carga inicial de sesión ──────────────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      setIsAuthLoading(true);
      setAuthError(null);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[AppStore] Session init error:", error);
          setAuthError(error.message);
          setIsAuthLoading(false);
          return;
        }

        if (data.session?.user) {
          setCurrentUserState(data.session.user);
          // Cargar suscripción automáticamente con token JWT
          await refreshSubscriptionInternal(data.session.user.id);
        }
      } catch (err) {
        console.error("[AppStore] Unexpected init error:", err);
        setAuthError("Error al cargar la sesión.");
      } finally {
        setIsAuthLoading(false);
      }
    };

    initSession();

    // Escuchar cambios de auth globalmente
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setCurrentUserState(session.user);
          refreshSubscriptionInternal(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setCurrentUserState(null);
          setSubscription(null);
          setIsPremium(false);
          setTrialDaysLeft(null);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Actualizar usuario y refrescar suscripción cuando el token se renueva
          setCurrentUserState(session.user);
          refreshSubscriptionInternal(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [refreshSubscriptionInternal]);

  // ── Acción pública: refrescar suscripción ─────────────────────────────────
  const refreshSubscription = useCallback(async () => {
    if (!currentUser?.id) {
      setSubscription(null);
      setIsPremium(false);
      setTrialDaysLeft(null);
      return;
    }
    await refreshSubscriptionInternal(currentUser.id);
  }, [currentUser, refreshSubscriptionInternal]);

  // ── Acción pública: logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUserState(null);
      setSubscription(null);
      setIsPremium(false);
      setTrialDaysLeft(null);
      setActiveSection("inicio");
      if (typeof window !== "undefined") {
        localStorage.removeItem(LS_KEY_SECTION);
      }
    } catch (err) {
      console.error("[AppStore] Logout error:", err);
    }
  }, [setActiveSection]);

  // ── Acción pública: verificar función por plan ────────────────────────────
  const canUseFeature = useCallback(
    (featureName: string): boolean => {
      const normalizedFeature = normalizeText(featureName);

      // Si no hay suscripción, solo funciones básicas
      if (!subscription || !isPremium) {
        const basicFeatures = ["inicio", "alumnos", "asistencia"];
        return basicFeatures.includes(normalizedFeature);
      }

      const normalizedPlan = normalizeText(subscription.plan_name);

      // Plan Profesional e Institucional tienen acceso a todo
      if (normalizedPlan.includes("profesional")) {
        return true;
      }
      if (normalizedPlan.includes("institucional")) {
        return true;
      }

      // Plan Básico: funciones limitadas
      if (normalizedPlan.includes("basico")) {
        const basicFeatures = [
          "inicio",
          "alumnos",
          "asistencia",
          "planeacion",
          "actividades",
          "evaluaciones",
        ];
        return basicFeatures.includes(normalizedFeature);
      }

      // Fallback: permitir si está en trial o active
      return true;
    },
    [subscription, isPremium]
  );

  return (
    <AppStoreContext.Provider
      value={{
        activeSection,
        sidebarOpen,
        currentUser,
        isAuthLoading,
        authError,
        subscription,
        isPremium,
        trialDaysLeft,
        setActiveSection,
        toggleSidebar,
        setSidebarOpen,
        setCurrentUser,
        logout,
        refreshSubscription,
        canUseFeature,
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
