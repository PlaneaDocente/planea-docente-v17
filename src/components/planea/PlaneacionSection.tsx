"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Brain, BookOpen, Sparkles, Calendar,
  CheckCircle2, Clock, Edit, Loader2, Save, FileText, Trash2,
  Search, X, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ═════════════════════ TIPOS ═════════════════════ */

interface Planeacion {
  id: string;
  maestro_id: string;        // ✅ Cambiado de user_id a maestro_id
  titulo: string;
  contenido: string;
  materia: string | null;
  grado: string | null;
  tipo_planeacion: string;
  generada_por_ia: boolean;
  estado: string;
  created_at: string;
}

interface ActividadBiblioteca {
  id: string;
  user_id: string | null;
  titulo: string;
  materia: string | null;
  grado: string | null;
  duracion: number;
  descripcion: string | null;
  ia_generada: boolean;
  usos: number;
  created_at: string;
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function PlaneacionSection() {
  const [activeTab, setActiveTab] = useState<"semanal" | "proyecto" | "automatica" | "biblioteca" | "guardadas">("semanal");
  const [showAIModal, setShowAIModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const cargarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    cargarUsuario();
  }, []);

  const tabs = [
    { id: "semanal" as const, label: "📅 Semanal" },
    { id: "proyecto" as const, label: "🗂️ Por Proyecto" },
    { id: "automatica" as const, label: "🤖 Generación IA" },
    { id: "biblioteca" as const, label: "📚 Biblioteca" },
    { id: "guardadas" as const, label: "💾 Mis Planeaciones" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
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
        <Button size="sm" className="gap-2" onClick={() => setShowAIModal(true)}>
          <Brain className="w-4 h-4" /> Generar con IA
        </Button>
      </div>

      {activeTab === "semanal" && <PlaneacionesList tipo="semanal" userId={userId} />}
      {activeTab === "proyecto" && <PlaneacionesList tipo="proyecto" userId={userId} />}
      {activeTab === "automatica" && <GeneracionAutomatica onGenerate={() => setShowAIModal(true)} />}
      {activeTab === "biblioteca" && <BibliotecaActividades />}
      {activeTab === "guardadas" && <PlaneacionesGuardadasView userId={userId} />}

      {showAIModal && <AIGeneratorModal onClose={() => setShowAIModal(false)} userId={userId} />}
    </div>
  );
}

/* ═════════════════════ PLANEACIONES LIST (SUPABASE) ═════════════════════ */

function PlaneacionesList({ tipo, userId }: { tipo: string; userId: string | null }) {
  const [planeaciones, setPlaneaciones] = useState<Planeacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("Español");
  const [grado, setGrado] = useState("3° Primaria");
  const [contenido, setContenido] = useState("");

  const cargar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    // ✅ CORREGIDO: usar maestro_id y el tipo correcto
    const { data, error } = await supabase
      .from('planeaciones')
      .select('*')
      .eq('maestro_id', userId)
      .eq('tipo_planeacion', tipo)
      .eq('generada_por_ia', false)
      .order('created_at', { ascending: false });
    if (!error && data) setPlaneaciones(data as Planeacion[]);
    setLoading(false);
  }, [userId, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!titulo.trim() || !userId) return;
    // ✅ CORREGIDO: usar maestro_id en lugar de user_id
    const { error } = await supabase.from("planeaciones").insert({
      maestro_id: userId,
      titulo: titulo.trim(),
      materia,
      grado,
      tipo_planeacion: tipo,
      contenido: contenido.trim() || "Sin contenido detallado",
      generada_por_ia: false,
      estado: "borrador",
    });
    if (error) {
      if (error.code === "42P01") toast.error("❌ La tabla 'planeaciones' no existe. Ejecuta el SQL del Lote 3.");
      else toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Planeación creada");
      setTitulo(""); setContenido(""); setShowForm(false); cargar();
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta planeación?")) return;
    await supabase.from("planeaciones").delete().eq("id", id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {tipo === "semanal" ? "Planeaciones Semanales" : "Planeaciones por Proyecto"}
        </h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card rounded-2xl p-5 border border-border space-y-3">
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título de la planeación..." className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
            <div className="grid grid-cols-2 gap-3">
              <select value={materia} onChange={e => setMateria(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                <option>Matemáticas</option><option>Español</option><option>Ciencias Naturales</option><option>Historia</option><option>Geografía</option><option>Formación Cívica</option>
              </select>
              <select value={grado} onChange={e => setGrado(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                <option>1° Primaria</option><option>2° Primaria</option><option>3° Primaria</option><option>4° Primaria</option><option>5° Primaria</option><option>6° Primaria</option>
              </select>
            </div>
            <textarea value={contenido} onChange={e => setContenido(e.target.value)} placeholder="Contenido, objetivos, actividades..." rows={4} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border resize-none" />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={guardar} disabled={!titulo.trim()}><Save className="w-4 h-4" /> Guardar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : planeaciones.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay planeaciones de este tipo aún.</p>
          <p className="text-xs text-muted-foreground mt-1">Crea una nueva planeación o genera una con IA.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {planeaciones.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{p.titulo}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.materia} · {p.grado}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    p.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{p.estado}</span>
                  <button onClick={() => eliminar(p.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-sm text-foreground/80 line-clamp-3">{p.contenido}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.created_at).toLocaleDateString("es-MX")}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ PLANEACIONES GUARDADAS (SUPABASE) ═════════════════════ */

function PlaneacionesGuardadasView({ userId }: { userId: string | null }) {
  const [planeaciones, setPlaneaciones] = useState<Planeacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandida, setExpandida] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!userId) { toast.error("Debes iniciar sesión"); return; }
    setLoading(true);
    try {
      // ✅ CORREGIDO: usar maestro_id en lugar de user_id
      const { data, error } = await supabase
        .from("planeaciones")
        .select("*")
        .eq("maestro_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPlaneaciones((data as Planeacion[]) || []);
    } catch (err: any) {
      toast.error("Error al cargar: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta planeación?")) return;
    const { error } = await supabase.from("planeaciones").delete().eq("id", id);
    if (!error) { toast.success("Eliminada"); cargar(); }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (planeaciones.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-10 border border-border text-center">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-foreground mb-1">No tienes planeaciones guardadas</p>
        <p className="text-sm text-muted-foreground mb-4">Genera una planeación con IA o crea una manualmente.</p>
        <Button size="sm" variant="outline" onClick={cargar} className="gap-2"><Loader2 className="w-4 h-4" /> Recargar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Mis Planeaciones ({planeaciones.length})</h3>
        <Button size="sm" variant="outline" onClick={cargar} className="gap-2 text-xs"><Loader2 className="w-3 h-3" /> Actualizar</Button>
      </div>
      <div className="grid gap-4">
        {planeaciones.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">{p.titulo}</h4>
                  {p.generada_por_ia && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3" /> IA
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">{p.estado}</span>
                <button onClick={() => eliminar(p.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className={`bg-muted/30 rounded-xl p-4 ${expandida === p.id ? "" : "max-h-32 overflow-hidden relative"}`}>
              <div className="whitespace-pre-wrap text-sm text-foreground/90">{p.contenido}</div>
              {expandida !== p.id && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/30 to-transparent" />}
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => setExpandida(expandida === p.id ? null : p.id)}>
                {expandida === p.id ? "Ver menos" : "Ver completo"}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════ BIBLIOTECA ACTIVIDADES (SUPABASE) ═════════════════════ */

function BibliotecaActividades() {
  const [actividades, setActividades] = useState<ActividadBiblioteca[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("biblioteca_actividades")
          .select("*")
          .order("usos", { ascending: false });
        if (!error && data) {
          setActividades(data as ActividadBiblioteca[]);
        } else if (error?.code === "42P01") {
          // ✅ Tabla no existe, mostrar mensaje amigable
          console.warn("Tabla biblioteca_actividades no existe aún");
          setActividades([]);
        }
      } catch (err) {
        console.error("Error cargando biblioteca:", err);
        setActividades([]);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const filtered = actividades.filter(a =>
    a.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (a.materia || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (actividades.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-10 border border-border text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-foreground mb-1">Biblioteca de actividades</p>
        <p className="text-sm text-muted-foreground">Próximamente encontrarás actividades didácticas precargadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <h3 className="font-semibold">Biblioteca de Actividades Didácticas</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar actividad..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border" />
        </div>
      </div>
      <div className="grid gap-3">
        {filtered.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                {a.ia_generada && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">IA</span>}
              </div>
              <p className="text-xs text-muted-foreground">{a.materia} · {a.grado} · {a.duracion} min</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.descripcion}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{a.usos} usos</p>
              <Button size="sm" variant="outline" className="text-xs h-7 mt-1" onClick={() => toast.success("Actividad agregada a tu planeación")}>Usar</Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════ GENERACIÓN AUTOMÁTICA ═════════════════════ */

function GeneracionAutomatica({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8" />
          <div>
            <h3 className="font-bold text-lg">Generador Automático con IA</h3>
            <p className="text-white/80 text-sm">Basado en la Nueva Escuela Mexicana (NEM)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            "✅ Campos formativos NEM",
            "✅ Ejes articuladores",
            "✅ Contenidos prioritarios",
            "✅ Procesos de desarrollo",
            "✅ Estrategias didácticas",
            "✅ Evaluación integrada",
          ].map((f) => (
            <div key={f} className="bg-white/10 rounded-xl px-3 py-2 text-sm">{f}</div>
          ))}
        </div>
        <Button onClick={onGenerate} className="bg-white text-purple-700 hover:bg-white/90 font-bold gap-2">
          <Sparkles className="w-4 h-4" /> Generar Planeación Ahora
        </Button>
      </div>
    </div>
  );
}

/* ═════════════════════ MODAL IA ═════════════════════ */

function AIGeneratorModal({ onClose, userId }: { onClose: () => void; userId: string | null }) {
  const [materia, setMateria] = useState("Matemáticas");
  const [grado, setGrado] = useState("3° Primaria");
  const [tema, setTema] = useState("");
  const [generating, setGenerating] = useState(false);
  const [planeacionGenerada, setPlaneacionGenerada] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!tema.trim()) { toast.error("Escribe un tema o contenido"); return; }
    if (!userId) { toast.error("Debes iniciar sesión"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/next_api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materia, grado, tema }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error desconocido");
      setPlaneacionGenerada(data.planeacion);
      toast.success("Planeación generada con IA");
    } catch (error: any) {
      toast.error(error.message || "Error al generar. Verifica que el endpoint /next_api/ai/generate-plan exista.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGuardar = async () => {
    if (!planeacionGenerada || !userId) { toast.error("No hay planeación para guardar"); return; }
    // ✅ CORREGIDO: usar maestro_id en lugar de user_id
    const { error } = await supabase.from("planeaciones").insert({
      maestro_id: userId,
      titulo: `Planeación IA: ${tema}`,
      contenido: planeacionGenerada,
      materia,
      grado,
      tipo_planeacion: "ia_generada",
      generada_por_ia: true,
      estado: "guardada",
    });
    if (error) {
      if (error.code === "42P01") toast.error("❌ La tabla 'planeaciones' no existe. Ejecuta el SQL del Lote 3.");
      else toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Planeación guardada en tu biblioteca");
      onClose();
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold">Generador IA de Planeaciones</h3>
            <p className="text-xs text-muted-foreground">Nueva Escuela Mexicana (NEM)</p>
          </div>
        </div>

        {!planeacionGenerada ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Materia</label>
                <select className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" value={materia} onChange={(e) => setMateria(e.target.value)}>
                  <option>Matemáticas</option><option>Español</option><option>Ciencias Naturales</option><option>Historia</option><option>Geografía</option><option>Formación Cívica</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grado</label>
                <select className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" value={grado} onChange={(e) => setGrado(e.target.value)}>
                  <option>1° Primaria</option><option>2° Primaria</option><option>3° Primaria</option><option>4° Primaria</option><option>5° Primaria</option><option>6° Primaria</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema o contenido</label>
              <input className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
                placeholder="Ej: Fracciones equivalentes, Independencia de México, Ciclo del agua..."
                value={tema} onChange={(e) => setTema(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={generating || !tema.trim()}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Generando..." : "Generar Planeación"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm">{planeacionGenerada}</div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPlaneacionGenerada(null)}>Regenerar</Button>
              <Button className="flex-1 gap-2" onClick={handleGuardar}><Save className="w-4 h-4" /> Guardar Planeación</Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}