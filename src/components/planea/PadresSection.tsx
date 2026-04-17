
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Bell, MessageSquare, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockComunicados } from "@/data/mock-data";

export default function PadresSection() {
  const [activeTab, setActiveTab] = useState<"avisos" | "tareas" | "mensajes">("avisos");
  const [newMessage, setNewMessage] = useState("");

  const tabs = [
    { id: "avisos", label: "📢 Avisos" },
    { id: "tareas", label: "📋 Tareas Digitales" },
    { id: "mensajes", label: "💬 Mensajes" },
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
          <Plus className="w-4 h-4" /> Nuevo
        </Button>
      </div>

      {activeTab === "avisos" && <AvisosView />}
      {activeTab === "tareas" && <TareasDigitalesView />}
      {activeTab === "mensajes" && <MensajesView newMessage={newMessage} setNewMessage={setNewMessage} />}
    </div>
  );
}

function AvisosView() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6" />
          <h3 className="font-bold">Sistema de Avisos a Padres</h3>
        </div>
        <p className="text-white/80 text-sm">Envía avisos instantáneos a todos los padres de familia del grupo.</p>
      </div>
      <div className="space-y-3">
        {mockComunicados.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-card rounded-xl p-4 border border-border"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold">{c.titulo}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    c.tipo === "aviso" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}>{c.tipo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.fecha}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{c.leidos}/{c.total} leídos</span>
                </div>
              </div>
            </div>
            <div className="mt-2 w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${(c.leidos / c.total) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TareasDigitalesView() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4">Tareas Digitales para Padres</h3>
      <div className="space-y-3">
        {[
          { titulo: "Ejercicios de fracciones", materia: "Matemáticas", entrega: "2025-01-15", enviadas: 28 },
          { titulo: "Lectura: El principito cap. 3", materia: "Español", entrega: "2025-01-14", enviadas: 30 },
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="flex-1">
              <p className="text-sm font-medium">{t.titulo}</p>
              <p className="text-xs text-muted-foreground">{t.materia} · Entrega: {t.entrega}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{t.enviadas}/32</p>
              <p className="text-xs text-muted-foreground">enviadas</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MensajesView({ newMessage, setNewMessage }: { newMessage: string; setNewMessage: (v: string) => void }) {
  const mensajes = [
    { de: "María López (Mamá de Ana)", mensaje: "Buenos días maestra, ¿cuándo es el examen de matemáticas?", hora: "09:15", leido: true },
    { de: "Roberto Martínez (Papá de Carlos)", mensaje: "Mi hijo no podrá asistir mañana por cita médica.", hora: "08:30", leido: false },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-500" /> Mensajes de Padres
          </h3>
        </div>
        <div className="divide-y divide-border">
          {mensajes.map((m, i) => (
            <div key={i} className={`p-4 ${!m.leido ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.de}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{m.mensaje}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">{m.hora}</p>
                  {!m.leido && <span className="w-2 h-2 bg-primary rounded-full inline-block mt-1" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
            />
            <Button size="sm" className="gap-2">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
