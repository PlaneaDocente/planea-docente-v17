"use client";

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, LayoutDashboard, Users, CalendarCheck, BookOpen,
  ClipboardList, Star, Camera, FileText, MessageSquare, Settings,
  LogOut, Crown, Zap, Menu, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ── Importación del DashboardSection del usuario ───────────────────────── */
import DashboardSection from "@/components/planea/DashboardSection";

/* ═══════════════════════════════════════════════════════════════════════════
   MAPA DE SECCIONES
   Añade aquí los imports de tus demás secciones conforme las tengas listas:
   ═══════════════════════════════════════════════════════════════════════════ */
const SECTIONS = [
  { id: "inicio",      label: "Dashboard",    icon: LayoutDashboard, component: DashboardSection },
  { id: "alumnos",     label: "Alumnos",      icon: Users },
  { id: "asistencia",  label: "Asistencia",   icon: CalendarCheck },
  { id: "planeacion",  label: "Planeación",   icon: BookOpen },
  { id: "actividades", label: "Actividades",  icon: ClipboardList },
  { id: "evaluaciones",label: "Evaluaciones", icon: Star },
  { id: "evidencias",  label: "Evidencias",   icon: Camera },
  { id: "reportes",    label: "Reportes",     icon: FileText },
  { id: "padres",      label: "Padres",       icon: MessageSquare },
  { id: "herramientas-ia", label: "Herramientas IA", icon: Zap },
  { id: "configuracion", label: "Configuración", icon: Settings },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL DEL DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("inicio");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ── 1. Cargar sesión y suscripción ───────────────────────────────────── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      setUser(session.user);

      try {
        const res = await fetch(`/api/user-subscription?user_id=${session.user.id}`);
        const json = await res.json();
        if (mounted && json.success) setSubscription(json.data);
      } catch (e) {
        console.error("[Dashboard] Subscription check failed:", e);
      }
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [router]);

  /* ── 2. ESCUCHAR EVENTOS DE NAVEGACIÓN (CRÍTICO para botones del DashboardSection)
     DashboardSection dispara: window.dispatchEvent(new CustomEvent('navigate', {detail: 'asistencia'}))
     Esta página CAPTA ese evento y cambia la sección activa.
  ────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail !== "string") return;

      console.log("[Dashboard] Navigate event received:", detail);

      // Si es una ruta externa (suscripcion, login, etc.)
      if (detail === "suscripcion") {
        router.push("/suscripcion");
        return;
      }

      // Si es una sección interna
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component;
  const isTrialing = subscription?.subscription?.estado === "trialing";
  const isActive = subscription?.subscription?.estado === "active";
  const hasSub = isTrialing || isActive;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        {/* Logo */}
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

        {/* Navegación */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => { setActiveSection(section.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                {section.label}
                {section.id === "herramientas-ia" && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">IA</Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {hasSub && subscription?.plan && (
            <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {isTrialing ? "🎁 Trial activo" : subscription.plan.nombre}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="md:hidden h-8 w-8 p-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-sm md:text-base font-bold">
                {SECTIONS.find((s) => s.id === activeSection)?.label}
              </h2>
              <p className="text-xs text-muted-foreground hidden md:block">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTrialing && (
              <Badge variant="secondary" className="gap-1 text-xs bg-amber-100 text-amber-700 border-amber-200">
                <Crown className="w-3 h-3" />
                Trial
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => router.push("/suscripcion")} className="hidden sm:flex gap-1 text-xs">
              <Zap className="w-3 h-3" />
              {hasSub ? "Mi plan" : "Actualizar"}
            </Button>
          </div>
        </header>

        {/* Área de contenido */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {ActiveComponent ? (
                <ActiveComponent />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {(() => {
                      const Icon = SECTIONS.find((s) => s.id === activeSection)?.icon || LayoutDashboard;
                      return <Icon className="w-8 h-8 text-slate-400" />;
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground">
                    {SECTIONS.find((s) => s.id === activeSection)?.label}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Esta sección está en desarrollo. Pronto estará disponible con todas las funciones de la Nueva Escuela Mexicana.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveSection("inicio")}>
                    Volver al Dashboard
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
