"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Trash2, Check, X, Loader2,
  UserCircle, Phone, Mail, MessageSquare,
  ChevronDown, HeartHandshake, ClipboardList, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  store, useStoreItem, GRUPOS, formatDate, syncTutorToPadres,
  type Alumno, type Tutor, type Observacion,
} from "./planeadocente-store";

/* ═════════════════════ TIPOS LOCALES ═════════════════════ */

type AlumnoTab = "registro" | "historial" | "tutores" | "observaciones";

const TABS: { id: AlumnoTab; label: string; icon: React.ElementType }[] = [
  { id: "registro", label: "Registro", icon: ClipboardList },
  { id: "historial", label: "Historial", icon: History },
  { id: "tutores", label: "Tutores", icon: HeartHandshake },
  { id: "observaciones", label: "Observaciones", icon: MessageSquare },
];

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function AlumnosSection() {
  const [activeTab, setActiveTab] = useState<AlumnoTab>("registro");

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
          {activeTab === "registro" && <RegistroView />}
          {activeTab === "historial" && <HistorialView />}
          {activeTab === "tutores" && <TutoresView />}
          {activeTab === "observaciones" && <ObservacionesView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ REGISTRO ═════════════════════ */

function RegistroView() {
  const [alumnos, setAlumnos] = useStoreItem(store.alumnos);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = alumnos.filter((a) => {
    const matchSearch = a.nombre.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || a.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este alumno? También se eliminarán sus tutores y observaciones.")) return;
    setAlumnos((prev) => prev.filter((a) => a.id !== id));
    const tutores = store.tutores.get().filter((t) => t.alumno_id !== id);
    store.tutores.set(tutores);
    const observs = store.observaciones.get().filter((o) => o.alumno_id !== id);
    store.observaciones.set(observs);
    toast.success("Alumno eliminado.");
  };

  const toggleActivo = (id: string) => {
    setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, activo: !a.activo } : a)));
    toast.success("Estado actualizado.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
        <select
          value={grupoFilter}
          onChange={(e) => setGrupoFilter(e.target.value)}
          className="bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary"
        >
          <option value="">Todos los grupos</option>
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nuevo Alumno
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No hay alumnos registrados.</p>
          </div>
        )}
        {filtered.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{a.nombre[0]}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">{a.nombre}</h4>
                    <Badge
                      className={`text-xs cursor-pointer ${a.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      onClick={() => toggleActivo(a.id)}
                    >
                      {a.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{a.grupo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Registrado: {formatDate(a.creado_en)}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(a.id)}
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
        {showModal && <NuevoAlumnoModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

function NuevoAlumnoModal({ onClose }: { onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [saving, setSaving] = useState(false);
  const [, setAlumnos] = useStoreItem(store.alumnos);

  const handleSave = () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    setSaving(true);
    const nuevo: Alumno = {
      id: `al-${Date.now()}`,
      nombre: nombre.trim(),
      grupo,
      activo: true,
      creado_en: new Date().toISOString().split("T")[0],
    };
    setAlumnos((prev) => [nuevo, ...prev]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Alumno registrado correctamente.");
      onClose();
    }, 400);
  };

  return (
    <ModalWrapper title="Nuevo Alumno" icon={UserCircle} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fernando Garcia Robles" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Alumno"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ═════════════════════ HISTORIAL ═════════════════════ */

function HistorialView() {
  const [alumnos] = useStoreItem(store.alumnos);
  const [selectedAlumno, setSelectedAlumno] = useState("");
  const [search, setSearch] = useState("");

  const filtered = alumnos.filter((a) => a.nombre.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar alumno para ver historial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
      </div>
      {!selectedAlumno ? (
        <div className="space-y-2">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAlumno(a.id)}
              className="w-full text-left bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{a.nombre[0]}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{a.nombre}</h4>
                  <p className="text-xs text-muted-foreground">{a.grupo} · Ver historial completo</p>
                </div>
                <History className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <AlumnoHistorial alumnoId={selectedAlumno} onBack={() => setSelectedAlumno("")} />
      )}
    </div>
  );
}

function AlumnoHistorial({ alumnoId, onBack }: { alumnoId: string; onBack: () => void }) {
  const [alumnos] = useStoreItem(store.alumnos);
  const [tutores] = useStoreItem(store.tutores);
  const [observaciones] = useStoreItem(store.observaciones);
  const alumno = alumnos.find((a) => a.id === alumnoId);

  if (!alumno) return null;

  const misTutores = tutores.filter((t) => t.alumno_id === alumnoId);
  const misObs = observaciones
    .filter((o) => o.alumno_id === alumnoId)
    .sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary flex items-center gap-1 hover:underline">
        <ChevronDown className="w-4 h-4 rotate-90" /> Volver a la lista
      </button>
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 text-white">
        <h3 className="font-bold text-lg">{alumno.nombre}</h3>
        <p className="text-white/80 text-sm">{alumno.grupo} · {alumno.activo ? "Activo" : "Inactivo"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-cyan-500" /> Tutores ({misTutores.length})</h4>
          {misTutores.length === 0 ? <p className="text-xs text-muted-foreground">Sin tutores registrados.</p> : (
            <div className="space-y-2">
              {misTutores.map((t) => (
                <div key={t.id} className="text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                  <p className="font-medium">{t.nombre} <span className="text-xs text-muted-foreground">({t.parentesco})</span></p>
                  {t.telefono && <p className="text-xs text-green-600 flex items-center gap-1"><Phone className="w-3 h-3" />{t.telefono}</p>}
                  {t.email && <p className="text-xs text-blue-600 flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-500" /> Observaciones ({misObs.length})</h4>
          {misObs.length === 0 ? <p className="text-xs text-muted-foreground">Sin observaciones.</p> : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {misObs.map((o) => (
                <div key={o.id} className="text-sm border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${o.tipo === "positiva" ? "bg-emerald-100 text-emerald-700" : o.tipo === "negativa" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{o.tipo}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDate(o.fecha)}</span>
                  </div>
                  <p className="mt-1">{o.descripcion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════ TUTORES ═════════════════════ */

function TutoresView() {
  const [tutores, setTutores] = useStoreItem(store.tutores);
  const [alumnos] = useStoreItem(store.alumnos);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = tutores.filter((t) =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.alumno_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este tutor?")) return;
    setTutores((prev) => prev.filter((t) => t.id !== id));
    const padres = store.padres.get().filter((p) => p.id !== id);
    store.padres.set(padres);
    toast.success("Tutor eliminado.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar tutor o alumno..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nuevo Tutor
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <HeartHandshake className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay tutores registrados.</p>
          <p className="text-xs">Registra tutores para mantener contacto con los padres de familia.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-semibold">{t.nombre}</h4>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t.parentesco}</span>
                  <span className="text-xs text-cyan-600 bg-cyan-50 dark:bg-cyan-950 px-2 py-0.5 rounded-full">{t.alumno_nombre}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {t.telefono && <span className="text-green-600 flex items-center gap-1"><Phone className="w-3 h-3" />{t.telefono}</span>}
                  {t.email && <span className="text-blue-600 flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
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
        {showModal && <NuevoTutorModal onClose={() => setShowModal(false)} alumnos={alumnos} />}
      </AnimatePresence>
    </div>
  );
}

function NuevoTutorModal({ onClose, alumnos }: { onClose: () => void; alumnos: Alumno[] }) {
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [nombre, setNombre] = useState("");
  const [parentesco, setParentesco] = useState("Madre");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [, setTutores] = useStoreItem(store.tutores);

  const handleSave = () => {
    if (!alumnoId || !nombre.trim()) { toast.error("Alumno y nombre del tutor son obligatorios."); return; }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) { toast.error("Alumno no válido."); return; }

    setSaving(true);
    const nuevo: Tutor = {
      id: `t-${Date.now()}`,
      alumno_id: alumnoId,
      alumno_nombre: alumno.nombre,
      nombre: nombre.trim(),
      parentesco: parentesco.trim() || "Tutor",
      telefono: telefono.trim(),
      email: email.trim(),
      creado_en: new Date().toISOString(),
    };

    setTutores((prev) => [nuevo, ...prev]);
    syncTutorToPadres(nuevo);

    setTimeout(() => {
      setSaving(false);
      toast.success("Tutor guardado y sincronizado con Padres de Familia.");
      onClose();
    }, 400);
  };

  return (
    <ModalWrapper title="Nuevo Tutor" icon={HeartHandshake} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.grupo})</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre del tutor *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: María de la Luz Garcia" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Parentesco</label>
            <input value={parentesco} onChange={(e) => setParentesco(e.target.value)} placeholder="Ej: Madre" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Teléfono</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 3221569887" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Correo electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej: tutor@email.com" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Tutor"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ═════════════════════ OBSERVACIONES ═════════════════════ */

function ObservacionesView() {
  const [observaciones, setObservaciones] = useStoreItem(store.observaciones);
  const [alumnos] = useStoreItem(store.alumnos);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = observaciones.filter((o) =>
    o.alumno_nombre.toLowerCase().includes(search.toLowerCase()) ||
    o.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta observación?")) return;
    setObservaciones((prev) => prev.filter((o) => o.id !== id));
    toast.success("Observación eliminada.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar observación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          />
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nueva Observación
        </Button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay observaciones registradas.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-semibold">{o.alumno_nombre}</h4>
                  <Badge className={`text-xs ${o.tipo === "positiva" ? "bg-emerald-100 text-emerald-700" : o.tipo === "negativa" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{o.tipo}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(o.fecha)}</span>
                </div>
                <p className="text-sm text-foreground">{o.descripcion}</p>
              </div>
              <button
                onClick={() => handleDelete(o.id)}
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
        {showModal && <NuevaObservacionModal onClose={() => setShowModal(false)} alumnos={alumnos} />}
      </AnimatePresence>
    </div>
  );
}

function NuevaObservacionModal({ onClose, alumnos }: { onClose: () => void; alumnos: Alumno[] }) {
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [tipo, setTipo] = useState<"positiva" | "negativa" | "neutra">("neutra");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [, setObservaciones] = useStoreItem(store.observaciones);

  const handleSave = () => {
    if (!alumnoId || !descripcion.trim()) { toast.error("Alumno y descripción son obligatorios."); return; }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    setSaving(true);
    const nueva: Observacion = {
      id: `obs-${Date.now()}`,
      alumno_id: alumnoId,
      alumno_nombre: alumno.nombre,
      fecha,
      tipo,
      descripcion: descripcion.trim(),
      creado_en: new Date().toISOString(),
    };
    setObservaciones((prev) => [nueva, ...prev]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Observación guardada correctamente.");
      onClose();
    }, 400);
  };

  return (
    <ModalWrapper title="Nueva Observación" icon={MessageSquare} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.filter((a) => a.activo).map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.grupo})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
              <option value="positiva">Positiva</option>
              <option value="neutra">Neutra</option>
              <option value="negativa">Negativa</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción *</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describe la observación..." rows={4} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar Observación"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
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