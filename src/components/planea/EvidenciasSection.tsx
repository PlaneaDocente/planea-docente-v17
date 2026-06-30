"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Video, FolderOpen, Camera,
  CheckCircle2, AlertCircle, Loader2, X, ImageIcon,
  File, Trash2, ZoomIn, ZoomOut, Download, Eye,
  ChevronLeft, ChevronRight, Grid3X3, List, Search,
  Plus, Minus, Move, Layers, User, Calendar, BookOpen,
  MoreHorizontal, ExternalLink, Copy, Check, Filter,
  Square, SquareCheck, SquareMinus, Clapperboard,
  FileSpreadsheet, FileType2, Music, Archive, ArrowUpRight,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMisGrupos } from "./useMisGrupos";

/* ═════════════════════ TIPOS ═════════════════════ */

type TabId = "fotos" | "documentos" | "videos" | "portafolio";
type EvidenciaTipo = "foto" | "documento" | "video";

interface Evidencia {
  id: string;
  titulo: string;
  url: string;
  tipo: EvidenciaTipo;
  grupo: string;
  alumno_id?: string;
  alumno_nombre?: string;
  materia?: string;
  descripcion?: string;
  size_bytes: number;
  creado_en: string;
  user_id: string;
  storage_path?: string;
}

interface AlumnoPortafolio {
  id: string;
  nombre: string;
  grupo: string;
  avatar: string;
  evidencias: Evidencia[];
  totalEvidencias: number;
  ultimaActualizacion: string;
}

