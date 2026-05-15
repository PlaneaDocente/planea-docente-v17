"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Search, Trash2, Check, X, Loader2, ClipboardCheck,
  FileText, BarChart3, UserCheck, UserX, Clock, Filter,
  ChevronDown, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  store, useStoreItem, GRUPOS, formatDate,
  type Alumno, type Justificacion, type RegistroAsistencia,
} from "./planeadocente-store";

/* ═════════════════════ TIPOS LOCALES ═════════════════════ */

type AsistenciaTab = "registro" | "justificaciones" | "reportes";

const TABS: { id: AsistenciaTab; label: string; icon: React.ElementType }[] = [
  { id: "registro", label: "Registro Diario", icon: ClipboardCheck },
  { id: "justificaciones", label: "Justificaciones", icon: FileText },
  { id: "reportes", label: "Reportes", icon: BarChart3 },
];

const ESTADOS = {
  presente: { label: "Presente", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: UserCheck },
  ausente: { label: "Ausente", className: "bg-red-100 text-red-700 border-red-200", icon: UserX },
  retardo: { label: "Retardo", className: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  justificado: { label: "Justificado", className: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
};

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

/* ═════════════════════ REGISTRO DIARIO ═════════════════════ */

function RegistroDiarioView() {
  const [alumnos] = useStoreItem(store.alumnos);
  const [asistencias, setAsistencias] = useStoreItem(store.asistencia);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [saving, setSaving] = useState(false);

  const alumnosGrupo = useMemo(() => alumnos.filter((a) => a.grupo === grupo && a.activo), [alumnos, grupo]);

  const registroExistente = useMemo(() => {
    return asistencias.find((a) => a.fecha === fecha && a.grupo === grupo);
  }, [asistencias, fecha, grupo]);

  const [registros, setRegistros] = useState<RegistroAsistencia["registros"]>([]);

  useEffect(() => {
    if (registroExistente) {
      setRegistros(registroExistente.registros);
    } else {
      setRegistros(
        alumnosGrupo.map((a) => ({
          alumno_id: a.id,
          alumno_nombre: a.nombre,
          estado: "presente" as const,
          nota: "",
        }))
      );
    }
  }, [registroExistente, alumnosGrupo]);

  const toggleEstado = (alumnoId: string) => {
    setRegistros((prev) =>
      prev.map((r) => {
        if (r.alumno_id !== alumnoId) return r;
        const estados: Array<keyof typeof ESTADOS> = ["presente", "ausente", "retardo", "justificado"];
        const idx = estados.indexOf(r.estado);
        const next = estados[(idx + 1) % estados.length];
        return { ...r, estado: next };
      })
    );
  };

  const handleSave = () => {
    setSaving(true);
    const nuevoRegistro: RegistroAsistencia = {
      id: registroExistente?.id || `as-${Date.now()}`,
      fecha,
      grupo,
      registros,
    };
    setAsistencias((prev) => {
      const filtrado = prev.filter((a) => !(a.fecha === fecha && a.grupo === grupo));
      return [nuevoRegistro, ...filtrado];
    });
    setTimeout(() => {
      setSaving(false);
      toast.success("Asistencia guardada correctamente.");
    }, 400);
  };

  const stats = useMemo(() => {
    const total = registros.length;
    const presentes = registros.filter((r) => r.estado === "presente").length;
    const ausentes = registros.filter((r) => r.estado === "ausente").length;
    const retardos = registros.filter((r) => r.estado === "retardo").length;
    const justificados = registros.filter((r) => r.estado === "justificado").length;
    return { total, presentes, ausentes, retardos, justificados };
  }, [registros]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-transparent text-sm outline-none" />
        </div>
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Button size="sm" className="gap-2 ml-auto" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando..." : "Guardar Registro"}
        </Button>
      </div>

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
    </div>
  );
}

/* ═════════════════════ JUSTIFICACIONES ═════════════════════ */

function JustificacionesView() {
  const [justificaciones, setJustificaciones] = useStoreItem(store.justificaciones);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = justificaciones.filter((j) =>
    j.alumno_nombre.toLowerCase().includes(search.toLowerCase()) ||
    j.motivo.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta justificación?")) return;
    setJustificaciones((prev) => prev.filter((j) => j.id !== id));
    toast.success("Justificación eliminada.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar justificación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
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
          <motion.div
            key={j.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
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
              <button
                onClick={() => handleDelete(j.id)}
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && <NuevaJustificacionModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

function NuevaJustificacionModal({ onClose }: { onClose: () => void }) {
  const [alumnos] = useStoreItem(store.alumnos);
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [, setJustificaciones] = useStoreItem(store.justificaciones);

  const handleSave = () => {
    if (!alumnoId || !desde || !hasta || !motivo.trim()) {
      toast.error("Completa todos los campos obligatorios.");
      return;
    }
    if (new Date(desde) > new Date(hasta)) {
      toast.error("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
      return;
    }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    setSaving(true);
    const nueva: Justificacion = {
      id: `j-${Date.now()}`,
      alumno_id: alumnoId,
      alumno_nombre: alumno.nombre,
      desde,
      hasta,
      motivo: motivo.trim(),
      creado_en: new Date().toISOString(),
    };
    setJustificaciones((prev) => [nueva, ...prev]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Justificación guardada correctamente.");
      onClose();
    }, 400);
  };

  return (
    <ModalWrapper title="Nueva Justificación" icon={FileText} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.grupo})</option>)}
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

/* ═════════════════════ REPORTES ═════════════════════ */

function ReportesView() {
  const [asistencias] = useStoreItem(store.asistencia);
  const [grupo, setGrupo] = useState(GRUPOS[0]);

  const registrosGrupo = asistencias.filter((a) => a.grupo === grupo);

  const stats = useMemo(() => {
    let total = 0;
    let presentes = 0;
    let ausentes = 0;
    let retardos = 0;
    let justificados = 0;
    registrosGrupo.forEach((r) => {
      r.registros.forEach((reg) => {
        total++;
        if (reg.estado === "presente") presentes++;
        if (reg.estado === "ausente") ausentes++;
        if (reg.estado === "retardo") retardos++;
        if (reg.estado === "justificado") justificados++;
      });
    });
    return { total, presentes, ausentes, retardos, justificados };
  }, [registrosGrupo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none">
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
        {registrosGrupo.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha)).map((r) => (
          <div key={r.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">{formatDate(r.fecha)}</h4>
              <Badge variant="outline" className="text-xs">{r.grupo}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">P: {r.registros.filter((x) => x.estado === "presente").length}</span>
              <span className="text-red-600 bg-red-50 px-2 py-1 rounded-md">A: {r.registros.filter((x) => x.estado === "ausente").length}</span>
              <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md">R: {r.registros.filter((x) => x.estado === "retardo").length}</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">J: {r.registros.filter((x) => x.estado === "justificado").length}</span>
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