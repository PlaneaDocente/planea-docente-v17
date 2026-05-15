"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Brain, CheckSquare, FileText, BarChart3,
  Sparkles, Star, Loader2, Trash2, X, Save, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TipoEvaluacion = "rubrica" | "cotejo" | "examen";

interface Evaluacion {
  id: string;
  titulo: string;
  materia: string;
  tipo: TipoEvaluacion;
  estado: string;
  criterios: any[];
  creado_en: string;
}

interface Alumno {
  id: string;
  nombre: string;
  apellido_paterno?: string;
}

export default function EvaluacionesSection() {
  const [activeTab, setActiveTab] = useState<"rubricas" | "cotejo" | "examenes" | "calificaciones">("rubricas");
  const [userId, setUserId] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);
  const [grupoId, setGrupoId] = useState<string>("");

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("grupos").select("id,nombre").eq("maestro_id", user.id);
      if (data?.length) {
        setGrupos(data);
        setGrupoId(data[0].id);
      }
    };
    cargar();
  }, []);

  const tabs = [
    { id: "rubricas" as const, label: "⭐ Rúbricas" },
    { id: "cotejo" as const, label: "✅ Listas de Cotejo" },
    { id: "examenes" as const, label: "📝 Exámenes" },
    { id: "calificaciones" as const, label: "📊 Calificaciones" },
  ] as const;

  return (
    <div className="space-y-5">
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
        <Button size="sm" className="gap-2" onClick={() => toast.info("Generador IA de evaluaciones — próximamente")}>
          <Brain className="w-4 h-4" /> Generar con IA
        </Button>
      </div>

      {grupos.length > 1 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
          >
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
      )}

      {activeTab === "rubricas" && <RubricasView grupoId={grupoId} userId={userId} tipo="rubrica" />}
      {activeTab === "cotejo" && <RubricasView grupoId={grupoId} userId={userId} tipo="cotejo" />}
      {activeTab === "examenes" && <ExamenesView grupoId={grupoId} userId={userId} />}
      {activeTab === "calificaciones" && <CalificacionesView grupoId={grupoId} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: Rúbricas / Cotejos (misma estructura, diferente tipo)
// ─────────────────────────────────────────────────────────────────────────────
function RubricasView({ grupoId, userId, tipo }: { grupoId: string; userId: string | null; tipo: TipoEvaluacion }) {
  const [items, setItems] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("Español");
  const [criterios, setCriterios] = useState<string[]>([""]);

  const cargar = async () => {
    if (!grupoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("grupo_id", grupoId)
      .eq("tipo", tipo)
      .order("creado_en", { ascending: false });
    if (!error && data) setItems(data as Evaluacion[]);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [grupoId, tipo]);

  const guardar = async () => {
    if (!titulo.trim() || !userId || !grupoId) return;
    const criteriosLimpios = criterios.filter(c => c.trim());
    const { error } = await supabase.from("evaluaciones").insert({
      titulo,
      materia,
      tipo,
      maestro_id: userId,
      grupo_id: grupoId,
      criterios: criteriosLimpios,
      estado: "borrador",
    });
    if (error) {
      toast.error("Error al guardar: " + error.message);
    } else {
      toast.success(tipo === "rubrica" ? "Rúbrica creada" : "Lista de cotejo creada");
      setTitulo(""); setCriterios([""]); setShowForm(false); cargar();
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await supabase.from("evaluaciones").delete().eq("id", id);
    cargar();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{tipo === "rubrica" ? "Rúbricas de Evaluación" : "Listas de Cotejo"}</h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card rounded-2xl p-5 border border-border space-y-3">
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título..." className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
            <select value={materia} onChange={e => setMateria(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
              <option>Matemáticas</option><option>Español</option><option>Ciencias Naturales</option><option>Historia</option>
            </select>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{tipo === "rubrica" ? "Criterios" : "Ítems"}</p>
              {criterios.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input value={c} onChange={e => {
                    const nuevos = [...criterios];
                    nuevos[i] = e.target.value;
                    setCriterios(nuevos);
                  }} placeholder={`${tipo === "rubrica" ? "Criterio" : "Ítem"} ${i + 1}`} className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
                  {criterios.length > 1 && (
                    <button onClick={() => setCriterios(criterios.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setCriterios([...criterios, ""])} className="text-xs">+ Agregar {tipo === "rubrica" ? "criterio" : "ítem"}</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={guardar} disabled={!titulo.trim()}><Save className="w-4 h-4" /> Guardar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay {tipo === "rubrica" ? "rúbricas" : "listas de cotejo"} aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                {tipo === "rubrica" ? <Star className="w-5 h-5 text-amber-600" /> : <CheckSquare className="w-5 h-5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{r.titulo}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.estado}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.materia} · {Array.isArray(r.criterios) ? r.criterios.length : 0} {tipo === "rubrica" ? "criterios" : "ítems"}</p>
              </div>
              <button onClick={() => eliminar(r.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: Exámenes
// ─────────────────────────────────────────────────────────────────────────────
function ExamenesView({ grupoId, userId }: { grupoId: string; userId: string | null }) {
  const [examenes, setExamenes] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupoId) return;
    const cargar = async () => {
      setLoading(true);
      const { data } = await supabase.from("evaluaciones").select("*").eq("grupo_id", grupoId).eq("tipo", "examen").order("creado_en", { ascending: false });
      if (data) setExamenes(data as Evaluacion[]);
      setLoading(false);
    };
    cargar();
  }, [grupoId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Exámenes</h3>
        <Button size="sm" className="gap-2" onClick={() => toast.info("Crear examen — usa la pestaña de rúbricas y cambia el tipo")}>
          <Plus className="w-4 h-4" /> Nuevo Examen
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : examenes.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay exámenes registrados.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {examenes.map((e, i) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl p-4 border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium">{e.titulo}</p>
                <p className="text-xs text-muted-foreground">{e.materia}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${e.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{e.estado}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA: Calificaciones (con datos reales de alumnos + evaluaciones)
// ─────────────────────────────────────────────────────────────────────────────
function CalificacionesView({ grupoId }: { grupoId: string }) {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupoId) return;
    const cargar = async () => {
      setLoading(true);
      // Alumnos del grupo
      const { data: alums } = await supabase.from("alumnos").select("id,nombre,apellido_paterno").eq("grupo_id", grupoId).eq("estado", "activo");
      if (alums) setAlumnos(alums);

      // Evaluaciones publicadas del grupo
      const { data: evals } = await supabase.from("evaluaciones").select("*").eq("grupo_id", grupoId).eq("estado", "publicado");
      if (evals) setEvaluaciones(evals as Evaluacion[]);

      // Calificaciones existentes
      const { data: cals } = await supabase.from("calificaciones").select("*").in("evaluacion_id", evals?.map(e => e.id) || []);
      const map: Record<string, Record<string, number>> = {};
      cals?.forEach(c => {
        if (!map[c.alumno_id]) map[c.alumno_id] = {};
        map[c.alumno_id][c.evaluacion_id] = Number(c.nota);
      });
      setCalificaciones(map);
      setLoading(false);
    };
    cargar();
  }, [grupoId]);

  const guardarNota = async (alumnoId: string, evalId: string, nota: string) => {
    const num = parseFloat(nota);
    if (isNaN(num) || num < 0 || num > 10) return;
    const { error } = await supabase.from("calificaciones").upsert({
      evaluacion_id: evalId,
      alumno_id: alumnoId,
      nota: num,
    }, { onConflict: "evaluacion_id,alumno_id" });
    if (error) toast.error(error.message);
    else toast.success("Calificación guardada");
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Calificaciones del Grupo</h3>
      </div>
      {evaluaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay evaluaciones publicadas. Publica una rúbrica o examen primero.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Alumno</th>
              {evaluaciones.map(e => (
                <th key={e.id} className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground min-w-[100px]">{e.titulo}</th>
              ))}
              <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Prom</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a, idx) => {
              const notas = evaluaciones.map(e => calificaciones[a.id]?.[e.id] || 0);
              const promedio = notas.filter(n => n > 0).length > 0
                ? (notas.filter(n => n > 0).reduce((a, b) => a + b, 0) / notas.filter(n => n > 0).length).toFixed(1)
                : "-";
              return (
                <tr key={a.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <td className="py-2 px-3 font-medium">{a.nombre} {a.apellido_paterno || ""}</td>
                  {evaluaciones.map(e => (
                    <td key={e.id} className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        defaultValue={calificaciones[a.id]?.[e.id] || ""}
                        onBlur={(ev) => guardarNota(a.id, e.id, ev.target.value)}
                        className="w-16 bg-muted rounded-lg px-2 py-1 text-center text-sm outline-none border border-border"
                      />
                    </td>
                  ))}
                  <td className={`py-2 px-3 text-center font-bold ${Number(promedio) >= 8 ? "text-emerald-600" : Number(promedio) >= 6 ? "text-amber-600" : "text-red-600"}`}>
                    {promedio}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}