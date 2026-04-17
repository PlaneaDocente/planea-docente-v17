
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Brain, CheckSquare, FileText, BarChart3, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockEvaluaciones, mockAlumnos } from "@/data/mock-data";

export default function EvaluacionesSection() {
  const [activeTab, setActiveTab] = useState<"rubricas" | "cotejo" | "examenes" | "calificaciones">("rubricas");

  const tabs = [
    { id: "rubricas", label: "⭐ Rúbricas" },
    { id: "cotejo", label: "✅ Listas de Cotejo" },
    { id: "examenes", label: "📝 Exámenes" },
    { id: "calificaciones", label: "📊 Calificaciones" },
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
          <Brain className="w-4 h-4" /> Generar con IA
        </Button>
      </div>

      {activeTab === "rubricas" && <RubricasView />}
      {activeTab === "cotejo" && <CotejoView />}
      {activeTab === "examenes" && <ExamenesView />}
      {activeTab === "calificaciones" && <CalificacionesView />}
    </div>
  );
}

function RubricasView() {
  const rubricas = [
    { titulo: "Rúbrica: Exposición oral", materia: "Español", criterios: 4, ia: true },
    { titulo: "Rúbrica: Proyecto de ciencias", materia: "Ciencias", criterios: 5, ia: false },
    { titulo: "Rúbrica: Resolución de problemas", materia: "Matemáticas", criterios: 3, ia: true },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Rúbricas de Evaluación</h3>
        <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Nueva Rúbrica</Button>
      </div>
      <div className="grid gap-3">
        {rubricas.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{r.titulo}</p>
                {r.ia && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" />IA</span>}
              </div>
              <p className="text-xs text-muted-foreground">{r.materia} · {r.criterios} criterios</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7">Aplicar</Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CotejoView() {
  const listas = [
    { titulo: "Lista: Lectura en voz alta", materia: "Español", items: 8, ia: false },
    { titulo: "Lista: Experimento científico", materia: "Ciencias", items: 6, ia: true },
  ];
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Listas de Cotejo</h3>
        <Button size="sm" variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Nueva Lista</Button>
      </div>
      <div className="grid gap-3">
        {listas.map((l, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{l.titulo}</p>
                {l.ia && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-1.5 py-0.5 rounded-full">IA</span>}
              </div>
              <p className="text-xs text-muted-foreground">{l.materia} · {l.items} ítems</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7">Aplicar</Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ExamenesView() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Generador de Exámenes</h3>
        <Button size="sm" className="gap-2"><Brain className="w-4 h-4" /> Generar con IA</Button>
      </div>
      <div className="grid gap-3">
        {mockEvaluaciones.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{e.titulo}</p>
              <p className="text-xs text-muted-foreground">{e.materia} · {e.fecha}</p>
            </div>
            <div className="text-right">
              {e.promedio ? (
                <p className="text-sm font-bold text-foreground">{e.promedio}</p>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full">Pendiente</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CalificacionesView() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Calificaciones del Grupo
        </h3>
        <Button size="sm" variant="outline" className="gap-2 text-xs">Exportar Excel</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Alumno</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">1er Bim</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">2do Bim</th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {mockAlumnos.slice(0, 6).map((a, i) => (
              <tr key={a.id} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
                <td className="py-2 px-3 font-medium">{a.nombre}</td>
                <td className="py-2 px-3 text-center">{(a.promedio - 0.3).toFixed(1)}</td>
                <td className="py-2 px-3 text-center">{a.promedio}</td>
                <td className={`py-2 px-3 text-center font-bold ${a.promedio >= 8 ? "text-emerald-600" : a.promedio >= 6 ? "text-amber-600" : "text-red-600"}`}>
                  {a.promedio}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
