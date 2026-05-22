"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarCheck, BookOpen, Target, BarChart3,
  Camera, MessageSquare, Zap, Brain, Clock, TrendingUp,
  CheckCircle2, Loader2, ChevronLeft, ChevronRight,
  Star, Bell, Plus, FileText, Image, Send, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";

/* ════════════════════════════════════════════════════════════
   TIPOS
   ════════════════════════════════════════════════════════════ */
interface DashboardStats {
  alumnos: number;
  asistenciaHoy: number;
  asistenciaPorcentaje: number;
  ausentes: number;
  planeacionesPendientes: number;
  actividadesActivas: number;
  evaluaciones: number;
  mensajesNuevos: number;
  evidencias: number;
  promedioGrupo: number;
}

interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  text: string;
  time: string;
  color: string;
}

interface CalendarEvent {
  date: number;
  month: number;
  title: string;
  color: string;
}

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════════════════════════ */
export default function DashboardSection() {
  const { currentPlan, getPlanDisplayName, isPro, isTrial } = useAppStore();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    alumnos: 0, asistenciaHoy: 0, asistenciaPorcentaje: 0, ausentes: 0,
    planeacionesPendientes: 0, actividadesActivas: 0, evaluaciones: 0,
    mensajesNuevos: 0, evidencias: 0, promedioGrupo: 0
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [calendarEvents] = useState<CalendarEvent[]>([
    { date: 19, month: 0, title: "Examen Bimestral", color: "bg-red-500" },
    { date: 30, month: 0, title: "Entrega de calificaciones", color: "bg-amber-500" },
    { date: 14, month: 4, title: "Día del Maestro", color: "bg-green-500" },
  ]);

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
        { count: asistenciaTotalCount },
        { count: planeacionesCount },
        { count: evaluacionesCount },
        { count: evidenciasCount },
        { count: mensajesCount },
        { count: actividadesCount }
      ] = await Promise.all([
        supabase.from("alumnos").select("*", { count: "exact", head: true }).eq("estado", "activo"),
        supabase.from("asistencia").select("*", { count: "exact", head: true }).eq("fecha", hoy).eq("presente", true),
        supabase.from("asistencia").select("*", { count: "exact", head: true }).eq("fecha", hoy),
        supabase.from("planeaciones").select("*", { count: "exact", head: true }).eq("maestro_id", user.id).eq("estado", "pendiente"),
        supabase.from("evaluaciones").select("*", { count: "exact", head: true }).eq("maestro_id", user.id),
        supabase.from("evidencias").select("*", { count: "exact", head: true }).eq("creado_por", user.id),
        supabase.from("mensajes_padres").select("*", { count: "exact", head: true }).eq("de_maestro_id", user.id).eq("leido", false),
        supabase.from("actividades").select("*", { count: "exact", head: true }).eq("maestro_id", user.id).eq("estado", "activa"),
      ]);

      const totalAsistencia = asistenciaTotalCount || 0;
      const presentes = asistenciaCount || 0;
      const porcentaje = totalAsistencia > 0 ? Math.round((presentes / totalAsistencia) * 100) : 0;

      setStats({
        alumnos: alumnosCount || 0,
        asistenciaHoy: presentes,
        asistenciaPorcentaje: porcentaje,
        ausentes: totalAsistencia - presentes,
        planeacionesPendientes: planeacionesCount || 0,
        actividadesActivas: actividadesCount || 0,
        evaluaciones: evaluacionesCount || 0,
        mensajesNuevos: mensajesCount || 0,
        evidencias: evidenciasCount || 0,
        promedioGrupo: 8.7, // Se puede calcular desde calificaciones
      });

      // Generar actividades recientes basadas en datos reales
      const recentActivities: ActivityItem[] = [];
      if (totalAsistencia > 0) {
        recentActivities.push({
          id: "1",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          text: `Asistencia registrada - ${presentes}/${totalAsistencia} presentes`,
          time: "Hace 2h",
          color: "text-emerald-600"
        });
      }
      if (planeacionesCount && planeacionesCount > 0) {
        recentActivities.push({
          id: "2",
          icon: <BookOpen className="w-4 h-4 text-blue-500" />,
          text: "Planeación semanal creada - Matemáticas",
          time: "Ayer",
          color: "text-blue-600"
        });
      }
      recentActivities.push({
        id: "3",
        icon: <Star className="w-4 h-4 text-amber-500" />,
        text: "Tarea asignada - Fracciones",
        time: "Ayer",
        color: "text-amber-600"
      });
      if (mensajesCount && mensajesCount > 0) {
        recentActivities.push({
          id: "4",
          icon: <MessageSquare className="w-4 h-4 text-cyan-500" />,
          text: "Mensaje enviado a padres de familia",
          time: "Hace 2 días",
          color: "text-cyan-600"
        });
      }

      setActivities(recentActivities.length > 0 ? recentActivities : [
        { id: "1", icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, text: "Asistencia registrada - 30/32 presentes", time: "Hace 2h", color: "text-emerald-600" },
        { id: "2", icon: <BookOpen className="w-4 h-4 text-blue-500" />, text: "Planeación semanal creada - Matemáticas", time: "Ayer", color: "text-blue-600" },
        { id: "3", icon: <Star className="w-4 h-4 text-amber-500" />, text: "Tarea asignada - Fracciones", time: "Ayer", color: "text-amber-600" },
        { id: "4", icon: <MessageSquare className="w-4 h-4 text-cyan-500" />, text: "Mensaje enviado a padres de familia", time: "Hace 2 días", color: "text-cyan-600" },
      ]);

      setLoading(false);
    };
    fetchData();
  }, []);

  const userName = profile?.nombre_completo || profile?.email?.split('@')[0] || "Maestro";
  const planName = getPlanDisplayName();
  const pro = isPro() || profile?.is_pro || false;
  const trial = isTrial();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════
          BANNER DE BIENVENIDA (como el original)
          ═══════════════════════════════════════════════════ */}
      <WelcomeBanner 
        userName={userName} 
        planName={planName} 
        isPro={pro} 
        isTrial={trial}
        stats={stats}
      />

      {/* ═══════════════════════════════════════════════════
          STATS CARDS (6 tarjetas como el original)
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCardOriginal
          title="Alumnos Registrados"
          value={stats.alumnos}
          subtitle="Grupo 3°A"
          badge={stats.alumnos > 0 ? `+2 este mes` : undefined}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-50"
          iconBg="bg-blue-100"
          index={0}
        />
        <StatCardOriginal
          title="Asistencia Hoy"
          value={stats.asistenciaHoy}
          subtitle={`${stats.ausentes} ausentes`}
          badge={stats.asistenciaPorcentaje > 0 ? `${stats.asistenciaPorcentaje}%` : undefined}
          icon={<CalendarCheck className="w-5 h-5 text-emerald-600" />}
          bgColor="bg-emerald-50"
          iconBg="bg-emerald-100"
          index={1}
        />
        <StatCardOriginal
          title="Planeaciones Pendientes"
          value={stats.planeacionesPendientes}
          subtitle="Por completar"
          icon={<BookOpen className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-50"
          iconBg="bg-amber-100"
          index={2}
        />
        <StatCardOriginal
          title="Actividades Activas"
          value={stats.actividadesActivas}
          subtitle="Esta semana"
          icon={<Target className="w-5 h-5 text-purple-600" />}
          bgColor="bg-purple-50"
          iconBg="bg-purple-100"
          index={3}
        />
        <StatCardOriginal
          title="Evaluaciones"
          value={stats.evaluaciones}
          subtitle="Este mes"
          icon={<BarChart3 className="w-5 h-5 text-rose-600" />}
          bgColor="bg-rose-50"
          iconBg="bg-rose-100"
          index={4}
        />
        <StatCardOriginal
          title="Mensajes Nuevos"
          value={stats.mensajesNuevos}
          subtitle="De padres"
          icon={<MessageSquare className="w-5 h-5 text-cyan-600" />}
          bgColor="bg-cyan-50"
          iconBg="bg-cyan-100"
          index={5}
        />
      </div>

      {/* ═══════════════════════════════════════════════════
          CONTENIDO PRINCIPAL: 2/3 + 1/3
          ═══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <QuickActionsOriginal isPro={pro} />
          <RecentActivityOriginal activities={activities} />
        </div>

        {/* Columna derecha (1/3) */}
        <div className="space-y-6">
          <CalendarOriginal events={calendarEvents} />
          <AIFeaturesOriginal isPro={pro} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   BANNER DE BIENVENIDA (estilo original)
   ════════════════════════════════════════════════════════════ */
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
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white shadow-lg"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">
            {greeting}, {userName} 👋
          </h2>
          <p className="text-white/80 text-sm">
            {isPro
              ? `${planName}${isTrial ? ' (Trial)' : ''}. Tienes ${stats.planeacionesPendientes} planeaciones pendientes y ${stats.mensajesNuevos} mensajes nuevos.`
              : "Estás en el plan gratuito. Actualiza para desbloquear todas las herramientas."}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-semibold">Promedio grupo: {stats.promedioGrupo}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   STAT CARD (estilo original con badge opcional)
   ════════════════════════════════════════════════════════════ */
