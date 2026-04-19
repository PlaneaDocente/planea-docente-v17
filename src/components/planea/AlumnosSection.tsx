"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Eye, Edit, TrendingUp, UserCheck, AlertCircle, X, Loader2, Users, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Grupo {
  id: string;
  nombre: string;
  grado: string;
}

interface Alumno {
  id: string;
  nombre: string;
  apellido_paterno: string | null;
  grupo_id: string;
  escuela_id: string | null;
  estado: string | null;
  created_at: string;
  grupos?: { nombre: string; grado: string } | null;
}

export default function AlumnosSection() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"lista" | "historial" | "tutores" | "observaciones">("lista");
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Formulario nuevo alumno (coincide con columnas reales de Supabase)
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: "",
    apellido_paterno: "",
    grupo_id: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para ver tus alumnos");
        setLoading(false);
        return;
      }

      // 1. Cargar grupos del usuario autenticado
      const { data: gruposData, error: gruposError } = await supabase
        .from("grupos")
        .select("id, nombre, grado")
        .eq("maestro_id", user.id);

      if (gruposError) throw gruposError;
      setGrupos(gruposData || []);

      // 2. Cargar alumnos que pertenezcan a esos grupos (con JOIN a grupos)
      if (gruposData && gruposData.length > 0) {
        const grupoIds = gruposData.map(g => g.id);
        const { data: alumnosData, error: alumnosError } = await supabase
          .from("alumnos")
          .select("*, grupos(nombre, grado)")
          .in("grupo_id", grupoIds)
          .order("nombre", { ascending: true });

        if (alumnosError) throw alumnosError;
        setAlumnos(alumnosData || []);
      } else {
        setAlumnos([]);
      }
    } catch (error: any) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAlumno.nombre.trim() || !nuevoAlumno.grupo_id) {
      toast.error("El nombre y el grupo son obligatorios");
      return;
    }

    setSaving(true);
    try {
      // Insertar SOLO las columnas que existen en tu tabla (según la imagen)
      const { error } = await supabase.from("alumnos").insert({
        nombre: nuevoAlumno.nombre.trim(),
        apellido_paterno: nuevoAlumno.apellido_paterno.trim() || null,
        grupo_id: nuevoAlumno.grupo_id,
        estado: "activo"
        // No enviamos: promedio, asistencia, grado (no existen en tu tabla)
        // escuela_id se deja null o lo obtendrás del grupo si es necesario
      });

      if (error) throw error;

      toast.success("Alumno registrado correctamente");
      setShowModal(false);
      setNuevoAlumno({ nombre: "", apellido_paterno: "", grupo_id: "" });
      cargarDatos(); // Recargar lista desde Supabase
    } catch (error: any) {
      console.error("Error creando alumno:", error);
      toast.error("Error al crear alumno: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = alumnos.filter(a =>
    (a.nombre + " " + (a.apellido_paterno || "")).toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "lista" as const, label: "📋 Registro" },
    { id: "historial" as const, label: "📖 Historial" },
    { id: "tutores" as const, label: "👨‍👩‍👧 Tutores" },
    { id: "observaciones" as const, label: "📝 Observaciones" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Cargando alumnos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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
        <Button 
          size="sm" 
          className="gap-2" 
          onClick={() => setShowModal(true)} 
          disabled={grupos.length === 0}
        >
          <Plus className="w-4 h-4" /> Nuevo Alumno
        </Button>
      </div>

      {/* Alerta: Sin grupos */}
      {grupos.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-amber-800 dark:text-amber-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">No tienes grupos creados</span>
          </div>
          <p className="mt-1 ml-7">
            Debes crear al menos un grupo antes de poder registrar alumnos. 
            Ve a la sección de <strong>Grupos</strong> en tu panel.
          </p>
        </div>
      )}

      {/* Tab: Lista */}
      {activeTab === "lista" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 flex-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar alumno..."
                  className="bg-transparent text-sm outline-none flex-1 w-full text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {alumnos.length} alumno{alumnos.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {alumnos.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No hay alumnos registrados aún</p>
                <p className="text-xs mt-1">Los alumnos que registres aparecerán aquí</p>
                {grupos.length > 0 && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowModal(true)}>
                    Registrar primer alumno
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((alumno, i) => (
                  <AlumnoRow key={alumno.id} alumno={alumno} index={i} />
                ))}
                {filtered.length === 0 && search && (
                  <p className="text-center py-4 text-sm text-muted-foreground">
                    No se encontraron resultados para "{search}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "historial" && <HistorialView alumnos={alumnos} />}
      {activeTab === "tutores" && <TutoresView />}
      {activeTab === "observaciones" && <ObservacionesView />}

      {/* Modal: Nuevo Alumno */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">Nuevo Alumno</h3>
                    <p className="text-xs text-muted-foreground">Registra un alumno en tu grupo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCrearAlumno} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nombre(s)
                  </label>
                  <input
                    type="text"
                    value={nuevoAlumno.nombre}
                    onChange={e => setNuevoAlumno({...nuevoAlumno, nombre: e.target.value})}
                    placeholder="Ej: Ana María"
                    className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border text-foreground"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Apellido Paterno
                  </label>
                  <input
                    type="text"
                    value={nuevoAlumno.apellido_paterno}
                    onChange={e => setNuevoAlumno({...nuevoAlumno, apellido_paterno: e.target.value})}
                    placeholder="Ej: García López"
                    className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Grupo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={nuevoAlumno.grupo_id}
                    onChange={e => setNuevoAlumno({...nuevoAlumno, grupo_id: e.target.value})}
                    className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border text-foreground"
                    required
                  >
                    <option value="">Selecciona un grupo</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre} — {g.grado}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {saving ? "Guardando..." : "Guardar Alumno"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlumnoRow({ alumno, index }: { alumno: Alumno; index: number }) {
  const nombreCompleto = `${alumno.nombre} ${alumno.apellido_paterno || ""}`.trim();
  
  const iniciales = alumno.nombre
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{iniciales}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{nombreCompleto}</p>
        <p className="text-xs text-muted-foreground">
          {alumno.grupos?.grado || ""} {alumno.grupos?.nombre ? `· ${alumno.grupos.nombre}` : ""}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          alumno.estado === "activo" 
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
        }`}>
          {alumno.estado || "Sin estado"}
        </span>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
      </div>
    </motion.div>
  );
}

function HistorialView({ alumnos }: { alumnos: Alumno[] }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <TrendingUp className="w-4 h-4 text-blue-500" /> Historial Académico
      </h3>
      {alumnos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No hay alumnos registrados</p>
      ) : (
        <div className="space-y-3">
          {alumnos.slice(0, 10).map(a => (
            <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{a.nombre[0]}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{a.nombre} {a.apellido_paterno || ""}</p>
                <p className="text-xs text-muted-foreground">Ciclo 2025-2026 · {a.grupos?.grado || ""} {a.grupos?.nombre || ""}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600 font-medium">{a.estado || "Sin estado"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TutoresView() {
  const tutores = [
    { nombre: "María López García", parentesco: "Madre", alumno: "Ana García López", telefono: "555-1234" },
    { nombre: "Roberto Martínez", parentesco: "Padre", alumno: "Carlos Martínez Ruiz", telefono: "555-5678" },
    { nombre: "Laura Hernández", parentesco: "Madre", alumno: "María Hernández Soto", telefono: "555-9012" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <UserCheck className="w-4 h-4 text-cyan-500" /> Tutores Registrados
      </h3>
      <div className="space-y-3">
        {tutores.map((t, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
              <span className="text-xs font-bold text-cyan-600">{t.nombre[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t.nombre}</p>
              <p className="text-xs text-muted-foreground">{t.parentesco} de {t.alumno}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t.telefono}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObservacionesView() {
  const obs = [
    { alumno: "Diego López Morales", tipo: "conducta", desc: "Dificultad para mantener atención en clase.", fecha: "2025-01-10" },
    { alumno: "Luis Pérez Torres", tipo: "aprendizaje", desc: "Requiere apoyo adicional en fracciones.", fecha: "2025-01-08" },
    { alumno: "Ana García López", tipo: "general", desc: "Excelente participación en actividades grupales.", fecha: "2025-01-07" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <AlertCircle className="w-4 h-4 text-amber-500" /> Observaciones
      </h3>
      <div className="space-y-3">
        {obs.map((o, i) => (
          <div key={i} className="p-3 rounded-xl bg-muted/40 border-l-4 border-amber-400">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground">{o.alumno}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                o.tipo === "conducta" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                o.tipo === "aprendizaje" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              }`}>{o.tipo}</span>
            </div>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
            <p className="text-xs text-muted-foreground mt-1">{o.fecha}</p>
          </div>
        ))}
      </div>
    </div>
  );
}