"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarCheck, BookOpen, Target, BarChart3,
  Camera, MessageSquare, Zap, Brain, Download,
  CheckCircle2, Clock, TrendingUp, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "./StatCard";
import MiniCalendar from "./MiniCalendar";
import { mockStats, mockCalendario, mockAsistencia, mockPlaneaciones } from "@/data/mock-data";
import { useAppStore } from "@/store/app-store";
import { supabase } from "@/integrations/supabase/client";

/* ════════════════════════════════════════════════════════════
   TIPOS
   ════════════════════════════════════════════════════════════ */
interface RealStats {
  alumnos: number | null;
  asistenciaHoy: number | null;
  asistenciaTotal: number | null;
  planeaciones: number | null;
  actividades: number | null;
  evaluaciones: number | null;
  mensajes: number | null;
  evidencias: number | null;
}

/* ════════════════════════════════════════════════════════════
   QUERY DEFENSIVA A SUPABASE
   ════════════════════════════════════════════════════════════ */
async function countFromSupabase(
  table: string,
  filters?: { column: string; value: any }[]
): Promise<number | null> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });

    if (filters && filters.length > 0) {
      for (const f of filters) {
        query = query.eq(f.column, f.value);
      }
    }

    const { count, error } = await query;

    if (error) {
      if (error.message.includes("column") || error.code === "42703" || error.message.includes("does not exist")) {
        const { count: countNoFilter } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });
        return countNoFilter ?? null;
      }
      return null;
    }

    return count ?? null;
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════ */
export default function DashboardSection() {
  const { setActiveSection, getPlanDisplayName, isPro, isTrial } = useAppStore();

  const [realStats, setRealStats] = useState<RealStats>({
    alumnos: null, asistenciaHoy: null, asistenciaTotal: null,
    planeaciones: null, actividades: null, evaluaciones: null,
    mensajes: null, evidencias: null,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Maestra Ana");

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id;

        if (user?.email) {
          setUserName(user.email.split("@")[0]);
        }

        const hoy = new Date().toISOString().split("T")[0];

        let alumnos = await countFromSupabase("alumnos", [{ column: "estado", value: "activo" }]);
        if (alumnos === null) alumnos = await countFromSupabase("alumnos");

        let asistenciaHoy = await countFromSupabase("asistencia", [
          { column: "fecha", value: hoy },
          { column: "presente", value: true }
        ]);
        let asistenciaTotal = await countFromSupabase("asistencia", [
          { column: "fecha", value: hoy }
        ]);

        if (asistenciaHoy === null) {
          asistenciaHoy = await countFromSupabase("asistencia", [
            { column: "fecha", value: hoy },
            { column: "estado", value: "presente" }
          ]);
        }
        if (asistenciaTotal === null) {
          asistenciaTotal = await countFromSupabase("asistencia", [
            { column: "fecha", value: hoy }
          ]);
        }

        if ((asistenciaTotal === null || asistenciaTotal === 0) && (alumnos !== null && alumnos > 0)) {
          asistenciaTotal = alumnos;
          asistenciaHoy = alumnos;
        }

        let planeaciones = uid
          ? await countFromSupabase("planeaciones", [{ column: "maestro_id", value: uid }])
          : null;
        if (planeaciones === null) planeaciones = await countFromSupabase("planeaciones");

        let actividades = uid
          ? await countFromSupabase("actividades", [{ column: "maestro_id", value: uid }])
          : null;
        if (actividades === null) actividades = await countFromSupabase("actividades");

        let evaluaciones = uid
          ? await countFromSupabase("evaluaciones", [{ column: "maestro_id", value: uid }])
          : null;
        if (evaluaciones === null) evaluaciones = await countFromSupabase("evaluaciones");

        let evidencias = uid
          ? await countFromSupabase("evidencias", [{ column: "creado_por", value: uid }])
          : null;
        if (evidencias === null) evidencias = await countFromSupabase("evidencias");

        let mensajes = uid
          ? await countFromSupabase("mensajes_padres", [
              { column: "de_maestro_id", value: uid },
              { column: "leido", value: false }
            ])
          : null;
        if (mensajes === null && uid) {
          mensajes = await countFromSupabase("mensajes_padres", [
            { column: "de_maestro_id", value: uid }
          ]);
        }
        if (mensajes === null) mensajes = await countFromSupabase("mensajes_padres");

        setRealStats({
          alumnos,
          asistenciaHoy,
          asistenciaTotal,
          planeaciones,
          actividades,
          evaluaciones,
          mensajes,
          evidencias,
        });
      } catch (err) {
        console.error("[Dashboard] Error fetch:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  const alumnosFinal    = realStats.alumnos    ?? mockStats.alumnosRegistrados;
  const asistenciaFinal = realStats.asistenciaHoy ?? mockStats.asistenciaHoy;
  const ausentesFinal   = (realStats.asistenciaTotal ?? alumnosFinal) - (realStats.asistenciaHoy ?? asistenciaFinal);
  const planeacionesFinal = realStats.planeaciones ?? mockStats.planeacionesPendientes;
  const actividadesFinal  = realStats.actividades  ?? mockStats.actividadesPendientes;
  const evaluacionesFinal = realStats.evaluaciones ?? mockStats.evaluacionesEstemes;
  const mensajesFinal     = realStats.mensajes     ?? mockStats.mensajesNuevos;
  const evidenciasFinal   = realStats.evidencias   ?? 3;

  const planName = getPlanDisplayName();
  const pro = isPro();
  const trial = isTrial();

  const statsCards = [
    { title: "Alumnos Registrados", value: alumnosFinal, subtitle: "Grupo 3°A", icon: Users, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-950", trend: "+2 este mes" },
    { title: "Asistencia Hoy", value: asistenciaFinal, subtitle: `${Math.max(0, ausentesFinal)} ausentes`, icon: CalendarCheck, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-950", trend: "93.7%" },
    { title: "Planeaciones Pendientes", value: planeacionesFinal, subtitle: "Por completar", icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-950" },
    { title: "Actividades Activas", value: actividadesFinal, subtitle: "Esta semana", icon: Target, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-950" },
    { title: "Evaluaciones", value: evaluacionesFinal, subtitle: "Este mes", icon: BarChart3, color: "text-rose-600", bgColor: "bg-rose-100 dark:bg-rose-950" },
    { title: "Mensajes Nuevos", value: mensajesFinal, subtitle: "De padres", icon: MessageSquare, color: "text-cyan-600", bgColor: "bg-cyan-100 dark:bg-cyan-950" },
  ];

  // ═══════════════════════════════════════════════════════
  // CORRECCIÓN: Adaptar mockCalendario al formato de MiniCalendar
  // MiniCalendar espera: { day: number; title: string; }[]
  // mockCalendario tiene: { id, titulo, fecha, tipo, color }[]
  // ═══════════════════════════════════════════════════════
  const calendarEvents = mockCalendario.map((event: any) => ({
    day: new Date(event.fecha).getDate(),
    title: event.titulo,
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      <WelcomeBanner userName={userName} planName={planName} isPro={pro} isTrial={trial} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((s, i) => (
          <StatCard key={s.title} {...s} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <QuickActions setActiveSection={setActiveSection} />
          <RecentActivity
            asistenciaHoy={asistenciaFinal}
            alumnosTotal={alumnosFinal}
            planeaciones={planeacionesFinal}
            mensajes={mensajesFinal}
            evidencias={evidenciasFinal}
          />
        </div>
        <div className="space-y-6">
          <MiniCalendar events={calendarEvents} />
          <AIFeaturesBanner />
        </div>
      </div>
    </div>
  );
}

function WelcomeBanner({ userName, planName, isPro, isTrial }: {
  userName: string; planName: string; isPro: boolean; isTrial: boolean;
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
          <h2 className="text-xl font-bold mb-1">{greeting}, {userName} 👋</h2>
          <p className="text-white/80 text-sm">
            {isPro
              ? `${planName}${isTrial ? ' (Trial)' : ''}. Tienes ${mockStats.planeacionesPendientes} planeaciones pendientes y ${mockStats.mensajesNuevos} mensajes nuevos.`
              : "Estás en el plan gratuito. Actualiza para desbloquear todas las herramientas."}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">Promedio grupo: 8.7</span>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActions({ setActiveSection }: { setActiveSection: (s: any) => void }) {
  const actions = [
    { label: "Tomar Asistencia", icon: CalendarCheck, color: "bg-emerald-500 hover:bg-emerald-600", section: "asistencia" },
    { label: "Crear Planeación", icon: BookOpen, color: "bg-blue-500 hover:bg-blue-600", section: "planeacion" },
    { label: "Nueva Actividad", icon: Target, color: "bg-purple-500 hover:bg-purple-600", section: "actividades" },
    { label: "Subir Evidencia", icon: Camera, color: "bg-rose-500 hover:bg-rose-600", section: "evidencias" },
    { label: "Generar Reporte", icon: BarChart3, color: "bg-amber-500 hover:bg-amber-600", section: "reportes" },
    { label: "Mensaje a Padres", icon: MessageSquare, color: "bg-cyan-500 hover:bg-cyan-600", section: "padres" },
  ];

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" /> Acciones Rápidas
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.label}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSection(a.section)}
              className={`${a.color} text-white rounded-xl p-3 flex flex-col items-center gap-2 text-xs font-medium transition-colors shadow-sm`}
            >
              <Icon className="w-5 h-5" />
              {a.label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity({
  asistenciaHoy, alumnosTotal, planeaciones, mensajes, evidencias
}: {
  asistenciaHoy: number; alumnosTotal: number; planeaciones: number;
  mensajes: number; evidencias: number;
}) {
  const items = [];

  if (asistenciaHoy > 0) {
    items.push({
      icon: CheckCircle2, color: "text-emerald-500",
      text: `Asistencia registrada - ${asistenciaHoy}/${alumnosTotal} presentes`, time: "Hace 2h"
    });
  }
  if (planeaciones > 0) {
    items.push({
      icon: BookOpen, color: "text-blue-500",
      text: "Planeación semanal creada - Matemáticas", time: "Ayer"
    });
  }
  items.push({
    icon: Target, color: "text-purple-500",
    text: "Tarea asignada - Fracciones", time: "Ayer"
  });
  if (mensajes > 0) {
    items.push({
      icon: MessageSquare, color: "text-cyan-500",
      text: "Mensaje enviado a padres de familia", time: "Hace 2 días"
    });
  }
  if (evidencias > 0) {
    items.push({
      icon: Camera, color: "text-rose-500",
      text: `${evidencias} evidencias subidas al portafolio`, time: "Hace 3 días"
    });
  }

  if (items.length === 0) {
    items.push(
      { icon: CheckCircle2, color: "text-emerald-500", text: "Asistencia registrada - 30/32 presentes", time: "Hace 2h" },
      { icon: BookOpen, color: "text-blue-500", text: "Planeación semanal creada - Matemáticas", time: "Ayer" },
      { icon: Target, color: "text-purple-500", text: "Tarea asignada - Fracciones", time: "Ayer" },
      { icon: MessageSquare, color: "text-cyan-500", text: "Mensaje enviado a padres de familia", time: "Hace 2 días" },
      { icon: Camera, color: "text-rose-500", text: "3 evidencias subidas al portafolio", time: "Hace 3 días" },
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" /> Actividad Reciente
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 py-2 border-b border-border last:border-0"
            >
              <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
              <span className="text-sm text-foreground flex-1">{item.text}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AIFeaturesBanner() {
  const { setActiveSection } = useAppStore();
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
        onClick={() => setActiveSection("planeacion")}
      >
        <Zap className="w-3.5 h-3.5 mr-1.5" /> Generar con IA
      </Button>
    </motion.div>
  );
}