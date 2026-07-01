"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════════════ */
export type PlanType = "gratuito" | "basico" | "profesional" | "institucional";

export interface SubscriptionData {
  id?: string;
  plan_id: PlanType;
  estado: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  fecha_prueba_fin?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  cancelar_al_periodo_fin?: boolean;
}

export interface AppState {
  /* Auth */
  user: User | null;
  session: Session | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  /* UI / Navegación */
  activeSection: string;
  sidebarOpen: boolean;

  /* Subscription */
  currentPlan: PlanType;
  subscription: SubscriptionData | null;
  subscriptionError: string | null;
  isRefreshingSubscription: boolean;

  /* Actions */
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setCurrentUser: (user: User | null) => void;
  setActiveSection: (section: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpenFn: (open: boolean) => void; // alias para compatibilidad
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  initSession: () => Promise<void>;

  /* Helpers */
  getPlanDisplayName: () => string;
  isPro: () => boolean;
  isTrial: () => boolean;
  canUseFeature: (featurePlan: PlanType) => boolean;
}

/* ═══════════════════════════════════════════════════════════
   PLAN LIMITS (NEM Compatible)
   ═══════════════════════════════════════════════════════════ */
export const PLAN_LIMITS: Record<PlanType, { maxAlumnos: number; maxGrupos: number; iaGeneraciones: number; label: string }> = {
  gratuito: { maxAlumnos: 15, maxGrupos: 1, iaGeneraciones: 5, label: "Gratuito" },
  basico:   { maxAlumnos: 35, maxGrupos: 3, iaGeneraciones: 50, label: "Básico" },
  profesional: { maxAlumnos: 9999, maxGrupos: 10, iaGeneraciones: 500, label: "Profesional" },
  institucional: { maxAlumnos: 99999, maxGrupos: 999, iaGeneraciones: 9999, label: "Institucional" },
};

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/* ═══════════════════════════════════════════════════════════
   STORE
   ═══════════════════════════════════════════════════════════ */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      /* Estado inicial */
      user: null,
      session: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: true,
      authError: null,
      activeSection: "inicio",
      sidebarOpen: true,
      currentPlan: "gratuito",
      subscription: null,
      subscriptionError: null,
      isRefreshingSubscription: false,

      /* ── Auth ── */
      setUser: (user: User | null) => {
        set({ user, currentUser: user, isAuthenticated: !!user });
      },

      setSession: (session: Session | null) => {
        set({ session });
      },

      setCurrentUser: (user: User | null) => {
        set({ currentUser: user, user, isAuthenticated: !!user });
      },

