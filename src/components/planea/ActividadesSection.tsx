"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Target, FolderOpen, Users, CheckCircle2, Clock, AlertCircle,
  Trash2, Edit3, Eye, Save, GraduationCap, Award, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════ */
type TipoActividad = "tarea" | "proyecto" | "clase";
type NivelDesempeño = "inicial" | "en_desarrollo" | "suficiente" | "sobresaliente";

interface Actividad {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  materia: string;
  campoFormativo: string;
  grupo: string;
  fechaEntrega: string;
  descripcion: string;
  competencias: string;
  aprendizajesEsperados: string;
  evidencias: string;
  criteriosEvaluacion: string;
  indicadoresLogro?: string;
  nivelDesempeño?: NivelDesempeño;
  entregadas: number;
  total: number;
  creadoEn: string;
}

/* ═══════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════ */
const STORAGE_KEY = "pd_actividades_nem_v1";
const GRUPOS = ["3°A", "3°B", "4°A", "4°B", "5°A", "5°B"];

const CAMPOS_FORMATIVOS_NEM = [
  "Lenguajes",
  "Saberes y Pensamiento Científico",
  "Ética, Naturaleza y Sociedades",
  "De lo Humano y lo Comunitario",
  "Artes y Creatividad",
  "Educación Socioemocional",
];

const NIVELES_DESEMPENO = [
  { value: "inicial" as NivelDesempeño, label: "Inicial", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  { value: "en_desarrollo" as NivelDesempeño, label: "En desarrollo", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "suficiente" as NivelDesempeño, label: "Suficiente", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "sobresaliente" as NivelDesempeño, label: "Sobresaliente", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
];

/* ═══════════════════════════════════════════════════
   LOCALSTORAGE
   ═══════════════════════════════════════════════════ */
function getStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("pd-store-update", { detail: key }));
}

/* ─── Datos iniciales ─── */
const DATOS_INICIALES: Actividad[] = [
  {
    id: "act-1",
    titulo: "Proyecto: Ecosistemas locales",
    tipo: "proyecto",
    materia: "Ciencias Naturales",
    campoFormativo: "Saberes y Pensamiento Científico",
    grupo: "3°A",
    fechaEntrega: "2026-05-25",
    descripcion: "Investigar un ecosistema local: flora, fauna y factores bióticos/abióticos.",
    competencias: "Explora el mundo natural con curiosidad.",
    aprendizajesEsperados: "Identifica elementos bióticos y abióticos.",
    evidencias: "Infografía digital.",
    criteriosEvaluacion: "Precisión (40%), calidad visual (30%), colaboración (30%).",
    nivelDesempeño: "suficiente",
    entregadas: 18,
    total: 25,
    creadoEn: new Date().toISOString(),
  },
  {
    id: "act-2",
    titulo: "Lectura: El principito",
    tipo: "tarea",
    materia: "Español",
    campoFormativo: "Lenguajes",
    grupo: "3°A",
    fechaEntrega: "2026-05-18",
    descripcion: "Lectura capítulos 1-5 y cuestionario de comprensión.",
    competencias: "Lee y comunica ideas con creatividad.",
    aprendizajesEsperados: "Comprende sentido literal e inferencial.",
    evidencias: "Cuestionario respondido.",
    criteriosEvaluacion: "Comprensión (50%), inferencia (30%), expresión (20%).",
    entregadas: 22,
    total: 25,
    creadoEn: new Date().toISOString(),
  },
  {
    id: "act-3",
    titulo: "Fracciones en clase",
    tipo: "clase",
    materia: "Matemáticas",
    campoFormativo: "Saberes y Pensamiento Científico",
    grupo: "3°A",
    fechaEntrega: "2026-05-15",
    descripcion: "Resolución de problemas contextualizados con fracciones.",
    competencias: "Piensa críticamente.",
    aprendizajesEsperados: "Resuelve problemas con fracciones.",
    evidencias: "Bitácora de parejas.",
    criteriosEvaluacion: "Procedimiento (40%), argumentación (30%), colaboración (30%).",
    entregadas: 25,
    total: 25,
    creadoEn: new Date().toISOString(),
  },
];

/* ═══════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════ */
function useActividadesStore() {
  const [state, setState] = useState<Actividad[]>(() => {
    const stored = getStore<Actividad[]>(STORAGE_KEY, []);
    if (stored.length === 0) {
      setStore(STORAGE_KEY, DATOS_INICIALES);
      return DATOS_INICIALES;
    }
    return stored;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail === STORAGE_KEY) {
        setState(getStore<Actividad[]>(STORAGE_KEY, []));
      }
    };
    window.addEventListener("pd-store-update", handler);
    return () => window.removeEventListener("pd-store-update", handler);
  }, []);

  const updater = useCallback(
    (value: Actividad[] | ((prev: Actividad[]) => Actividad[])) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: Actividad[]) => Actividad[])(prev) : value;
        setStore(STORAGE_KEY, next);
        return next;
      });
    },
    []
  );

  return [state, updater] as const;
}

