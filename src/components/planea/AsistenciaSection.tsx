
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAlumnos, mockAsistencia } from "@/data/mock-data";

type EstadoAsistencia = "presente" | "ausente" | "justificado" | "retardo";

export default function AsistenciaSection() {
  const [activeTab, setActiveTab] = useState<"registro" | "justificaciones" | "reportes">("registro");
  const [asistencias, setAsistencias] = useState<Record<string, EstadoAsistencia>>(
    Object.fromEntries(mockAlumnos.map(a => [a.id, "presente"]))
  );

  const tabs = [
    { id: "registro", label: "📋 Registro Diario" },
    { id: "justificaciones", label: "📄 Justificaciones" },
    { id: "reportes", label: "📊 Reportes" },
  ] as const;

  const counts = {
    presentes: Object.values(asistencias).filter(v => v === "presente").length,
    ausentes: Object.values(asistencias).filter(v => v === "ausente").length,
    justificados: Object.values(asistencias).filter(v => v === "justificado").length,
    retardos: Object.values(asistencias).filter(v => v === "retardo").length,
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
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {activeTab === "registro" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Presentes", value: counts.presentes, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
              { label: "Ausentes", value: counts.ausentes, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
              { label: "Justificados", value: counts.justificados, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
              { label: "Retardos", value: counts.retardos, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Lista de Asistencia</h3>
              <Button size="sm" className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> Guardar Asistencia
              </Button>
            </div>
            <div className="space-y-2">
              {mockAlumnos.map((alumno, i) => (
                <AsistenciaRow
                  key={alumno.id}
                  alumno={alumno}
                  estado={asistencias[alumno.id]}
                  index={i}
                  onChange={(estado) => setAsistencias(prev => ({ ...prev, [alumno.id]: estado }))}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "justificaciones" && <JustificacionesView />}
      {activeTab === "reportes" && <ReportesAsistenciaView />}
    </div>
  );
}

function AsistenciaRow({
  alumno, estado, index, onChange,
}: {
  alumno: (typeof mockAlumnos)[0];
  estado: EstadoAsistencia;
  index: number;
  onChange: (e: EstadoAsistencia) => void;
}) {
  const options: { value: EstadoAsistencia; label: string; color: string }[] = [
    { value: "presente", label: "P", color: "bg-emerald-500 text-white" },
    { value: "ausente", label: "A", color: "bg-red-500 text-white" },
    { value: "justificado", label: "J", color: "bg-blue-500 text-white" },
    { value: "retardo", label: "R", color: "bg-amber-500 text-white" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors"
    >
      <span className="text-xs text-muted-foreground w-5 text-right">{index + 1}</span>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{alumno.nombre[0]}</span>
      </div>
      <p className="text-sm flex-1 truncate">{alumno.nombre}</p>
      <div className="flex gap-1">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
              estado === opt.value ? opt.color : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function JustificacionesView() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" /> Justificaciones Pendientes
        </h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>
      <div className="space-y-3">
        {[
          { alumno: "Luis Pérez Torres", motivo: "Cita médica", fecha: "2025-01-10", estado: "pendiente" },
          { alumno: "Diego López Morales", motivo: "Enfermedad", fecha: "2025-01-09", estado: "aprobado" },
        ].map((j, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="flex-1">
              <p className="text-sm font-medium">{j.alumno}</p>
              <p className="text-xs text-muted-foreground">{j.motivo} · {j.fecha}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              j.estado === "aprobado" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
              "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            }`}>{j.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportesAsistenciaView() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple-500" /> Historial de Asistencia
      </h3>
      <div className="space-y-3">
        {mockAsistencia.map((a, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <p className="text-sm font-medium w-28">{a.fecha}</p>
            <div className="flex gap-4 flex-1">
              <span className="text-xs text-emerald-600 font-medium">{a.presentes} presentes</span>
              <span className="text-xs text-red-600 font-medium">{a.ausentes} ausentes</span>
              <span className="text-xs text-blue-600 font-medium">{a.justificados} justificados</span>
            </div>
            <div className="w-24 bg-muted rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full"
                style={{ width: `${(a.presentes / 32) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
