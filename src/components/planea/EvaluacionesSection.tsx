"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Brain, CheckSquare, FileText, BarChart3,
  Sparkles, Star, Loader2, Trash2, X, Save,
  GraduationCap, AlertTriangle, Eye, Pencil, Download, Columns3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ═════════════════════ TIPOS ═════════════════════ */

type TipoEvaluacion = "rubrica" | "cotejo" | "examen";

interface Evaluacion {
  id: string;
  maestro_id: string;        // ✅ Cambiado de user_id a maestro_id
  titulo: string;
  materia: string | null;
  tipo: TipoEvaluacion;
  estado: string;
  grupo: string | null;
  criterios: string[];
  created_at: string;
  campo_formativo?: string | null;
  estructura?: RubricaEstructura | null;
}

interface RubricaFila {
  indicador: string;
  descriptores: string[];   // alineado a niveles (misma longitud)
}

interface RubricaEstructura {
  campo_formativo: string;
  niveles: string[];        // columnas (escala de logro)
  filas: RubricaFila[];     // indicadores (filas)
}

const CAMPOS_FORMATIVOS = [
  "Lenguajes",
  "Saberes y Pensamiento Científico",
  "Ética, Naturaleza y Sociedades",
  "De lo Humano y lo Comunitario",
];

const NIVELES_DEFAULT = [
  "Excelente (4)",
  "Satisfactorio (3)",
  "Mejorable (2)",
  "Insuficiente (1)",
];

interface AlumnoMini {
  id: string;
  nombre: string;
  apellidos?: string;
  grupo: string;
  activo: boolean;
}

interface Calificacion {
  id: string;
  user_id: string;           // ⚠️ En calificaciones sigue siendo user_id (no cambia)
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
  const [showIAModal, setShowIAModal] = useState(false);
  const [iaGenerating, setIaGenerating] = useState(false);
  const [iaForm, setIaForm] = useState({ materia: '', tema: '', tipo: 'rubrica' });

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

  const handleGenerarIA = async () => {
    if (!iaForm.tema.trim()) { toast.error("Escribe el tema de la evaluación"); return; }
    setIaGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Inicia sesión primero"); setIaGenerating(false); return; }

      const res = await fetch("/next_api/ai/generate-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: iaForm.tipo,
          materia: iaForm.materia,
          grado: grupoSeleccionado,
          tema: iaForm.tema,
          grupo: grupoSeleccionado,
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || "Error generando"); setIaGenerating(false); return; }

      const ev = data.evaluacion;
      const { error } = await supabase.from("evaluaciones").insert({
        maestro_id: user.id,
        user_id: user.id,
        titulo: ev.titulo,
        tipo: ev.tipo || iaForm.tipo,
        materia: ev.materia || iaForm.materia,
        grupo: grupoSeleccionado,
        criterios: ev.criterios || [],
        estado: "borrador",
        descripcion: ev.descripcion || "",
      });

