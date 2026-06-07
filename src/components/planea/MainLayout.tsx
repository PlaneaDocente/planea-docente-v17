"use client";

import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppStoreProvider, useAppStore } from "@/store/app-store";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import DashboardSection from "./DashboardSection";
import AlumnosSection from "./AlumnosSection";
import AsistenciaSection from "./AsistenciaSection";
import PlaneacionSection from "./PlaneacionSection";
import ActividadesSection from "./ActividadesSection";
import EvaluacionesSection from "./EvaluacionesSection";
import EvidenciasSection from "./EvidenciasSection";
import ReportesSection from "./ReportesSection";
import PadresSection from "./PadresSection";
import ConfiguracionSection from "./ConfiguracionSection";
import DescargasSection from "./DescargasSection";
import HerramientasIASection from "./HerramientasIASection";
import SuscripcionSection from "./SuscripcionSection";
import AfiliatesSection from "./AfiliatesSection";
import AuthGate from "@/components/auth/AuthGate";
import LandingPage from "@/components/landing/LandingPage";
import type { User } from "@supabase/supabase-js";

// "loading" = verificando sesión | "landing" = sin sesión | "auth" = formulario login | "dashboard" = app
type AppView = "loading" | "landing" | "auth" | "dashboard";

function MainContent({ user }: { user: User }) {
  const { activeSection } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {activeSection === "inicio"         && <DashboardSection />}
            {activeSection === "alumnos"        && <AlumnosSection />}
            {activeSection === "asistencia"     && <AsistenciaSection />}
            {activeSection === "planeacion"     && <PlaneacionSection />}
            {activeSection === "actividades"    && <ActividadesSection />}
            {activeSection === "evaluaciones"   && <EvaluacionesSection />}
            {activeSection === "evidencias"     && <EvidenciasSection />}
            {activeSection === "reportes"       && <ReportesSection />}
            {activeSection === "padres"         && <PadresSection />}
            {activeSection === "configuracion"  && <ConfiguracionSection />}
            {activeSection === "descargas"      && <DescargasSection />}
            {activeSection === "herramientas-ia" && <HerramientasIASection />}
            {activeSection === "suscripcion"    && <SuscripcionSection />}
            {activeSection === "afiliados"      && <AfiliatesSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRouter() {
  // ── FIX PRINCIPAL: iniciar en "loading" para verificar sesión ANTES de mostrar landing ──
  const [view, setView]   = useState<AppView>("loading");
  const [user, setUser]   = useState<User | null>(null);
  const { setCurrentUser } = useAppStore();

  const handleAuthenticated = useCallback(
    (authenticatedUser: User) => {
      setUser(authenticatedUser);
      setCurrentUser(authenticatedUser);
      setView("dashboard");
    },
    [setCurrentUser]
  );

  const handleSignOut = useCallback(() => {
    setUser(null);
    setCurrentUser(null);
    setView("landing");
  }, [setCurrentUser]);

  useEffect(() => {
    // 1. Verificar sesión existente al montar (cubre el caso de OAuth callback + recargas)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthenticated(session.user);
      } else {
        setView("landing");
      }
    });

    // 2. Escuchar cambios de auth en tiempo real (OAuth, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          handleAuthenticated(session.user);
        } else if (event === "SIGNED_OUT") {
          handleSignOut();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Actualizar user con token renovado sin cambiar vista
          setUser(session.user);
          setCurrentUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleAuthenticated, handleSignOut, setCurrentUser]);

  // ── PANTALLA DE CARGA mientras se verifica la sesión ──
  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Cargando PlaneaDocente...</p>
        </div>
      </div>
    );
  }

  // ── LANDING: usuario no autenticado ──
  if (view === "landing") {
    return <LandingPage onGetStarted={() => setView("auth")} />;
  }

  // ── AUTH GATE: formulario de login/registro ──
  if (view === "auth" || !user) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  // ── DASHBOARD: usuario autenticado ──
  return <MainContent user={user} />;
}

export default function MainLayout() {
  return (
    <AppStoreProvider>
      <AppRouter />
    </AppStoreProvider>
  );
}
