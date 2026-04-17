
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Target, FolderOpen, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockActividades } from "@/data/mock-data";

export default function ActividadesSection() {
  const [activeTab, setActiveTab] = useState<"tareas" | "proyectos" | "clase">("tareas");

  const tabs = [
    { id: "tareas", label: "📋 Tareas" },
    { id: "proyectos", label: "🗂️ Proyectos" },
    { id: "clase", label: "🏫 En Clase" },
  ] as const;

  const filtered = mockActividades.filter(a =>
    activeTab === "tareas" ? a.tipo === "tarea" :
    activeTab === "proyectos" ? a.tipo === "proyecto" :
    a.tipo === "clase"
  );

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
          <Plus className="w-4 h-4" /> Nueva Actividad
        </Button>
      </div>

      <div className="grid gap-4">
        {mockActividades.map((a, i) => (
          <ActividadCard key={a.id} actividad={a} index={i} />
        ))}
      </div>
    </div>
  );
}

function ActividadCard({ actividad, index }: { actividad: (typeof mockActividades)[0]; index: number }) {
  const pct = Math.round((actividad.entregadas / actividad.total) * 100);
  const Icon = actividad.tipo === "tarea" ? Target : actividad.tipo === "proyecto" ? FolderOpen : Users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          actividad.tipo === "tarea" ? "bg-blue-100 dark:bg-blue-950" :
          actividad.tipo === "proyecto" ? "bg-purple-100 dark:bg-purple-950" :
          "bg-emerald-100 dark:bg-emerald-950"
        }`}>
          <Icon className={`w-5 h-5 ${
            actividad.tipo === "tarea" ? "text-blue-600" :
            actividad.tipo === "proyecto" ? "text-purple-600" :
            "text-emerald-600"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-foreground">{actividad.titulo}</h4>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{actividad.materia}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {actividad.fechaEntrega}</span>
            <span className="flex items-center gap-1">
              {pct === 100 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
              {actividad.entregadas}/{actividad.total} entregas
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progreso de entregas</span>
              <span className="font-medium">{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.6 }}
                className={`h-2 rounded-full ${pct === 100 ? "bg-emerald-500" : pct > 60 ? "bg-blue-500" : "bg-amber-500"}`}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
