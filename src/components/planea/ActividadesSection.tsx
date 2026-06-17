"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Target, FolderOpen, Users, CheckCircle2, Clock, AlertCircle,
  Trash2, Edit3, Eye, Save, GraduationCap, Award, Search, Loader2,
  BookOpen, Filter, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════
   TIPOS NEM (Nueva Escuela Mexicana)
   ═══════════════════════════════════════════════════════════════════════════ */
type TipoActividad = "tarea" | "proyecto" | "clase";
type NivelDesempeño = "inicial" | "en_desarrollo" | "suficiente" | "sobresaliente";

interface Actividad {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  materia: string;
  campo_formativo: string;
  grupo: string;
  fecha_entrega: string;
  descripcion: string;
  competencias: string;
  aprendizajes_esperados: string;
  evidencias: string;
  criterios_evaluacion: string;
  indicadores_logro?: string;
  nivel_desempeño?: NivelDesempeño;
  entregadas: number;
  total: number;
  user_id?: string;
  creado_en: string;
}

/* ── Constantes NEM ───────────────────────────────────────────────────── */
const CAMPOS_FORMATIVOS_NEM = [
  "Lenguajes",
  "Saberes y Pensamiento Científico",
  "Ética, Naturaleza y Sociedades",
  "De lo Humano y lo Comunitario",
  "Artes y Creatividad",
  "Educación Socioemocional",
];

