
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Eye, Edit, TrendingUp, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAlumnos } from "@/data/mock-data";

export default function AlumnosSection() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"lista" | "historial" | "tutores" | "observaciones">("lista");

  const filtered = mockAlumnos.filter(a =>
    a.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: "lista", label: "📋 Registro" },
    { id: "historial", label: "📖 Historial" },
    { id: "tutores", label: "👨‍👩‍👧 Tutores" },
    { id: "observaciones", label: "📝 Observaciones" },
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
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Alumno
        </Button>
      </div>

      {activeTab === "lista" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 flex-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar alumno..."
                  className="bg-transparent text-sm outline-none flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              {filtered.map((alumno, i) => (
                <AlumnoRow key={alumno.id} alumno={alumno} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "historial" && <HistorialView />}
      {activeTab === "tutores" && <TutoresView />}
      {activeTab === "observaciones" && <ObservacionesView />}
    </div>
  );
}

function AlumnoRow({ alumno, index }: { alumno: (typeof mockAlumnos)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">
          {alumno.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{alumno.nombre}</p>
        <p className="text-xs text-muted-foreground">{alumno.grado}</p>
      </div>
      <div className="hidden sm:flex items-center gap-4">
        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{alumno.promedio}</p>
          <p className="text-xs text-muted-foreground">Promedio</p>
        </div>
        <div className="text-center">
          <p className={`text-sm font-bold ${alumno.asistencia >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
            {alumno.asistencia}%
          </p>
          <p className="text-xs text-muted-foreground">Asistencia</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="w-3.5 h-3.5" /></Button>
      </div>
    </motion.div>
  );
}

function HistorialView() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-500" /> Historial Académico
      </h3>
      <div className="space-y-3">
        {mockAlumnos.slice(0, 5).map(a => (
          <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{a.nombre[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{a.nombre}</p>
              <p className="text-xs text-muted-foreground">Ciclo 2024-2025 · {a.grado}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{a.promedio}</p>
              <p className="text-xs text-emerald-600">Aprobado</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TutoresView() {
  const tutores = [
    { nombre: "María López García", parentesco: "Madre", alumno: "Ana García López", telefono: "555-1234" },
    { nombre: "Roberto Martínez", parentesco: "Padre", alumno: "Carlos Martínez Ruiz", telefono: "555-5678" },
    { nombre: "Laura Hernández", parentesco: "Madre", alumno: "María Hernández Soto", telefono: "555-9012" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-cyan-500" /> Tutores Registrados
      </h3>
      <div className="space-y-3">
        {tutores.map((t, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
              <span className="text-xs font-bold text-cyan-600">{t.nombre[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{t.nombre}</p>
              <p className="text-xs text-muted-foreground">{t.parentesco} de {t.alumno}</p>
            </div>
            <p className="text-xs text-muted-foreground">{t.telefono}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ObservacionesView() {
  const obs = [
    { alumno: "Diego López Morales", tipo: "conducta", desc: "Dificultad para mantener atención en clase.", fecha: "2025-01-10" },
    { alumno: "Luis Pérez Torres", tipo: "aprendizaje", desc: "Requiere apoyo adicional en fracciones.", fecha: "2025-01-08" },
    { alumno: "Ana García López", tipo: "general", desc: "Excelente participación en actividades grupales.", fecha: "2025-01-07" },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500" /> Observaciones
      </h3>
      <div className="space-y-3">
        {obs.map((o, i) => (
          <div key={i} className="p-3 rounded-xl bg-muted/40 border-l-4 border-amber-400">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium">{o.alumno}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                o.tipo === "conducta" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" :
                o.tipo === "aprendizaje" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              }`}>{o.tipo}</span>
            </div>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
            <p className="text-xs text-muted-foreground mt-1">{o.fecha}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
