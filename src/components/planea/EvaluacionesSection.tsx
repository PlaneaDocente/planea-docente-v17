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
  trimestre?: number | null;
}

const TRIMESTRES = [
  { value: 1, label: "1er Trimestre" },
  { value: 2, label: "2do Trimestre" },
  { value: 3, label: "3er Trimestre" },
];

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
      {activeTab === "cotejo" && <CotejosView grupo={grupoSeleccionado} userId={userId} />}
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
  const [campoFormativo, setCampoFormativo] = useState(CAMPOS_FORMATIVOS[0]);
  const [trimestre, setTrimestre] = useState<number>(1);
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
      materia: campoFormativo,
      tipo,
      maestro_id: userId,    // 🔁 cambiado
      user_id: userId,
      grupo,
      campo_formativo: campoFormativo,
      trimestre,
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

  const descargarExamenWord = (r: Evaluacion) => {
    const preguntas = Array.isArray(r.criterios) ? r.criterios : [];
    const fecha = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const preguntasHTML = preguntas.map((p, i) => `
      <p style="margin:14px 0 4px 0;"><b>${i + 1}.</b> ${esc(p)}</p>
      <p style="border-bottom:1px solid #999;height:16px;margin:0 0 4px 0;">&nbsp;</p>
      <p style="border-bottom:1px solid #999;height:16px;margin:0 0 12px 0;">&nbsp;</p>`).join("");
    const html = `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(r.titulo)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:12pt;color:#000;">
  <div style="text-align:center;">
    <p style="margin:0;font-size:11pt;">Escuela: ______________________________________________</p>
    <h3 style="margin:8px 0;">${esc(r.titulo)}</h3>
  </div>
  <table style="width:100%;font-size:11pt;margin:8px 0;border-collapse:collapse;">
    <tr><td style="padding:3px;">Alumno(a): _______________________________</td><td style="padding:3px;">Grupo: ${esc(r.grupo || "")}</td></tr>
    <tr><td style="padding:3px;">Materia: ${esc(r.materia || "")}</td><td style="padding:3px;">Fecha: ${fecha}</td></tr>
    <tr><td style="padding:3px;">Campo formativo: ${esc(r.campo_formativo || "")}</td><td style="padding:3px;">Trimestre: ${r.trimestre || 1}</td></tr>
    <tr><td style="padding:3px;">Aciertos: ______ / ${preguntas.length}</td><td style="padding:3px;">Calificación: ______</td></tr>
  </table>
  <p style="font-size:11pt;"><b>Instrucciones:</b> Lee con atención cada pregunta y responde en las líneas.</p>
  <hr/>
  ${preguntasHTML}
  <br/>
  <p style="font-size:9pt;color:#666;text-align:center;">Generado con PlaneaDocente.com — Nueva Escuela Mexicana</p>
</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(r.titulo || "examen").replace(/[^\w\sáéíóúñÁÉÍÓÚÑ-]/gi, "").trim() || "examen"}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Examen descargado en Word (.doc), listo para editar.");
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Campo formativo (NEM)</label>
                <select value={campoFormativo} onChange={e => setCampoFormativo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                  {CAMPOS_FORMATIVOS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Trimestre</label>
                <select value={trimestre} onChange={e => setTrimestre(Number(e.target.value))} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                  {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
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
              {tipo === "examen" && (
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-blue-700" onClick={() => descargarExamenWord(r)}>
                  <Download className="w-3.5 h-3.5" /> Word
                </Button>
              )}
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
  const [trimestre, setTrimestre] = useState<number>(1);

  const cargar = useCallback(async () => {
    if (!grupo || !userId) return;
    setLoading(true);
    try {
      const { data: alums } = await supabase
        .from("alumnos")
        .select("id, nombre, apellidos, grupo, activo")
        .eq("user_id", userId).eq("grupo", grupo).eq("activo", true)
        .order("nombre", { ascending: true });
      setAlumnos((alums as AlumnoMini[]) || []);

      const { data: evals } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("maestro_id", userId).eq("grupo", grupo).eq("estado", "publicado");
      const evalsData = (evals as Evaluacion[]) || [];
      setEvaluaciones(evalsData);

      if (evalsData.length > 0) {
        const evalIds = evalsData.map(e => e.id);
        const { data: cals } = await supabase
          .from("calificaciones_nem").select("*")
          .eq("user_id", userId).in("evaluacion_id", evalIds);
        const map: Record<string, Record<string, number>> = {};
        (cals as Calificacion[] || []).forEach(c => {
          if (!map[c.alumno_id]) map[c.alumno_id] = {};
          map[c.alumno_id][c.evaluacion_id] = Number(c.nota);
        });
        setCalificaciones(map);
      } else {
        setCalificaciones({});
      }
    } catch (err) {
      console.error("[Calificaciones] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [grupo, userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarNota = async (alumnoId: string, evalId: string, valor: string) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num < 0 || num > 10) return;
    if (!userId) return;
    setCalificaciones(prev => ({ ...prev, [alumnoId]: { ...(prev[alumnoId] || {}), [evalId]: num } }));
    const { error } = await supabase.from("calificaciones_nem").upsert({
      user_id: userId, evaluacion_id: evalId, alumno_id: alumnoId, nota: num,
    }, { onConflict: "user_id,evaluacion_id,alumno_id" });
    if (error) toast.error(error.message);
    else toast.success("Calificación guardada");
  };

  const tipoIcono = (t: string) => t === "rubrica" ? "⭐" : t === "cotejo" ? "✅" : "📝";

  // Evaluaciones del trimestre seleccionado
  const evalsTrim = evaluaciones.filter(e => (e.trimestre || 1) === trimestre);
  // Agrupar por campo formativo (las que no tengan, van a "Sin campo")
  const camposOrden = [...CAMPOS_FORMATIVOS, "Otros"];
  const grupos: { campo: string; evals: Evaluacion[] }[] = [];
  for (const campo of camposOrden) {
    const evs = evalsTrim.filter(e => (e.campo_formativo || "Otros") === campo);
    if (evs.length > 0) grupos.push({ campo, evals: evs });
  }

  const promedioCampo = (alumnoId: string, evs: Evaluacion[]): number | null => {
    const notas = evs.map(e => calificaciones[alumnoId]?.[e.id] || 0).filter(n => n > 0);
    if (notas.length === 0) return null;
    return notas.reduce((a, b) => a + b, 0) / notas.length;
  };
  const promedioGeneral = (alumnoId: string): number | null => {
    const proms = grupos.map(g => promedioCampo(alumnoId, g.evals)).filter((p): p is number => p !== null);
    if (proms.length === 0) return null;
    return proms.reduce((a, b) => a + b, 0) / proms.length;
  };
  const colorNota = (n: number) => n >= 8 ? "text-emerald-600" : n >= 6 ? "text-amber-600" : "text-red-600";

  const descargarPDF = () => {
    const fecha = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const trimLabel = TRIMESTRES.find(t => t.value === trimestre)?.label || "";
    let head1 = '<th rowspan="2">Alumno</th>';
    let head2 = "";
    grupos.forEach(g => {
      head1 += `<th colspan="${g.evals.length + 1}">${esc(g.campo)}</th>`;
      g.evals.forEach(e => { head2 += `<th>${tipoIcono(e.tipo)} ${esc(e.titulo)}</th>`; });
      head2 += `<th><b>Prom</b></th>`;
    });
    head1 += '<th rowspan="2">General</th>';
    const filas = alumnos.map(a => {
      let row = `<td style="text-align:left">${esc(a.nombre)} ${esc(a.apellidos || "")}</td>`;
      grupos.forEach(g => {
        g.evals.forEach(e => { const n = calificaciones[a.id]?.[e.id] || 0; row += `<td>${n > 0 ? n.toFixed(1) : "—"}</td>`; });
        const pc = promedioCampo(a.id, g.evals);
        row += `<td><b>${pc !== null ? pc.toFixed(1) : "—"}</b></td>`;
      });
      const pg = promedioGeneral(a.id);
      row += `<td><b>${pg !== null ? pg.toFixed(1) : "—"}</b></td>`;
      return `<tr>${row}</tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Calificaciones ${esc(grupo)} - ${esc(trimLabel)}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;padding:24px}h1{color:#2563eb;font-size:18px;margin:0 0 4px}
      p{font-size:12px;color:#374151;margin:2px 0}table{border-collapse:collapse;width:100%;margin-top:10px;font-size:11px}
      th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:center}th{background:#dbeafe;color:#1e3a8a}
      td:first-child,th:first-child{text-align:left}.footer{margin-top:16px;font-size:10px;color:#9ca3af;text-align:right}
      button,select,input{display:none !important}</style></head><body>
      <h1>Calificaciones — ${esc(grupo)}</h1>
      <p><b>${esc(trimLabel)}</b> · Generado: ${fecha} · PlaneaDocente.com (NEM)</p>
      <table><thead><tr>${head1}</tr><tr>${head2}</tr></thead><tbody>${filas}</tbody></table>
      <div class="footer">Calificación general = promedio de los campos formativos del trimestre.</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Permite las ventanas emergentes para el PDF."); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Calificaciones del Grupo {grupo}</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {TRIMESTRES.map(t => (
              <button key={t.value} onClick={() => setTrimestre(t.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${trimestre === t.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {grupos.length > 0 && alumnos.length > 0 && (
            <Button size="sm" variant="outline" className="gap-2" onClick={descargarPDF}><Download className="w-4 h-4" /> PDF</Button>
          )}
        </div>
      </div>

      {evalsTrim.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border text-center">
          <p className="text-sm text-muted-foreground">No hay evaluaciones publicadas en el {TRIMESTRES.find(t => t.value === trimestre)?.label}. Crea y publica rúbricas, listas de cotejo o exámenes y asígnalos a este trimestre.</p>
        </div>
      ) : alumnos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No hay alumnos activos en este grupo.</p>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th rowSpan={2} className="text-left p-2 border border-border bg-muted/60 sticky left-0 min-w-[150px]">Alumno</th>
                {grupos.map(g => (
                  <th key={g.campo} colSpan={g.evals.length + 1} className="p-2 border border-border bg-blue-50 dark:bg-blue-950/40 text-xs font-semibold text-blue-800 dark:text-blue-300">{g.campo}</th>
                ))}
                <th rowSpan={2} className="p-2 border border-border bg-amber-50 dark:bg-amber-950/40 text-xs font-bold min-w-[70px]">General</th>
              </tr>
              <tr>
                {grupos.map(g => [
                  ...g.evals.map(e => (
                    <th key={e.id} className="p-2 border border-border bg-muted/40 text-[11px] font-medium min-w-[80px]" title={e.titulo}>
                      {tipoIcono(e.tipo)} {e.titulo.length > 16 ? e.titulo.slice(0, 16) + "…" : e.titulo}
                    </th>
                  )),
                  <th key={g.campo + "-prom"} className="p-2 border border-border bg-blue-50/60 dark:bg-blue-950/30 text-[11px] font-bold min-w-[60px]">Prom</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, idx) => {
                const pg = promedioGeneral(a.id);
                return (
                  <tr key={a.id} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                    <td className="p-2 border border-border font-medium sticky left-0 bg-card">{a.nombre} {a.apellidos || ""}</td>
                    {grupos.map(g => [
                      ...g.evals.map(e => (
                        <td key={e.id} className="p-1 border border-border text-center">
                          <input type="number" min="0" max="10" step="0.1"
                            defaultValue={calificaciones[a.id]?.[e.id] || ""}
                            onBlur={(ev) => guardarNota(a.id, e.id, ev.target.value)}
                            className="w-14 bg-muted rounded-lg px-1.5 py-1 text-center text-xs outline-none border border-border" />
                        </td>
                      )),
                      (() => { const pc = promedioCampo(a.id, g.evals); return (
                        <td key={g.campo + "-pc"} className={`p-2 border border-border text-center font-bold ${pc !== null ? colorNota(pc) : "text-muted-foreground"}`}>
                          {pc !== null ? pc.toFixed(1) : "—"}
                        </td>
                      ); })(),
                    ])}
                    <td className={`p-2 border border-border text-center font-bold text-base ${pg !== null ? colorNota(pg) : "text-muted-foreground"}`}>
                      {pg !== null ? pg.toFixed(1) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">La <b>calificación general</b> es el promedio de los campos formativos del trimestre. Puedes escribir o ajustar cualquier nota directamente (0 a 10).</p>
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
  const [evaluando, setEvaluando] = useState<Evaluacion | null>(null);

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

      {evaluando && (
        <EvaluarAlumnosModal evaluacion={evaluando} grupo={grupo} userId={userId} onClose={() => setEvaluando(null)} />
      )}

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
                  {est && (
                    <Button size="sm" variant="ghost" className="text-xs h-7 text-blue-600 gap-1" onClick={() => setEvaluando(r)} title="Calificar alumnos">
                      <GraduationCap className="w-3.5 h-3.5" /> Evaluar
                    </Button>
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
  const [trimestre, setTrimestre] = useState<number>(editing?.trimestre || 1);
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
      trimestre,
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
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Trimestre</label>
        <select value={trimestre} onChange={e => setTrimestre(Number(e.target.value))} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
          {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
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

/* ═════════════════════ EVALUAR ALUMNOS (rúbrica / cotejo) + PDF ═════════════════════ */

function nivelPuntos(label: string): number | null {
  const m = (label || "").match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function calcularResultado(estructura: RubricaEstructura, valoresArr: string[]) {
  const niveles = estructura.niveles;
  const puntos = niveles.map(nivelPuntos);
  const esNumerica = puntos.length > 0 && puntos.every(p => p !== null) && puntos.some(p => (p || 0) > 0);
  const nFilas = estructura.filas.length;
  if (esNumerica) {
    const maxP = Math.max(...puntos.map(p => p || 0));
    let sum = 0; let sumMax = 0;
    for (let i = 0; i < nFilas; i++) {
      sumMax += maxP;
      const idx = niveles.indexOf(valoresArr[i]);
      if (idx >= 0 && puntos[idx] != null) sum += puntos[idx] as number;
    }
    const nota10 = sumMax > 0 ? (sum / sumMax) * 10 : 0;
    return { nota10, total: sum, pct: sumMax > 0 ? (sum / sumMax) * 100 : 0, esNumerica: true, maxP };
  }
  // Cotejo: la primera opción de la escala se considera "logrado"
  const logrado = niveles[0];
  let count = 0;
  for (let i = 0; i < nFilas; i++) if (valoresArr[i] === logrado) count++;
  const pct = nFilas > 0 ? (count / nFilas) * 100 : 0;
  return { nota10: pct / 10, total: count, pct, esNumerica: false, maxP: 0 };
}

function EvaluarAlumnosModal({ evaluacion, grupo, userId, onClose }: {
  evaluacion: Evaluacion; grupo: string; userId: string | null; onClose: () => void;
}) {
  const est = evaluacion.estructura as RubricaEstructura | null;
  const [alumnos, setAlumnos] = useState<AlumnoMini[]>([]);
  const [valores, setValores] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const esCotejo = evaluacion.tipo === "cotejo";
  const niveles = est?.niveles || [];
  const filas = est?.filas || [];

  useEffect(() => {
    const cargar = async () => {
      if (!userId || !grupo || !est) { setLoading(false); return; }
      setLoading(true);
      const { data: alums } = await supabase
        .from("alumnos").select("id, nombre, apellidos, grupo, activo")
        .eq("user_id", userId).eq("grupo", grupo).eq("activo", true).order("nombre");
      const lista = (alums as AlumnoMini[]) || [];
      setAlumnos(lista);

      const { data: res } = await supabase
        .from("evaluacion_resultados").select("alumno_id, valores")
        .eq("user_id", userId).eq("evaluacion_id", evaluacion.id);
      const map: Record<string, string[]> = {};
      lista.forEach(a => { map[a.id] = new Array(filas.length).fill(""); });
      (res || []).forEach((r: any) => {
        const arr = Array.isArray(r.valores) ? r.valores : [];
        map[r.alumno_id] = filas.map((_, i) => arr[i] || "");
      });
      setValores(map);
      setLoading(false);
    };
    cargar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, grupo, evaluacion.id]);

  const setCelda = (alumnoId: string, filaIdx: number, val: string) => {
    setValores(prev => {
      const arr = [...(prev[alumnoId] || new Array(filas.length).fill(""))];
      arr[filaIdx] = val;
      return { ...prev, [alumnoId]: arr };
    });
  };

  const guardar = async () => {
    if (!userId || !est) return;
    setSaving(true);
    try {
      for (const a of alumnos) {
        const arr = valores[a.id] || [];
        if (!arr.some(v => v)) continue; // sin calificar, saltar
        await supabase.from("evaluacion_resultados").upsert({
          user_id: userId, evaluacion_id: evaluacion.id, alumno_id: a.id, valores: arr,
          actualizado_en: new Date().toISOString(),
        }, { onConflict: "user_id,evaluacion_id,alumno_id" });
        const { nota10 } = calcularResultado(est, arr);
        await supabase.from("calificaciones_nem").upsert({
          user_id: userId, evaluacion_id: evaluacion.id, alumno_id: a.id, nota: Number(nota10.toFixed(1)),
        }, { onConflict: "user_id,evaluacion_id,alumno_id" });
      }
      toast.success("Evaluación guardada. Las calificaciones se reflejan en Reportes.");
    } catch (e: any) {
      if (e?.code === "42P01") toast.error("Falta la tabla. Corre el SQL del Lote 17 en Supabase.");
      else toast.error("Error al guardar: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const descargarPDF = () => {
    if (!est) return;
    const fecha = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const headIndicadores = filas.map((f, i) => `<th>${i + 1}. ${esc(f.indicador)}</th>`).join("");
    const colExtra = esCotejo
      ? `<th>Total ${esc(niveles[0] || "Sí")}</th><th>%</th>`
      : `<th>Calificación</th>`;
    const filasHTML = alumnos.map((a) => {
      const arr = valores[a.id] || [];
      const celdas = filas.map((_, i) => `<td>${esc(arr[i] || "—")}</td>`).join("");
      const r = calcularResultado(est, arr);
      const extra = esCotejo
        ? `<td style="text-align:center"><b>${r.total}</b>/${filas.length}</td><td style="text-align:center">${r.pct.toFixed(0)}%</td>`
        : `<td style="text-align:center"><b>${r.nota10.toFixed(1)}</b></td>`;
      const nombre = `${esc(a.nombre)}${a.apellidos ? " " + esc(a.apellidos) : ""}`;
      return `<tr><td style="text-align:left">${nombre}</td>${celdas}${extra}</tr>`;
    }).join("");
    const escalaInfo = esCotejo ? `<p><b>Escala:</b> ${niveles.map(esc).join(" / ")}</p>` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(evaluacion.titulo)}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px}
        h1{color:#6d28d9;font-size:18px;margin:0 0 4px}
        h2{font-size:14px;margin:12px 0 6px}
        p{font-size:12px;margin:2px 0;color:#374151}
        table{border-collapse:collapse;width:100%;margin-top:10px;font-size:11px}
        th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:center;vertical-align:top}
        th{background:#ede9fe;color:#4c1d95;font-weight:bold}
        td:first-child,th:first-child{text-align:left;min-width:140px}
        .footer{margin-top:18px;font-size:10px;color:#9ca3af;text-align:right}
        button,select,input{display:none !important}
      </style></head><body>
      <h1>${esc(evaluacion.titulo)}</h1>
      <p><b>Tipo:</b> ${esCotejo ? "Lista de cotejo" : "Rúbrica"} &nbsp;·&nbsp; <b>Campo formativo:</b> ${esc(est.campo_formativo || "—")}</p>
      <p><b>Grupo:</b> ${esc(grupo)} &nbsp;·&nbsp; <b>Generado:</b> ${fecha}</p>
      ${escalaInfo}
      <table><thead><tr><th>Alumno</th>${headIndicadores}${colExtra}</tr></thead>
      <tbody>${filasHTML}</tbody></table>
      <div class="footer">PlaneaDocente.com — Nueva Escuela Mexicana</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Permite las ventanas emergentes para descargar el PDF."); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-500" /> Evaluar: {evaluacion.titulo}</h3>
            <p className="text-xs text-muted-foreground">{esCotejo ? "Lista de cotejo" : "Rúbrica"} · {grupo} · {filas.length} indicadores</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : !est ? (
            <p className="text-sm text-muted-foreground text-center py-8">Esta evaluación no tiene estructura. Edítala primero.</p>
          ) : alumnos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay alumnos activos en {grupo}.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="text-left p-2 border-b border-border sticky left-0 bg-muted/60 min-w-[150px]">Alumno</th>
                    {filas.map((f, i) => (
                      <th key={i} className="text-left p-2 border-b border-l border-border min-w-[150px]" title={f.indicador}>
                        {i + 1}. {f.indicador.length > 40 ? f.indicador.slice(0, 40) + "…" : f.indicador}
                      </th>
                    ))}
                    <th className="text-center p-2 border-b border-l border-border min-w-[70px]">{esCotejo ? "Total" : "Calif."}</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnos.map((a, idx) => {
                    const arr = valores[a.id] || [];
                    const r = calcularResultado(est, arr);
                    return (
                      <tr key={a.id} className={idx % 2 === 0 ? "bg-muted/10" : ""}>
                        <td className="p-2 border-b border-border sticky left-0 bg-card font-medium">{a.nombre} {a.apellidos || ""}</td>
                        {filas.map((fila, fi) => (
                          <td key={fi} className="p-1 border-b border-l border-border">
                            <select value={arr[fi] || ""} onChange={e => setCelda(a.id, fi, e.target.value)}
                              className="w-full bg-muted rounded-lg px-2 py-1.5 text-xs outline-none border border-border">
                              <option value="">—</option>
                              {niveles.map((n, ni) => {
                                const desc = fila?.descriptores?.[ni];
                                return <option key={ni} value={n} title={desc || n}>{desc ? `${n} — ${desc}` : n}</option>;
                              })}
                            </select>
                            {arr[fi] && !esCotejo && fila?.descriptores?.[niveles.indexOf(arr[fi])] && (
                              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{fila.descriptores[niveles.indexOf(arr[fi])]}</p>
                            )}
                          </td>
                        ))}
                        <td className="p-2 border-b border-l border-border text-center font-semibold">
                          {esCotejo ? `${r.total}/${filas.length}` : r.nota10.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-border">
          <Button variant="outline" className="gap-2" onClick={descargarPDF} disabled={loading || alumnos.length === 0}>
            <Download className="w-4 h-4" /> Descargar PDF
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button className="gap-2" onClick={guardar} disabled={saving || loading || alumnos.length === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar evaluación
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ═════════════════════ LISTAS DE COTEJO (constructor + evaluar) ═════════════════════ */

const ESCALAS_COTEJO = [
  ["Sí", "No"],
  ["Logrado", "No logrado"],
  ["Logrado", "En proceso", "No logrado"],
];

function CotejosView({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [items, setItems] = useState<Evaluacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluacion | null>(null);
  const [evaluando, setEvaluando] = useState<Evaluacion | null>(null);

  const cargar = useCallback(async () => {
    if (!grupo || !userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluaciones").select("*")
      .eq("maestro_id", userId).eq("grupo", grupo).eq("tipo", "cotejo")
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as Evaluacion[]);
    setLoading(false);
  }, [grupo, userId]);

  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar esta lista de cotejo?")) return;
    await supabase.from("evaluaciones").delete().eq("id", id);
    cargar();
  };
  const publicar = async (id: string) => {
    const { error } = await supabase.from("evaluaciones").update({ estado: "publicado" }).eq("id", id);
    if (!error) { toast.success("Lista publicada. Ya puedes evaluar a los alumnos."); cargar(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Listas de Cotejo</h3>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => { setEditing(null); setBuilderOpen(true); }}>
          <Plus className="w-4 h-4" /> Nueva lista
        </Button>
      </div>

      <AnimatePresence>
        {builderOpen && (
          <CotejoBuilder grupo={grupo} userId={userId} editing={editing}
            onClose={() => setBuilderOpen(false)} onSaved={() => { setBuilderOpen(false); cargar(); }} />
        )}
      </AnimatePresence>

      {evaluando && (
        <EvaluarAlumnosModal evaluacion={evaluando} grupo={grupo} userId={userId} onClose={() => setEvaluando(null)} />
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay listas de cotejo aún. Crea una con "Nueva lista".</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => {
            const est = r.estructura || null;
            const nFilas = est?.filas?.length ?? (Array.isArray(r.criterios) ? r.criterios.length : 0);
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{r.titulo}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado === "publicado" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.estado}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.campo_formativo || r.materia} · {nFilas} indicadores · escala: {(est?.niveles || []).join(" / ") || "—"}
                  </p>
                </div>
                {est && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-blue-600 gap-1" onClick={() => setEvaluando(r)} title="Calificar alumnos">
                    <GraduationCap className="w-3.5 h-3.5" /> Evaluar
                  </Button>
                )}
                <button onClick={() => { setEditing(r); setBuilderOpen(true); }} className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                {r.estado !== "publicado" && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-emerald-600" onClick={() => publicar(r.id)}>Publicar</Button>
                )}
                <button onClick={() => eliminar(r.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CotejoBuilder({ grupo, userId, editing, onClose, onSaved }: {
  grupo: string; userId: string | null; editing: Evaluacion | null; onClose: () => void; onSaved: () => void;
}) {
  const est0 = editing?.estructura || null;
  const [campoFormativo, setCampoFormativo] = useState(editing?.campo_formativo || est0?.campo_formativo || CAMPOS_FORMATIVOS[0]);
  const [titulo, setTitulo] = useState(editing?.titulo || "");
  const [trimestre, setTrimestre] = useState<number>(editing?.trimestre || 1);
  const [escala, setEscala] = useState<string[]>(est0?.niveles?.length ? est0.niveles : ESCALAS_COTEJO[0]);
  const [indicadores, setIndicadores] = useState<string[]>(
    est0?.filas?.length ? est0.filas.map(f => f.indicador) : [""]
  );
  const [saving, setSaving] = useState(false);

  const escalaKey = JSON.stringify(escala);
  const setIndic = (i: number, v: string) => setIndicadores(prev => prev.map((x, j) => j === i ? v : x));
  const addIndic = () => setIndicadores(prev => [...prev, ""]);
  const removeIndic = (i: number) => { if (indicadores.length > 1) setIndicadores(prev => prev.filter((_, j) => j !== i)); };

  const guardar = async () => {
    if (!titulo.trim()) { toast.error("Escribe un título."); return; }
    if (!userId || !grupo) { toast.error("Falta sesión o grupo."); return; }
    const inds = indicadores.map(s => s.trim()).filter(Boolean);
    if (inds.length === 0) { toast.error("Agrega al menos un indicador."); return; }
    const estructura: RubricaEstructura = {
      campo_formativo: campoFormativo,
      niveles: escala,
      filas: inds.map(i => ({ indicador: i, descriptores: [] })),
    };
    const payload = {
      titulo: titulo.trim(), materia: campoFormativo, tipo: "cotejo" as const,
      maestro_id: userId, user_id: userId, grupo, campo_formativo: campoFormativo,
      trimestre,
      criterios: inds, estructura,
    };
    setSaving(true);
    let error;
    if (editing) ({ error } = await supabase.from("evaluaciones").update(payload).eq("id", editing.id));
    else ({ error } = await supabase.from("evaluaciones").insert({ ...payload, estado: "borrador" }));
    setSaving(false);
    if (error) {
      if (error.code === "42703") toast.error("Faltan columnas en 'evaluaciones'. Corre el SQL del Lote 16.");
      else toast.error("Error al guardar: " + error.message);
      return;
    }
    toast.success(editing ? "Lista actualizada" : "Lista de cotejo creada");
    onSaved();
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="bg-card rounded-2xl p-5 border border-border space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-500" /> {editing ? "Editar lista de cotejo" : "Nueva lista de cotejo"}</h4>
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Escala</label>
          <select value={escalaKey} onChange={e => setEscala(JSON.parse(e.target.value))} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
            {ESCALAS_COTEJO.map((s, i) => <option key={i} value={JSON.stringify(s)}>{s.join(" / ")}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Trimestre</label>
        <select value={trimestre} onChange={e => setTrimestre(Number(e.target.value))} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
          {TRIMESTRES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Lista de cotejo — Exposición de proyecto" className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-muted-foreground">Indicadores / aspectos a evaluar</label>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={addIndic}>+ Indicador</Button>
        </div>
        <div className="space-y-2">
          {indicadores.map((c, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs text-muted-foreground w-5 pt-2">{i + 1}.</span>
              <input value={c} onChange={e => setIndic(i, e.target.value)} placeholder={`Indicador ${i + 1} (enunciado corto)`} className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border" />
              {indicadores.length > 1 && <button onClick={() => removeIndic(i)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><X className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 gap-2" onClick={guardar} disabled={saving || !titulo.trim()}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editing ? "Guardar cambios" : "Guardar lista"}
        </Button>
      </div>
    </motion.div>
  );
}
