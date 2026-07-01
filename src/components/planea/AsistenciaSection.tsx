"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Search, Trash2, Check, X, Loader2, ClipboardCheck,
  FileText, BarChart3, UserCheck, UserX, Clock, Save,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMisGrupos } from "./useMisGrupos";

/* ═════════════════════ TIPOS ═════════════════════ */

type EstadoAsistencia = "presente" | "ausente" | "retardo" | "justificado";

interface RegistroIndividual {
  alumno_id: string;
  alumno_nombre: string;
  estado: EstadoAsistencia;
  nota?: string;
}

interface AsistenciaDia {
  id: string;
  user_id: string;
  fecha: string;
  grupo: string;
  registros: RegistroIndividual[];
  creado_en: string;
}

interface Justificacion {
  id: string;
  user_id: string;
  alumno_id: string;
  alumno_nombre: string;
  desde: string;
  hasta: string;
  motivo: string;
  creado_en: string;
}

interface AlumnoMini {
  id: string;
  nombre: string;
  grupo: string;
  activo: boolean;
}

type AsistenciaTab = "registro" | "justificaciones" | "reportes";

const GRUPOS = [
  "1°A", "1°B", "1°C", "1°D",
  "2°A", "2°B", "2°C", "2°D",
  "3°A", "3°B", "3°C", "3°D",
  "4°A", "4°B", "4°C", "4°D",
  "5°A", "5°B", "5°C", "5°D",
  "6°A", "6°B", "6°C", "6°D",
];

const TABS: { id: AsistenciaTab; label: string; icon: React.ElementType }[] = [
  { id: "registro", label: "Registro Diario", icon: ClipboardCheck },
  { id: "justificaciones", label: "Justificaciones", icon: FileText },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
];

