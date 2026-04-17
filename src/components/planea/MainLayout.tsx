
"use client";

import { useState, useCallback } from "react";
import { AppStoreProvider, useAppStore } from "@/store/app-store";
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

type AppView = "landing" | "auth" | "dashboard";

function MainContent({ user }: { user: User }) {
  const { activeSection } = useAppStore();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {activeSection === "inicio" && <DashboardSection />}
            {activeSection === "alumnos" && <AlumnosSection />}
            {activeSection === "asistencia" && <AsistenciaSection />}
            {activeSection === "planeacion" && <PlaneacionSection />}
            {activeSection === "actividades" && <ActividadesSection />}
            {activeSection === "evaluaciones" && <EvaluacionesSection />}
            {activeSection === "evidencias" && <EvidenciasSection />}
            {activeSection === "reportes" && <ReportesSection />}
            {activeSection === "padres" && <PadresSection />}
            {activeSection === "configuracion" && <ConfiguracionSection />}
            {activeSection === "descargas" && <DescargasSection />}
            {activeSection === "herramientas-ia" && <HerramientasIASection />}
            {activeSection === "suscripcion" && <SuscripcionSection />}
            {activeSection === "afiliados" && <AfiliatesSection />}
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRouter() {
  const [view, setView] = useState<AppView>("landing");
  const [user, setUser] = useState<User | null>(null);
  const { setCurrentUser } = useAppStore();

  const handleAuthenticated = useCallback(
    (authenticatedUser: User) => {
      setUser(authenticatedUser);
      setCurrentUser(authenticatedUser);
      setView("dashboard");
    },
    [setCurrentUser]
  );

  if (view === "landing") {
    return <LandingPage onGetStarted={() => setView("auth")} />;
  }

  if (view === "auth" || !user) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  return <MainContent user={user} />;
}

export default function MainLayout() {
  return (
    <AppStoreProvider>
      <AppRouter />
    </AppStoreProvider>
  );
}
