"use client";
// RUTA: src/components/planea/HerramientasIASection.tsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Download, Save, Images, Wand2,
  AlertCircle, Loader2, Trash2, Eye, Zap,
  GraduationCap, BookOpen, Palette, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";

interface GalleryImage {
  id: string;
  original_prompt: string;
  enhanced_prompt: string;
  image_url: string;
  education_level: string;
  nem_field: string;
  style: string;
  format: string;
  created_at: string;
}

const LEVELS = ["Preescolar","Primaria 1°-3°","Primaria 4°-6°","Secundaria","Educación Especial","Multigrado","General"];
const NEM_FIELDS = ["Lenguajes","Saberes y Pensamiento Científico","Ética, Naturaleza y Sociedades","De lo Humano y lo Comunitario","General"];
const STYLES = [
  { value:"infantil cartoon",                         label:"🎨 Infantil" },
  { value:"colorful educational illustration",        label:"🖌️ Ilustración colorida" },
  { value:"school didactic poster",                   label:"📚 Escolar didáctico" },
  { value:"classroom wall poster",                    label:"📋 Cartel escolar" },
  { value:"black and white coloring page children",   label:"✏️ Para colorear" },
  { value:"educational comic strip",                  label:"💬 Cómic educativo" },
  { value:"watercolor children illustration",         label:"🎭 Acuarela" },
  { value:"minimalist flat design educational",       label:"⬜ Minimalista" },
];
const FORMATS = [
  { value:"horizontal", label:"📐 Horizontal 16:9", w:1920, h:1080 },
  { value:"cuadrado",   label:"⬛ Cuadrado 1:1",   w:1024, h:1024 },
  { value:"vertical",   label:"📱 Vertical 9:16",  w:1080, h:1920 },
  { value:"portada",    label:"📄 Portada 4:3",    w:1280, h:960  },
];
const TEMPLATES = [
  "Niños trabajando en equipo en un proyecto escolar",
  "Cartel sobre el cuidado del agua para primaria",
  "Lámina educativa sobre las partes de la planta",
  "Dibujo para colorear de animales de la granja",
  "Imagen sobre cultura de paz e inclusión en el aula",
  "Niños leyendo en la biblioteca escolar",
  "Actividad de matemáticas con frutas y números",
  "Cartel de valores para el salón de clases",
  "Proyecto comunitario Nueva Escuela Mexicana",
  "Efeméride escolar: Independencia de México",
  "Trabajo colaborativo entre alumnos de primaria",
  "Cuidado del medio ambiente en la comunidad",
  "Portada para planeación didáctica de primaria",
  "Niños aprendiendo sobre la cultura mexicana",
  "Ilustración de los derechos de los niños",
];
const MONTHLY_LIMITS: Record<string,number> = {
  gratuito:5, trialing:20, basico:20, profesional:100, institucional:500
};

