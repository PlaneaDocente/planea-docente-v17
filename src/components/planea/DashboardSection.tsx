"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarCheck, BookOpen, Target, BarChart3,
  Camera, MessageSquare, Zap, Brain, Clock, TrendingUp,
  CheckCircle2, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "./StatCard";
import MiniCalendar from "./MiniCalendar";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

type SectionId = 
  | "inicio" | "alumnos" | "asistencia" | "planeacion" | "actividades" 
  | "evaluaciones" | "evidencias" | "reportes" | "padres" 
  | "herramientas-ia" | "suscripcion" | "afiliados" | "configuracion" | "descargas";

interface DashboardStats {
  alumnos: number;
  asistenciaHoy: number;
  planeaciones: number;
  actividades: number;
  evaluaciones: number;
  mensajes: number;
  evidencias: number;
}

export default function DashboardSection() {
  // Leer plan desde AppStore (fallback si profile.is_pro no está actualizado)
  const { currentPlan, subscription, getPlanDisplayName, isPro: appStoreIsPro } = useAppStore();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    alumnos: 0, asistenciaHoy: 0, planeaciones: 0,
    actividades: 0, evaluaciones: 0, mensajes: 0, evidencias: 0
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      // Cargar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileData) setProfile(profileData);

      // Cargar estadísticas reales en paralelo
      const hoy = new Date().toISOString().split("T")[0];

      const [
        { count: alumnosCount },
        { count: asistenciaCount },
        { count: planeacionesCount },
        { count: evaluacionesCount },
        { count: evidenciasCount },
        { count: mensajesCount }
      ] = await Promise.all([
        supabase.from("alumnos").select("*", { count: "exact", head: true }).eq("estado", "activo"),
        supabase.from("asistencia").select("*", { count: "exact", head: true }).eq("fecha", hoy),
        supabase.from("planeaciones").select("*", { count: "exact", head: true }).eq("maestro_id", user.id),
        supabase.from("evaluaciones").select("*", { count: "exact", head: true }).eq("maestro_id", user.id),
        supabase.from("evidencias").select("*", { count: "exact", head: true }).eq("creado_por", user.id),
        supabase.from("mensajes_padres").select("*", { count: "exact", head: true }).eq("de_maestro_id", user.id).eq("leido", false),
      ]);

      setStats({
        alumnos: alumnosCount || 0,
        asistenciaHoy: asistenciaCount || 0,
        planeaciones: planeacionesCount || 0,
        actividades: 0, // No hay tabla aún
        evaluaciones: evaluacionesCount || 0,
        mensajes: mensajesCount || 0,
        evidencias: evidenciasCount || 0,
      });

      setLoading(false);
    };
    fetchData();
  }, []);

  const userName = profile?.nombre_completo || profile?.email?.split('@')[0] || "Maestro";

  // Usar AppStore como fuente de verdad para el plan, con fallback a profile.is_pro
  const isPro = appStoreIsPro() || profile?.is_pro || false;
  const isTrial = subscription?.estado === "trialing";
  const planName = getPlanDisplayName();

  const statCards = [
    { title: "Alumnos Registrados", value: stats.alumnos, subtitle: isPro ? planName : "Plan Gratuito", icon: Users, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-950", trend: stats.alumnos > 0 ? "Registrados" : "Sin alumnos" },
    { title: "Asistencia Hoy", value: stats.asistenciaHoy, subtitle: "Registros hoy", icon: CalendarCheck, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-950", trend: stats.asistenciaHoy > 0 ? "Tomada" : "Pendiente" },
    { title: "Planeaciones", value: stats.planeaciones, subtitle: "Guardadas", icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-950" },
    { title: "Evidencias", value: stats.evidencias, subtitle: "Subidas", icon: Camera, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-950" },
    { title: "Evaluaciones", value: stats.evaluaciones, subtitle: "Creadas", icon: BarChart3, color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-950" },
    { title: "Mensajes", value: stats.mensajes, subtitle: "Sin leer", icon: MessageSquare, color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-950" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <WelcomeBanner userName={userName} planName={planName} isPro={isPro} isTrial={isTrial} stats={stats} />

      {!isPro && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          Tu cuenta es gratuita. <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'suscripcion' }))} className="underline font-bold">Actualiza a Pro</button> para desbloquear todas las funciones.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions isPro={isPro} />
          <RecentActivity stats={stats} />
        </div>
        <div className="space-y-6">
          <MiniCalendar events={[]} />
          <AIFeaturesBanner isPro={isPro} />
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({ userName, planName, isPro, isTrial, stats }: { 
  userName: string; 
  planName: string; 
  isPro: boolean; 
  isTrial: boolean;
  stats: DashboardStats; 
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-6 text-white shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">
            {greeting}, {userName} 👋
          </h2>
          <p className="text-white/80 text-sm">
            {isPro
              ? `${planName}${isTrial ? ' (Trial)' : ''}. Tienes ${stats.planeaciones} planeaciones y ${stats.evidencias} evidencias.`
              : "Estás en el plan gratuito. Actualiza para desbloquear todas las herramientas."}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">{planName}{isTrial ? ' (Trial)' : ''}</span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActions({ isPro }: { isPro: boolean }) {
  const navigateTo = (section: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: section }));
  };

  const actions = [
    { label: "Tomar Asistencia", icon: CalendarCheck, color: "bg-emerald-500 hover:bg-emerald-600", section: "asistencia", pro: false },
    { label: "Crear Planeación", icon: BookOpen, color: "bg-blue-500 hover:bg-blue-600", section: "planeacion", pro: true },
    { label: "Evaluaciones", icon: BarChart3, color: "bg-purple-500 hover:bg-purple-600", section: "evaluaciones", pro: true },
    { label: "Subir Evidencia", icon: Camera, color: "bg-rose-500 hover:bg-rose-600", section: "evidencias", pro: true },
    { label: "Generar Reporte", icon: Target, color: "bg-amber-500 hover:bg-amber-600", section: "reportes", pro: true },
    { label: "Mensaje a Padres", icon: MessageSquare, color: "bg-cyan-500 hover:bg-cyan-600", section: "padres", pro: true },
  ];

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" /> Acciones Rápidas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          const isLocked = a.pro && !isPro;
          return (
            <motion.button
              key={a.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => isLocked ? navigateTo("suscripcion") : navigateTo(a.section)}
              className={`${a.color} ${isLocked ? 'opacity-70' : ''} text-white rounded-xl p-3 flex flex-col items-center gap-2 text-xs font-medium transition-colors shadow-sm relative`}
            >
              <Icon className="w-5 h-5" />
              {a.label}
              {isLocked && <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] px-1 rounded">🔒 PRO</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity({ stats }: { stats: DashboardStats }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Resumen de Actividad
      </h3>
      {stats.alumnos === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No hay actividad reciente. Comienza creando un grupo o una planeación.
        </div>
      ) : (
        <div className="space-y-3">
          {stats.asistenciaHoy > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Asistencia tomada hoy: <strong>{stats.asistenciaHoy}</strong> registros</span>
            </div>
          )}
          {stats.planeaciones > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span>Planeaciones guardadas: <strong>{stats.planeaciones}</strong></span>
            </div>
          )}
          {stats.evidencias > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Camera className="w-4 h-4 text-rose-500" />
              <span>Evidencias subidas: <strong>{stats.evidencias}</strong></span>
            </div>
          )}
          {stats.evaluaciones > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span>Evaluaciones creadas: <strong>{stats.evaluaciones}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AIFeaturesBanner({ isPro }: { isPro: boolean }) {
  const navigateTo = (section: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: section }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg"
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5" />
        <h3 className="font-bold text-sm">IA Educativa</h3>
      </div>
      <p className="text-xs text-white/80 mb-4">
        Genera planeaciones, rúbricas y exámenes automáticamente con inteligencia artificial.
      </p>
      <Button
        size="sm"
        className="w-full bg-white text-purple-700 hover:bg-white/90 font-semibold text-xs"
        onClick={() => navigateTo(isPro ? "planeacion" : "suscripcion")}
      >
        <Zap className="w-3.5 h-3.5 mr-1.5" />
        {isPro ? "Generar con IA" : "Desbloquear IA"}
      </Button>
    </motion.div>
  );
}