"use client";

import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useRef, useCallback, useEffect } from "react";

// ============================================================
// TIPOS — PlaneaDocente V17 NEM
// ============================================================

export type PlanType = "gratuito" | "basico" | "profesional" | "institucional";

export interface SubscriptionData {
  id?: string;
  plan_id: PlanType;
  estado: "active" | "trialing" | "canceled" | "past_due" | "inactive";
  fecha_inicio?: string;
  fecha_fin?: string;
  fecha_prueba_fin?: string;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
  cancelar_al_periodo_fin?: boolean;
  plan_nombre?: string;
  plan_descripcion?: string;
  plan_precio_mensual?: number;
  plan_precio_anual?: number;
  plan_limites?: Record<string, number>;
}

export interface AppState {
  user: User | null;
  currentUser: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  subscription: SubscriptionData | null;
  isRefreshingSubscription: boolean;
  subscriptionError: string | null;
  currentPlan: PlanType;
  sidebarOpen: boolean;
  activeSection: string;

  setUser: (user: User | null, session: Session | null) => void;
  setCurrentUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  logout: () => Promise<void>;
  setSubscription: (sub: SubscriptionData | null) => void;
  refreshSubscription: () => Promise<void>;
  clearSubscriptionError: () => void;
  canUseFeature: (feature: string) => boolean;
  getPlanDisplayName: () => string;
  isTrial: () => boolean;
  isPro: () => boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveSection: (section: string) => void;
}

// ============================================================
// NORMALIZACIÓN DE TEXTO — NEM compatible
// ============================================================

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ============================================================
// LÍMITES POR PLAN — Nueva Escuela Mexicana
// ============================================================

const PLAN_LIMITS: Record<PlanType, Record<string, number | boolean>> = {
  gratuito: {
    alumnos: 30, grupos: 3, planeaciones: 5, evaluaciones: 5,
    evidencias_mb: 50, reportes: false, asistencia_avanzada: false,
    padres_app: false, ia_educativa: false, exportar_pdf: false, soporte: false,
  },
  basico: {
    alumnos: 100, grupos: 10, planeaciones: 50, evaluaciones: 50,
    evidencias_mb: 500, reportes: true, asistencia_avanzada: true,
    padres_app: true, ia_educativa: false, exportar_pdf: true, soporte: true,
  },
  profesional: {
    alumnos: 500, grupos: 50, planeaciones: 9999, evaluaciones: 9999,
    evidencias_mb: 2048, reportes: true, asistencia_avanzada: true,
    padres_app: true, ia_educativa: true, exportar_pdf: true, soporte: true,
  },
  institucional: {
    alumnos: 99999, grupos: 99999, planeaciones: 99999, evaluaciones: 99999,
    evidencias_mb: 10240, reportes: true, asistencia_avanzada: true,
    padres_app: true, ia_educativa: true, exportar_pdf: true, soporte: true,
  },
};

const PLAN_NAMES: Record<PlanType, string> = {
  gratuito: "Plan Gratuito",
  basico: "Plan Básico",
  profesional: "Plan Profesional",
  institucional: "Plan Institucional",
};

// ============================================================
// STORE ZUSTAND
// ============================================================