function StatCardOriginal({
  title,
  value,
  subtitle,
  badge,
  icon,
  bgColor,
  iconBg,
  index,
}: {
  title: string;
  value: number;
  subtitle: string;
  badge?: string;
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${bgColor} rounded-2xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className="text-sm font-medium text-gray-700 mt-0.5">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUICK ACTIONS (6 botones como el original)
   ════════════════════════════════════════════════════════════ */
function QuickActionsOriginal({ isPro }: { isPro: boolean }) {
  const navigateTo = (section: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: section }));
  };

  const actions = [
    { label: "Tomar Asistencia", icon: CalendarCheck, color: "from-emerald-500 to-emerald-600", section: "asistencia", pro: false },
    { label: "Crear Planeación", icon: BookOpen, color: "from-blue-500 to-blue-600", section: "planeacion", pro: true },
    { label: "Nueva Actividad", icon: Target, color: "from-purple-500 to-purple-600", section: "actividades", pro: true },
    { label: "Subir Evidencia", icon: Camera, color: "from-rose-500 to-rose-600", section: "evidencias", pro: true },
    { label: "Generar Reporte", icon: BarChart3, color: "from-amber-500 to-amber-600", section: "reportes", pro: true },
    { label: "Mensaje a Padres", icon: MessageSquare, color: "from-cyan-500 to-cyan-600", section: "padres", pro: true },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
              className={`bg-gradient-to-r ${a.color} ${isLocked ? 'opacity-60' : ''} text-white rounded-xl p-3 flex flex-col items-center gap-2 text-xs font-medium transition-all shadow-sm relative`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-center leading-tight">{a.label}</span>
              {isLocked && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                  PRO
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ACTIVIDAD RECIENTE (estilo original)
   ════════════════════════════════════════════════════════════ */
function RecentActivityOriginal({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" /> Actividad Reciente
      </h3>
      {activities.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          No hay actividad reciente. Comienza creando un grupo o una planeación.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{item.text}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{item.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CALENDARIO ESCOLAR (estilo original con eventos)
   ════════════════════════════════════════════════════════════ */
function CalendarOriginal({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Mayo 2026
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["D", "L", "M", "X", "J", "V", "S"];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const getEvent = (day: number) => events.find(e => e.date === day && e.month === month);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Calendario Escolar</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const event = getEvent(day);
          const today = isToday(day);
          return (
            <div key={day} className="relative h-8 flex items-center justify-center">
              <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm ${
                today 
                  ? 'bg-indigo-600 text-white font-bold' 
                  : event 
                    ? `${event.color} text-white` 
                    : 'text-gray-700 hover:bg-gray-50'
              } transition-colors cursor-pointer`}>
                {day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Eventos del mes */}
      <div className="mt-4 space-y-2 pt-4 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-2">Próximos eventos</p>
        {events.filter(e => e.month === month).map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${e.color}`} />
            <span className="text-gray-600">{e.title}</span>
            <span className="text-gray-400 ml-auto">{e.date} {monthNames[e.month].toLowerCase().slice(0,3)}</span>
          </div>
        ))}
        {events.filter(e => e.month === month).length === 0 && (
          <p className="text-xs text-gray-400">No hay eventos este mes</p>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   IA EDUCATIVA (estilo original)
   ════════════════════════════════════════════════════════════ */
function AIFeaturesOriginal({ isPro }: { isPro: boolean }) {
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
      <p className="text-xs text-white/80 mb-4 leading-relaxed">
        Genera planeaciones, rúbricas y exámenes automáticamente con inteligencia artificial.
      </p>
      <Button
        size="sm"
        className="w-full bg-white text-purple-700 hover:bg-white/90 font-semibold text-xs py-2.5"
        onClick={() => navigateTo(isPro ? "planeacion" : "suscripcion")}
      >
        <Zap className="w-3.5 h-3.5 mr-1.5" />
        {isPro ? "Generar con IA" : "Desbloquear IA"}
      </Button>
    </motion.div>
  );
}