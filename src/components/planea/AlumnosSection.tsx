"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Trash2, Check, X, Loader2,
  UserCircle, Phone, Mail, MessageSquare,
  ChevronDown, HeartHandshake, ClipboardList, History,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ═════════════════════ TIPOS ═════════════════════ */

interface Alumno {
  id: string;
  user_id: string;
  nombre: string;
  apellidos?: string;
  grupo: string;
  grado?: string;
  turno?: string;
  curp?: string;
  fecha_nacimiento?: string;
  tutor_nombre?: string;
  tutor_email?: string;
  tutor_telefono?: string;
  foto_url?: string;
  activo: boolean;
  creado_en: string;
}

interface Tutor {
  id: string;
  user_id: string;
  alumno_id: string;
  alumno_nombre: string;
  nombre: string;
  parentesco: string;
  telefono?: string;
  email?: string;
  creado_en: string;
}

interface Observacion {
  id: string;
  user_id: string;
  alumno_id: string;
  alumno_nombre: string;
  fecha: string;
  tipo: "positiva" | "negativa" | "neutra";
  descripcion: string;
  creado_en: string;
}

type AlumnoTab = "registro" | "historial" | "tutores" | "observaciones";

const GRUPOS = [
  "1° A", "1° B", "1° C", "1° D",
  "2° A", "2° B", "2° C", "2° D",
  "3° A", "3° B", "3° C", "3° D",
  "4° A", "4° B", "4° C", "4° D",
  "5° A", "5° B", "5° C", "5° D",
  "6° A", "6° B", "6° C", "6° D",
];

const TABS: { id: AlumnoTab; label: string; icon: React.ElementType }[] = [
  { id: "registro", label: "Registro", icon: ClipboardList },
  { id: "historial", label: "Historial", icon: History },
  { id: "tutores", label: "Tutores", icon: HeartHandshake },
  { id: "observaciones", label: "Observaciones", icon: MessageSquare },
];

/* ═════════════════════ UTILIDADES ═════════════════════ */

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

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

/* ═════════════════════ REGISTRO (CRUD SUPABASE) ═════════════════════ */

