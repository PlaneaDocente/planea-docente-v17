"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Brain, BookOpen, Sparkles, Calendar,
  CheckCircle2, Clock, Edit, Loader2, Save, FileText, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockPlaneaciones, mockBibliotecaActividades } from "@/data/mock-data";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Tipo para planeaciones reales de la BD
interface PlaneacionReal {
  id: string;
  titulo: string;
  contenido: string;
  maestro_id: string;
  tipo_tipo_planeacion: string;
  generada_por_ia: boolean;
  created_at: string;
}

export default function PlaneacionSection() {
  const [activeTab, setActiveTab] = useState<"semanal" | "proyecto" | "automatica" | "biblioteca" | "guardadas">("semanal");
  const [showAIModal, setShowAIModal] = useState(false);
  const [planeacionesGuardadas, setPlaneacionesGuardadas] = useState<PlaneacionReal[]>([]);
  const [loadingGuardadas, setLoadingGuardadas] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Cargar usuario autenticado
  useEffect(() => {
    const cargarUsuario = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    cargarUsuario();
  }, []);

  // Cargar planeaciones guardadas cuando se abre la pestaña
  const cargarPlaneaciones = async () => {
    if (!userId) {
      toast.error("Debes iniciar sesión para ver tus planeaciones");
      return;
    }
    setLoadingGuardadas(true);
    try {
      const { data, error } = await supabase
        .from("planeaciones")
        .select("*")
        .eq("maestro_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlaneacionesGuardadas(data as PlaneacionReal[]);
    } catch (err: any) {
      console.error("Error cargando planeaciones:", err);
      toast.error("Error al cargar planeaciones: " + err.message);
    } finally {
      setLoadingGuardadas(false);
    }
  };

  useEffect(() => {
    if (activeTab === "guardadas") {
      cargarPlaneaciones();
    }
  }, [activeTab, userId]);

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

      {(activeTab === "semanal" || activeTab === "proyecto") && (
        <PlaneacionesList tipo={activeTab === "semanal" ? "semanal" : "proyecto"} />
      )}
      {activeTab === "automatica" && <GeneracionAutomatica onGenerate={() => setShowAIModal(true)} />}
      {activeTab === "biblioteca" && <BibliotecaActividades />}
      {activeTab === "guardadas" && (
        <PlaneacionesGuardadasView 
          planeaciones={planeacionesGuardadas} 
          loading={loadingGuardadas}
          onRecargar={cargarPlaneaciones}
        />
      )}

      {showAIModal && <AIGeneratorModal onClose={() => setShowAIModal(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NUEVO: Vista de planeaciones guardadas en la BD
// ─────────────────────────────────────────────────────────────────────────────
function PlaneacionesGuardadasView({ 
  planeaciones, 
  loading, 
  onRecargar 
}: { 
  planeaciones: PlaneacionReal[]; 
  loading: boolean;
  onRecargar: () => void;
}) {
  const [expandida, setExpandida] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (planeaciones.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-10 border border-border text-center">
        <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-foreground mb-1">No tienes planeaciones guardadas</p>
        <p className="text-sm text-muted-foreground mb-4">
          Genera una planeación con IA y guárdala para verla aquí.
        </p>
        <Button size="sm" variant="outline" onClick={onRecargar} className="gap-2">
          <Loader2 className="w-4 h-4" /> Recargar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          Mis Planeaciones ({planeaciones.length})
        </h3>
        <Button size="sm" variant="outline" onClick={onRecargar} className="gap-2 text-xs">
          <Loader2 className="w-3 h-3" /> Actualizar
        </Button>
      </div>

      <div className="grid gap-4">
        {planeaciones.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-foreground truncate">{p.titulo}</h4>
                  {p.generada_por_ia && (
                    <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3" /> IA
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("es-MX", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400`}>
                Guardada
              </span>
            </div>

            {/* Contenido expandible */}
            <div className={`bg-muted/30 rounded-xl p-4 ${expandida === p.id ? "" : "max-h-32 overflow-hidden relative"}`}>
              <div className="whitespace-pre-wrap text-sm text-foreground/90">
                {p.contenido}
              </div>
              {expandida !== p.id && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/30 to-transparent" />
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1.5 text-xs h-7"
                onClick={() => setExpandida(expandida === p.id ? null : p.id)}
              >
                {expandida === p.id ? "Ver menos" : "Ver completo"}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="gap-1.5 text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (!confirm("¿Eliminar esta planeación?")) return;
                  const { error } = await supabase.from("planeaciones").delete().eq("id", p.id);
                  if (!error) {
                    toast.success("Planeación eliminada");
                    onRecargar();
                  }
                }}
              >
                <Trash2 className="w-3 h-3" /> Eliminar
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista de planeaciones (mock)
// ─────────────────────────────────────────────────────────────────────────────
function PlaneacionesList({ tipo }: { tipo: string }) {
  const filtered = mockPlaneaciones.filter((p) => p.tipo === tipo);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {tipo === "semanal" ? "Planeaciones Semanales" : "Planeaciones por Proyecto"}
        </h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay planeaciones de este tipo aún.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p, i) => (
            <PlaneacionCard key={p.id} planeacion={p} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaneacionCard({ planeacion, index }: { planeacion: (typeof mockPlaneaciones)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground">{planeacion.titulo}</h4>
            {planeacion.generadaPorIA && (
              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> IA
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{planeacion.materia}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          planeacion.estado === "publicado"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        }`}>
          {planeacion.estado}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {planeacion.fechaInicio}</span>
        <span>→</span>
        <span>{planeacion.fechaFin}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
          <Edit className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
          Ver detalle
        </Button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección "Generación automática" (página informativa)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Biblioteca de actividades (mock)
// ─────────────────────────────────────────────────────────────────────────────
function BibliotecaActividades() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Biblioteca de Actividades Didácticas</h3>
      <div className="grid gap-3">
        {mockBibliotecaActividades.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                {a.ia && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-1.5 py-0.5 rounded-full">IA</span>}
              </div>
              <p className="text-xs text-muted-foreground">{a.materia} · {a.grado} · {a.duracion} min</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{a.usada} usos</p>
              <Button size="sm" variant="outline" className="text-xs h-7 mt-1">Usar</Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE GENERACIÓN CON IA REAL (CONEXIÓN A ENDPOINT)
// ─────────────────────────────────────────────────────────────────────────────
function AIGeneratorModal({ onClose }: { onClose: () => void }) {
  const [materia, setMateria] = useState("Matemáticas");
  const [grado, setGrado] = useState("3° Primaria");
  const [tema, setTema] = useState("");
  const [generating, setGenerating] = useState(false);
  const [planeacionGenerada, setPlaneacionGenerada] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!tema.trim()) {
      toast.error("Escribe un tema o contenido");
      return;
    }
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
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGuardarPlaneacion = async () => {
    if (!planeacionGenerada) {
      toast.error("No hay planeación generada para guardar");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Debes iniciar sesión para guardar");
      return;
    }

    const { error } = await supabase.from("planeaciones").insert({
      titulo: `Planeación: ${tema}`,
      contenido: planeacionGenerada,
      maestro_id: user.id,
      tipo_tipo_planeacion: "ia_generada",
      generada_por_ia: true,
    });

    if (error) {
      console.error("Error al guardar planeación:", error);
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success("Planeación guardada en tu biblioteca");
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
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
                <select
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                >
                  <option>Matemáticas</option>
                  <option>Español</option>
                  <option>Ciencias Naturales</option>
                  <option>Historia</option>
                  <option>Geografía</option>
                  <option>Formación Cívica</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Grado</label>
                <select
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
                  value={grado}
                  onChange={(e) => setGrado(e.target.value)}
                >
                  <option>1° Primaria</option>
                  <option>2° Primaria</option>
                  <option>3° Primaria</option>
                  <option>4° Primaria</option>
                  <option>5° Primaria</option>
                  <option>6° Primaria</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema o contenido</label>
              <input
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
                placeholder="Ej: Fracciones equivalentes, Independencia de México, Ciclo del agua..."
                value={tema}
                onChange={(e) => setTema(e.target.value)}
              />
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
            <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm">{planeacionGenerada}</div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPlaneacionGenerada(null)}>
                Regenerar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleGuardarPlaneacion}>
                <Save className="w-4 h-4" /> Guardar Planeación
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}