export default function HerramientasIASection() {
  const { currentPlan } = useAppStore();
  const [tab, setTab]                   = useState<"generator"|"gallery">("generator");
  const [userPrompt, setUserPrompt]     = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [level, setLevel]               = useState("Primaria 1°-3°");
  const [nemField, setNemField]         = useState("General");
  const [style, setStyle]               = useState(STYLES[0].value);
  const [format, setFormat]             = useState("horizontal");
  const [imageUrl, setImageUrl]         = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [enhancing, setEnhancing]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [gallery, setGallery]           = useState<GalleryImage[]>([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [userId, setUserId]             = useState<string|null>(null);

  const plan   = currentPlan || "gratuito";
  const limit  = MONTHLY_LIMITS[plan] || 5;
  const fmt    = FORMATS.find(f => f.value === format) || FORMATS[0];
  const atLimit = monthlyCount >= limit;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const startMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [{ data: imgs }, { count }] = await Promise.all([
        supabase.from("generated_school_images").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(30),
        supabase.from("generated_school_images").select("*",{count:"exact",head:true}).eq("user_id",user.id).gte("created_at",startMes),
      ]);
      if (imgs) setGallery(imgs);
      setMonthlyCount(count || 0);
    };
    load();
  }, []);

  const handleEnhance = async () => {
    if (!userPrompt.trim()) { toast.error("Escribe una descripción primero"); return; }
    setEnhancing(true);
    try {
      const res  = await fetch("/next_api/ai/enhance-prompt", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt:userPrompt, level, nemField, style }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) { setEnhancedPrompt(data.enhancedPrompt); toast.success("Prompt mejorado con IA ✨"); }
    } catch { toast.error("Error al mejorar el prompt"); }
    setEnhancing(false);
  };

  const handleGenerate = async () => {
    if (!userPrompt.trim()) { toast.error("Describe la imagen que necesitas"); return; }
    if (atLimit) { toast.error(`Límite de ${limit} imágenes alcanzado. Actualiza tu plan.`); return; }
    setGenerating(true); setImageUrl(""); setProgress(10);
    const iv = setInterval(() => setProgress(p => Math.min(p+5,82)), 600);
    try {
      const res  = await fetch("/next_api/ai/generate-image", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ prompt: enhancedPrompt||userPrompt, level, nemField, style, width:fmt.w, height:fmt.h }),
      });
      const data = await res.json();
      clearInterval(iv);
      if (!data.success) { toast.error(data.error||"Error al generar"); setGenerating(false); setProgress(0); return; }
      setProgress(90); setImageUrl(data.imageUrl); setImageLoading(true);
      setMonthlyCount(c => c+1);
    } catch { clearInterval(iv); toast.error("Error de conexión"); setGenerating(false); setProgress(0); }
  };

  const handleSave = async () => {
    if (!imageUrl||!userId) { toast.error("No hay imagen para guardar"); return; }
    const { error } = await supabase.from("generated_school_images").insert({
      user_id:userId, original_prompt:userPrompt, enhanced_prompt:enhancedPrompt||userPrompt,
      image_url:imageUrl, education_level:level, grade:"General", nem_field:nemField, style, format,
    });
    if (error) { toast.error("Error al guardar"); return; }
    toast.success("¡Guardada en tu galería! ✅");
    const { data } = await supabase.from("generated_school_images").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(30);
    if (data) setGallery(data);
  };

  const handleDownload = (url?: string) => {
    const src = url||imageUrl; if (!src) return;
    const a = document.createElement("a");
    a.href=src; a.download=`planeadocente-ia-${Date.now()}.jpg`; a.target="_blank";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Descargando imagen...");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("generated_school_images").delete().eq("id",id);
    setGallery(g => g.filter(img => img.id!==id));
    toast.success("Imagen eliminada");
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
        className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Herramientas de IA para Docentes</h2>
              <p className="text-white/80 text-sm mt-0.5">Genera imágenes educativas con IA para enriquecer tus clases y materiales didácticos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 shrink-0">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-bold">{monthlyCount}/{limit}</span>
            <span className="text-xs text-white/80">imágenes este mes</span>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-xs text-white/70">
          {["Imágenes educativas","Generación instantánea","Material didáctico"].map(t => (
            <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/>{t}</span>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab==="generator"?"default":"outline"} onClick={()=>setTab("generator")} className="gap-2">
          <Sparkles className="w-4 h-4"/> Generador de Imágenes
        </Button>
        <Button variant={tab==="gallery"?"default":"outline"} onClick={()=>setTab("gallery")} className="gap-2">
          <Images className="w-4 h-4"/> Galería ({gallery.length})
        </Button>
      </div>

      {tab === "generator" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* LEFT: Form */}
          <div className="space-y-4">

            {/* Prompt */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <Wand2 className="w-4 h-4 text-violet-500"/> Describe la imagen que necesitas
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Descripción del contenido educativo</p>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 min-h-[100px]"
                placeholder="Ej: Niños aprendiendo matemáticas en un salón colorido con frutas..."
                value={userPrompt}
                onChange={e => { setUserPrompt(e.target.value); setEnhancedPrompt(""); }}
                maxLength={300}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{userPrompt.length}/300 caracteres</span>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                  onClick={handleEnhance} disabled={enhancing||!userPrompt.trim()}>
                  {enhancing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3 text-violet-500"/>}
                  Mejorar prompt con IA
                </Button>
              </div>
              {enhancedPrompt && (
                <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
                  className="mt-3 p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200 dark:border-violet-800">
                  <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3"/> Prompt mejorado:
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-300 leading-relaxed">{enhancedPrompt}</p>
                </motion.div>
              )}
            </div>

            {/* NEM Config */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-violet-500"/> Configuración NEM
              </h3>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Nivel educativo</p>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map(l => (
                    <button key={l} onClick={()=>setLevel(l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        level===l ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-violet-100 dark:hover:bg-violet-950/40 hover:text-violet-700"
                      }`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Campo Formativo NEM</p>
                <div className="flex flex-wrap gap-2">
                  {NEM_FIELDS.map(f => (
                    <button key={f} onClick={()=>setNemField(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        nemField===f ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-violet-100 dark:hover:bg-violet-950/40 hover:text-violet-700"
                      }`}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Style & Format */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4 text-violet-500"/> Estilo y Formato
              </h3>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Estilo visual</p>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map(s => (
                    <button key={s.value} onClick={()=>setStyle(s.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                        style===s.value ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-violet-100 dark:hover:bg-violet-950/40 hover:text-violet-700"
                      }`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Formato de imagen</p>
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={()=>setFormat(f.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                        format===f.value ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-violet-100 dark:hover:bg-violet-950/40 hover:text-violet-700"
                      }`}>{f.label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-violet-500"/> Sugerencias de prompts educativos
              </h3>
              <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                {TEMPLATES.map((t,i) => (
                  <button key={i} onClick={()=>{ setUserPrompt(t); setEnhancedPrompt(""); }}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 text-muted-foreground hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                    💡 {t}
                  </button>
                ))}
              </div>
            </div>

            {atLimit && (
              <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Has alcanzado el límite de <strong>{limit} imágenes</strong> del plan <strong>{plan}</strong> este mes.
                  Actualiza tu suscripción para continuar generando imágenes.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="gap-2 shrink-0" disabled={generating}
                onClick={()=>{ setUserPrompt(""); setEnhancedPrompt(""); setImageUrl(""); setProgress(0); setGenerating(false); setImageLoading(false); }}>
                Nueva
              </Button>
              <Button className="flex-1 h-11 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                onClick={handleGenerate} disabled={generating||!userPrompt.trim()||atLimit}>
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin"/> Generando... {progress}%</>
                  : <><Sparkles className="w-4 h-4"/> Generar Imagen</>
                }
              </Button>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4 text-violet-500"/> Imagen Generada
                </h3>
                {imageUrl && !imageLoading && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={handleSave}>
                      <Save className="w-3.5 h-3.5"/> Guardar
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs h-8 bg-violet-600 hover:bg-violet-700" onClick={()=>handleDownload()}>
                      <Download className="w-3.5 h-3.5"/> Descargar
                    </Button>
                  </div>
                )}
              </div>

              <div className="w-full bg-muted/30 rounded-xl overflow-hidden" style={{minHeight:300}}>
                {generating && !imageUrl ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-violet-500 animate-spin"/>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">Generando tu imagen...</p>
                      <p className="text-xs text-muted-foreground mt-1">Esto puede tardar 10-30 segundos</p>
                    </div>
                    <div className="w-56 h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className="h-full bg-violet-500 rounded-full" animate={{width:`${progress}%`}} transition={{duration:0.5}}/>
                    </div>
                    <p className="text-xs text-muted-foreground">{progress}%</p>
                  </div>
                ) : imageUrl ? (
                  <div className="relative">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/60 rounded-xl z-10">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin"/>
                      </div>
                    )}
                    <img src={imageUrl} alt="Imagen educativa generada"
                      className="w-full rounded-xl object-contain max-h-[450px]"
                      onLoad={()=>{ setImageLoading(false); setGenerating(false); setProgress(100); toast.success("¡Imagen generada! ✨"); }}
                      onError={()=>{ setImageLoading(false); setGenerating(false); toast.error("Error cargando imagen. Intenta de nuevo."); setImageUrl(""); setProgress(0); }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                    <Palette className="w-14 h-14 opacity-20"/>
                    <p className="text-sm text-center max-w-52 leading-relaxed">
                      Escribe una descripción y presiona <span className="font-medium text-violet-600">"Generar Imagen"</span>
                    </p>
                  </div>
                )}
              </div>

              {imageUrl && !imageLoading && (
                <div className="mt-3 p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Prompt:</span> {userPrompt}
                  </p>
                  {enhancedPrompt && (
                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1.5 leading-relaxed">
                      <span className="font-medium">Mejorado:</span> {enhancedPrompt.slice(0,120)}...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (

        /* GALLERY */
        <div>
          {gallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Images className="w-16 h-16 opacity-20 mb-4"/>
              <p className="font-medium text-foreground">Tu galería está vacía</p>
              <p className="text-sm mt-1">Genera imágenes y presiona "Guardar" para verlas aquí</p>
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700" onClick={()=>setTab("generator")}>
                <Sparkles className="w-4 h-4"/> Ir al Generador
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{gallery.length} imágenes guardadas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gallery.map(img => (
                  <motion.div key={img.id} initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                    className="bg-card rounded-2xl border border-border overflow-hidden group shadow-sm">
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <img src={img.image_url} alt={img.original_prompt}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy"/>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" className="text-xs gap-1 h-8" onClick={()=>handleDownload(img.image_url)}>
                          <Download className="w-3 h-3"/> Descargar
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs h-8 w-8 p-0" onClick={()=>handleDelete(img.id)}>
                          <Trash2 className="w-3 h-3"/>
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium line-clamp-2 text-foreground">{img.original_prompt}</p>
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate">{img.education_level}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(img.created_at).toLocaleDateString("es-MX",{day:"2-digit",month:"short"})}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
