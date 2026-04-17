
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Brain, BookOpen, Sparkles, Calendar, CheckCircle2, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockPlaneaciones, mockBibliotecaActividades } from "@/data/mock-data";

export default function PlaneacionSection() {
  const [activeTab, setActiveTab] = useState<"semanal" | "proyecto" | "automatica" | "biblioteca">("semanal");
  const [showAIModal, setShowAIModal] = useState(false);

  const tabs = [
    { id: "semanal", label: "📅 Semanal" },
    { id: "proyecto", label: "🗂️ Por Proyecto" },
    { id: "automatica", label: "🤖 Generación IA" },
    { id: "biblioteca", label: "📚 Biblioteca" },
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
        <Button size="sm" className="gap-2" onClick={() => setShowAIModal(true)}>
          <Brain className="w-4 h-4" /> Generar con IA
        </Button>
      </div>

      {(activeTab === "semanal" || activeTab === "proyecto") && (
        <PlaneacionesList tipo={activeTab === "semanal" ? "semanal" : "proyecto"} />
      )}
      {activeTab === "automatica" && <GeneracionAutomatica onGenerate={() => setShowAIModal(true)} />}
      {activeTab === "biblioteca" && <BibliotecaActividades />}

      {showAIModal && <AIGeneratorModal onClose={() => setShowAIModal(false)} />}
    </div>
  );
}

function PlaneacionesList({ tipo }: { tipo: string }) {
  const filtered = mockPlaneaciones.filter(p => p.tipo === tipo);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">
          {tipo === "semanal" ? "Planeaciones Semanales" : "Planeaciones por Proyecto"}
        </h3>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-4 h-4" /> Nueva
        </Button>
      </div>
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-10 border border-border text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No hay planeaciones de este tipo aún.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p, i) => (
            <PlaneacionCard key={p.id} planeacion={p} index={i} />
          ))}
        </div>
      )}
      {mockPlaneaciones.map((p, i) => (
        <PlaneacionCard key={p.id} planeacion={p} index={i} />
      ))}
    </div>
  );
}

function PlaneacionCard({ planeacion, index }: { planeacion: (typeof mockPlaneaciones)[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground">{planeacion.titulo}</h4>
            {planeacion.generadaPorIA && (
              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> IA
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{planeacion.materia}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          planeacion.estado === "publicado"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        }`}>
          {planeacion.estado}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {planeacion.fechaInicio}</span>
        <span>→</span>
        <span>{planeacion.fechaFin}</span>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
          <Edit className="w-3 h-3" /> Editar
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
          Ver detalle
        </Button>
      </div>
    </motion.div>
  );
}

function GeneracionAutomatica({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8" />
          <div>
            <h3 className="font-bold text-lg">Generador Automático con IA</h3>
            <p className="text-white/80 text-sm">Basado en la Nueva Escuela Mexicana (NEM)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            "✅ Campos formativos NEM",
            "✅ Ejes articuladores",
            "✅ Contenidos prioritarios",
            "✅ Procesos de desarrollo",
            "✅ Estrategias didácticas",
            "✅ Evaluación integrada",
          ].map(f => (
            <div key={f} className="bg-white/10 rounded-xl px-3 py-2 text-sm">{f}</div>
          ))}
        </div>
        <Button onClick={onGenerate} className="bg-white text-purple-700 hover:bg-white/90 font-bold gap-2">
          <Sparkles className="w-4 h-4" /> Generar Planeación Ahora
        </Button>
      </div>
    </div>
  );
}

function BibliotecaActividades() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Biblioteca de Actividades Didácticas</h3>
      <div className="grid gap-3">
        {mockBibliotecaActividades.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{a.titulo}</p>
                {a.ia && <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 px-1.5 py-0.5 rounded-full">IA</span>}
              </div>
              <p className="text-xs text-muted-foreground">{a.materia} · {a.grado} · {a.duracion} min</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{a.usada} usos</p>
              <Button size="sm" variant="outline" className="text-xs h-7 mt-1">Usar</Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AIGeneratorModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDone(true); }, 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold">Generador IA de Planeaciones</h3>
            <p className="text-xs text-muted-foreground">Nueva Escuela Mexicana</p>
          </div>
        </div>

        {!done ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Materia</label>
              <select className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                <option>Matemáticas</option>
                <option>Español</option>
                <option>Ciencias Naturales</option>
                <option>Historia</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Grado</label>
              <select className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border">
                <option>3° Primaria</option>
                <option>4° Primaria</option>
                <option>5° Primaria</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tema o contenido</label>
              <input
                className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
                placeholder="Ej: Fracciones equivalentes..."
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <><Clock className="w-4 h-4 animate-spin" /> Generando...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generar</>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-bold text-lg mb-1">¡Planeación Generada!</h4>
            <p className="text-sm text-muted-foreground mb-4">Tu planeación fue creada exitosamente con IA.</p>
            <Button className="w-full" onClick={onClose}>Ver Planeación</Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
