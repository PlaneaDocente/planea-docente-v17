"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarCheck, BookOpen, Target, BarChart3,
  Camera, MessageSquare, Zap, Brain, Clock, TrendingUp,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "./StatCard";
import MiniCalendar from "./MiniCalendar";
import { useAppStore } from "@/store/app-store";
import { supabase } from "@/integrations/supabase/client"; // Ajusta esta ruta si tu cliente de Supabase está en otra parte

export default function DashboardSection() {
  const { setActiveSection } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (!error && data) {
          setProfile(data);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  // Datos reales del usuario o ceros por defecto
  const userName = profile?.nombre_completo || profile?.email?.split('@')[0] || "Maestro";
  const isPro = profile?.is_pro || false;
  const alumnosCount = profile?.total_alumnos || 0;
  const pendingPlans = profile?.planeaciones_pendientes || 0;
  const mensajes = profile?.mensajes_nuevos || 0;

  const stats = [
    { title: "Alumnos Registrados", value: alumnosCount, subtitle: isPro ? "Plan Pro Activo" : "Plan Gratuito", icon: Users, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-950", trend: alumnosCount > 0 ? "Registrados" : "Sin alumnos" },
    { title: "Asistencia Hoy", value: 0, subtitle: "Sin registro", icon: CalendarCheck, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-950", trend: "0%" },
    { title: "Planeaciones", value: pendingPlans, subtitle: "Pendientes", icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-950" },
    { title: "Actividades", value: 0, subtitle: "Esta semana", icon: Target, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-950" },
    { title: "Evaluaciones", value: 0, subtitle: "Este mes", icon: BarChart3, color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-950" },
    { title: "Mensajes", value: mensajes, subtitle: "Nuevos", icon: MessageSquare, color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-950" },
  ];

  if (loading) return <div className="p-8 text-center">Cargando tu información...</div>;

  return (
    <div className="space-y-6">
      <WelcomeBanner userName={userName} isPro={isPro} pendingPlans={pendingPlans} mensajes={mensajes} />
      
      {!isPro && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          Tu cuenta es gratuita. <button onClick={() => setActiveSection("suscripcion")} className="underline font-bold">Actualiza a Pro</button> para desbloquear todas las funciones.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions setActiveSection={setActiveSection} isPro={isPro} />
          <RecentActivity />
        </div>
        <div className="space-y-6">
          <MiniCalendar events={[]} />
          <AIFeaturesBanner setActiveSection={setActiveSection} isPro={isPro} />
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({ userName, isPro, pendingPlans, mensajes }: { userName: string, isPro: boolean, pendingPlans: number, mensajes: number }) {
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
              ? `Plan Pro activo. Tienes ${pendingPlans} planeaciones pendientes y ${mensajes} mensajes nuevos.`
              : "Estás en el plan gratuito. Actualiza para desbloquear todas las herramientas."}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">{isPro ? "Pro Activo" : "Plan Gratuito"}</span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActions({ setActiveSection, isPro }: { setActiveSection: (s: any) => void, isPro: boolean }) {
  const actions = [
    { label: "Tomar Asistencia", icon: CalendarCheck, color: "bg-emerald-500 hover:bg-emerald-600", section: "asistencia", pro: false },
    { label: "Crear Planeación", icon: BookOpen, color: "bg-blue-500 hover:bg-blue-600", section: "planeacion", pro: true },
    { label: "Nueva Actividad", icon: Target, color: "bg-purple-500 hover:bg-purple-600", section: "actividades", pro: true },
    { label: "Subir Evidencia", icon: Camera, color: "bg-rose-500 hover:bg-rose-600", section: "evidencias", pro: true },
    { label: "Generar Reporte", icon: BarChart3, color: "bg-amber-500 hover:bg-amber-600", section: "reportes", pro: true },
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
          const disabled = a.pro && !isPro;
          return (
            <motion.button
              key={a.label}
              whileHover={disabled ? {} : { scale: 1.03 }}
              whileTap={disabled ? {} : { scale: 0.97 }}
              onClick={() => !disabled && setActiveSection(a.section)}
              className={`${a.color} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} text-white rounded-xl p-3 flex flex-col items-center gap-2 text-xs font-medium transition-colors shadow-sm relative`}
            >
              <Icon className="w-5 h-5" />
              {a.label}
              {disabled && <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] px-1 rounded">PRO</span>}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Actividad Reciente
      </h3>
      <div className="text-sm text-muted-foreground text-center py-8">
        No hay actividad reciente. Comienza creando un grupo o una planeación.
      </div>
    </div>
  );
}

function AIFeaturesBanner({ setActiveSection, isPro }: { setActiveSection: (s: any) => void, isPro: boolean }) {
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
        onClick={() => setActiveSection(isPro ? "planeacion" : "suscripcion")}
      >
        <Zap className="w-3.5 h-3.5 mr-1.5" /> 
        {isPro ? "Generar con IA" : "Desbloquear IA"}
      </Button>
    </motion.div>
  );
}