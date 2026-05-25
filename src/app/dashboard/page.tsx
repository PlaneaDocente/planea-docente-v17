"use client";

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, LayoutDashboard, Users, CalendarCheck, BookOpen,
  ClipboardList, Star, Camera, FileText, MessageSquare, Settings,
  LogOut, Crown, Zap, Menu, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Lazy load sections para mejorar rendimiento
const DashboardSection = lazy(() => import("@/components/planea/DashboardSection"));
const AlumnosSection = lazy(() => import("@/components/planea/AlumnosSection"));
const AsistenciaSection = lazy(() => import("@/components/planea/AsistenciaSection"));
const PlaneacionSection = lazy(() => import("@/components/planea/PlaneacionSection"));
const ActividadesSection = lazy(() => import("@/components/planea/ActividadesSection"));
const EvaluacionesSection = lazy(() => import("@/components/planea/EvaluacionesSection"));
const EvidenciasSection = lazy(() => import("@/components/planea/EvidenciasSection"));
const ReportesSection = lazy(() => import("@/components/planea/ReportesSection"));
const PadresSection = lazy(() => import("@/components/planea/PadresSection"));
const HerramientasIASection = lazy(() => import("@/components/planea/HerramientasIASection"));
const ConfiguracionSection = lazy(() => import("@/components/planea/ConfiguracionSection"));

const SECTIONS = [
  { id: "inicio",      label: "Dashboard",    icon: LayoutDashboard, component: DashboardSection, requiresPro: false },
  { id: "alumnos",     label: "Alumnos",      icon: Users,            component: AlumnosSection,   requiresPro: false },
  { id: "asistencia",  label: "Asistencia",   icon: CalendarCheck,    component: AsistenciaSection, requiresPro: false },
  { id: "planeacion",  label: "Planeación",   icon: BookOpen,         component: PlaneacionSection, requiresPro: true },
  { id: "actividades", label: "Actividades",  icon: ClipboardList,    component: ActividadesSection, requiresPro: false },
  { id: "evaluaciones",label: "Evaluaciones", icon: Star,             component: EvaluacionesSection, requiresPro: true },
  { id: "evidencias",  label: "Evidencias",   icon: Camera,           component: EvidenciasSection,  requiresPro: false },
  { id: "reportes",    label: "Reportes",     icon: FileText,         component: ReportesSection,    requiresPro: true },
  { id: "padres",      label: "Padres",       icon: MessageSquare,    component: PadresSection,      requiresPro: true },
  { id: "herramientas-ia", label: "Herramientas IA", icon: Zap,       component: HerramientasIASection, requiresPro: true },
  { id: "configuracion", label: "Configuración", icon: Settings,      component: ConfiguracionSection, requiresPro: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // 1. Obtener sesión y token
  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      setUser(session.user);
      setSessionToken(session.access_token);
      setLoading(false);
    };
    loadSession();
    return () => { mounted = false; };
  }, [router]);

  // 2. Cargar suscripción con token
  useEffect(() => {
    if (!sessionToken || !user) return;
    let mounted = true;
    const fetchSubscription = async () => {
      try {
        const res = await fetch(`/api/user-subscription`, {
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });
        const json = await res.json();
        if (mounted && json.success) {
          setSubscription(json.data);
        } else if (mounted && !json.success && json.error?.includes("autorizado")) {
          // Token inválido, redirigir a login
          router.push("/login");
        }
      } catch (e) {
        console.error("[Dashboard] Subscription fetch failed:", e);
      }
    };
    fetchSubscription();
    return () => { mounted = false; };
  }, [sessionToken, user, router]);

  // 3. Navegación por eventos personalizados
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail !== "string") return;
      if (detail === "suscripcion") {
        router.push("/suscripcion");
        return;
      }
      const section = SECTIONS.find((s) => s.id === detail);
      if (section) {
        setActiveSection(detail);
        setSidebarOpen(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.info(`Sección "${detail}" próximamente disponible.`);
      }
    };
    window.addEventListener("navigate", handleNavigate);
    return () => window.removeEventListener("navigate", handleNavigate);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Verificar si el usuario tiene plan activo (suscripción activa o en prueba)
  const hasActivePlan = subscription?.subscription && 
    (subscription.subscription.estado === "active" || subscription.subscription.estado === "trialing");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
      </div>
    );
  }

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const ActiveComponent = currentSection?.component;
  const requiresPro = currentSection?.requiresPro || false;
  const isBlocked = requiresPro && !hasActivePlan;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Overlay y Sidebar (igual, se omite por brevedad) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">PlaneaDocente</h1>
              <p className="text-[10px] text-muted-foreground">V17 · NEM</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isLocked = section.requiresPro && !hasActivePlan;
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (isLocked) {
                    toast.info("Esta sección requiere un plan activo. Actualiza tu suscripción.");
                    return;
                  }
                  setActiveSection(section.id);
                  setSidebarOpen(false);
                }}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                {section.label}
                {section.requiresPro && !hasActivePlan && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">
                    PRO
                  </Badge>
                )}
                {section.id === "herramientas-ia" && hasActivePlan && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">IA</Badge>
                )}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {hasActivePlan && subscription?.plan && (
            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {subscription.subscription.estado === "trialing" ? "🎁 Trial activo" : subscription.plan.nombre}
                </span>
              </div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="text-sm md:text-base font-bold">{currentSection?.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!hasActivePlan && (
              <Button size="sm" onClick={() => router.push("/suscripcion")} className="gap-1 text-xs">
                <Zap className="w-3 h-3" />
                Activar Plan
              </Button>
            )}
            {hasActivePlan && (
              <Button size="sm" variant="outline" onClick={() => router.push("/suscripcion")} className="hidden sm:flex gap-1 text-xs">
                Mi plan
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {isBlocked ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Crown className="w-10 h-10 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold">Acceso restringido</h3>
                  <p className="text-muted-foreground max-w-md">
                    La sección <strong>{currentSection?.label}</strong> requiere un plan activo.
                    Activa tu suscripción para desbloquear todas las herramientas.
                  </p>
                  <Button onClick={() => router.push("/suscripcion")} className="gap-2">
                    <Zap className="w-4 h-4" />
                    Ver planes disponibles
                  </Button>
                </div>
              ) : ActiveComponent ? (
                <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin mx-auto" />}>
                  <ActiveComponent />
                </Suspense>
              ) : (
                <div className="text-center py-20">Sección en desarrollo</div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}