function RegistroView() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadAlumnos = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const { data, error } = await supabase
        .from("alumnos")
        .select("*")
        .eq("user_id", uid)
        .order("creado_en", { ascending: false });

      if (error) {
        console.error("[Alumnos] Error cargando:", error);
        if (error.code === "42P01") {
          toast.error("La tabla de alumnos no existe. Ejecuta el SQL de configuración en Supabase.");
        } else {
          toast.error("Error al cargar alumnos: " + error.message);
        }
      } else {
        // Cast explícito para resolver TS 2345
        setAlumnos((data as Alumno[]) || []);
      }
    } catch (err) {
      console.error("[Alumnos] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlumnos();
  }, [loadAlumnos]);

  const filtered = alumnos.filter((a) => {
    const matchSearch = a.nombre.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || a.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este alumno? También se eliminarán sus tutores y observaciones.")) return;
    try {
      await supabase.from("tutores").delete().eq("alumno_id", id);
      await supabase.from("observaciones").delete().eq("alumno_id", id);
      const { error } = await supabase.from("alumnos").delete().eq("id", id);
      if (error) throw error;
      setAlumnos((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alumno eliminado correctamente.");
    } catch (err: any) {
      toast.error("Error al eliminar: " + err.message);
    }
  };

  const toggleActivo = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("alumnos")
        .update({ activo: !current })
        .eq("id", id);
      if (error) throw error;
      setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, activo: !current } : a)));
      toast.success(`Alumno ${!current ? "activado" : "desactivado"}.`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <p className="text-xs mt-1">Haz clic en "Nuevo Alumno" para comenzar.</p>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold">{a.nombre} {a.apellidos}</h4>
                    <Badge
                      className={`text-xs cursor-pointer ${a.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      onClick={() => toggleActivo(a.id, a.activo)}
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
        {showModal && <NuevoAlumnoModal onClose={() => { setShowModal(false); loadAlumnos(); }} userId={userId} />}
      </AnimatePresence>
    </div>
  );
}

function NuevoAlumnoModal({ onClose, userId }: { onClose: () => void; userId: string | null }) {
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [grado, setGrado] = useState("1°");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error("El nombre es obligatorio."); return; }
    if (!userId) { toast.error("Debes iniciar sesión."); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("alumnos")
        .insert({
          user_id: userId,
          nombre: nombre.trim(),
          apellidos: apellidos.trim() || null,
          grupo,
          grado,
          activo: true,
        })
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === "42P01") {
          toast.error("❌ La tabla 'alumnos' no existe. Ejecuta el SQL de configuración.");
        } else {
          throw error;
        }
      } else {
        toast.success("Alumno registrado correctamente.");
        onClose();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nuevo Alumno" icon={UserCircle} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre *</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fernando" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Apellidos</label>
            <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Ej: Garcia Robles" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
              {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grado</label>
            <select value={grado} onChange={(e) => setGrado(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
              {["1°", "2°", "3°", "4°", "5°", "6°"].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
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
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumno, setSelectedAlumno] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }

      const [{ data: alData }, { data: tuData }, { data: obData }] = await Promise.all([
        supabase.from("alumnos").select("*").eq("user_id", uid),
        supabase.from("tutores").select("*").eq("user_id", uid),
        supabase.from("observaciones").select("*").eq("user_id", uid).order("fecha", { ascending: false }),
      ]);

      setAlumnos((alData as Alumno[]) || []);
      setTutores((tuData as Tutor[]) || []);
      setObservaciones((obData as Observacion[]) || []);
    } catch (err) {
      console.error("[Historial] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = alumnos.filter((a) => a.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar alumno..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
        </div>
      </div>
      {!selectedAlumno ? (
        <div className="space-y-2">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedAlumno(a.id)} className="w-full text-left bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-700">{a.nombre[0]}</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{a.nombre} {a.apellidos}</h4>
                  <p className="text-xs text-muted-foreground">{a.grupo} · Ver historial completo</p>
                </div>
                <History className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <AlumnoHistorial
          alumnoId={selectedAlumno}
          onBack={() => setSelectedAlumno("")}
          alumnos={alumnos}
          tutores={tutores}
          observaciones={observaciones}
        />
      )}
    </div>
  );
}

function AlumnoHistorial({ alumnoId, onBack, alumnos, tutores, observaciones }: {
  alumnoId: string; onBack: () => void; alumnos: Alumno[]; tutores: Tutor[]; observaciones: Observacion[];
}) {
  const alumno = alumnos.find((a) => a.id === alumnoId);
  if (!alumno) return null;

  const misTutores = tutores.filter((t) => t.alumno_id === alumnoId);
  const misObs = observaciones.filter((o) => o.alumno_id === alumnoId);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary flex items-center gap-1 hover:underline">
        <ChevronDown className="w-4 h-4 rotate-90" /> Volver a la lista
      </button>
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 text-white">
        <h3 className="font-bold text-lg">{alumno.nombre} {alumno.apellidos}</h3>
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

/* ═════════════════════ TUTORES (CRUD SUPABASE) ═════════════════════ */

function TutoresView() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const [{ data: tuData }, { data: alData }] = await Promise.all([
        supabase.from("tutores").select("*").eq("user_id", uid).order("creado_en", { ascending: false }),
        supabase.from("alumnos").select("id, nombre, grupo, activo").eq("user_id", uid).eq("activo", true),
      ]);

      setTutores((tuData as Tutor[]) || []);
      setAlumnos((alData as Alumno[]) || []);
    } catch (err) {
      console.error("[Tutores] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = tutores.filter((t) =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.alumno_nombre.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este tutor?")) return;
    try {
      const { error } = await supabase.from("tutores").delete().eq("id", id);
      if (error) throw error;
      setTutores((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tutor eliminado.");
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
          <input type="text" placeholder="Buscar tutor o alumno..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
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
          <motion.div key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="text-sm font-semibold">{t.nombre}</h4>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t.parentesco}</span>
                  <span className="text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">{t.alumno_nombre}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {t.telefono && <span className="text-green-600 flex items-center gap-1"><Phone className="w-3 h-3" />{t.telefono}</span>}
                  {t.email && <span className="text-blue-600 flex items-center gap-1"><Mail className="w-3 h-3" />{t.email}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && <NuevoTutorModal onClose={() => { setShowModal(false); loadData(); }} alumnos={alumnos} userId={userId} />}
      </AnimatePresence>
    </div>
  );
}

function NuevoTutorModal({ onClose, alumnos, userId }: { onClose: () => void; alumnos: Alumno[]; userId: string | null }) {
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [nombre, setNombre] = useState("");
  const [parentesco, setParentesco] = useState("Madre");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!alumnoId || !nombre.trim()) { toast.error("Alumno y nombre del tutor son obligatorios."); return; }
    if (!userId) { toast.error("Debes iniciar sesión."); return; }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) { toast.error("Alumno no válido."); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from("tutores").insert({
        user_id: userId,
        alumno_id: alumnoId,
        alumno_nombre: alumno.nombre,
        nombre: nombre.trim(),
        parentesco: parentesco.trim() || "Tutor",
        telefono: telefono.trim() || null,
        email: email.trim() || null,
      });

      if (error) {
        if (error.code === "42P01") {
          toast.error("❌ La tabla 'tutores' no existe. Ejecuta el SQL de configuración.");
        } else {
          throw error;
        }
      } else {
        toast.success("Tutor guardado correctamente.");
        onClose();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nuevo Tutor" icon={HeartHandshake} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({a.grupo})</option>)}
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

/* ═════════════════════ OBSERVACIONES (CRUD SUPABASE) ═════════════════════ */

function ObservacionesView() {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);

      const [{ data: obData }, { data: alData }] = await Promise.all([
        supabase.from("observaciones").select("*").eq("user_id", uid).order("fecha", { ascending: false }),
        supabase.from("alumnos").select("id, nombre, activo").eq("user_id", uid).eq("activo", true),
      ]);

      setObservaciones((obData as Observacion[]) || []);
      setAlumnos((alData as Alumno[]) || []);
    } catch (err) {
      console.error("[Observaciones] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = observaciones.filter((o) =>
    o.alumno_nombre.toLowerCase().includes(search.toLowerCase()) ||
    o.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta observación?")) return;
    try {
      const { error } = await supabase.from("observaciones").delete().eq("id", id);
      if (error) throw error;
      setObservaciones((prev) => prev.filter((o) => o.id !== id));
      toast.success("Observación eliminada.");
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
          <input type="text" placeholder="Buscar observación..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
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
          <motion.div key={o.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
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
              <button onClick={() => handleDelete(o.id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && <NuevaObservacionModal onClose={() => { setShowModal(false); loadData(); }} alumnos={alumnos} userId={userId} />}
      </AnimatePresence>
    </div>
  );
}

function NuevaObservacionModal({ onClose, alumnos, userId }: { onClose: () => void; alumnos: Alumno[]; userId: string | null }) {
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id || "");
  const [tipo, setTipo] = useState<"positiva" | "negativa" | "neutra">("neutra");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!alumnoId || !descripcion.trim()) { toast.error("Alumno y descripción son obligatorios."); return; }
    if (!userId) { toast.error("Debes iniciar sesión."); return; }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("observaciones").insert({
        user_id: userId,
        alumno_id: alumnoId,
        alumno_nombre: alumno.nombre,
        fecha,
        tipo,
        descripcion: descripcion.trim(),
      });

      if (error) {
        if (error.code === "42P01") {
          toast.error("❌ La tabla 'observaciones' no existe. Ejecuta el SQL de configuración.");
        } else {
          throw error;
        }
      } else {
        toast.success("Observación guardada correctamente.");
        onClose();
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Nueva Observación" icon={MessageSquare} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno *</label>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
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