const ESTADOS: Record<EstadoAsistencia, { label: string; className: string; icon: React.ElementType }> = {
  presente: { label: "Presente", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: UserCheck },
  ausente: { label: "Ausente", className: "bg-red-100 text-red-700 border-red-200", icon: UserX },
  retardo: { label: "Retardo", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  justificado: { label: "Justificado", className: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
};

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function AsistenciaSection() {
  const [activeTab, setActiveTab] = useState<AsistenciaTab>("registro");

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "registro" && <RegistroDiarioView />}
          {activeTab === "justificaciones" && <JustificacionesView />}
          {activeTab === "reportes" && <ReportesView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ REGISTRO DIARIO (SUPABASE) ═════════════════════ */

function grupoMasComun(lista: { grupo?: string }[], fallback: string): string {
  const counts: Record<string, number> = {};
  for (const a of lista) { if (a.grupo) counts[a.grupo] = (counts[a.grupo] || 0) + 1; }
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
  return top ? top[0] : fallback;
}

function RegistroDiarioView() {
  const [alumnos, setAlumnos] = useState<AlumnoMini[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const misGrupos = useMisGrupos();
  useEffect(() => { if (misGrupos.length > 0) setGrupo((g) => misGrupos.includes(g) ? g : misGrupos[0]); }, [misGrupos]);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const [{ data: alData }, { data: asData }] = await Promise.all([
        supabase.from("alumnos").select("id, nombre, grupo, activo").eq("user_id", uid).eq("activo", true),
        supabase.from("asistencia").select("*").eq("user_id", uid).order("fecha", { ascending: false }),
      ]);

      setAlumnos((alData as AlumnoMini[]) || []);
      setAsistencias((asData as AsistenciaDia[]) || []);
    } catch (err) {
      console.error("[Asistencia] Error cargando:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Si hay alumnos, autoselecciona el grupo más común (en vez de quedarse en 1° A)
  useEffect(() => {
    if (alumnos.length > 0) {
      setGrupo((g) => (g === GRUPOS[0] ? grupoMasComun(alumnos, g) : g));
    }
  }, [alumnos]);

  const alumnosGrupo = useMemo(() => alumnos.filter((a) => a.grupo === grupo), [alumnos, grupo]);

  const registroExistente = useMemo(() => {
    return asistencias.find((a) => a.fecha === fecha && a.grupo === grupo);
  }, [asistencias, fecha, grupo]);

  const [registros, setRegistros] = useState<RegistroIndividual[]>([]);

  useEffect(() => {
    const previos = registroExistente?.registros || [];
    const idsValidos = new Set(alumnosGrupo.map((a) => a.id));
    // Conserva las marcas previas SOLO de alumnos que siguen en el grupo
    const base = previos.filter((r) => idsValidos.has(r.alumno_id));
    const yaIncluidos = new Set(base.map((r) => r.alumno_id));
    // Agrega los alumnos del grupo que aún no están en el registro
    const faltantes = alumnosGrupo
      .filter((a) => !yaIncluidos.has(a.id))
      .map((a) => ({
        alumno_id: a.id,
        alumno_nombre: a.nombre,
        estado: "presente" as EstadoAsistencia,
        nota: "",
      }));
    setRegistros([...base, ...faltantes]);
  }, [registroExistente, alumnosGrupo]);

  const toggleEstado = (alumnoId: string) => {
    setRegistros((prev) =>
      prev.map((r) => {
        if (r.alumno_id !== alumnoId) return r;
        const estados: EstadoAsistencia[] = ["presente", "ausente", "retardo", "justificado"];
        const idx = estados.indexOf(r.estado);
        const next = estados[(idx + 1) % estados.length];
        return { ...r, estado: next };
      })
    );
  };

  const handleSave = async () => {
    if (!userId) { toast.error("Debes iniciar sesión."); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        fecha,
        grupo,
        registros,
      };

      let error;
      if (registroExistente) {
        const { error: updError } = await supabase
          .from("asistencia")
          .update({ registros, creado_en: new Date().toISOString() })
          .eq("id", registroExistente.id);
        error = updError;
      } else {
        const { error: insError } = await supabase.from("asistencia").insert(payload);
        error = insError;
      }

      if (error) {
        if (error.code === "42P01") {
          toast.error("❌ La tabla 'asistencia' no existe. Ejecuta el SQL de configuración.");
        } else {
          throw error;
        }
      } else {
        toast.success("Asistencia guardada correctamente.");
        loadData();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = registros.length;
    const presentes = registros.filter((r) => r.estado === "presente").length;
    const ausentes = registros.filter((r) => r.estado === "ausente").length;
    const retardos = registros.filter((r) => r.estado === "retardo").length;
    const justificados = registros.filter((r) => r.estado === "justificado").length;
    return { total, presentes, ausentes, retardos, justificados };
  }, [registros]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-transparent text-sm outline-none" />
        </div>
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {(misGrupos.length ? misGrupos : GRUPOS).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Button size="sm" className="gap-2 ml-auto" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando..." : registroExistente ? "Actualizar Registro" : "Guardar Registro"}
        </Button>
      </div>

      {alumnosGrupo.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-card rounded-xl border border-border">
          <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay alumnos activos en el grupo {grupo}.</p>
          <p className="text-xs mt-1">Registra alumnos primero en la sección de Alumnos.</p>
        </div>
      )}

      {alumnosGrupo.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Presentes", value: stats.presentes, className: "bg-emerald-50 text-emerald-700" },
              { label: "Ausentes", value: stats.ausentes, className: "bg-red-50 text-red-700" },
              { label: "Retardos", value: stats.retardos, className: "bg-amber-50 text-amber-700" },
              { label: "Justificados", value: stats.justificados, className: "bg-blue-50 text-blue-700" },
            ].map((s) => (
              <div key={s.label} className={`${s.className} rounded-xl p-3 border border-border text-center`}>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {registros.map((r) => {
              const cfg = ESTADOS[r.estado];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={r.alumno_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-card rounded-xl p-3 border border-border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {r.alumno_nombre[0]}
                    </div>
                    <span className="text-sm font-medium">{r.alumno_nombre}</span>
                  </div>
                  <button
                    onClick={() => toggleEstado(r.alumno_id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${cfg.className}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cfg.label}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ═════════════════════ JUSTIFICACIONES (SUPABASE) ═════════════════════ */

function JustificacionesView() {
  const misGrupos = useMisGrupos();
  const [justificaciones, setJustificaciones] = useState<Justificacion[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grupoFiltro, setGrupoFiltro] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const [{ data: jData }, { data: alData }] = await Promise.all([
        supabase.from("justificaciones").select("*").eq("user_id", uid).order("desde", { ascending: false }),
        supabase.from("alumnos").select("id, nombre, grupo, activo").eq("user_id", uid).eq("activo", true),
      ]);

      setJustificaciones((jData as Justificacion[]) || []);
      setAlumnos((alData as AlumnoMini[]) || []);
    } catch (err) {
      console.error("[Justificaciones] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const grupoDeAlumno = (alumnoId: string) => alumnos.find((a) => a.id === alumnoId)?.grupo || "";
  const filtered = justificaciones.filter((j) =>
    (j.alumno_nombre.toLowerCase().includes(search.toLowerCase()) ||
    j.motivo.toLowerCase().includes(search.toLowerCase())) &&
    (!grupoFiltro || grupoDeAlumno(j.alumno_id) === grupoFiltro)
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta justificación?")) return;
    try {
      const { error } = await supabase.from("justificaciones").delete().eq("id", id);
      if (error) throw error;
      setJustificaciones((prev) => prev.filter((j) => j.id !== id));
      toast.success("Justificación eliminada.");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar justificación..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <select value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)} className="bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary">
          <option value="">Todos los grupos</option>
          {(misGrupos.length ? misGrupos : GRUPOS).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nueva Justificación
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay justificaciones registradas.</p>
          <p className="text-xs">Registra justificaciones de ausencias aquí.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((j, i) => (
          <motion.div key={j.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-semibold">{j.alumno_nombre}</h4>
                  <Badge className="text-xs bg-blue-100 text-blue-700">Justificado</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  {formatDate(j.desde)} → {formatDate(j.hasta)}
                </p>
                <p className="text-sm text-foreground">{j.motivo}</p>
              </div>
              <button onClick={() => handleDelete(j.id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && <NuevaJustificacionModal onClose={() => { setShowModal(false); loadData(); }} alumnos={alumnos} userId={userId} />}
      </AnimatePresence>
    </div>
  );
}

function NuevaJustificacionModal({ onClose, alumnos, userId }: { onClose: () => void; alumnos: AlumnoMini[]; userId: string | null }) {
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!alumnoId || !desde || !hasta || !motivo.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }
    if (!userId) { toast.error("Debes iniciar sesión."); return; }
    if (new Date(desde) > new Date(hasta)) {
      toast.error("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
      return;
    }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("justificaciones").insert({
        user_id: userId,
        alumno_id: alumnoId,
        alumno_nombre: alumno.nombre,
        desde,
        hasta,
        motivo: motivo.trim(),
      });

      if (error) {
        if (error.code === "42P01") {
          toast.error("❌ La tabla 'justificaciones' no existe. Ejecuta el SQL de configuración.");
        } else {
          throw error;
        }
      } else {
        toast.success("Justificación guardada correctamente.");
        onClose();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nueva Justificación" icon={FileText} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.grupo})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Desde *</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Hasta *</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Motivo *</label>
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Citas médicas" rows={4} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Justificación"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ═════════════════════ REPORTES (SUPABASE) ═════════════════════ */

function ReportesView() {
  const [asistencias, setAsistencias] = useState<AsistenciaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const misGrupos = useMisGrupos();
  useEffect(() => { if (misGrupos.length > 0) setGrupo((g) => misGrupos.includes(g) ? g : misGrupos[0]); }, [misGrupos]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }

      const { data, error } = await supabase
        .from("asistencia")
        .select("*")
        .eq("user_id", uid)
        .order("fecha", { ascending: false });

      if (error) console.error("[Reportes] Error:", error);
      else setAsistencias((data as AsistenciaDia[]) || []);
    } catch (err) {
      console.error("[Reportes] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Default del grupo desde los alumnos reales del maestro (en vez de 1° A)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("alumnos").select("grupo").eq("user_id", uid).eq("activo", true);
      if (data && data.length > 0) {
        setGrupo((g) => (g === GRUPOS[0] ? grupoMasComun(data as { grupo?: string }[], g) : g));
      }
    })();
  }, []);

  const registrosGrupo = asistencias.filter((a) => a.grupo === grupo);

  const stats = useMemo(() => {
    let total = 0, presentes = 0, ausentes = 0, retardos = 0, justificados = 0;
    registrosGrupo.forEach((r) => {
      (r.registros || []).forEach((reg) => {
        total++;
        if (reg.estado === "presente") presentes++;
        if (reg.estado === "ausente") ausentes++;
        if (reg.estado === "retardo") retardos++;
        if (reg.estado === "justificado") justificados++;
      });
    });
    return { total, presentes, ausentes, retardos, justificados };
  }, [registrosGrupo]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {(misGrupos.length ? misGrupos : GRUPOS).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total registros", value: stats.total, icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Presentes", value: stats.presentes, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Ausentes", value: stats.ausentes, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
          { label: "Retardos", value: stats.retardos, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-border text-center`}>
              <Icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {registrosGrupo.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay registros de asistencia para este grupo.</p>
        </div>
      )}

      <div className="space-y-2">
        {registrosGrupo.map((r) => (
          <div key={r.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">{formatDate(r.fecha)}</h4>
              <Badge variant="outline" className="text-xs">{r.grupo}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">P: {(r.registros || []).filter((x) => x.estado === "presente").length}</span>
              <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md">A: {(r.registros || []).filter((x) => x.estado === "ausente").length}</span>
              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md">R: {(r.registros || []).filter((x) => x.estado === "retardo").length}</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">J: {(r.registros || []).filter((x) => x.estado === "justificado").length}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════ MODAL WRAPPER ═════════════════════ */

function ModalWrapper({ title, icon: Icon, children, onClose }: { title: string; icon: React.ElementType; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl border border-border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}