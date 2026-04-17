
"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Video, FolderOpen,
  CheckCircle2, AlertCircle, Loader2, X, ImageIcon,
  File, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockEvidencias } from "@/data/mock-data";
import NextImage from "next/image";
import { upload } from "@zoerai/integration";
import type { UploadResult } from "@zoerai/integration";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  fileKey: string;
  size: number;
  type: string;
  uploadedAt: number;
}

export default function EvidenciasSection() {
  const [activeTab, setActiveTab] = useState<"fotos" | "documentos" | "videos" | "portafolio">("fotos");

  const tabs = [
    { id: "fotos", label: "📷 Fotos" },
    { id: "documentos", label: "📄 Documentos" },
    { id: "videos", label: "🎥 Videos" },
    { id: "portafolio", label: "🗂️ Portafolio Digital" },
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
      </div>

      {activeTab === "fotos" && <FotosView />}
      {activeTab === "documentos" && <DocumentosView />}
      {activeTab === "videos" && <VideosView />}
      {activeTab === "portafolio" && <PortafolioView />}
    </div>
  );
}

function FileUploadZone({
  accept,
  label,
  hint,
  onUploadComplete,
}: {
  accept: string;
  label: string;
  hint: string;
  onUploadComplete: (file: UploadedFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setUploadError(null);
    setLastResult(null);

    const result = await upload.uploadWithPresignedUrl(file, {
      maxSize: 5 * 1024 * 1024,
      onProgress: (p) => setProgress(p),
    });

    setIsUploading(false);

    if (result.success && result.url && result.fileKey) {
      setLastResult(result);
      onUploadComplete({
        id: `file-${Date.now()}`,
        name: file.name,
        url: result.url,
        fileKey: result.fileKey,
        size: file.size,
        type: file.type,
        uploadedAt: Date.now(),
      });
    } else {
      setUploadError(result.error ?? "Error al subir el archivo. Intenta de nuevo.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/10"
            : isUploading
            ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30 cursor-not-allowed"
            : lastResult?.success
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            : uploadError
            ? "border-red-400 bg-red-50 dark:bg-red-950/30"
            : "border-border bg-card hover:border-primary hover:bg-primary/5"
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">Subiendo archivo...</p>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-violet-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        ) : lastResult?.success ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">¡Archivo subido exitosamente!</p>
            <p className="text-xs text-muted-foreground">Haz clic para subir otro archivo</p>
          </div>
        ) : uploadError ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Error al subir</p>
            <p className="text-xs text-muted-foreground max-w-xs">{uploadError}</p>
            <p className="text-xs text-primary mt-1">Haz clic para intentar de nuevo</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
            <p className="text-xs text-muted-foreground">o arrastra y suelta aquí</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function FotosView() {
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedFile[]>([]);

  const staticPhotos = [
    { titulo: "Proyecto de ciencias - Grupo 3A", alumno: "Grupo 3°A", fecha: "2025-01-10", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop" },
    { titulo: "Actividad de matemáticas", alumno: "Grupo 3°A", fecha: "2025-01-08", url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop" },
    { titulo: "Lectura en voz alta", alumno: "Ana García", fecha: "2025-01-07", url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop" },
    { titulo: "Experimento del ciclo del agua", alumno: "Grupo 3°A", fecha: "2025-01-05", url: "https://images.unsplash.com/photo-1532094349884-543559c5f185?w=400&h=300&fit=crop" },
  ];

  const handleUpload = (file: UploadedFile) => {
    setUploadedPhotos((prev) => [file, ...prev]);
  };

  const removeUploaded = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-5">
      <FileUploadZone
        accept="image/jpeg,image/png,image/webp,image/gif"
        label="Subir foto de evidencia"
        hint="JPG, PNG, WEBP hasta 5MB"
        onUploadComplete={handleUpload}
      />

      {uploadedPhotos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Fotos subidas recientemente ({uploadedPhotos.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {uploadedPhotos.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800 shadow-sm group relative"
              >
                <div className="relative h-40 overflow-hidden bg-muted">
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      Nueva
                    </span>
                  </div>
                </div>
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(1)} KB · {new Date(f.uploadedAt).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeUploaded(f.id)}
                    className="shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Fotos anteriores</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {staticPhotos.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="relative h-40 overflow-hidden">
                <NextImage
                  src={f.url}
                  alt={f.titulo}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{f.titulo}</p>
                <p className="text-xs text-muted-foreground">{f.alumno} · {f.fecha}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocumentosView() {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedFile[]>([]);

  const staticDocs = [
    { titulo: "Examen bimestral resuelto - Ana García", tipo: "PDF", fecha: "2025-01-08", tamaño: "2.3 MB" },
    { titulo: "Tarea de fracciones - Carlos Martínez", tipo: "Word", fecha: "2025-01-07", tamaño: "1.1 MB" },
    { titulo: "Proyecto ecosistemas - Grupo 3A", tipo: "PDF", fecha: "2025-01-05", tamaño: "5.8 MB" },
  ];

  const handleUpload = (file: UploadedFile) => {
    setUploadedDocs((prev) => [file, ...prev]);
  };

  const removeUploaded = (id: string) => {
    setUploadedDocs((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-5">
      <FileUploadZone
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        label="Subir documento de evidencia"
        hint="PDF, Word, Excel, PowerPoint hasta 5MB"
        onUploadComplete={handleUpload}
      />

      {uploadedDocs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Documentos subidos recientemente ({uploadedDocs.length})
          </h4>
          <div className="space-y-3">
            {uploadedDocs.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <File className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(d.size / 1024).toFixed(1)} KB · {new Date(d.uploadedAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    Nueva
                  </span>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => removeUploaded(d.id)}
                    className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Documentos anteriores</h4>
        <div className="space-y-3">
          {staticDocs.map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">{d.tipo} · {d.tamaño} · {d.fecha}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-7">Descargar</Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideosView() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedFile[]>([]);

  const handleUpload = (file: UploadedFile) => {
    setUploadedVideos((prev) => [file, ...prev]);
  };

  const removeUploaded = (id: string) => {
    setUploadedVideos((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-5">
      <FileUploadZone
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        label="Subir video de evidencia"
        hint="MP4, WebM, MOV hasta 5MB"
        onUploadComplete={handleUpload}
      />

      {uploadedVideos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Videos subidos recientemente ({uploadedVideos.length})
          </h4>
          <div className="space-y-3">
            {uploadedVideos.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-xl p-4 border border-emerald-200 dark:border-emerald-800 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(v.size / 1024).toFixed(1)} KB · {new Date(v.uploadedAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    Nuevo
                  </span>
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Ver
                  </a>
                  <button
                    onClick={() => removeUploaded(v.id)}
                    className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {uploadedVideos.length === 0 && (
        <div className="bg-card rounded-2xl p-8 border border-border text-center">
          <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Sin videos aún</p>
          <p className="text-sm text-muted-foreground">
            Sube videos de actividades y exposiciones del grupo usando el área de arriba.
          </p>
        </div>
      )}
    </div>
  );
}

function PortafolioView() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-6 h-6" />
          <h3 className="font-bold">Portafolio Digital del Alumno</h3>
        </div>
        <p className="text-white/80 text-sm">Colección completa de evidencias del aprendizaje de cada alumno.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {mockEvidencias.slice(0, 4).map((e) => (
          <div key={e.id} className="bg-card rounded-xl p-4 border border-border text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-xs font-medium truncate">{e.titulo}</p>
            <p className="text-xs text-muted-foreground">{e.tipo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
