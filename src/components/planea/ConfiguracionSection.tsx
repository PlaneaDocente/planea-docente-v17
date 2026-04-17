
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { School, Users, Clock, Bell, Palette, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfiguracionSection() {
  const [activeTab, setActiveTab] = useState<"escuela" | "usuarios" | "horarios" | "notificaciones" | "apariencia">("escuela");

  const tabs = [
    { id: "escuela", label: "🏫 Escuela", icon: School },
    { id: "usuarios", label: "👥 Usuarios", icon: Users },
    { id: "horarios", label: "⏰ Horarios", icon: Clock },
    { id: "notificaciones", label: "🔔 Notificaciones", icon: Bell },
    { id: "apariencia", label: "🎨 Apariencia", icon: Palette },
  ] as const;

  return (
    <div className="space-y-5">
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

      {activeTab === "escuela" && <EscuelaConfig />}
      {activeTab === "usuarios" && <UsuariosConfig />}
      {activeTab === "horarios" && <HorariosConfig />}
      {activeTab === "notificaciones" && <NotificacionesConfig />}
      {activeTab === "apariencia" && <AparienciaConfig />}
    </div>
  );
}

function ConfigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, type = "text", defaultValue, placeholder }: { label: string; type?: string; defaultValue?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors"
      />
    </div>
  );
}

function EscuelaConfig() {
  return (
    <ConfigCard title="Datos de la Escuela">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FormField label="Nombre de la escuela" defaultValue="Escuela Primaria Benito Juárez" />
        <FormField label="Clave del centro de trabajo" defaultValue="15EPR0001A" />
        <FormField label="Municipio" defaultValue="Toluca" />
        <FormField label="Estado" defaultValue="Estado de México" />
        <FormField label="Teléfono" defaultValue="722-123-4567" />
        <FormField label="Ciclo escolar activo" defaultValue="2024-2025" />
      </div>
      <Button className="gap-2"><Save className="w-4 h-4" /> Guardar Cambios</Button>
    </ConfigCard>
  );
}

function UsuariosConfig() {
  const users = [
    { nombre: "Ana Martínez", rol: "Maestra", grupo: "3°A", estado: "activo" },
    { nombre: "Carlos Rodríguez", rol: "Director", grupo: "—", estado: "activo" },
    { nombre: "Laura Sánchez", rol: "Maestra", grupo: "4°B", estado: "activo" },
  ];
  return (
    <ConfigCard title="Gestión de Usuarios">
      <div className="space-y-3 mb-4">
        {users.map((u, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{u.nombre[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{u.nombre}</p>
              <p className="text-xs text-muted-foreground">{u.rol} · {u.grupo}</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">{u.estado}</span>
          </div>
        ))}
      </div>
      <Button variant="outline" className="gap-2"><Users className="w-4 h-4" /> Agregar Usuario</Button>
    </ConfigCard>
  );
}

function HorariosConfig() {
  return (
    <ConfigCard title="Configuración de Horarios">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <FormField label="Hora de entrada" type="time" defaultValue="08:00" />
        <FormField label="Hora de salida" type="time" defaultValue="14:00" />
        <FormField label="Minutos de tolerancia" type="number" defaultValue="10" />
        <FormField label="Calificación aprobatoria" type="number" defaultValue="6" />
      </div>
      <Button className="gap-2"><Save className="w-4 h-4" /> Guardar</Button>
    </ConfigCard>
  );
}

function NotificacionesConfig() {
  const options = [
    { label: "Recordatorio de asistencia", desc: "Notificar al inicio del día", enabled: true },
    { label: "Planeaciones pendientes", desc: "Avisar cuando hay planeaciones sin completar", enabled: true },
    { label: "Mensajes de padres", desc: "Notificar nuevos mensajes", enabled: true },
    { label: "Fechas de exámenes", desc: "Recordatorio 3 días antes", enabled: false },
  ];
  return (
    <ConfigCard title="Notificaciones y Recordatorios">
      <div className="space-y-3">
        {options.map((o, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div>
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${o.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
              <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform shadow-sm ${o.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
          </div>
        ))}
      </div>
    </ConfigCard>
  );
}

function AparienciaConfig() {
  return (
    <ConfigCard title="Apariencia del Sistema">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Color principal</label>
          <div className="flex gap-3">
            {["#4F46E5", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"].map(c => (
              <button
                key={c}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground transition-all"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Nombre del sistema</label>
          <input
            defaultValue="PlaneaDocente"
            className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border"
          />
        </div>
        <Button className="gap-2"><Save className="w-4 h-4" /> Guardar Apariencia</Button>
      </div>
    </ConfigCard>
  );
}
