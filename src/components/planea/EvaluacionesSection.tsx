"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Brain, CheckSquare, FileText, BarChart3,
  Sparkles, Star, Loader2, Trash2, X, Save,
  GraduationCap, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ═════════════════════ TIPOS ═════════════════════ */

type TipoEvaluacion = "rubrica" | "cotejo" | "examen";

interface Evaluacion {
  id: string;
  user_id: string;
  titulo: string;
  materia: string | null;
  tipo: TipoEvaluacion;
  estado: string;
  grupo: string | null;
  criterios: string[];
  created_at: string;
}

interface AlumnoMini {
  id: string;
  nombre: string;
  apellidos?: string;
  grupo: string;
  activo: boolean;
}

interface Calificacion {
  id: string;
  user_id: string;
  evaluacion_id: string;
  alumno_id: string;
  nota: number;
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function EvaluacionesSection() {
  const [activeTab, setActiveTab] = useState<"rubricas" | "cotejo" | "examenes" | "calificaciones">("rubricas");
  const [userId, setUserId] = useState<string | null>(null);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("");

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Obtener grupos únicos de la tabla alumnos (campo 'grupo' como texto)
      const { data } = await supabase
        .from("alumnos")
        .select("grupo")
        .eq("user_id", user.id)
        .eq("activo", true);

      if (data && data.length > 0) {
        const gruposUnicos = Array.from(new Set((data as { grupo: string }[]).map(a => a.grupo))).sort();
        setGrupos(gruposUnicos);
        setGrupoSeleccionado(gruposUnicos[0]);
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

      {grupos.length > 0 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
          <select
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border"
          >
            {grupos.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      {grupos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">No tienes alumnos registrados. Ve a la sección Alumnos para crear grupos.</p>
        </div>
      )}

      {activeTab === "rubricas" && <EvaluacionesView grupo={grupoSeleccionado} userId={userId} tipo="rubrica" />}
      {activeTab === "cotejo" && <EvaluacionesView grupo={grupoSeleccionado} userId={userId} tipo="cotejo" />}
      {activeTab === "examenes" && <EvaluacionesView grupo={grupoSeleccionado} userId={userId} tipo="examen" />}
      {activeTab === "calificaciones" && <CalificacionesView grupo={grupoSeleccionado} userId={userId} />}
    </div>
  );
}

/* ═════════════════════ EVALUACIONES VIEW (Rúbricas/Cotejo/Exámenes) ═════════════════════ */

function EvaluacionesView({ grupo, userId, tipo }: { grupo: string; userId: string | null; tipo: TipoEvaluacion }) {
  const [items, setItems] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("Español");
  const [criterios, setCriterios] = useState<string[]>([""]);

  const cargar = useCallback(async () => {
    if (!grupo || !userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("user_id", userId)
      .eq("grupo", grupo)
      .eq("tipo", tipo)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as Evaluacion[]);
    setLoading(false);
  }, [grupo, userId, tipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!titulo.trim() || !userId || !grupo) return;
    const criteriosLimpios = criterios.filter(c => c.trim());
    const { error } = await supabase.from("evaluaciones").insert({
      titulo: titulo.trim(),
      materia,
      tipo,
      user_id: userId,
      grupo,
      criterios: criteriosLimpios,
      estado: "borrador",
    });
    if (error) {
      if (error.code === "42P01") toast.error("❌ La tabla 'evaluaciones' no existe. Ejecuta el SQL del Lote 3.");
      else toast.error("Error al guardar: " + error.message);
    } else {
      toast.success(tipo === "rubrica" ? "Rúbrica creada" : tipo === "cotejo" ? "Lista de cotejo creada" : "Examen creado");
      setTitulo(""); setCriterios([""]); setShowForm(false); cargar();
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    await supabase.from("evaluaciones").delete().eq("id", id);
    cargar();
  };

  const publicar = async (id: string) => {
    const { error } = await supabase.from("evaluaciones").update({ estado: "publicado" }).eq("id", id);
    if (!error) { toast.success("Evaluación publicada"); cargar(); }
  };

  const tituloTipo = tipo === "rubrica" ? "Rúbricas de Evaluación" : tipo === "cotejo" ? "Listas de Cotejo" : "Exámenes";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{tituloTipo}</h3>
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
              <p className="text-xs font-medium text-muted-foreground">{tipo === "examen" ? "Preguntas" : tipo === "rubrica" ? "Criterios" : "Ítems"}</p>
              {criterios.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input value={c} onChange={e => {
                    const nuevos = [...criterios]; nuevos[i] = e.target.value; setCriterios(nuevos);
                  }} placeholder={`${tipo === "examen" ? "Pregunta" : tipo === "rubrica" ? "Criterio" : "Ítem"} ${i + 1}`} className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
                  {criterios.length > 1 && (
                    <button onClick={() => setCriterios(criterios.filter((_, idx) => idx !== i))} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setCriterios([...criterios, ""])} className="text-xs">+ Agregar {tipo === "examen" ? "pregunta" : tipo === "rubrica" ? "criterio" : "ítem"}</Button>
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
          <p className="text-muted-foreground">No hay {tituloTipo.toLowerCase()} aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                {tipo === "rubrica" ? <Star className="w-5 h-5 text-amber-600" /> : tipo === "cotejo" ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{r.titulo}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.estado}</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.materia} · {Array.isArray(r.criterios) ? r.criterios.length : 0} {tipo === "examen" ? "preguntas" : tipo === "rubrica" ? "criterios" : "ítems"}</p>
              </div>
              {r.estado !== "publicado" && (
                <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => publicar(r.id)}>Publicar</Button>
              )}
              <button onClick={() => eliminar(r.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ CALIFICACIONES VIEW ═════════════════════ */

function CalificacionesView({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [alumnos, setAlumnos] = useState<AlumnoMini[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    if (!grupo || !userId) return;
    setLoading(true);
    try {
      // Alumnos del grupo (usando campo 'grupo' como texto y 'activo' como boolean)
      const { data: alums } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, grupo, activo")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("activo", true);
      setAlumnos((alums as AlumnoMini[]) || []);

      // Evaluaciones publicadas del grupo
      const { data: evals } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("estado", "publicado");
      const evalsData = (evals as Evaluacion[]) || [];
      setEvaluaciones(evalsData);

      // Calificaciones existentes
      if (evalsData.length > 0) {
        const evalIds = evalsData.map(e => e.id);
        const { data: cals } = await supabase
          .from("calificaciones")
          .select("*")
          .eq("user_id", userId)
          .in("evaluacion_id", evalIds);
        const map: Record<string, Record<string, number>> = {};
        (cals as Calificacion[] || []).forEach(c => {
          if (!map[c.alumno_id]) map[c.alumno_id] = {};
          map[c.alumno_id][c.evaluacion_id] = Number(c.nota);
        });
        setCalificaciones(map);
      }
    } catch (err) {
      console.error("[Calificaciones] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [grupo, userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarNota = async (alumnoId: string, evalId: string, nota: string) => {
    const num = parseFloat(nota);
    if (isNaN(num) || num < 0 || num > 10) return;
    if (!userId) return;
    const { error } = await supabase.from("calificaciones").upsert({
      user_id: userId,
      evaluacion_id: evalId,
      alumno_id: alumnoId,
      nota: num,
    }, { onConflict: "user_id,evaluacion_id,alumno_id" });
    if (error) toast.error(error.message);
    else toast.success("Calificación guardada");
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Calificaciones del Grupo {grupo}</h3>
      </div>
      {evaluaciones.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay evaluaciones publicadas. Publica una rúbrica o examen primero.</p>
      ) : alumnos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay alumnos activos en este grupo.</p>
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
              const notasValidas = notas.filter(n => n > 0);
              const promedio = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1) : "-";
              return (
                <tr key={a.id} className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                  <td className="py-2 px-3 font-medium">{a.nombre} {a.apellidos || ""}</td>
                  {evaluaciones.map(e => (
                    <td key={e.id} className="py-2 px-3 text-center">
                      <input
                        type="number" min="0" max="10" step="0.1"
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