
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Sparkles, ImageIcon, Download, RefreshCw,
  CheckCircle2, AlertCircle, Loader2, X, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiImage } from "@zoerai/integration";
import type { TextToImageResult } from "@zoerai/integration";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:2";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: AspectRatio;
  timestamp: number;
}

const aspectRatioOptions: { value: AspectRatio; label: string; desc: string }[] = [
  { value: "1:1", label: "Cuadrado", desc: "1:1 · 1024×1024" },
  { value: "16:9", label: "Horizontal", desc: "16:9 · 1920×1080" },
  { value: "9:16", label: "Vertical", desc: "9:16 · 1080×1920" },
  { value: "4:3", label: "Estándar", desc: "4:3 · 1024×768" },
  { value: "3:2", label: "Foto", desc: "3:2 · 1080×720" },
];

const promptSuggestions = [
  "Niños aprendiendo matemáticas en un salón de clases colorido",
  "Maestra explicando ciencias naturales con experimentos",
  "Mapa conceptual de la Revolución Mexicana ilustrado",
  "Diagrama del ciclo del agua para primaria",
  "Ilustración de fracciones con pizzas y pasteles",
  "Salón de clases moderno con tecnología educativa",
];

export default function HerramientasIASection() {
  const [activeTab, setActiveTab] = useState<"generador" | "galeria">("generador");
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  const tabs = [
    { id: "generador", label: "🎨 Generador de Imágenes" },
    { id: "galeria", label: `🖼️ Galería (${gallery.length})` },
  ] as const;

  const handleImageGenerated = (img: GeneratedImage) => {
    setGallery((prev) => [img, ...prev]);
  };

  return (
    <div className="space-y-5">
      <HeroBanner />

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

      {activeTab === "generador" && (
        <ImageGeneratorPanel onImageGenerated={handleImageGenerated} />
      )}
      {activeTab === "galeria" && (
        <GalleryPanel
          images={gallery}
          onPreview={setPreviewImage}
          onClear={() => setGallery([])}
        />
      )}

      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal image={previewImage} onClose={() => setPreviewImage(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl"
    >
      <div className="flex flex-col md:flex-row items-center gap-5">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Wand2 className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-bold mb-1">Herramientas de IA para Docentes</h2>
          <p className="text-white/80 text-sm">
            Genera imágenes educativas con inteligencia artificial para enriquecer tus clases y materiales didácticos.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {["🎨 Imágenes educativas", "⚡ Generación instantánea", "📚 Material didáctico"].map((f) => (
            <div key={f} className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ImageGeneratorPanel({ onImageGenerated }: { onImageGenerated: (img: GeneratedImage) => void }) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TextToImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const res = await aiImage.textToImage(prompt.trim(), {
        aspectRatio,
        onProgress: (p) => setProgress(p),
      });

      if (res.success && res.imageUrl) {
        setResult(res);
        onImageGenerated({
          id: `img-${Date.now()}`,
          prompt: prompt.trim(),
          imageUrl: res.imageUrl,
          aspectRatio,
          timestamp: Date.now(),
        });
      } else {
        setError(res.error ?? "No se pudo generar la imagen. Intenta de nuevo.");
      }
    } catch {
      setError("Ocurrió un error inesperado. Por favor intenta de nuevo.");
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setPrompt("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PromptPanel
        prompt={prompt}
        setPrompt={setPrompt}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
        onReset={handleReset}
        hasResult={!!result}
      />
      <ResultPanel
        isGenerating={isGenerating}
        progress={progress}
        result={result}
        error={error}
        prompt={prompt}
      />
    </div>
  );
}

function PromptPanel({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  isGenerating,
  onGenerate,
  onReset,
  hasResult,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (v: AspectRatio) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onReset: () => void;
  hasResult: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Describe la imagen que necesitas
        </h3>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Descripción del contenido educativo
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Niños aprendiendo matemáticas en un salón colorido con pizarrón y materiales didácticos..."
            rows={4}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">{prompt.length} caracteres</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Proporción de la imagen
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {aspectRatioOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAspectRatio(opt.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                  aspectRatio === opt.value
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <p className="font-semibold">{opt.label}</p>
                <p className="opacity-70">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {hasResult && (
            <Button variant="outline" onClick={onReset} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Nueva
            </Button>
          )}
          <Button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generar Imagen</>
            )}
          </Button>
        </div>
      </div>

      <SuggestionsPanel onSelect={setPrompt} />
    </div>
  );
}

function SuggestionsPanel({ onSelect }: { onSelect: (v: string) => void }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-blue-500" />
        Sugerencias de prompts educativos
      </h4>
      <div className="space-y-2">
        {promptSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
          >
            💡 {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({
  isGenerating,
  progress,
  result,
  error,
  prompt,
}: {
  isGenerating: boolean;
  progress: number;
  result: TextToImageResult | null;
  error: string | null;
  prompt: string;
}) {
  const handleDownload = async () => {
    if (!result?.imageUrl) return;
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imagen-educativa-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(result.imageUrl, "_blank");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-purple-500" />
          Imagen Generada
        </h3>
        {result?.imageUrl && (
          <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs h-7">
            <Download className="w-3 h-3" /> Descargar
          </Button>
        )}
      </div>

      <div className="aspect-video flex items-center justify-center bg-muted/30 relative">
        {isGenerating && (
          <GeneratingState progress={progress} />
        )}

        {!isGenerating && !result && !error && (
          <EmptyState />
        )}

        {!isGenerating && error && (
          <ErrorState error={error} />
        )}

        {!isGenerating && result?.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
          >
            <img
              src={result.imageUrl}
              alt={prompt}
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </div>

      {result?.imageUrl && (
        <div className="p-4 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground line-clamp-2">
            <span className="font-medium text-foreground">Prompt: </span>
            {prompt}
          </p>
        </div>
      )}
    </div>
  );
}

function GeneratingState({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
      <div className="w-full max-w-xs">
        <p className="text-sm font-medium mb-2">Generando imagen con IA...</p>
        <div className="w-full bg-muted rounded-full h-2">
          <motion.div
            className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
        <Wand2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Escribe una descripción y presiona "Generar Imagen"
      </p>
      <p className="text-xs text-muted-foreground">
        La imagen aparecerá aquí en unos segundos
      </p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-600 dark:text-red-400">Error al generar</p>
      <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
    </div>
  );
}

function GalleryPanel({
  images,
  onPreview,
  onClear,
}: {
  images: GeneratedImage[];
  onPreview: (img: GeneratedImage) => void;
  onClear: () => void;
}) {
  if (images.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-12 border border-border text-center">
        <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-foreground mb-1">Galería vacía</p>
        <p className="text-sm text-muted-foreground">
          Las imágenes que generes aparecerán aquí durante esta sesión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{images.length} imagen(es) generada(s)</p>
        <Button size="sm" variant="outline" onClick={onClear} className="gap-1.5 text-xs h-7 text-red-600 hover:text-red-700">
          <X className="w-3 h-3" /> Limpiar galería
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <GalleryCard key={img.id} image={img} index={i} onPreview={onPreview} />
        ))}
      </div>
    </div>
  );
}

function GalleryCard({
  image,
  index,
  onPreview,
}: {
  image: GeneratedImage;
  index: number;
  onPreview: (img: GeneratedImage) => void;
}) {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imagen-educativa-${image.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.imageUrl, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
      onClick={() => onPreview(image)}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={image.imageUrl}
          alt={image.prompt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium line-clamp-2 mb-2">{image.prompt}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {image.aspectRatio}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ImagePreviewModal({
  image,
  onClose,
}: {
  image: GeneratedImage;
  onClose: () => void;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imagen-educativa-${image.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.imageUrl, "_blank");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <p className="text-sm font-semibold line-clamp-1 flex-1 mr-4">{image.prompt}</p>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5 text-xs h-7">
              <Download className="w-3 h-3" /> Descargar
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="p-4">
          <img
            src={image.imageUrl}
            alt={image.prompt}
            className="w-full rounded-xl object-contain max-h-[60vh]"
          />
        </div>
        <div className="px-4 pb-4 flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Proporción: {image.aspectRatio}
          </span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {new Date(image.timestamp).toLocaleTimeString("es-MX")}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