/* ═════════════════════ UTILIDADES ═════════════════════ */

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function EvidenciasSection() {
  const [activeTab, setActiveTab] = useState<TabId>("fotos");
  const [gruposDisponibles, setGruposDisponibles] = useState<string[]>(["1°A","1°B","1°C","1°D","2°A","2°B","2°C","2°D","3°A","3°B","3°C","3°D","4°A","4°B","4°C","4°D","5°A","5°B","5°C","5°D","6°A","6°B","6°C","6°D"]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("3°A");
  const misGrupos = useMisGrupos();
  useEffect(() => {
    if (misGrupos.length > 0) {
      setGruposDisponibles(misGrupos);
      setGrupoSeleccionado((g) => misGrupos.includes(g) ? g : misGrupos[0]);
    }
  }, [misGrupos]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alumnosGrupo, setAlumnosGrupo] = useState<{ id: string; nombre: string }[]>([]);
  const [alumnoSel, setAlumnoSel] = useState<string>("");

  // Cargar grupos desde alumnos del usuario
  useEffect(() => {
    const cargarGrupos = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data } = await supabase
          .from("alumnos")
          .select("grupo")
          .eq("user_id", user.id)
          .neq("grupo", null);

        if (data && data.length > 0) {
          const grupos = [...new Set(data.map((a: any) => a.grupo).filter(Boolean))].sort();
          setGruposDisponibles(grupos);
          setGrupoSeleccionado(grupos[0]);
        }
      } catch (err) {
        console.error("[Evidencias] Error cargando grupos:", err);
      } finally {
        setLoading(false);
      }
    };
    cargarGrupos();
  }, []);

  const tabs = [
    { id: "fotos" as TabId, label: "Fotos", icon: Camera },
    { id: "documentos" as TabId, label: "Documentos", icon: FileText },
    { id: "videos" as TabId, label: "Videos", icon: Clapperboard },
    { id: "portafolio" as TabId, label: "Portafolio Digital", icon: FolderOpen },
  ];

  useEffect(() => {
    const cargarAlumnos = async () => {
      if (!userId || !grupoSeleccionado) { setAlumnosGrupo([]); return; }
      const { data } = await supabase
        .from("alumnos")
        .select("id, nombre")
        .eq("user_id", userId)
        .eq("grupo", grupoSeleccionado)
        .eq("activo", true)
        .order("nombre", { ascending: true });
      setAlumnosGrupo((data as { id: string; nombre: string }[]) || []);
      setAlumnoSel("");
    };
    cargarAlumnos();
  }, [userId, grupoSeleccionado]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-40 animate-pulse bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidencias</h1>
          <p className="text-sm text-muted-foreground">Ciclo Escolar 2025-2026 · Nueva Escuela Mexicana</p>
        </div>
      </div>

      {/* Selector de grupo */}
      <div className="bg-card rounded-xl p-3 border border-border">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
        <select
          value={grupoSeleccionado}
          onChange={(e) => setGrupoSeleccionado(e.target.value)}
          className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
        >
          {gruposDisponibles.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Selector de alumno (opcional) — solo aplica a Fotos/Documentos/Videos */}
      {activeTab !== "portafolio" && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Alumno (opcional — para el portafolio individual)
          </label>
          <select
            value={alumnoSel}
            onChange={(e) => setAlumnoSel(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
          >
            <option value="">General del grupo (sin alumno específico)</option>
            {alumnosGrupo.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => {
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

      {/* Contenido */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + grupoSeleccionado}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "fotos" && <FotosView grupo={grupoSeleccionado} userId={userId} alumnoId={alumnoSel} alumnoNombre={alumnosGrupo.find((a) => a.id === alumnoSel)?.nombre || ""} />}
          {activeTab === "documentos" && <DocumentosView grupo={grupoSeleccionado} userId={userId} alumnoId={alumnoSel} alumnoNombre={alumnosGrupo.find((a) => a.id === alumnoSel)?.nombre || ""} />}
          {activeTab === "videos" && <VideosView grupo={grupoSeleccionado} userId={userId} alumnoId={alumnoSel} alumnoNombre={alumnosGrupo.find((a) => a.id === alumnoSel)?.nombre || ""} />}
          {activeTab === "portafolio" && <PortafolioView grupo={grupoSeleccionado} userId={userId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ FOTOS VIEW (SUPABASE) ═════════════════════ */

function FotosView({ grupo, userId, alumnoId, alumnoNombre }: { grupo: string; userId: string | null; alumnoId?: string; alumnoNombre?: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar desde Supabase
  const cargar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evidencias")
        .select("*")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("tipo", "foto")
        .order("creado_en", { ascending: false });

      if (error) {
        if (error.code === "42P01") {
          toast.error("La tabla de evidencias aún no existe. Ejecuta el SQL en Supabase.");
        } else {
          throw error;
        }
      }
      setEvidencias((data as Evidencia[]) || []);
    } catch (err: any) {
      console.error("[Fotos] Error cargando:", err);
      toast.error("Error cargando fotos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, grupo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const fotos = evidencias;
  const filtered = fotos.filter((f) =>
    f.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (f.materia?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (f.descripcion?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !userId) return;
    setIsUploading(true);

    let subidas = 0;
    for (const file of files) {
      const mime = file.type || "";
      const tipo = mime.startsWith("image/") ? "foto"
        : mime.startsWith("video/") ? "video"
        : "documento";
      // Límite de 50 MB por archivo (tope del plan gratuito de Supabase)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(0)} MB y supera el límite de 50 MB del plan gratuito. Comprímelo o usa uno más ligero.`);
        continue;
      }

      try {
        const safeGrupo = grupo.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const carpeta = tipo === "foto" ? "fotos" : tipo === "video" ? "videos" : "documentos";
        const path = `${userId}/${safeGrupo}/${carpeta}/${Date.now()}-${file.name}`;

        // Subir a Storage
        const { error: upError } = await supabase.storage
          .from("evidencias")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (upError) throw upError;

        // Obtener URL pública
        const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
        const publicUrl = urlData?.publicUrl || "";

        // Insertar en tabla
        const { error: dbError } = await supabase.from("evidencias").insert({
          user_id: userId,
          titulo: file.name,
          url: publicUrl,
          storage_path: path,
          tipo,
          grupo,
          alumno_id: alumnoId || null,
          alumno_nombre: alumnoNombre || null,
          size_bytes: file.size,
        });

        if (dbError) throw dbError;
        subidas++;
      } catch (err: any) {
        console.error("[Fotos] Error subiendo:", err);
        toast.error(`Error subiendo ${file.name}: ${err.message}`);
      }
    }

    setIsUploading(false);
    if (subidas > 0) {
      toast.success(`${subidas} foto(s) subida(s) correctamente.`);
      cargar();
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string, storagePath?: string) => {
    if (!confirm("¿Eliminar esta foto permanentemente?")) return;

    try {
      // Eliminar de Storage si hay path
      if (storagePath) {
        await supabase.storage.from("evidencias").remove([storagePath]);
      }
      // Eliminar de BD
      const { error } = await supabase.from("evidencias").delete().eq("id", id);
      if (error) throw error;

      setEvidencias((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success("Foto eliminada.");
    } catch (err: any) {
      toast.error("Error eliminando: " + err.message);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} foto(s) seleccionada(s)?`)) return;

    const toDelete = evidencias.filter((e) => selectedIds.has(e.id));
    for (const ev of toDelete) {
      if (ev.storage_path) {
        await supabase.storage.from("evidencias").remove([ev.storage_path]);
      }
      await supabase.from("evidencias").delete().eq("id", ev.id);
    }

    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);
    toast.success("Fotos eliminadas.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((f) => f.id)));
  const deselectAll = () => setSelectedIds(new Set());

  const openPreview = (index: number) => setPreviewIndex(index);
  const closePreview = () => setPreviewIndex(null);
  const goNext = () => { if (previewIndex !== null) setPreviewIndex((previewIndex + 1) % filtered.length); };
  const goPrev = () => { if (previewIndex !== null) setPreviewIndex((previewIndex - 1 + filtered.length) % filtered.length); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewIndex, filtered.length]);

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer p-8 text-center group"
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Subiendo imágenes...</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
            <p className="text-sm font-medium">Subir foto de evidencia</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP hasta 5MB · Arrastra o haz clic</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
      </div>

      {/* Toolbar */}
      {fotos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Buscar fotos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}><Grid3X3 className="w-4 h-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSelecting ? (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionadas</span>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={selectAll}><SquareCheck className="w-3 h-3" /> Todas</Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={deselectAll}><SquareMinus className="w-3 h-3" /> Ninguna</Button>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={handleDeleteSelected}>
                    <Trash2 className="w-3 h-3" /> Eliminar ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); }}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setIsSelecting(true)}>
                <Square className="w-3 h-3" /> Seleccionar
              </Button>
            )}
          </div>
        </div>
      )}

      {fotos.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} foto{filtered.length !== 1 ? "s" : ""} {search ? "encontrada(s)" : "subida(s)"}
        </p>
      )}

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No hay fotos en este grupo</p>
          <p className="text-xs">Sube la primera foto de evidencia</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((f, i) => {
            const isSelected = selectedIds.has(f.id);
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className={`group relative bg-card rounded-2xl overflow-hidden border shadow-sm transition-all ${
                  isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:shadow-md"
                }`}
              >
                {isSelecting && (
                  <div className="absolute top-2 left-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary text-white" : "bg-white/80 border-white/80"}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                {!isSelecting && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openPreview(i); }} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors" title="Ver"><ZoomIn className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id, f.storage_path); }} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => isSelecting ? toggleSelect(f.id) : openPreview(i)}>
                  <img src={f.url} alt={f.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{f.titulo}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatSize(f.size_bytes)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(f.creado_en)}</span>
                  </div>
                  {f.materia && <p className="text-[10px] text-primary mt-1">{f.materia}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f, i) => {
            const isSelected = selectedIds.has(f.id);
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"
                }`}
                onClick={() => isSelecting ? toggleSelect(f.id) : openPreview(i)}
              >
                {isSelecting && (
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                )}
                <img src={f.url} alt={f.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.titulo}</p>
                  <p className="text-xs text-muted-foreground">{f.materia} · {formatSize(f.size_bytes)} · {formatDate(f.creado_en)}</p>
                </div>
                {!isSelecting && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openPreview(i); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Eye className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id, f.storage_path); }} className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {previewIndex !== null && filtered[previewIndex] && (
          <ImagePreviewModal
            evidencia={filtered[previewIndex]}
            currentIndex={previewIndex}
            total={filtered.length}
            onClose={closePreview}
            onNext={goNext}
            onPrev={goPrev}
            onDelete={() => { handleDelete(filtered[previewIndex].id, filtered[previewIndex].storage_path); if (filtered.length <= 1) closePreview(); else if (previewIndex >= filtered.length - 1) setPreviewIndex(filtered.length - 2); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ IMAGE PREVIEW MODAL ═════════════════════ */

function ImagePreviewModal({ evidencia, currentIndex, total, onClose, onNext, onPrev, onDelete }: {
  evidencia: Evidencia; currentIndex: number; total: number;
  onClose: () => void; onNext: () => void; onPrev: () => void; onDelete: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 4));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) { setIsDragging(true); dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }; }
  };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); };
  const handleMouseUp = () => setIsDragging(false);
  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = evidencia.url;
    a.download = evidencia.titulo;
    a.click();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{evidencia.titulo}</span>
          {evidencia.materia && <Badge className="bg-white/20 text-white text-xs border-white/30">{evidencia.materia}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">{currentIndex + 1} / {total}</span>
          <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(s + 0.5, 4)); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Acercar"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(s - 0.5, 0.5)); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Alejar"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); resetZoom(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Reset zoom"><MinimizeIcon /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Descargar"><Download className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-red-500 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Cerrar"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden relative" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {total > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onPrev(); resetZoom(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={(e) => { e.stopPropagation(); onNext(); resetZoom(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"><ChevronRight className="w-6 h-6" /></button>
          </>
        )}
        <motion.img key={evidencia.id} src={evidencia.url} alt={evidencia.titulo} className="max-w-full max-h-full object-contain select-none"
          style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`, cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}
        />
      </div>
      <div className="p-3 bg-black/50 backdrop-blur-sm text-center">
        <p className="text-white/60 text-xs">{evidencia.descripcion || evidencia.titulo} · {formatSize(evidencia.size_bytes)} · {formatDate(evidencia.creado_en)}</p>
        <p className="text-white/40 text-[10px] mt-1">Rueda del ratón para zoom · Arrastra para mover · Flechas para navegar · ESC para cerrar</p>
      </div>
    </motion.div>
  );
}

function MinimizeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

/* ═════════════════════ DOCUMENTOS VIEW (SUPABASE) ═════════════════════ */

function DocumentosView({ grupo, userId, alumnoId, alumnoNombre }: { grupo: string; userId: string | null; alumnoId?: string; alumnoNombre?: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evidencias")
        .select("*")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("tipo", "documento")
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setEvidencias((data as Evidencia[]) || []);
    } catch (err: any) {
      console.error("[Documentos] Error:", err);
      toast.error("Error cargando documentos: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, grupo]);

  useEffect(() => { cargar(); }, [cargar]);

  const docs = evidencias;
  const filtered = docs.filter((d) => d.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !userId) return;
    setIsUploading(true);
    let subidas = 0;
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(0)} MB y supera el límite de 50 MB del plan gratuito. Comprímelo o usa uno más ligero.`);
        continue;
      }
      try {
        const safeGrupo = grupo.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const path = `${userId}/${safeGrupo}/documentos/${Date.now()}-${file.name}`;
        const { error: upError } = await supabase.storage.from("evidencias").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upError) throw upError;
        const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
        const { error: dbError } = await supabase.from("evidencias").insert({
          user_id: userId, titulo: file.name, url: urlData?.publicUrl || "", storage_path: path,
          tipo: "documento", grupo, alumno_id: alumnoId || null, alumno_nombre: alumnoNombre || null, size_bytes: file.size,
        });
        if (dbError) throw dbError;
        subidas++;
      } catch (err: any) {
        toast.error(`Error subiendo ${file.name}: ${err.message}`);
      }
    }
    setIsUploading(false);
    if (subidas > 0) { toast.success(`${subidas} documento(s) subido(s).`); cargar(); }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string, storagePath?: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      if (storagePath) await supabase.storage.from("evidencias").remove([storagePath]);
      const { error } = await supabase.from("evidencias").delete().eq("id", id);
      if (error) throw error;
      setEvidencias((prev) => prev.filter((e) => e.id !== id));
      toast.success("Documento eliminado.");
    } catch (err: any) { toast.error("Error: " + err.message); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} documento(s)?`)) return;
    const toDelete = evidencias.filter((e) => selectedIds.has(e.id));
    for (const ev of toDelete) {
      if (ev.storage_path) await supabase.storage.from("evidencias").remove([ev.storage_path]);
      await supabase.from("evidencias").delete().eq("id", ev.id);
    }
    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set()); setIsSelecting(false);
    toast.success("Documentos eliminados.");
  };

  const toggleSelect = (id: string) => { setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  const getDocIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (["doc", "docx"].includes(ext || "")) return <FileType2 className="w-5 h-5 text-blue-500" />;
    if (["xls", "xlsx", "csv"].includes(ext || "")) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (["ppt", "pptx"].includes(ext || "")) return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div onClick={() => !isUploading && inputRef.current?.click()} className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer p-8 text-center group">
        {isUploading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : <Upload className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />}
        <p className="text-sm font-medium mt-2">Subir documento</p>
        <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint</p>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
      </div>

      {docs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar documentos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="flex items-center gap-2">
            {isSelecting ? (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionados</span>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={handleDeleteSelected}>
                    <Trash2 className="w-3 h-3" /> Eliminar ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); }}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setIsSelecting(true)}>
                <Square className="w-3 h-3" /> Seleccionar
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No hay documentos en este grupo</p>
          </div>
        )}
        {filtered.map((d, i) => {
          const isSelected = selectedIds.has(d.id);
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card hover:shadow-sm"}`}>
              {isSelecting && (
                <button onClick={() => toggleSelect(d.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"}`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              )}
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">{getDocIcon(d.titulo)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">{formatSize(d.size_bytes)} · {formatDate(d.creado_en)}</p>
              </div>
              {!isSelecting && (
                <div className="flex gap-1 shrink-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Ver"><ExternalLink className="w-4 h-4" /></a>
                  <button onClick={() => handleDelete(d.id, d.storage_path)} className="p-2 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════ VIDEOS VIEW (SUPABASE) ═════════════════════ */

function VideosView({ grupo, userId, alumnoId, alumnoNombre }: { grupo: string; userId: string | null; alumnoId?: string; alumnoNombre?: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("evidencias")
        .select("*")
        .eq("user_id", userId)
        .eq("grupo", grupo)
        .eq("tipo", "video")
        .order("creado_en", { ascending: false });
      if (error) throw error;
      setEvidencias((data as Evidencia[]) || []);
    } catch (err: any) {
      toast.error("Error cargando videos: " + err.message);
    } finally { setLoading(false); }
  }, [userId, grupo]);

  useEffect(() => { cargar(); }, [cargar]);

  const videos = evidencias;
  const filtered = videos.filter((v) => v.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !userId) return;
    setIsUploading(true);
    let subidas = 0;
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`"${file.name}" pesa ${(file.size / 1024 / 1024).toFixed(0)} MB y supera el límite de 50 MB del plan gratuito de Supabase. Comprime el video o usa uno más corto.`);
        continue;
      }
      try {
        const safeGrupo = grupo.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const path = `${userId}/${safeGrupo}/videos/${Date.now()}-${file.name}`;
        const { error: upError } = await supabase.storage.from("evidencias").upload(path, file, { cacheControl: "3600", upsert: false });
        if (upError) throw upError;
        const { data: urlData } = supabase.storage.from("evidencias").getPublicUrl(path);
        const { error: dbError } = await supabase.from("evidencias").insert({
          user_id: userId, titulo: file.name, url: urlData?.publicUrl || "", storage_path: path,
          tipo: "video", grupo, alumno_id: alumnoId || null, alumno_nombre: alumnoNombre || null, size_bytes: file.size,
        });
        if (dbError) throw dbError;
        subidas++;
      } catch (err: any) { toast.error(`Error subiendo ${file.name}: ${err.message}`); }
    }
    setIsUploading(false);
    if (subidas > 0) { toast.success(`${subidas} video(s) subido(s).`); cargar(); }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (id: string, storagePath?: string) => {
    if (!confirm("¿Eliminar este video?")) return;
    try {
      if (storagePath) await supabase.storage.from("evidencias").remove([storagePath]);
      const { error } = await supabase.from("evidencias").delete().eq("id", id);
      if (error) throw error;
      setEvidencias((prev) => prev.filter((e) => e.id !== id));
      if (playingId === id) setPlayingId(null);
      toast.success("Video eliminado.");
    } catch (err: any) { toast.error("Error: " + err.message); }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} video(s)?`)) return;
    const toDelete = evidencias.filter((e) => selectedIds.has(e.id));
    for (const ev of toDelete) {
      if (ev.storage_path) await supabase.storage.from("evidencias").remove([ev.storage_path]);
      await supabase.from("evidencias").delete().eq("id", ev.id);
    }
    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set()); setIsSelecting(false); setPlayingId(null);
    toast.success("Videos eliminados.");
  };

  const toggleSelect = (id: string) => { setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div onClick={() => !isUploading && inputRef.current?.click()} className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer p-8 text-center group">
        {isUploading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : <Clapperboard className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />}
        <p className="text-sm font-medium mt-2">Subir video</p>
        <p className="text-xs text-muted-foreground">MP4, WebM, MOV hasta 50MB</p>
        <input ref={inputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} />
      </div>

      {videos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar videos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="flex items-center gap-2">
            {isSelecting ? (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionados</span>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={handleDeleteSelected}>
                    <Trash2 className="w-3 h-3" /> Eliminar ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); }}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setIsSelecting(true)}>
                <Square className="w-3 h-3" /> Seleccionar
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Clapperboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No hay videos en este grupo</p>
          </div>
        )}
        {filtered.map((v, i) => {
          const isSelected = selectedIds.has(v.id);
          const isPlaying = playingId === v.id;
          return (
            <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-2xl overflow-hidden border shadow-sm transition-all ${isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:shadow-md"}`}>
              <div className="relative aspect-video bg-black group">
                {isPlaying ? (
                  <video src={v.url} controls autoPlay className="w-full h-full" onEnded={() => setPlayingId(null)} />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center"><Video className="w-10 h-10 text-white/30" /></div>
                    <button onClick={() => setPlayingId(v.id)} className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-primary border-b-8 border-b-transparent ml-1" />
                      </div>
                    </button>
                  </>
                )}
                {isSelecting && (
                  <div className="absolute top-2 left-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(v.id); }} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${isSelected ? "bg-primary border-primary text-white" : "bg-white/80 border-white/80"}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                {!isSelecting && !isPlaying && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => handleDelete(v.id, v.storage_path)} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{v.titulo}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatSize(v.size_bytes)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(v.creado_en)}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════ PORTAFOLIO DIGITAL (SUPABASE) ═════════════════════ */

function PortafolioView({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [alumnos, setAlumnos] = useState<AlumnoPortafolio[]>([]);
  const [search, setSearch] = useState("");
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoPortafolio | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);

  // Cargar alumnos + evidencias desde Supabase
  useEffect(() => {
    const cargar = async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      try {
        // 1. Obtener alumnos del grupo
        const { data: alumnosData, error: alError } = await supabase
          .from("alumnos")
          .select("id, nombre, grupo")
          .eq("user_id", userId)
          .eq("grupo", grupo)
          .eq("activo", true)
          .order("nombre", { ascending: true });

        if (alError) throw alError;

        // 2. Para cada alumno, obtener evidencias
        const portafolios: AlumnoPortafolio[] = [];
        for (const alumno of (alumnosData || [])) {
          const { data: evData } = await supabase
            .from("evidencias")
            .select("*")
            .eq("user_id", userId)
            .eq("alumno_id", alumno.id)
            .order("creado_en", { ascending: false });

          const evidencias = (evData || []).map((e: any) => ({
            id: e.id,
            titulo: e.titulo,
            url: e.url,
            tipo: e.tipo as EvidenciaTipo,
            grupo: e.grupo,
            materia: e.materia,
            size_bytes: e.size_bytes || 0,
            creado_en: e.creado_en,
            user_id: e.user_id,
            storage_path: e.storage_path,
          }));

          const ultima = evidencias.length > 0 ? evidencias[0].creado_en : new Date().toISOString();

          portafolios.push({
            id: alumno.id,
            nombre: alumno.nombre,
            grupo: alumno.grupo,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(alumno.nombre)}`,
            evidencias,
            totalEvidencias: evidencias.length,
            ultimaActualizacion: ultima,
          });
        }

        setAlumnos(portafolios);
      } catch (err: any) {
        console.error("[Portafolio] Error:", err);
        toast.error("Error cargando portafolios: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [userId, grupo]);

  const filtered = alumnos.filter((a) => a.nombre.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-6 h-6" />
          <h3 className="font-bold text-lg">Portafolio Digital del Alumno</h3>
        </div>
        <p className="text-white/80 text-sm">Colección completa de evidencias del aprendizaje de cada alumno. Haz clic para ver su portafolio.</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar alumno..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} alumno{filtered.length !== 1 ? "s" : ""} en {grupo}</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No hay alumnos en este grupo</p>
          <p className="text-xs">Registra alumnos primero en la sección de Alumnos</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <motion.button key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedAlumno(a)}
              className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={a.avatar} alt={a.nombre} className="w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{a.nombre}</h4>
                  <p className="text-xs text-muted-foreground">{a.grupo}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="font-medium">{a.totalEvidencias}</span>
                  <span className="text-xs text-muted-foreground">evidencias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatDate(a.ultimaActualizacion)}</span>
                </div>
              </div>
              {a.evidencias.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {a.evidencias.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border">
                      {ev.tipo === "foto" || ev.tipo === "video" ? (
                        <img src={ev.url || "https://via.placeholder.com/48"} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                    </div>
                  ))}
                  {a.evidencias.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border">+{a.evidencias.length - 3}</div>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a, i) => (
            <motion.button key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedAlumno(a)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/50 transition-all text-left">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 flex items-center justify-center shrink-0 overflow-hidden">
                <img src={a.avatar} alt={a.nombre} className="w-full h-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">{a.nombre}</h4>
                <p className="text-xs text-muted-foreground">{a.grupo} · Última actualización: {formatDate(a.ultimaActualizacion)}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{a.totalEvidencias}</span>
                </div>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedAlumno && <AlumnoPortafolioModal alumno={selectedAlumno} onClose={() => setSelectedAlumno(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ MODAL PORTAFOLIO ALUMNO ═════════════════════ */

function AlumnoPortafolioModal({ alumno, onClose }: { alumno: AlumnoPortafolio; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"todas" | "foto" | "documento" | "video">("todas");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTipo, setPreviewTipo] = useState<EvidenciaTipo | null>(null);

  const filtered = activeTab === "todas" ? alumno.evidencias : alumno.evidencias.filter((e) => e.tipo === activeTab);

  const tabs = [
    { id: "todas" as const, label: "Todas", count: alumno.evidencias.length },
    { id: "foto" as const, label: "Fotos", count: alumno.evidencias.filter((e) => e.tipo === "foto").length },
    { id: "documento" as const, label: "Docs", count: alumno.evidencias.filter((e) => e.tipo === "documento").length },
    { id: "video" as const, label: "Videos", count: alumno.evidencias.filter((e) => e.tipo === "video").length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl border border-border shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900 dark:to-pink-900 flex items-center justify-center overflow-hidden">
              <img src={alumno.avatar} alt={alumno.nombre} className="w-full h-full" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{alumno.nombre}</h3>
              <p className="text-sm text-muted-foreground">{alumno.grupo} · {alumno.totalEvidencias} evidencias</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 pt-4 flex gap-2 shrink-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Este alumno aún no tiene evidencias registradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((ev, i) => (
                <motion.div key={ev.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    if (ev.tipo === "foto") { setPreviewUrl(ev.url); setPreviewTipo("foto"); }
                    else if (ev.tipo === "video") { setPreviewUrl(ev.url); setPreviewTipo("video"); }
                    else { window.open(ev.url, "_blank"); }
                  }}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {ev.tipo === "foto" && ev.url ? (
                      <img src={ev.url} alt={ev.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : ev.tipo === "video" ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/5">
                        <Video className="w-8 h-8 text-muted-foreground" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <div className="w-0 h-0 border-t-6 border-t-transparent border-l-8 border-l-primary border-b-6 border-b-transparent ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FileText className="w-8 h-8 text-muted-foreground" /></div>
                    )}
                    <Badge className="absolute top-2 right-2 text-[10px] bg-black/60 text-white backdrop-blur-sm">
                      {ev.tipo === "foto" ? "Foto" : ev.tipo === "video" ? "Video" : "Doc"}
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium truncate">{ev.titulo}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ev.materia}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {previewUrl && previewTipo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => { setPreviewUrl(null); setPreviewTipo(null); }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setPreviewUrl(null); setPreviewTipo(null); }} className="absolute -top-10 right-0 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
              {previewTipo === "foto" ? (
                <img src={previewUrl} alt="Preview" className="w-full max-h-[80vh] object-contain rounded-xl" />
              ) : (
                <video src={previewUrl} controls autoPlay className="w-full max-h-[80vh] rounded-xl" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}