      if (error) { toast.error("Error guardando: " + error.message); }
      else {
        toast.success("¡Evaluación generada con IA y guardada! ✨");
        setShowIAModal(false);
        setIaForm({ materia: "", tema: "", tipo: "rubrica" });
        // Recargar evaluaciones
        const { data: evals } = await supabase
          .from("evaluaciones").select("*")
          .eq("maestro_id", user.id).eq("grupo", grupoSeleccionado)
          .order("created_at", { ascending: false });
        if (evals) {
          // trigger re-render via tipo actual
          setActiveTab(iaForm.tipo === 'rubrica' ? 'rubricas' : iaForm.tipo === 'cotejo' ? 'cotejo' : 'examenes');
        }
      }
    } catch { toast.error("Error de conexión"); }
    setIaGenerating(false);
  };

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
        <Button size="sm" className="gap-2 bg-violet-600 hover:bg-violet-700" onClick={() => setShowIAModal(true)}>
          <Sparkles className="w-4 h-4" /> Generar con IA
        </Button>

        {/* Modal IA */}
        {showIAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" /> Generar Evaluación con IA
                </h3>
                <button onClick={() => setShowIAModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo de evaluación</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value:"rubrica", label:"⭐ Rúbrica" },
                      { value:"cotejo",  label:"✅ Cotejo" },
                      { value:"examen",  label:"📝 Examen" },
                    ].map(t => (
                      <button key={t.value} onClick={() => setIaForm(f => ({...f, tipo: t.value}))}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          iaForm.tipo === t.value ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:bg-violet-100"
                        }`}>{t.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Materia</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    placeholder="Ej: Matemáticas, Ciencias Naturales..."
                    value={iaForm.materia}
                    onChange={e => setIaForm(f => ({...f, materia: e.target.value}))}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tema a evaluar *</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    placeholder="Ej: Fracciones, Ciclo del agua, La Revolución..."
                    value={iaForm.tema}
                    onChange={e => setIaForm(f => ({...f, tema: e.target.value}))}
                  />
                </div>

                <p className="text-xs text-muted-foreground bg-violet-50 dark:bg-violet-950/30 rounded-lg px-3 py-2">
                  ✨ La IA generará criterios de evaluación alineados a la NEM y los guardará en tu sección de evaluaciones.
                </p>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setShowIAModal(false)} disabled={iaGenerating}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2"
                    onClick={handleGenerarIA}
                    disabled={iaGenerating || !iaForm.tema.trim()}
                  >
                    {iaGenerating ? <><Loader2 className="w-4 h-4 animate-spin"/> Generando...</> : <><Sparkles className="w-4 h-4"/> Generar</>}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {activeTab === "rubricas" && <RubricasView grupo={grupoSeleccionado} userId={userId} />}
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
    // ✅ CORRECCIÓN: usar maestro_id en lugar de user_id
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("maestro_id", userId)      // 🔁 cambiado
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
    // ✅ CORRECCIÓN: insertar con maestro_id en lugar de user_id
    const { error } = await supabase.from("evaluaciones").insert({
      titulo: titulo.trim(),
      materia,
      tipo,
      maestro_id: userId,    // 🔁 cambiado
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
      // Alumnos del grupo
      const { data: alums } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, grupo, activo")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("activo", true);
      setAlumnos((alums as AlumnoMini[]) || []);

      // ✅ CORRECCIÓN: evaluaciones publicadas del grupo usando maestro_id
      const { data: evals } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("maestro_id", userId)      // 🔁 cambiado
        .eq("grupo", grupo)
        .eq("estado", "publicado");
      const evalsData = (evals as Evaluacion[]) || [];
      setEvaluaciones(evalsData);

      // Calificaciones existentes (la tabla calificaciones usa user_id, no cambia)
      if (evalsData.length > 0) {
        const evalIds = evalsData.map(e => e.id);
        const { data: cals } = await supabase
          .from("calificaciones_nem")
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
    const { error } = await supabase.from("calificaciones_nem").upsert({
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

/* ═════════════════════ RÚBRICAS (constructor de matriz editable) ═════════════════════ */

function RubricasView({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [items, setItems] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluacion | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!grupo || !userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones")
      .select("*")
      .eq("maestro_id", userId)
      .eq("grupo", grupo)
      .eq("tipo", "rubrica")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as Evaluacion[]);
    setLoading(false);
  }, [grupo, userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta rúbrica?")) return;
    await supabase.from("evaluaciones").delete().eq("id", id);
    if (expandedId === id) setExpandedId(null);
    cargar();
  };

  const publicar = async (id: string) => {
    const { error } = await supabase.from("evaluaciones").update({ estado: "publicado" }).eq("id", id);
    if (!error) { toast.success("Rúbrica publicada. Ya puedes evaluar en Calificaciones."); cargar(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Rúbricas de Evaluación</h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => { setEditing(null); setBuilderOpen(true); }}>
          <Plus className="w-4 h-4" /> Nueva rúbrica
        </Button>
      </div>

      <AnimatePresence>
        {builderOpen && (
          <RubricaBuilder
            grupo={grupo}
            userId={userId}
            editing={editing}
            onClose={() => setBuilderOpen(false)}
            onSaved={() => { setBuilderOpen(false); cargar(); }}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay rúbricas aún. Crea una con el botón "Nueva rúbrica".</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => {
            const est = r.estructura || null;
            const nFilas = est?.filas?.length ?? (Array.isArray(r.criterios) ? r.criterios.length : 0);
            const nNiveles = est?.niveles?.length ?? 0;
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{r.titulo}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.estado}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.campo_formativo || r.materia} · {nFilas} indicadores × {nNiveles} niveles
                    </p>
                  </div>
                  {est && (
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground" title="Ver rúbrica">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditing(r); setBuilderOpen(true); }} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {r.estado !== "publicado" && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => publicar(r.id)}>Publicar</Button>
                  )}
                  <button onClick={() => eliminar(r.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
                {expandedId === r.id && est && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    <RubricaMatriz estructura={est} titulo={r.titulo} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RubricaBuilder({ grupo, userId, editing, onClose, onSaved }: {
  grupo: string; userId: string | null; editing: Evaluacion | null; onClose: () => void; onSaved: () => void;
}) {
  const est0 = editing?.estructura || null;
  const [campoFormativo, setCampoFormativo] = useState(editing?.campo_formativo || est0?.campo_formativo || CAMPOS_FORMATIVOS[0]);
  const [titulo, setTitulo] = useState(editing?.titulo || "");
  const [materia, setMateria] = useState(editing?.materia || "Español");
  const [niveles, setNiveles] = useState<string[]>(est0?.niveles?.length ? est0.niveles : [...NIVELES_DEFAULT]);
  const [filas, setFilas] = useState<RubricaFila[]>(
    est0?.filas?.length
      ? est0.filas.map(f => ({ indicador: f.indicador, descriptores: [...f.descriptores] }))
      : [{ indicador: "", descriptores: ["", "", "", ""] }]
  );
  const [saving, setSaving] = useState(false);

  // Mantener descriptores alineados al número de niveles
  const ajustarFila = (desc: string[], n: number) => {
    const copia = [...desc];
    while (copia.length < n) copia.push("");
    return copia.slice(0, n);
  };

  const addNivel = () => {
    setNiveles(prev => [...prev, ""]);
    setFilas(prev => prev.map(f => ({ ...f, descriptores: [...f.descriptores, ""] })));
  };
  const removeNivel = (idx: number) => {
    if (niveles.length <= 1) return;
    setNiveles(prev => prev.filter((_, i) => i !== idx));
    setFilas(prev => prev.map(f => ({ ...f, descriptores: f.descriptores.filter((_, i) => i !== idx) })));
  };
  const setNivel = (idx: number, val: string) => setNiveles(prev => prev.map((n, i) => i === idx ? val : n));

  const addFila = () => setFilas(prev => [...prev, { indicador: "", descriptores: ajustarFila([], niveles.length) }]);
  const removeFila = (idx: number) => { if (filas.length > 1) setFilas(prev => prev.filter((_, i) => i !== idx)); };
  const setIndicador = (idx: number, val: string) => setFilas(prev => prev.map((f, i) => i === idx ? { ...f, indicador: val } : f));
  const setDescriptor = (fi: number, ni: number, val: string) =>
    setFilas(prev => prev.map((f, i) => i === fi ? { ...f, descriptores: f.descriptores.map((d, j) => j === ni ? val : d) } : f));

  const guardar = async () => {
    if (!titulo.trim()) { toast.error("Escribe un título para la rúbrica."); return; }
    if (!userId || !grupo) { toast.error("Falta sesión o grupo."); return; }
    const nivelesLimpios = niveles.map(n => n.trim()).filter(Boolean);
    const filasLimpias = filas
      .map(f => ({ indicador: f.indicador.trim(), descriptores: ajustarFila(f.descriptores, niveles.length).map(d => d.trim()) }))
      .filter(f => f.indicador);
    if (nivelesLimpios.length === 0) { toast.error("Agrega al menos un nivel de logro (columna)."); return; }
    if (filasLimpias.length === 0) { toast.error("Agrega al menos un indicador (fila)."); return; }

    const estructura: RubricaEstructura = { campo_formativo: campoFormativo, niveles: nivelesLimpios, filas: filasLimpias };
    const payload = {
      titulo: titulo.trim(),
      materia,
      tipo: "rubrica" as const,
      maestro_id: userId,
      user_id: userId,
      grupo,
      campo_formativo: campoFormativo,
      criterios: filasLimpias.map(f => f.indicador),
      estructura,
    };

    setSaving(true);
    let error;
    if (editing) {
      ({ error } = await supabase.from("evaluaciones").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("evaluaciones").insert({ ...payload, estado: "borrador" }));
    }
    setSaving(false);
    if (error) {
      if (error.code === "42703") toast.error("Faltan columnas en 'evaluaciones'. Corre el SQL del Lote 16 en Supabase.");
      else toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success(editing ? "Rúbrica actualizada" : "Rúbrica creada");
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="bg-card rounded-2xl p-5 border border-border space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> {editing ? "Editar rúbrica" : "Nueva rúbrica"}</h4>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Campo formativo (NEM)</label>
          <select value={campoFormativo} onChange={e => setCampoFormativo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
            {CAMPOS_FORMATIVOS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Materia (para reportes)</label>
          <select value={materia} onChange={e => setMateria(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
            <option>Matemáticas</option><option>Español</option><option>Ciencias Naturales</option><option>Historia</option><option>Geografía</option><option>Formación Cívica</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Título de la rúbrica</label>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Rúbrica para la coevaluación de una exposición oral" className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
      </div>

      {/* Niveles (columnas) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Columns3 className="w-3 h-3" /> Niveles de logro (columnas)</label>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={addNivel}>+ Nivel</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {niveles.map((n, i) => (
            <div key={i} className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
              <input value={n} onChange={e => setNivel(i, e.target.value)} placeholder={`Nivel ${i + 1}`} className="bg-transparent text-xs outline-none w-32" />
              {niveles.length > 1 && <button onClick={() => removeNivel(i)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>}
            </div>
          ))}
        </div>
      </div>

      {/* Matriz: indicadores (filas) × niveles (columnas) con descriptores */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">Indicadores y descriptores</label>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={addFila}>+ Indicador</Button>
        </div>
        <div className="overflow-x-auto border border-border rounded-xl">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-left p-2 border-b border-border min-w-[140px] sticky left-0 bg-muted/60">Indicador / Criterio</th>
                {niveles.map((n, i) => (
                  <th key={i} className="text-left p-2 border-b border-l border-border min-w-[160px] font-medium">{n || `Nivel ${i + 1}`}</th>
                ))}
                <th className="border-b border-border w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, fi) => (
                <tr key={fi} className="align-top">
                  <td className="p-1 border-b border-border sticky left-0 bg-card">
                    <textarea value={f.indicador} onChange={e => setIndicador(fi, e.target.value)} placeholder={`Indicador ${fi + 1}`} rows={3} className="w-full bg-muted rounded-lg px-2 py-1.5 text-xs outline-none border border-border resize-none font-medium" />
                  </td>
                  {f.descriptores.map((d, ni) => (
                    <td key={ni} className="p-1 border-b border-l border-border">
                      <textarea value={d} onChange={e => setDescriptor(fi, ni, e.target.value)} placeholder="Descripción observable…" rows={3} className="w-full bg-muted rounded-lg px-2 py-1.5 text-xs outline-none border border-border resize-none" />
                    </td>
                  ))}
                  <td className="p-1 border-b border-border text-center">
                    {filas.length > 1 && <button onClick={() => removeFila(fi)} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 gap-2" onClick={guardar} disabled={saving || !titulo.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing ? "Guardar cambios" : "Guardar rúbrica"}
        </Button>
      </div>
    </motion.div>
  );
}

function RubricaMatriz({ estructura, titulo }: { estructura: RubricaEstructura; titulo?: string }) {
  return (
    <div className="overflow-x-auto">
      {estructura.campo_formativo && (
        <p className="text-xs text-muted-foreground mb-2">Campo formativo: <span className="font-medium text-foreground">{estructura.campo_formativo}</span></p>
      )}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/60">
            <th className="text-left p-2 border border-border min-w-[140px]">Indicador / Criterio</th>
            {estructura.niveles.map((n, i) => (
              <th key={i} className="text-left p-2 border border-border min-w-[150px] font-semibold">{n}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {estructura.filas.map((f, fi) => (
            <tr key={fi} className="align-top">
              <td className="p-2 border border-border font-medium bg-muted/30">{f.indicador}</td>
              {f.descriptores.map((d, ni) => (
                <td key={ni} className="p-2 border border-border text-muted-foreground">{d || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