/* ═══════════════════════════════════════════════════
   UTILIDADES
   ═══════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════ */
export default function ActividadesSection() {
  const [actividades, setActividades] = useActividadesStore();
  const [activeTab, setActiveTab] = useState<TipoActividad | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"crear" | "editar" | "ver">("crear");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  /* Debug montaje */
  useEffect(() => {
    console.log("[ActividadesSection] Montado. Actividades:", actividades.length);
  }, []);

  /* ─── Filtrado ─── */
  const filtradas = actividades.filter((a) => {
    const coincideTab = activeTab === "todas" ? true : a.tipo === activeTab;
    const q = busqueda.toLowerCase();
    const coincideBusqueda =
      a.titulo.toLowerCase().includes(q) ||
      a.materia.toLowerCase().includes(q) ||
      a.campoFormativo.toLowerCase().includes(q) ||
      a.grupo.toLowerCase().includes(q);
    return coincideTab && coincideBusqueda;
  });

  /* ─── Handlers ─── */
  const handleNueva = () => {
    console.log("[CLICK] Nueva Actividad");
    setModalMode("crear");
    setEditingId(null);
    setModalOpen(true);
  };

  const handleGuardar = (data: Omit<Actividad, "id" | "creadoEn">) => {
    console.log("[CLICK] Guardar");
    if (modalMode === "editar" && editingId) {
      setActividades((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, ...data, id: a.id, creadoEn: a.creadoEn } : a))
      );
    } else {
      const nueva: Actividad = { ...data, id: generarId(), creadoEn: new Date().toISOString() };
      setActividades((prev) => [nueva, ...prev]);
    }
    setModalOpen(false);
    setEditingId(null);
  };

  const handleEliminar = (id: string) => {
    console.log("[CLICK] Eliminar", id);
    setActividades((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  };

  const handleEditar = (id: string) => {
    console.log("[CLICK] Editar", id);
    setEditingId(id);
    setModalMode("editar");
    setModalOpen(true);
  };

  const handleVer = (id: string) => {
    console.log("[CLICK] Ver", id);
    setEditingId(id);
    setModalMode("ver");
    setModalOpen(true);
  };

  const actividadParaEditar = editingId ? actividades.find((a) => a.id === editingId) : undefined;

  /* ─── Tabs ─── */
  const tabs = [
    { id: "todas" as const, label: "Todas" },
    { id: "tarea" as const, label: "Tareas" },
    { id: "proyecto" as const, label: "Proyectos" },
    { id: "clase" as const, label: "En Clase" },
  ];

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                console.log("[CLICK] Tab:", t.id);
                setActiveTab(t.id);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar actividad, materia, campo formativo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button type="button" size="sm" className="gap-2 shrink-0" onClick={handleNueva}>
            <Plus className="w-4 h-4" /> Nueva Actividad
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {filtradas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay actividades que coincidan.</p>
          </div>
        ) : (
          filtradas.map((a) => {
            const pct = Math.round((a.entregadas / a.total) * 100) || 0;
            const Icon = a.tipo === "tarea" ? Target : a.tipo === "proyecto" ? FolderOpen : Users;
            const colorBg =
              a.tipo === "tarea" ? "bg-blue-100 dark:bg-blue-950" :
              a.tipo === "proyecto" ? "bg-purple-100 dark:bg-purple-950" :
              "bg-emerald-100 dark:bg-emerald-950";
            const colorText =
              a.tipo === "tarea" ? "text-blue-600" :
              a.tipo === "proyecto" ? "text-purple-600" :
              "text-emerald-600";
            const nivelInfo = a.nivelDesempeño
              ? NIVELES_DESEMPENO.find((n) => n.value === a.nivelDesempeño)
              : null;

            return (
              <div
                key={a.id}
                className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorBg}`}>
                    <Icon className={`w-5 h-5 ${colorText}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{a.titulo}</h4>
                      <div className="flex gap-1.5 flex-wrap shrink-0">
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {a.materia}
                        </span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {a.campoFormativo}
                        </span>
                        {nivelInfo && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${nivelInfo.color}`}>
                            <Award className="w-3 h-3 inline mr-1" />
                            {nivelInfo.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatearFecha(a.fechaEntrega)}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> {a.grupo}
                      </span>
                      <span className="flex items-center gap-1">
                        {pct === 100 ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
                        {a.entregadas}/{a.total}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {a.descripcion}
                    </p>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            pct === 100 ? "bg-emerald-500" : pct > 60 ? "bg-blue-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleVer(a.id)}
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => handleEditar(a.id)}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => setConfirmDelete(a.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ MODAL NATIVO (sin Framer Motion, sin sticky) ═══ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalOpen(false);
              setEditingId(null);
            }
          }}
        >
          <div className="bg-background rounded-2xl w-full max-w-2xl border border-border shadow-xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold text-lg">
                {modalMode === "crear" ? "Nueva Actividad" : modalMode === "editar" ? "Editar Actividad" : "Detalle"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-muted rounded-lg"
              >
                ×
              </button>
            </div>

            <ModalForm
              mode={modalMode}
              initialData={actividadParaEditar}
              onSave={handleGuardar}
              onClose={() => {
                setModalOpen(false);
                setEditingId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Confirmación eliminar */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl p-6 max-w-sm w-full border border-border shadow-xl">
            <h3 className="font-semibold text-lg mb-2">¿Eliminar actividad?</h3>
            <p className="text-sm text-muted-foreground mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => handleEliminar(confirmDelete)}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   FORMULARIO INTERNO
   ═══════════════════════════════════════════════════ */
function ModalForm({
  mode,
  initialData,
  onSave,
  onClose,
}: {
  mode: "crear" | "editar" | "ver";
  initialData?: Actividad;
  onSave: (data: Omit<Actividad, "id" | "creadoEn">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Actividad, "id" | "creadoEn">>(() => ({
    titulo: initialData?.titulo ?? "",
    tipo: initialData?.tipo ?? "tarea",
    materia: initialData?.materia ?? "",
    campoFormativo: initialData?.campoFormativo ?? CAMPOS_FORMATIVOS_NEM[0],
    grupo: initialData?.grupo ?? GRUPOS[0],
    fechaEntrega: initialData?.fechaEntrega ?? "",
    descripcion: initialData?.descripcion ?? "",
    competencias: initialData?.competencias ?? "",
    aprendizajesEsperados: initialData?.aprendizajesEsperados ?? "",
    evidencias: initialData?.evidencias ?? "",
    criteriosEvaluacion: initialData?.criteriosEvaluacion ?? "",
    indicadoresLogro: initialData?.indicadoresLogro ?? "",
    nivelDesempeño: initialData?.nivelDesempeño ?? "en_desarrollo",
    entregadas: initialData?.entregadas ?? 0,
    total: initialData?.total ?? 25,
  }));

  const isReadOnly = mode === "ver";

  const handleChange = (field: keyof Omit<Actividad, "id" | "creadoEn">, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    console.log("[CLICK] Submit formulario");
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Título</label>
          <input
            readOnly={isReadOnly}
            value={form.titulo}
            onChange={(e) => handleChange("titulo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Tipo</label>
          <select
            disabled={isReadOnly}
            value={form.tipo}
            onChange={(e) => handleChange("tipo", e.target.value as TipoActividad)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          >
            <option value="tarea">Tarea</option>
            <option value="proyecto">Proyecto</option>
            <option value="clase">En Clase</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Grupo</label>
          <select
            disabled={isReadOnly}
            value={form.grupo}
            onChange={(e) => handleChange("grupo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          >
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Materia</label>
          <input
            readOnly={isReadOnly}
            value={form.materia}
            onChange={(e) => handleChange("materia", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Fecha entrega</label>
          <input
            readOnly={isReadOnly}
            type="date"
            value={form.fechaEntrega}
            onChange={(e) => handleChange("fechaEntrega", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Campo Formativo</label>
          <select
            disabled={isReadOnly}
            value={form.campoFormativo}
            onChange={(e) => handleChange("campoFormativo", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          >
            {CAMPOS_FORMATIVOS_NEM.map((cf) => (
              <option key={cf} value={cf}>
                {cf}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Competencias</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.competencias}
            onChange={(e) => handleChange("competencias", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Aprendizajes esperados</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.aprendizajesEsperados}
            onChange={(e) => handleChange("aprendizajesEsperados", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Evidencias</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.evidencias}
            onChange={(e) => handleChange("evidencias", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Criterios evaluación</label>
          <textarea
            readOnly={isReadOnly}
            rows={2}
            value={form.criteriosEvaluacion}
            onChange={(e) => handleChange("criteriosEvaluacion", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Indicadores logro</label>
          <input
            readOnly={isReadOnly}
            value={form.indicadoresLogro}
            onChange={(e) => handleChange("indicadoresLogro", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Nivel desempeño</label>
          <select
            disabled={isReadOnly}
            value={form.nivelDesempeño}
            onChange={(e) => handleChange("nivelDesempeño", e.target.value as NivelDesempeño)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          >
            {NIVELES_DESEMPENO.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium mb-1">Descripción</label>
          <textarea
            readOnly={isReadOnly}
            rows={3}
            value={form.descripcion}
            onChange={(e) => handleChange("descripcion", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60 resize-none"
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
            onChange={(e) => handleChange("entregadas", parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Total</label>
          <input
            readOnly={isReadOnly}
            type="number"
            min={1}
            value={form.total}
            onChange={(e) => handleChange("total", parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm disabled:opacity-60"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        {!isReadOnly && (
          <Button type="submit" className="gap-2">
            <Save className="w-4 h-4" />
            {mode === "crear" ? "Guardar" : "Guardar Cambios"}
          </Button>
        )}
      </div>
    </form>
  );
}