const NIVELES_DESEMPENO = [
  { value: "inicial" as NivelDesempeño, label: "Inicial", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200" },
  { value: "en_desarrollo" as NivelDesempeño, label: "En desarrollo", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200" },
  { value: "suficiente" as NivelDesempeño, label: "Suficiente", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200" },
  { value: "sobresaliente" as NivelDesempeño, label: "Sobresaliente", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200" },
];

const GRUPOS = ["3°A", "3°B", "4°A", "4°B", "5°A", "5°B", "6°A", "6°B"];

const STORAGE_KEY = "pd_actividades_nem_v1";

/* ═══════════════════════════════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════════════════════════════ */
function generarId() {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatearFecha(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function getLocalStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ActividadesSection() {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [activeTab, setActiveTab] = useState<TipoActividad | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"crear" | "editar" | "ver">("crear");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [useSupabase, setUseSupabase] = useState(true);

  /* ── Cargar datos: intenta Supabase primero, fallback a localStorage ──── */
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid && useSupabase) {
        try {
          const { data, error } = await supabase
            .from("actividades")
            .select("*")
            .eq("user_id", uid)
            .order("creado_en", { ascending: false });

          if (!error && data && data.length > 0) {
            setActividades(data as Actividad[]);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("[Actividades] Supabase no disponible, usando localStorage:", e);
        }
      }

      // Fallback a localStorage
      const stored = getLocalStore<Actividad[]>(STORAGE_KEY, []);
      setActividades(stored);
      setLoading(false);
    };
    load();
  }, [useSupabase]);

  /* ── Guardar en localStorage cuando cambian ───────────────────────────── */
  useEffect(() => {
    if (!loading && actividades.length > 0) {
      setLocalStore(STORAGE_KEY, actividades);
    }
  }, [actividades, loading]);

  /* ── Filtrado ─────────────────────────────────────────────────────────── */
  const filtradas = actividades.filter((a) => {
    const coincideTab = activeTab === "todas" ? true : a.tipo === activeTab;
    const q = busqueda.toLowerCase();
    const coincideBusqueda =
      a.titulo.toLowerCase().includes(q) ||
      a.materia.toLowerCase().includes(q) ||
      a.campo_formativo.toLowerCase().includes(q) ||
      a.grupo.toLowerCase().includes(q);
    return coincideTab && coincideBusqueda;
  });

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleNueva = () => {
    setModalMode("crear");
    setEditingId(null);
    setModalOpen(true);
  };

  const handleGuardar = async (data: Omit<Actividad, "id" | "creado_en">) => {
    try {
      if (modalMode === "editar" && editingId) {
        const actualizadas = actividades.map((a) =>
          a.id === editingId ? { ...a, ...data, id: a.id, creado_en: a.creado_en } : a
        );
        setActividades(actualizadas);
        toast.success("Actividad actualizada correctamente");

        // Sync Supabase si está disponible
        if (userId && useSupabase) {
          await supabase.from("actividades").update(data).eq("id", editingId);
        }
      } else {
        const nueva: Actividad = { ...data, id: generarId(), creado_en: new Date().toISOString() };
        setActividades((prev) => [nueva, ...prev]);
        toast.success("Actividad creada correctamente");

        if (userId && useSupabase) {
          await supabase.from("actividades").insert({ ...nueva, user_id: userId });
        }
      }
      setModalOpen(false);
      setEditingId(null);
    } catch (err) {
      toast.error("Error al guardar la actividad");
      console.error(err);
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      setActividades((prev) => prev.filter((a) => a.id !== id));
      setConfirmDelete(null);
      toast.success("Actividad eliminada");

      if (userId && useSupabase) {
        await supabase.from("actividades").delete().eq("id", id);
      }
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const handleEditar = (id: string) => {
    setEditingId(id);
    setModalMode("editar");
    setModalOpen(true);
  };

  const handleVer = (id: string) => {
    setEditingId(id);
    setModalMode("ver");
    setModalOpen(true);
  };

  const actividadParaEditar = editingId ? actividades.find((a) => a.id === editingId) : undefined;

  /* ── Tabs ─────────────────────────────────────────────────────────────── */
  const tabs = [
    { id: "todas" as const, label: "Todas", count: actividades.length },
    { id: "tarea" as const, label: "Tareas", count: actividades.filter((a) => a.tipo === "tarea").length },
    { id: "proyecto" as const, label: "Proyectos", count: actividades.filter((a) => a.tipo === "proyecto").length },
    { id: "clase" as const, label: "En Clase", count: actividades.filter((a) => a.tipo === "clase").length },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.count}</Badge>
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar actividad, materia, campo formativo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button type="button" size="sm" className="gap-2 shrink-0" onClick={handleNueva}>
            <Plus className="w-4 h-4" /> Nueva
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {filtradas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border border-dashed">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No hay actividades que coincidan</p>
            <p className="text-xs mt-1">Crea una nueva actividad para comenzar</p>
            <Button size="sm" className="mt-4 gap-2" onClick={handleNueva}>
              <Plus className="w-4 h-4" /> Crear actividad
            </Button>
          </div>
        ) : (
          filtradas.map((a) => {
            const pct = Math.round((a.entregadas / a.total) * 100) || 0;
            const Icon = a.tipo === "tarea" ? Target : a.tipo === "proyecto" ? FolderOpen : Users;
            const colorBg = a.tipo === "tarea" ? "bg-blue-100 dark:bg-blue-950" : a.tipo === "proyecto" ? "bg-purple-100 dark:bg-purple-950" : "bg-emerald-100 dark:bg-emerald-950";
            const colorText = a.tipo === "tarea" ? "text-blue-600" : a.tipo === "proyecto" ? "text-purple-600" : "text-emerald-600";
            const nivelInfo = a.nivel_desempeño ? NIVELES_DESEMPENO.find((n) => n.value === a.nivel_desempeño) : null;
            const isVencida = new Date(a.fecha_entrega) < new Date() && pct < 100;

            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all group ${
                  isVencida ? "border-red-200 dark:border-red-800" : "border-border"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorBg}`}>
                    <Icon className={`w-5 h-5 ${colorText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h4 className="font-semibold text-foreground">{a.titulo}</h4>
                        {isVencida && (
                          <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 mt-1">
                            <AlertCircle className="w-3 h-3 mr-1" /> Vencida
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-wrap shrink-0">
                        <Badge variant="outline" className="text-[10px] px-2 py-0">
                          {a.materia}
                        </Badge>
                        <Badge className="text-[10px] px-2 py-0 bg-primary/10 text-primary border-0">
                          {a.campo_formativo}
                        </Badge>
                        {nivelInfo && (
                          <Badge variant="outline" className={`text-[10px] px-2 py-0 ${nivelInfo.color}`}>
                            <Award className="w-3 h-3 inline mr-1" />
                            {nivelInfo.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatearFecha(a.fecha_entrega)}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {a.grupo}
                      </span>
                      <span className="flex items-center gap-1">
                        {pct === 100 ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className={`w-3 h-3 ${isVencida ? "text-red-500" : "text-amber-500"}`} />
                        )}
                        {a.entregadas}/{a.total}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {a.descripcion}
                    </p>

                    {/* Progreso */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progreso de entregas</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            pct === 100 ? "bg-emerald-500" : pct > 60 ? "bg-blue-500" : isVencida ? "bg-red-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleVer(a.id)}>
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleEditar(a.id)}>
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmDelete(a.id)}>
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ═══ MODAL ═══ */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setModalOpen(false);
                setEditingId(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-background rounded-2xl w-full max-w-2xl border border-border shadow-xl my-8"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  {modalMode === "crear" ? <Plus className="w-5 h-5" /> : modalMode === "editar" ? <Edit3 className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  {modalMode === "crear" ? "Nueva Actividad NEM" : modalMode === "editar" ? "Editar Actividad" : "Detalle de Actividad"}
                </h2>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setEditingId(null); }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ModalForm
                mode={modalMode}
                initialData={actividadParaEditar}
                onSave={handleGuardar}
                onClose={() => { setModalOpen(false); setEditingId(null); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación eliminar */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-background rounded-2xl p-6 max-w-sm w-full border border-border shadow-xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-center">¿Eliminar actividad?</h3>
              <p className="text-sm text-muted-foreground mb-5 text-center">Esta acción no se puede deshacer. La actividad se eliminará permanentemente.</p>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => handleEliminar(confirmDelete)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORMULARIO MODAL
   ═══════════════════════════════════════════════════════════════════════════ */
function ModalForm({
  mode,
  initialData,
  onSave,
  onClose,
}: {
  mode: "crear" | "editar" | "ver";
  initialData?: Actividad;
  onSave: (data: Omit<Actividad, "id" | "creado_en">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Actividad, "id" | "creado_en">>(() => ({
    titulo: initialData?.titulo ?? "",
    tipo: initialData?.tipo ?? "tarea",
    materia: initialData?.materia ?? "",
    campo_formativo: initialData?.campo_formativo ?? CAMPOS_FORMATIVOS_NEM[0],
    grupo: initialData?.grupo ?? GRUPOS[0],
    fecha_entrega: initialData?.fecha_entrega ?? new Date().toISOString().split("T")[0],
    descripcion: initialData?.descripcion ?? "",
    competencias: initialData?.competencias ?? "",
    aprendizajes_esperados: initialData?.aprendizajes_esperados ?? "",
    evidencias: initialData?.evidencias ?? "",
    criterios_evaluacion: initialData?.criterios_evaluacion ?? "",
    indicadores_logro: initialData?.indicadores_logro ?? "",
    nivel_desempeño: initialData?.nivel_desempeño ?? "en_desarrollo",
    entregadas: initialData?.entregadas ?? 0,
    total: initialData?.total ?? 25,
  }));

  const isReadOnly = mode === "ver";

  const handleChange = (field: keyof Omit<Actividad, "id" | "creado_en">, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!form.titulo.trim()) { toast.error("El título es obligatorio"); return; }
    if (!form.materia.trim()) { toast.error("La materia es obligatoria"); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Título *</label>
          <input
            readOnly={isReadOnly}
            value={form.titulo}
            onChange={(e) => handleChange("titulo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Proyecto de Ecosistemas"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Tipo</label>
          <select
            disabled={isReadOnly}
            value={form.tipo}
            onChange={(e) => handleChange("tipo", e.target.value as TipoActividad)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="tarea">📝 Tarea</option>
            <option value="proyecto">📁 Proyecto</option>
            <option value="clase">👥 En Clase</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Grupo</label>
          <select
            disabled={isReadOnly}
            value={form.grupo}
            onChange={(e) => handleChange("grupo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Materia *</label>
          <input
            readOnly={isReadOnly}
            value={form.materia}
            onChange={(e) => handleChange("materia", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Ciencias Naturales"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Fecha de entrega</label>
          <input
            readOnly={isReadOnly}
            type="date"
            value={form.fecha_entrega}
            onChange={(e) => handleChange("fecha_entrega", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Campo Formativo (NEM)</label>
          <select
            disabled={isReadOnly}
            value={form.campo_formativo}
            onChange={(e) => handleChange("campo_formativo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {CAMPOS_FORMATIVOS_NEM.map((cf) => <option key={cf} value={cf}>{cf}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Competencias a desarrollar</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.competencias}
            onChange={(e) => handleChange("competencias", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Lee y comunica ideas con creatividad..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Aprendizajes esperados</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.aprendizajes_esperados}
            onChange={(e) => handleChange("aprendizajes_esperados", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Identifica elementos bióticos y abióticos..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Evidencias de aprendizaje</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.evidencias}
            onChange={(e) => handleChange("evidencias", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Infografía digital, cuestionario..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Criterios de evaluación</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.criterios_evaluacion}
            onChange={(e) => handleChange("criterios_evaluacion", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Ej: Precisión 40%, calidad visual 30%..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Indicadores de logro</label>
          <input
            readOnly={isReadOnly}
            value={form.indicadores_logro}
            onChange={(e) => handleChange("indicadores_logro", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Nivel de desempeño</label>
          <select
            disabled={isReadOnly}
            value={form.nivel_desempeño}
            onChange={(e) => handleChange("nivel_desempeño", e.target.value as NivelDesempeño)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {NIVELES_DESEMPENO.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Descripción general</label>
          <textarea
            readOnly={isReadOnly}
            rows={3}
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Describe la actividad, objetivos y metodología..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Entregadas</label>
          <input
            readOnly={isReadOnly}
            type="number"
            min={0}
            max={form.total}
            value={form.entregadas}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onChange={(e) => {
              const v = e.target.value;
              handleChange("entregadas", v === "" ? 0 : Math.max(0, parseInt(v) || 0));
            }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Total de alumnos</label>
          <input
            readOnly={isReadOnly}
            type="number"
            min={1}
            value={form.total}
            onFocus={(e) => e.target.select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onChange={(e) => {
              const v = e.target.value;
              handleChange("total", v === "" ? 1 : Math.max(1, parseInt(v) || 1));
            }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {isReadOnly ? "Cerrar" : "Cancelar"}
        </Button>
        {!isReadOnly && (
          <Button type="submit" className="gap-2">
            <Save className="w-4 h-4" />
            {mode === "crear" ? "Guardar Actividad" : "Guardar Cambios"}
          </Button>
        )}
      </div>
    </form>
  );
}
