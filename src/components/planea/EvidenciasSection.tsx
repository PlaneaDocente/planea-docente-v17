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
  FileSpreadsheet, FileType2, Music, Archive, ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ═════════════════════ TIPOS ═════════════════════ */

type TabId = "fotos" | "documentos" | "videos" | "portafolio";
type EvidenciaTipo = "foto" | "documento" | "video";

interface Evidencia {
  id: string;
  titulo: string;
  url: string;
  tipo: EvidenciaTipo;
  grupo: string;
  alumno?: string;
  materia?: string;
  descripcion?: string;
  size: number;
  creado_en: string;
  isDemo?: boolean;
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

/* ═════════════════════ CONSTANTES ═════════════════════ */

const GRUPOS = ["3°A", "3°B", "4°A", "4°B", "5°A", "5°B"];

const STORAGE_KEY = "planeadocente_evidencias";

// Fotos de ejemplo (demo) — integradas para la demostración
const FOTOS_EJEMPLO: Evidencia[] = [
  {
    id: "demo-1",
    titulo: "Cielo.png",
    url: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Ciencias Naturales",
    descripcion: "Observación del cielo y formación de nubes",
    size: 2457600,
    creado_en: "2025-01-15T10:00:00Z",
    isDemo: true,
  },
  {
    id: "demo-2",
    titulo: "Corteza Arbol.png",
    url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Biología",
    descripcion: "Análisis de la corteza de árbol en el patio escolar",
    size: 1892000,
    creado_en: "2025-01-14T11:30:00Z",
    isDemo: true,
  },
  {
    id: "demo-3",
    titulo: "Piedra.png",
    url: "https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Geografía",
    descripcion: "Clasificación de rocas ígneas y sedimentarias",
    size: 2100000,
    creado_en: "2025-01-13T09:15:00Z",
    isDemo: true,
  },
  {
    id: "demo-4",
    titulo: "Corteza Arbol 2.png",
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Biología",
    descripcion: "Textura de la corteza de encino",
    size: 1950000,
    creado_en: "2025-01-12T10:00:00Z",
    isDemo: true,
  },
  {
    id: "demo-5",
    titulo: "Cielo Atardecer.png",
    url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Ciencias Naturales",
    descripcion: "Formación de nubes al atardecer",
    size: 2300000,
    creado_en: "2025-01-11T16:45:00Z",
    isDemo: true,
  },
  {
    id: "demo-6",
    titulo: "Piedras Rio.png",
    url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80",
    tipo: "foto",
    grupo: "3°A",
    materia: "Geografía",
    descripcion: "Piedras del río erosionadas por el agua",
    size: 2050000,
    creado_en: "2025-01-10T08:30:00Z",
    isDemo: true,
  },
];

const PORTAFOLIOS_MOCK: AlumnoPortafolio[] = [
  {
    id: "al-1",
    nombre: "Ana Pérez",
    grupo: "3°A",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
    totalEvidencias: 12,
    ultimaActualizacion: "2025-01-15",
    evidencias: [
      { id: "ev-1", titulo: "Proyecto de ciencias", url: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400", tipo: "foto", grupo: "3°A", materia: "Ciencias", size: 0, creado_en: "2025-01-10" },
      { id: "ev-2", titulo: "Examen bimestral", url: "", tipo: "documento", grupo: "3°A", materia: "Matemáticas", size: 0, creado_en: "2025-01-08" },
    ],
  },
  {
    id: "al-2",
    nombre: "Luis López",
    grupo: "3°A",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luis",
    totalEvidencias: 8,
    ultimaActualizacion: "2025-01-14",
    evidencias: [
      { id: "ev-3", titulo: "Exposición oral", url: "https://images.unsplash.com/photo-1475721027767-p428ed255c73?w=400", tipo: "video", grupo: "3°A", materia: "Español", size: 0, creado_en: "2025-01-12" },
    ],
  },
  {
    id: "al-3",
    nombre: "Sofía Ruiz",
    grupo: "3°A",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia",
    totalEvidencias: 15,
    ultimaActualizacion: "2025-01-15",
    evidencias: [
      { id: "ev-4", titulo: "Experimento volcanes", url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400", tipo: "foto", grupo: "3°A", materia: "Ciencias", size: 0, creado_en: "2025-01-13" },
      { id: "ev-5", titulo: "Lectura en voz alta", url: "", tipo: "video", grupo: "3°A", materia: "Español", size: 0, creado_en: "2025-01-11" },
    ],
  },
  {
    id: "al-4",
    nombre: "Diego Martínez",
    grupo: "3°B",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diego",
    totalEvidencias: 6,
    ultimaActualizacion: "2025-01-13",
    evidencias: [],
  },
  {
    id: "al-5",
    nombre: "María García",
    grupo: "4°A",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    totalEvidencias: 10,
    ultimaActualizacion: "2025-01-14",
    evidencias: [],
  },
  {
    id: "al-6",
    nombre: "Carlos Torres",
    grupo: "4°A",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
    totalEvidencias: 9,
    ultimaActualizacion: "2025-01-12",
    evidencias: [],
  },
];

/* ═════════════════════ UTILIDADES ═════════════════════ */

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function EvidenciasSection() {
  const [activeTab, setActiveTab] = useState<TabId>("fotos");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>(GRUPOS[0]);

  const tabs = [
    { id: "fotos" as TabId, label: "Fotos", icon: Camera },
    { id: "documentos" as TabId, label: "Documentos", icon: FileText },
    { id: "videos" as TabId, label: "Videos", icon: Clapperboard },
    { id: "portafolio" as TabId, label: "Portafolio Digital", icon: FolderOpen },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Evidencias</h1>
          <p className="text-sm text-muted-foreground">Ciclo Escolar 2025-2026</p>
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
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

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
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "fotos" && <FotosView grupo={grupoSeleccionado} />}
          {activeTab === "documentos" && <DocumentosView grupo={grupoSeleccionado} />}
          {activeTab === "videos" && <VideosView grupo={grupoSeleccionado} />}
          {activeTab === "portafolio" && <PortafolioView grupo={grupoSeleccionado} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ FOTOS VIEW ═════════════════════ */

function FotosView({ grupo }: { grupo: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar desde localStorage + demo data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let all: Evidencia[] = [];
    if (saved) {
      try { all = JSON.parse(saved); } catch { /* ignore */ }
    }
    // Si no hay nada guardado, usar demo data
    if (all.length === 0) {
      all = [...FOTOS_EJEMPLO];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
    setEvidencias(all);
    setLoaded(true);
  }, []);

  // Guardar cambios
  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(evidencias));
  }, [evidencias, loaded]);

  const fotos = evidencias.filter((e) => e.tipo === "foto" && e.grupo === grupo);
  const filtered = fotos.filter((f) =>
    f.titulo.toLowerCase().includes(search.toLowerCase()) ||
    (f.materia?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (f.descripcion?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);

    const newPhotos: Evidencia[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        titulo: file.name,
        url,
        tipo: "foto",
        grupo,
        size: file.size,
        creado_en: new Date().toISOString(),
      });
    }

    setEvidencias((prev) => [...newPhotos, ...prev]);
    setIsUploading(false);
    toast.success(`${newPhotos.length} foto(s) subida(s) correctamente.`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta foto permanentemente?")) return;
    setEvidencias((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("Foto eliminada.");
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} foto(s) seleccionada(s)?`)) return;
    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);
    toast.success("Fotos eliminadas.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = new Set(filtered.map((f) => f.id));
    setSelectedIds(ids);
  };

  const deselectAll = () => setSelectedIds(new Set());

  const openPreview = (index: number) => setPreviewIndex(index);
  const closePreview = () => setPreviewIndex(null);

  const goNext = () => {
    if (previewIndex === null) return;
    setPreviewIndex((previewIndex + 1) % filtered.length);
  };

  const goPrev = () => {
    if (previewIndex === null) return;
    setPreviewIndex((previewIndex - 1 + filtered.length) % filtered.length);
  };

  // Keyboard navigation
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

  if (!loaded) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </div>

      {/* Toolbar */}
      {fotos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar fotos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary"
              />
            </div>
            <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSelecting ? (
              <>
                <span className="text-xs text-muted-foreground">{selectedIds.size} seleccionadas</span>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={selectAll}>
                  <SquareCheck className="w-3 h-3" /> Todas
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={deselectAll}>
                  <SquareMinus className="w-3 h-3" /> Ninguna
                </Button>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={handleDeleteSelected}>
                    <Trash2 className="w-3 h-3" /> Eliminar ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setIsSelecting(false); setSelectedIds(new Set()); }}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setIsSelecting(true)}>
                <Square className="w-3 h-3" /> Seleccionar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contador */}
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
                {/* Checkbox overlay */}
                {isSelecting && (
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary border-primary text-white" : "bg-white/80 border-white/80"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* Delete individual */}
                {!isSelecting && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openPreview(i); }}
                      className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                      title="Ver"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                      className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Image */}
                <div
                  className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                  onClick={() => isSelecting ? toggleSelect(f.id) : openPreview(i)}
                >
                  <img
                    src={f.url}
                    alt={f.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {f.isDemo && (
                    <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] backdrop-blur-sm">
                      Ejemplo
                    </Badge>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{f.titulo}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(f.creado_en)}</span>
                  </div>
                  {f.materia && (
                    <p className="text-[10px] text-primary mt-1">{f.materia}</p>
                  )}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(f.id); }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                )}
                <img src={f.url} alt={f.titulo} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.titulo}</p>
                  <p className="text-xs text-muted-foreground">{f.materia} · {formatSize(f.size)} · {formatDate(f.creado_en)}</p>
                </div>
                {!isSelecting && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); openPreview(i); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            onDelete={() => {
              handleDelete(filtered[previewIndex].id);
              if (filtered.length <= 1) closePreview();
              else if (previewIndex >= filtered.length - 1) setPreviewIndex(filtered.length - 2);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ IMAGE PREVIEW MODAL (ZOOM) ═════════════════════ */

function ImagePreviewModal({
  evidencia,
  currentIndex,
  total,
  onClose,
  onNext,
  onPrev,
  onDelete,
}: {
  evidencia: Evidencia;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDelete: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 4));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetZoom = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = evidencia.url;
    a.download = evidencia.titulo;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm font-medium">{evidencia.titulo}</span>
          {evidencia.materia && (
            <Badge className="bg-white/20 text-white text-xs border-white/30">{evidencia.materia}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs">{currentIndex + 1} / {total}</span>
          <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(s + 0.5, 4)); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Acercar">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(s - 0.5, 0.5)); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Alejar">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); resetZoom(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Reset zoom">
            <MinimizeIcon />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Descargar">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-red-500 transition-colors" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onPrev(); resetZoom(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onNext(); resetZoom(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <motion.img
          ref={imgRef}
          key={evidencia.id}
          src={evidencia.url}
          alt={evidencia.titulo}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Info bar */}
      <div className="p-3 bg-black/50 backdrop-blur-sm text-center">
        <p className="text-white/60 text-xs">
          {evidencia.descripcion || evidencia.titulo} · {formatSize(evidencia.size)} · {formatDate(evidencia.creado_en)}
        </p>
        <p className="text-white/40 text-[10px] mt-1">
          Usa la rueda del ratón para zoom · Arrastra para mover · Flechas para navegar · ESC para cerrar
        </p>
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

/* ═════════════════════ DOCUMENTOS VIEW ═════════════════════ */

function DocumentosView({ grupo }: { grupo: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let all: Evidencia[] = [];
    if (saved) { try { all = JSON.parse(saved); } catch { } }
    setEvidencias(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(evidencias));
  }, [evidencias, loaded]);

  const docs = evidencias.filter((e) => e.tipo === "documento" && e.grupo === grupo);
  const filtered = docs.filter((d) => d.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    const newDocs: Evidencia[] = [];
    for (const file of files) {
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newDocs.push({
        id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        titulo: file.name,
        url,
        tipo: "documento",
        grupo,
        size: file.size,
        creado_en: new Date().toISOString(),
      });
    }
    setEvidencias((prev) => [...newDocs, ...prev]);
    setIsUploading(false);
    toast.success(`${newDocs.length} documento(s) subido(s).`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setEvidencias((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.success("Documento eliminado.");
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} documento(s)?`)) return;
    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);
    toast.success("Documentos eliminados.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const getDocIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-5 h-5 text-red-500" />;
    if (["doc", "docx"].includes(ext || "")) return <FileType2 className="w-5 h-5 text-blue-500" />;
    if (["xls", "xlsx", "csv"].includes(ext || "")) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (["ppt", "pptx"].includes(ext || "")) return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  if (!loaded) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

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
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border bg-card hover:shadow-sm"
              }`}
            >
              {isSelecting && (
                <button onClick={() => toggleSelect(d.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30"}`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </button>
              )}
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {getDocIcon(d.titulo)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">{formatSize(d.size)} · {formatDate(d.creado_en)}</p>
              </div>
              {!isSelecting && (
                <div className="flex gap-1 shrink-0">
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Ver">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button onClick={() => handleDelete(d.id)} className="p-2 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═════════════════════ VIDEOS VIEW ═════════════════════ */

function VideosView({ grupo }: { grupo: string }) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let all: Evidencia[] = [];
    if (saved) { try { all = JSON.parse(saved); } catch { } }
    setEvidencias(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(evidencias));
  }, [evidencias, loaded]);

  const videos = evidencias.filter((e) => e.tipo === "video" && e.grupo === grupo);
  const filtered = videos.filter((v) => v.titulo.toLowerCase().includes(search.toLowerCase()));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    const newVideos: Evidencia[] = [];
    for (const file of files) {
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newVideos.push({
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        titulo: file.name,
        url,
        tipo: "video",
        grupo,
        size: file.size,
        creado_en: new Date().toISOString(),
      });
    }
    setEvidencias((prev) => [...newVideos, ...prev]);
    setIsUploading(false);
    toast.success(`${newVideos.length} video(s) subido(s).`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este video?")) return;
    setEvidencias((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (playingId === id) setPlayingId(null);
    toast.success("Video eliminado.");
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} video(s)?`)) return;
    setEvidencias((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setIsSelecting(false);
    setPlayingId(null);
    toast.success("Videos eliminados.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (!loaded) return <div className="h-40 animate-pulse bg-muted rounded-2xl" />;

  return (
    <div className="space-y-5">
      <div onClick={() => !isUploading && inputRef.current?.click()} className="rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary hover:bg-primary/5 transition-all cursor-pointer p-8 text-center group">
        {isUploading ? <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /> : <Clapperboard className="w-8 h-8 mx-auto text-muted-foreground group-hover:text-primary transition-colors" />}
        <p className="text-sm font-medium mt-2">Subir video</p>
        <p className="text-xs text-muted-foreground">MP4, WebM, MOV hasta 100MB</p>
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
            <motion.div
              key={v.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-2xl overflow-hidden border shadow-sm transition-all ${
                isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:shadow-md"
              }`}
            >
              {/* Video / Thumbnail */}
              <div className="relative aspect-video bg-black group">
                {isPlaying ? (
                  <video src={v.url} controls autoPlay className="w-full h-full" onEnded={() => setPlayingId(null)} />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-10 h-10 text-white/30" />
                    </div>
                    <button
                      onClick={() => setPlayingId(v.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                    >
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
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{v.titulo}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatSize(v.size)}</span>
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

/* ═════════════════════ PORTAFOLIO DIGITAL VIEW ═════════════════════ */

function PortafolioView({ grupo }: { grupo: string }) {
  const [alumnos, setAlumnos] = useState<AlumnoPortafolio[]>(PORTAFOLIOS_MOCK);
  const [search, setSearch] = useState("");
  const [selectedAlumno, setSelectedAlumno] = useState<AlumnoPortafolio | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = alumnos.filter((a) => {
    const matchGrupo = a.grupo === grupo;
    const matchSearch = a.nombre.toLowerCase().includes(search.toLowerCase());
    return matchGrupo && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-6 h-6" />
          <h3 className="font-bold text-lg">Portafolio Digital del Alumno</h3>
        </div>
        <p className="text-white/80 text-sm">Colección completa de evidencias del aprendizaje de cada alumno. Haz clic en un alumno para ver su portafolio.</p>
      </motion.div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary"
            />
          </div>
          <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-white dark:bg-zinc-800 shadow-sm" : ""}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {filtered.length} alumno{filtered.length !== 1 ? "s" : ""} en {grupo}
        </Badge>
      </div>

      {/* Lista de alumnos */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No hay alumnos en este grupo</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedAlumno(a)}
              className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left group"
            >
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
              {/* Mini preview de evidencias */}
              {a.evidencias.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {a.evidencias.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="w-12 h-12 rounded-lg bg-muted overflow-hidden border border-border">
                      {ev.tipo === "foto" || ev.tipo === "video" ? (
                        <img src={ev.url || "https://via.placeholder.com/48"} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {a.evidencias.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground border border-border">
                      +{a.evidencias.length - 3}
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedAlumno(a)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/50 transition-all text-left"
            >
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

      {/* Modal de portafolio de alumno */}
      <AnimatePresence>
        {selectedAlumno && (
          <AlumnoPortafolioModal alumno={selectedAlumno} onClose={() => setSelectedAlumno(null)} />
        )}
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card rounded-2xl border border-border shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Este alumno aún no tiene evidencias registradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    if (ev.tipo === "foto") { setPreviewUrl(ev.url); setPreviewTipo("foto"); }
                    else if (ev.tipo === "video") { setPreviewUrl(ev.url); setPreviewTipo("video"); }
                    else { window.open(ev.url, "_blank"); }
                  }}
                >
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
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      </div>
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

      {/* Preview de foto/video dentro del modal */}
      <AnimatePresence>
        {previewUrl && previewTipo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
            onClick={() => { setPreviewUrl(null); setPreviewTipo(null); }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setPreviewUrl(null); setPreviewTipo(null); }}
                className="absolute -top-10 right-0 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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