      /* ── UI / Navegación ── */
      setActiveSection: (section: string) => {
        console.log("[AppStore] Navegando a:", section);
        set({ activeSection: section });
        // Emitir evento para que el layout escuche
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("navigate", { detail: section }));
        }
      },

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setSidebarOpenFn: (open: boolean) => set({ sidebarOpen: open }), // alias
      toggleSidebar: () => set((state: AppState) => ({ sidebarOpen: !state.sidebarOpen })),

      /* ── Logout ── */
      logout: async () => {
        await supabase.auth.signOut();
        set({
          user: null, session: null, currentUser: null,
          isAuthenticated: false, currentPlan: "gratuito",
          subscription: null, authError: null, activeSection: "inicio",
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem("pd_auth_refreshing");
          localStorage.removeItem("pd_auth_refresh_timeout");
        }
      },

      /* ── Init Session ── */
      initSession: async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (data.session) {
            set({
              session: data.session, user: data.session.user,
              currentUser: data.session.user, isAuthenticated: true, isLoading: false,
            });
            // Refrescar suscripción en background
            setTimeout(() => get().refreshSubscription(), 500);
          } else {
            set({ isLoading: false });
          }
        } catch (err: any) {
          console.error("[AppStore] initSession error:", err?.message);
          set({ isLoading: false, authError: err?.message || "Error de autenticación" });
        }
      },

      /* ── Refresh Subscription (ANTI-ATASCO DEFINITIVO) ── */
      refreshSubscription: async () => {
        const state = get();
        const token = state.session?.access_token;

        if (!token) {
          set({ currentPlan: "gratuito", subscription: null, isRefreshingSubscription: false });
          return;
        }

        // Anti-atasco: si ya está en progreso, no repetir
        if (state.isRefreshingSubscription) {
          console.log("[AppStore] Refresh ya en progreso, skipping");
          return;
        }

        set({ isRefreshingSubscription: true, subscriptionError: null });

        // Timeout de seguridad: SIEMPRE liberar después de 14s
        const safetyTimeout = setTimeout(() => {
          console.warn("[AppStore] Safety timeout: liberando lock");
          set({ isRefreshingSubscription: false });
        }, 14000);

        // Respaldo confiable: lee el plan directo de la BD (subscriptions → profiles)
        const resolverPlanDesdeBD = async () => {
          const uid = state.user?.id;
          if (!uid) return;
          try {
            const { data: sub } = await supabase
              .from("subscriptions")
              .select("plan_id, estado")
              .eq("user_id", uid)
              .in("estado", ["active", "trialing"])
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (sub?.plan_id) {
              set({ currentPlan: sub.plan_id as PlanType, subscription: { plan_id: sub.plan_id, estado: sub.estado || "active" } });
              return;
            }
            const { data: profile } = await supabase
              .from("profiles").select("is_pro, plan_actual").eq("id", uid).maybeSingle();
            if (profile?.is_pro && profile.plan_actual) {
              set({ currentPlan: profile.plan_actual as PlanType, subscription: { plan_id: profile.plan_actual, estado: "active" } });
            }
          } catch { /* sin conexión: mantener valor actual */ }
        };

        try {
          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 10000);

          const res = await fetch(`/api/user-subscription?user_id=${state.user?.id || ""}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          });
          clearTimeout(fetchTimeout);

          if (!res.ok) {
            if (res.status === 401) {
              set({ currentPlan: "gratuito", subscription: null });
            } else {
              await resolverPlanDesdeBD();
            }
            return;
          }

          const data = await res.json();

          if (data?.success && data?.data?.subscription) {
            const sub = data.data.subscription as SubscriptionData;
            const planId = (sub.plan_id as PlanType) || "gratuito";
            set({ subscription: sub, currentPlan: planId, subscriptionError: null });
            console.log("[AppStore] Plan detectado:", planId);
          } else {
            // Fallback: verificar profile.is_pro
            const { data: profile } = await supabase
              .from("profiles")
              .select("is_pro, plan_actual")
              .eq("id", state.user?.id || "")
              .single();

            if (profile?.is_pro) {
              const plan = (profile.plan_actual as PlanType) || "profesional";
              set({ currentPlan: plan, subscription: { plan_id: plan, estado: "active" } });
            } else {
              set({ subscription: null, currentPlan: "gratuito" });
            }
          }
        } catch (err: any) {
          console.error("[AppStore] Error:", err?.message);
          set({ subscriptionError: err?.message || "Error de conexión" });
          // Si la API se canceló o falló, resolvemos el plan directo de la BD
          await resolverPlanDesdeBD();
        } finally {
          clearTimeout(safetyTimeout);
          set({ isRefreshingSubscription: false });
        }
      },

      /* ── Helpers ── */
      getPlanDisplayName: () => {
        const plan = get().currentPlan;
        return PLAN_LIMITS[plan]?.label || "Gratuito";
      },

      isPro: () => {
        const plan = get().currentPlan;
        return plan === "profesional" || plan === "institucional" || get().subscription?.estado === "trialing";
      },

      isTrial: () => get().subscription?.estado === "trialing",

      canUseFeature: (featurePlan: PlanType) => {
        const current = normalizeText(get().currentPlan);
        const required = normalizeText(featurePlan);
        const hierarchy: Record<string, number> = { gratuito: 0, basico: 1, profesional: 2, institucional: 3 };
        return hierarchy[current] >= hierarchy[required];
      },
    }),
    {
      name: "app-store-pd-v17",
      partialize: (state: AppState) => ({
        activeSection: state.activeSection,
        sidebarOpen: state.sidebarOpen,
        currentPlan: state.currentPlan,
      }),
    }
  )
);

/* ═══════════════════════════════════════════════════════════
   PROVIDER (para layout.tsx)
   ═══════════════════════════════════════════════════════════ */
export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const initSession = useAppStore((s) => s.initSession);
  const refreshSubscription = useAppStore((s) => s.refreshSubscription);
  const user = useAppStore((s) => s.user);
  const session = useAppStore((s) => s.session);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Escuchar cambios de auth
  // ✅ FIX: Usar ref para evitar que SIGNED_IN dispare refreshSubscription múltiples veces.
  // Supabase JS v2 emite SIGNED_IN en cada token refresh automático.
  // Con el ref, solo procesamos el primer SIGNED_IN por session de usuario.
  const signedInUserRef    = useRef<string | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AppStore] Auth event:", event);

      if (event === "SIGNED_IN" && session?.user) {
        useAppStore.setState({
          session, user: session.user,
          currentUser: session.user, isAuthenticated: true,
        });

        const now = Date.now();
        const isNewUser    = signedInUserRef.current !== session.user.id;
        const enoughTime   = (now - lastRefreshTimeRef.current) > 30000; // 30s debounce

        if (isNewUser || enoughTime) {
          signedInUserRef.current    = session.user.id;
          lastRefreshTimeRef.current = now;
          setTimeout(() => refreshSubscription(), 500);
        }
      }

      if (event === "INITIAL_SESSION" && session?.user) {
        useAppStore.setState({
          session, user: session.user,
          currentUser: session.user, isAuthenticated: true,
        });
      }

      if (event === "SIGNED_OUT") {
        signedInUserRef.current    = null;
        lastRefreshTimeRef.current = 0;
        useAppStore.setState({
          user: null, session: null, currentUser: null,
          isAuthenticated: false, currentPlan: "gratuito", subscription: null,
        });
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, [refreshSubscription]);

  // Refrescar suscripción cuando cambia el usuario
  const lastUserRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id;
    const token = session?.access_token;
    if (userId && token && lastUserRef.current !== userId) {
      lastUserRef.current = userId;
      refreshSubscription();
    }
  }, [user?.id, refreshSubscription]);

  return <>{children}</>;
}

export function useAuthInit() {
  const initSession = useAppStore((s) => s.initSession);
  useEffect(() => { initSession(); }, [initSession]);
}