export const useAppStore = create<AppState>()(
  persist(
    (set: (fn: (state: AppState) => Partial<AppState>) => void, get: () => AppState) => ({
      user: null,
      currentUser: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      subscription: null,
      isRefreshingSubscription: false,
      subscriptionError: null,
      currentPlan: "gratuito",
      sidebarOpen: true,
      activeSection: "dashboard",

      setUser: (user: User | null, session: Session | null) => {
        set((state: AppState) => ({
          ...state, user, currentUser: user, session,
          isAuthenticated: !!user, isLoading: false,
        }));
      },

      setCurrentUser: (user: User | null) => {
        set((state: AppState) => ({
          ...state, currentUser: user, user,
          isAuthenticated: !!user,
        }));
      },

      setSession: (session: Session | null) => {
        set((state: AppState) => ({ ...state, session }));
      },

      logout: async () => {
        try { await supabase.auth.signOut(); } catch (e: any) {}
        set((state: AppState) => ({
          ...state, user: null, currentUser: null, session: null,
          isAuthenticated: false, subscription: null,
          currentPlan: "gratuito", isLoading: false,
        }));
        if (typeof window !== "undefined") {
          localStorage.removeItem("pd_auth_refreshing");
          localStorage.removeItem("pd_auth_refresh_timeout");
        }
      },

      setSubscription: (sub: SubscriptionData | null) => {
        const plan: PlanType = (sub?.plan_id as PlanType) || "gratuito";
        set((state: AppState) => ({
          ...state, subscription: sub, currentPlan: plan, subscriptionError: null,
        }));
      },

      clearSubscriptionError: () => {
        set((state: AppState) => ({ ...state, subscriptionError: null }));
      },

      refreshSubscription: async () => {
        const state = get();

        if (!state.session?.access_token) {
          console.log("[AppStore] No hay token");
          set((s: AppState) => ({ ...s, currentPlan: "gratuito", subscription: null }));
          return;
        }

        // Anti-atasco
        if (typeof window !== "undefined") {
          const isRefreshing = localStorage.getItem("pd_auth_refreshing");
          const timeoutStr = localStorage.getItem("pd_auth_refresh_timeout");
          if (isRefreshing === "1" && timeoutStr) {
            const timeout = parseInt(timeoutStr, 10);
            if (Date.now() - timeout < 10000) {
              console.log("[AppStore] Refresh en progreso, skipping...");
              return;
            }
            localStorage.removeItem("pd_auth_refreshing");
            localStorage.removeItem("pd_auth_refresh_timeout");
          }
          localStorage.setItem("pd_auth_refreshing", "1");
          localStorage.setItem("pd_auth_refresh_timeout", Date.now().toString());
        }

        set((s: AppState) => ({ ...s, isRefreshingSubscription: true, subscriptionError: null }));

        try {
          const token = state.session.access_token;
          console.log("[AppStore] Fetching subscription via API...");

          const res = await fetch("/api/user-subscription", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "Error");
            console.error(`[AppStore] API error ${res.status}:`, errText);
            throw new Error(`API HTTP ${res.status}`);
          }

          const data = await res.json();
          console.log("[AppStore] API response:", data?.data?.subscription?.plan_id || "none");

          let subscription: SubscriptionData | null = null;

          if (data?.data?.subscription) {
            subscription = {
              ...data.data.subscription,
              plan_id: normalizeText(data.data.subscription.plan_id) as PlanType || "gratuito",
            };
          }

          // ── FALLBACK: Si API devuelve null, consultar Supabase directamente ──
          if (!subscription && state.user?.id) {
            console.log("[AppStore] Fallback: consultando Supabase directamente...");
            try {
              const { data: subData, error: subError } = await supabase
                .from("subscriptions")
                .select("id, user_id, plan_id, estado, fecha_inicio, fecha_fin, fecha_prueba_fin, stripe_subscription_id, stripe_customer_id, created_at")
                .eq("user_id", state.user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!subError && subData) {
                console.log("[AppStore] Fallback encontró suscripción directamente:", subData.plan_id);
                subscription = {
                  ...subData,
                  plan_id: normalizeText(subData.plan_id) as PlanType || "gratuito",
                };
              } else if (subError) {
                console.warn("[AppStore] Fallback error:", subError.message);
              }
            } catch (fallbackErr: any) {
              console.warn("[AppStore] Fallback exception:", fallbackErr?.message);
            }
          }

          if (subscription) {
            set((s: AppState) => ({
              ...s, subscription, currentPlan: subscription.plan_id, subscriptionError: null,
            }));
          } else {
            set((s: AppState) => ({ ...s, subscription: null, currentPlan: "gratuito", subscriptionError: null }));
          }
        } catch (err: any) {
          console.error("[AppStore] Error:", err?.message);
          set((s: AppState) => ({ ...s, subscriptionError: err?.message || "Error", subscription: null }));
        } finally {
          set((s: AppState) => ({ ...s, isRefreshingSubscription: false }));
          if (typeof window !== "undefined") {
            localStorage.removeItem("pd_auth_refreshing");
            localStorage.removeItem("pd_auth_refresh_timeout");
          }
        }
      },

      canUseFeature: (feature: string) => {
        const plan = get().currentPlan;
        const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.gratuito;
        const value = limits[feature];
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        return false;
      },

      getPlanDisplayName: () => PLAN_NAMES[get().currentPlan] || "Plan Gratuito",
      isTrial: () => get().subscription?.estado === "trialing",
      isPro: () => {
        const plan = get().currentPlan;
        return plan === "profesional" || plan === "institucional";
      },
      toggleSidebar: () => set((state: AppState) => ({ ...state, sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set((state: AppState) => ({ ...state, sidebarOpen: open })),
      setActiveSection: (section: string) => set((state: AppState) => ({ ...state, activeSection: section })),
    }),
    {
      name: "planeadocente-store-v17",
      storage: createJSONStorage(() => localStorage),
      partialize: (state: AppState) => ({
        sidebarOpen: state.sidebarOpen,
        activeSection: state.activeSection,
      }),
    }
  )
);

// ============================================================
// HOOK: useAuthInit
// ============================================================

export function useAuthInit() {
  const { setUser } = useAppStore();
  const initDoneRef = useRef(false);

  const initSession = useCallback(async () => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    try {
      console.log("[AuthInit] Iniciando...");
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthInit] Error:", error.message);
        setUser(null, null);
        return;
      }

      if (data.session?.user) {
        console.log("[AuthInit] Sesión:", data.session.user.email);
        setUser(data.session.user, data.session);
        setTimeout(() => {
          useAppStore.getState().refreshSubscription();
        }, 500);
      } else {
        console.log("[AuthInit] Sin sesión");
        setUser(null, null);
      }
    } catch (err: any) {
      console.error("[AuthInit] Error crítico:", err?.message);
      setUser(null, null);
    }
  }, [setUser]);

  useEffect(() => {
    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        console.log("[AuthInit] Evento:", event);

        if (event === "SIGNED_IN") {
          if (session?.user) {
            setUser(session.user, session);
            setTimeout(() => {
              useAppStore.getState().refreshSubscription();
            }, 300);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null, null);
        } else if (event === "TOKEN_REFRESHED") {
          if (session) {
            useAppStore.setState({ session } as Partial<AppState>);
          }
        } else if (event === "USER_UPDATED") {
          if (session?.user) setUser(session.user, session);
        }
      }
    );

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, [initSession, setUser]);
}

// ============================================================
// PROVIDER
// ============================================================

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  useAuthInit();
  return <>{children}</>;
}

// ============================================================
// HOOK: useSubscriptionRefresh
// ============================================================

export function useSubscriptionRefresh() {
  const { refreshSubscription, isRefreshingSubscription } = useAppStore();

  const forceRefresh = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pd_auth_refreshing");
      localStorage.removeItem("pd_auth_refresh_timeout");
    }
    await refreshSubscription();
  }, [refreshSubscription]);

  return { refreshSubscription: forceRefresh, isRefreshingSubscription };
}

// ============================================================
// SELECTORES
// ============================================================

export const selectUser = (state: AppState) => state.user;
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectIsLoading = (state: AppState) => state.isLoading;
export const selectSubscription = (state: AppState) => state.subscription;
export const selectCurrentPlan = (state: AppState) => state.currentPlan;
export const selectCanUseFeature = (state: AppState) => state.canUseFeature;
export const selectIsPro = (state: AppState) => state.isPro();
export const selectPlanName = (state: AppState) => state.getPlanDisplayName();

export default useAppStore;