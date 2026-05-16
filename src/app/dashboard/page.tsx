"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Loader2,
  LayoutDashboard,
  Users,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  Star,
  ImageIcon,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Crown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface SubscriptionInfo {
  estado: string;
  plan_nombre: string;
  dias_restantes: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSub, setNeedsSub] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.push("/login?redirect=/dashboard");
          return;
        }

        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email ?? "",
          full_name: session.user.user_metadata?.full_name ?? null,
        };
        setUser(profile);

        // Verificar suscripción
        const res = await fetch(`/api/user-subscription?user_id=${session.user.id}`);
        const json = await res.json();

        if (json.success && json.data?.subscription) {
          const sub = json.data.subscription;
          const plan = json.data.plan;

          setSubscription({
            estado: sub.estado,
            plan_nombre: plan?.nombre ?? "Plan activo",
            dias_restantes: sub.fecha_prueba_fin 
              ? Math.max(0, Math.ceil((new Date(sub.fecha_prueba_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0,
          });
        } else {
          setNeedsSub(true);
        }
      } catch (err) {
        console.error("[Dashboard] Error:", err);
        toast.error("Error cargando el dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm">PlaneaDocente</h1>
              <p className="text-xs text-muted-foreground">V17 NEM</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active />
          <SidebarItem icon={<Users className="w-4 h-4" />} label="Alumnos" />
          <SidebarItem icon={<CalendarCheck className="w-4 h-4" />} label="Asistencia" />
          <SidebarItem icon={<BookOpen className="w-4 h-4" />} label="Planeación" />
          <SidebarItem icon={<ClipboardList className="w-4 h-4" />} label="Actividades" />
          <SidebarItem icon={<Star className="w-4 h-4" />} label="Evaluaciones" />
          <SidebarItem icon={<ImageIcon className="w-4 h-4" />} label="Evidencias" />
          <SidebarItem icon={<FileText className="w-4 h-4" />} label="Reportes" />
          <SidebarItem icon={<MessageSquare className="w-4 h-4" />} label="Padres" />
          <SidebarItem icon={<Settings className="w-4 h-4" />} label="Configuración" />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                ¡Hola, {user?.full_name || user?.email?.split("@")[0] || "Maestro"}!
              </h2>
              <p className="text-sm text-muted-foreground">
                Bienvenido a tu panel de PlaneaDocente
              </p>
            </div>
            <div className="flex items-center gap-3">
              {subscription && (
                <Badge variant={subscription.estado === "trialing" ? "secondary" : "default"} className="gap-1">
                  <Crown className="w-3 h-3" />
                  {subscription.estado === "trialing" 
                    ? `🎁 Trial: ${subscription.dias_restantes} días restantes`
                    : subscription.plan_nombre}
                </Badge>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 space-y-6">
          {/* Banner si necesita suscripción */}
          {needsSub && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                <CardContent className="py-4 flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                      Activa un plan para desbloquear todas las funciones
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Comienza con 15 días de prueba gratuita en el plan Profesional.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => router.push("/suscripcion")}>
                    Ver planes
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Alumnos" value="0" />
            <StatCard icon={<CalendarCheck className="w-5 h-5 text-green-500" />} label="Asistencia hoy" value="0%" />
            <StatCard icon={<BookOpen className="w-5 h-5 text-violet-500" />} label="Planeaciones" value="0" />
            <StatCard icon={<ClipboardList className="w-5 h-5 text-amber-500" />} label="Actividades" value="0" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Accesos rápidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <QuickAction label="Registrar alumno" icon={<Users className="w-4 h-4" />} />
                <QuickAction label="Tomar asistencia" icon={<CalendarCheck className="w-4 h-4" />} />
                <QuickAction label="Nueva planeación" icon={<BookOpen className="w-4 h-4" />} />
                <QuickAction label="Generar reporte" icon={<FileText className="w-4 h-4" />} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Información NEM</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sistema alineado a la <strong>Nueva Escuela Mexicana</strong>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Campos Formativos</Badge>
                  <Badge variant="outline">Fases de Aprendizaje</Badge>
                  <Badge variant="outline">Competencias</Badge>
                  <Badge variant="outline">Desempeños</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Sub-componentes ────────────────────────────────────────────────────── */

function SidebarItem({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors">
      {icon}
      {label}
    </button>
  );
}
