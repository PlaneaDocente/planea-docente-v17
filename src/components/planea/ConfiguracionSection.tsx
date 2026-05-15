"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Trash2, AlertTriangle, RefreshCw, Database,
  Download, Upload, Save, Check, X, Loader2, Info,
  Shield, HardDrive, Clock, FileWarning, School, User,
  Palette, Moon, Sun, Monitor, Crown, Gift, Share2,
  Image, Type, Phone, Mail, MapPin, GraduationCap,
  CreditCard, CheckCircle2, Zap, Star, ArrowRight,
  Copy, ExternalLink, Eye, EyeOff, Lock, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  store, useStoreItem,
  type Alumno, type Tutor, type Padre, type Justificacion,
  type Observacion, type RegistroAsistencia, type Aviso,
  type TareaDigital, type Mensaje,
} from "./planeadocente-store";

/* ═══════════════════════════════════════════════════════════════
   PLANEADOCENTE – CONFIGURACIÓN COMPLETA
   Fusiona: Gestión de datos + Escuela + Apariencia + Docente
   + Suscripción + Afiliados
   ═══════════════════════════════════════════════════════════════ */

/* ─── TIPOS ─── */

interface BackupData {
  version: string;
  fecha: string;
  alumnos: Alumno[];
  tutores: Tutor[];
  padres: Padre[];
  justificaciones: Justificacion[];
  observaciones: Observacion[];
  asistencia: RegistroAsistencia[];
  avisos: Aviso[];
  tareas: TareaDigital[];
  mensajes: Mensaje[];
}

interface EscuelaData {
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  director: string;
  ciclo_escolar: string;
  logo_url: string;
  estado: string;
  pais: string;
}

interface DocenteData {
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  cedula: string;
  avatar_url: string;
}

interface AparienciaData {
  tema: "light" | "dark" | "system";
  color_primario: string;
  radio_borde: "small" | "medium" | "large";
  fuente_escala: "compact" | "normal" | "large";
  animaciones: boolean;
}

interface SuscripcionData {
  plan: "free" | "pro" | "escuela";
  expira: string;
  activa: boolean;
  codigo_referido: string;
  usos_referido: number;
}

/* ─── CONSTANTES ─── */

const STORAGE_CONFIG = "pd_configuracion_v2";

const COLORES_PRESET = [
  { name: "Azul", value: "#2563eb", class: "bg-blue-600" },
  { name: "Cyan", value: "#0891b2", class: "bg-cyan-600" },
  { name: "Esmeralda", value: "#059669", class: "bg-emerald-600" },
  { name: "Violeta", value: "#7c3aed", class: "bg-violet-600" },
  { name: "Rosa", value: "#db2777", class: "bg-pink-600" },
  { name: "Naranja", value: "#ea580c", class: "bg-orange-600" },
  { name: "Rojo", value: "#dc2626", class: "bg-red-600" },
  { name: "Zinc", value: "#52525b", class: "bg-zinc-600" },
];

const BENEFICIOS_PRO = [
  "Alumnos ilimitados",
  "Reportes avanzados PDF/Excel",
  "Mensajes masivos WhatsApp/Email",
  "Soporte prioritario",
  "Sin publicidad",
  "Respaldo automático en la nube",
];

/* ─── HELPERS LOCALSTORAGE CONFIG ─── */

function getConfig<T>(key: keyof typeof defaultConfig, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG);
    const all = raw ? JSON.parse(raw) : {};
    return all[key] !== undefined ? all[key] : fallback;
  } catch {
    return fallback;
  }
}

function setConfig(key: keyof typeof defaultConfig, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = value;
    localStorage.setItem(STORAGE_CONFIG, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("pd-config-update"));
  } catch {
    // ignore
  }
}

const defaultConfig = {
  escuela: {
    nombre: "Escuela Primaria Ejemplo",
    direccion: "",
    telefono: "",
    email: "",
    director: "",
    ciclo_escolar: "2025-2026",
    logo_url: "",
    estado: "",
    pais: "México",
  } as EscuelaData,
  docente: {
    nombre: "Maestro",
    email: "",
    telefono: "",
    especialidad: "",
    cedula: "",
    avatar_url: "",
  } as DocenteData,
  apariencia: {
    tema: "system" as AparienciaData["tema"],
    color_primario: "#2563eb",
    radio_borde: "medium" as AparienciaData["radio_borde"],
    fuente_escala: "normal" as AparienciaData["fuente_escala"],
    animaciones: true,
  } as AparienciaData,
  suscripcion: {
    plan: "free" as SuscripcionData["plan"],
    expira: "",
    activa: true,
    codigo_referido: "",
    usos_referido: 0,
  } as SuscripcionData,
};

/* ─── HOOK CONFIG REACTIVO ─── */

function useConfigItem<T>(key: keyof typeof defaultConfig): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => getConfig(key, defaultConfig[key] as unknown as T));

  useEffect(() => {
    const handler = () => setState(getConfig(key, defaultConfig[key] as unknown as T));
    window.addEventListener("pd-config-update", handler);
    return () => window.removeEventListener("pd-config-update", handler);
  }, [key]);

  const updater = (value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
      setConfig(key, next);
      return next;
    });
  };

  return [state, updater];
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function ConfiguracionSection() {
  const [activeCard, setActiveCard] = useState<string | null>("escuela");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-7 h-7" />
          <h2 className="text-xl font-bold">Configuración del Sistema</h2>
        </div>
        <p className="text-white/70 text-sm">
          Personaliza PlaneaDocente: datos de tu escuela, apariencia, cuenta y suscripción.
        </p>
      </motion.div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfigCard
          id="escuela"
          icon={School}
          title="Datos de la Escuela"
          description="Nombre, dirección, director, ciclo escolar y logo."
          color="text-blue-600"
          bg="bg-blue-50 dark:bg-blue-950"
          isOpen={activeCard === "escuela"}
          onToggle={() => setActiveCard(activeCard === "escuela" ? null : "escuela")}
        >
          <EscuelaManager />
        </ConfigCard>

        <ConfigCard
          id="docente"
          icon={User}
          title="Perfil del Docente"
          description="Tu información personal y de contacto."
          color="text-emerald-600"
          bg="bg-emerald-50 dark:bg-emerald-950"
          isOpen={activeCard === "docente"}
          onToggle={() => setActiveCard(activeCard === "docente" ? null : "docente")}
        >
          <DocenteManager />
        </ConfigCard>

        <ConfigCard
          id="apariencia"
          icon={Palette}
          title="Apariencia"
          description="Tema, colores, bordes y animaciones."
          color="text-violet-600"
          bg="bg-violet-50 dark:bg-violet-950"
          isOpen={activeCard === "apariencia"}
          onToggle={() => setActiveCard(activeCard === "apariencia" ? null : "apariencia")}
        >
          <AparienciaManager />
        </ConfigCard>

        <ConfigCard
          id="suscripcion"
          icon={Crown}
          title="Suscripción y Afiliados"
          description="Tu plan, beneficios y código de referido."
          color="text-amber-600"
          bg="bg-amber-50 dark:bg-amber-950"
          isOpen={activeCard === "suscripcion"}
          onToggle={() => setActiveCard(activeCard === "suscripcion" ? null : "suscripcion")}
        >
          <SuscripcionManager />
        </ConfigCard>

        <ConfigCard
          id="datos"
          icon={Database}
          title="Gestión de Datos"
          description="Respaldo, restauración y limpieza local."
          color="text-rose-600"
          bg="bg-rose-50 dark:bg-rose-950"
          isOpen={activeCard === "datos"}
          onToggle={() => setActiveCard(activeCard === "datos" ? null : "datos")}
        >
          <DatosManager />
        </ConfigCard>

        <ConfigCard
          id="info"
          icon={Info}
          title="Información del Sistema"
          description="Estadísticas de almacenamiento y versión."
          color="text-cyan-600"
          bg="bg-cyan-50 dark:bg-cyan-950"
          isOpen={activeCard === "info"}
          onToggle={() => setActiveCard(activeCard === "info" ? null : "info")}
        >
          <InfoManager />
        </ConfigCard>
      </div>
    </div>
  );
}

/* ═════════════════════ TARJETA DE CONFIGURACIÓN ═════════════════════ */

function ConfigCard({
  id,
  icon: Icon,
  title,
  description,
  color,
  bg,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div layout className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-5 text-left flex items-start gap-4 hover:bg-muted/30 transition-colors"
      >
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-border">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═════════════════════ ESCUELA ═════════════════════ */

function EscuelaManager() {
  const [escuela, setEscuela] = useConfigItem<EscuelaData>("escuela");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(escuela);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setEscuela(form);
      setSaving(false);
      setEditando(false);
      toast.success("Datos de la escuela actualizados.");
    }, 400);
  };

  return (
    <div className="space-y-4">
      {!editando ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {escuela.logo_url ? (
              <img src={escuela.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-border">
                <School className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h4 className="font-semibold text-sm">{escuela.nombre || "Sin nombre"}</h4>
              <p className="text-xs text-muted-foreground">Ciclo: {escuela.ciclo_escolar}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <InfoRow icon={MapPin} label="Dirección" value={escuela.direccion} />
            <InfoRow icon={Phone} label="Teléfono" value={escuela.telefono} />
            <InfoRow icon={Mail} label="Email" value={escuela.email} />
            <InfoRow icon={User} label="Director" value={escuela.director} />
            <InfoRow icon={MapPin} label="Estado" value={escuela.estado} />
            <InfoRow icon={MapPin} label="País" value={escuela.pais} />
          </div>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setForm(escuela); setEditando(true); }}>
            <Settings className="w-3.5 h-3.5" /> Editar información
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre de la escuela</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ciclo escolar</label>
              <input value={form.ciclo_escolar} onChange={(e) => setForm({ ...form, ciclo_escolar: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Director</label>
              <input value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Dirección completa</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email institucional</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado</label>
              <input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">País</label>
              <input value={form.pais} onChange={(e) => setForm({ ...form, pais: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL del logo</label>
            <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button size="sm" className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ DOCENTE ═════════════════════ */

function DocenteManager() {
  const [docente, setDocente] = useConfigItem<DocenteData>("docente");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(docente);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setDocente(form);
      setSaving(false);
      setEditando(false);
      toast.success("Perfil del docente actualizado.");
    }, 400);
  };

  return (
    <div className="space-y-4">
      {!editando ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            {docente.avatar_url ? (
              <img src={docente.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-border">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h4 className="font-semibold text-sm">{docente.nombre || "Sin nombre"}</h4>
              <p className="text-xs text-muted-foreground">{docente.especialidad}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <InfoRow icon={Mail} label="Email" value={docente.email} />
            <InfoRow icon={Phone} label="Teléfono" value={docente.telefono} />
            <InfoRow icon={GraduationCap} label="Especialidad" value={docente.especialidad} />
            <InfoRow icon={Shield} label="Cédula" value={docente.cedula} />
          </div>

          <Button size="sm" variant="outline" className="gap-2" onClick={() => { setForm(docente); setEditando(true); }}>
            <Settings className="w-3.5 h-3.5" /> Editar perfil
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre completo</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Especialidad</label>
              <input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Cédula profesional</label>
              <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">URL de avatar</label>
            <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://..." className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button size="sm" className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════ APARIENCIA ═════════════════════ */

function AparienciaManager() {
  const [apariencia, setApariencia] = useConfigItem<AparienciaData>("apariencia");
  const [aplicando, setAplicando] = useState(false);

  const aplicarTema = () => {
    setAplicando(true);
    setTimeout(() => {
      // Aplicar tema al documento
      const root = document.documentElement;
      if (apariencia.tema === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else if (apariencia.tema === "light") {
        root.classList.remove("dark");
        root.classList.add("light");
      } else {
        // system
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }

      // Aplicar color primario como variable CSS (si tu app lo soporta)
      root.style.setProperty("--primary-color", apariencia.color_primario);

      // Radio de borde
      const radios = { small: "0.5rem", medium: "0.75rem", large: "1rem" };
      root.style.setProperty("--radius", radios[apariencia.radio_borde]);

      // Escala de fuente
      const escalas = { compact: "14px", normal: "16px", large: "18px" };
      root.style.setProperty("--base-font-size", escalas[apariencia.fuente_escala]);

      setAplicando(false);
      toast.success("Apariencia aplicada. Recarga si no ves todos los cambios.");
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Tema */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Tema</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "light" as const, label: "Claro", icon: Sun },
            { id: "dark" as const, label: "Oscuro", icon: Moon },
            { id: "system" as const, label: "Sistema", icon: Monitor },
          ].map((t) => {
            const Icon = t.icon;
            const active = apariencia.tema === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setApariencia({ ...apariencia, tema: t.id })}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color primario */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Color principal</label>
        <div className="flex flex-wrap gap-2">
          {COLORES_PRESET.map((c) => (
            <button
              key={c.value}
              onClick={() => setApariencia({ ...apariencia, color_primario: c.value })}
              className={`w-10 h-10 rounded-xl ${c.class} flex items-center justify-center transition-all border-2 ${
                apariencia.color_primario === c.value ? "border-white ring-2 ring-offset-2 ring-primary scale-110" : "border-transparent"
              }`}
              title={c.name}
            >
              {apariencia.color_primario === c.value && <Check className="w-5 h-5 text-white" />}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={apariencia.color_primario}
              onChange={(e) => setApariencia({ ...apariencia, color_primario: e.target.value })}
              className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
            />
            <span className="text-xs text-muted-foreground">Personalizado</span>
          </div>
        </div>
      </div>

      {/* Radio de borde */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Forma de bordes</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "small" as const, label: "Pequeño", demo: "rounded-lg" },
            { id: "medium" as const, label: "Medio", demo: "rounded-xl" },
            { id: "large" as const, label: "Grande", demo: "rounded-2xl" },
          ].map((r) => {
            const active = apariencia.radio_borde === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setApariencia({ ...apariencia, radio_borde: r.id })}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border bg-muted/50"
                }`}
              >
                <div className={`w-8 h-8 bg-primary/20 ${r.demo}`} />
                <span className="text-xs font-medium">{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Escala de fuente */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Tamaño de texto</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "compact" as const, label: "Compacto", size: "text-xs" },
            { id: "normal" as const, label: "Normal", size: "text-sm" },
            { id: "large" as const, label: "Grande", size: "text-base" },
          ].map((f) => {
            const active = apariencia.fuente_escala === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setApariencia({ ...apariencia, fuente_escala: f.id })}
                className={`p-3 rounded-xl border text-center transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border bg-muted/50"
                }`}
              >
                <span className={`${f.size} font-medium block mb-1`}>Aa</span>
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animaciones */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">Animaciones</span>
        </div>
        <button
          onClick={() => setApariencia({ ...apariencia, animaciones: !apariencia.animaciones })}
          className={`relative w-11 h-6 rounded-full transition-colors ${apariencia.animaciones ? "bg-primary" : "bg-muted-foreground/30"}`}
        >
          <motion.div
            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
            animate={{ x: apariencia.animaciones ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <Button size="sm" className="w-full gap-2" onClick={aplicarTema} disabled={aplicando}>
        {aplicando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {aplicando ? "Aplicando..." : "Aplicar cambios de apariencia"}
      </Button>
    </div>
  );
}

/* ═════════════════════ SUSCRIPCIÓN Y AFILIADOS ═════════════════════ */

function SuscripcionManager() {
  const [suscripcion, setSuscripcion] = useConfigItem<SuscripcionData>("suscripcion");
  const [copiado, setCopiado] = useState(false);

  // Generar código de referido si no existe
  useEffect(() => {
    if (!suscripcion.codigo_referido) {
      const codigo = "PD" + Math.random().toString(36).substring(2, 8).toUpperCase();
      setSuscripcion({ ...suscripcion, codigo_referido: codigo });
    }
  }, []);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(suscripcion.codigo_referido).then(() => {
      setCopiado(true);
      toast.success("Código copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const planes: Record<string, { label: string; precio: string; color: string; badge: string }> = {
    free: { label: "Gratuito", precio: "$0", color: "text-gray-600", badge: "bg-gray-100 text-gray-700" },
    pro: { label: "PRO", precio: "$99/mes", color: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
    escuela: { label: "Escuela", precio: "$299/mes", color: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
  };

  const planActual = planes[suscripcion.plan];

  return (
    <div className="space-y-5">
      {/* Plan actual */}
      <div className={`rounded-xl p-4 border ${suscripcion.plan === "free" ? "border-gray-200 bg-gray-50" : suscripcion.plan === "pro" ? "border-amber-200 bg-amber-50" : "border-purple-200 bg-purple-50"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className={`w-5 h-5 ${planActual.color}`} />
            <h4 className="font-semibold text-sm">Plan actual</h4>
          </div>
          <Badge className={planActual.badge}>{planActual.label}</Badge>
        </div>
        <p className="text-2xl font-bold">{planActual.precio}</p>
        {suscripcion.expira && (
          <p className="text-xs text-muted-foreground mt-1">
            Expira: {new Date(suscripcion.expira).toLocaleDateString("es-MX")}
          </p>
        )}
      </div>

      {/* Cambiar plan */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Cambiar plan</label>
        <div className="space-y-2">
          {Object.entries(planes).map(([key, p]) => {
            const active = suscripcion.plan === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSuscripcion({ ...suscripcion, plan: key as SuscripcionData["plan"] });
                  toast.success(`Plan cambiado a ${p.label}`);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {key === "free" ? <Star className="w-4 h-4" /> : key === "pro" ? <Crown className="w-4 h-4" /> : <School className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">{p.precio}</p>
                  </div>
                </div>
                {active && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Beneficios PRO */}
      {suscripcion.plan !== "free" && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Beneficios activos
          </h4>
          <ul className="space-y-1.5">
            {BENEFICIOS_PRO.map((b) => (
              <li key={b} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3 h-3 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Afiliados / Referido */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Programa de Afiliados</h4>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
          Comparte tu código y gana 30 días gratis por cada docente que se registre.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <code className="text-sm font-mono text-blue-700 dark:text-blue-300">{suscripcion.codigo_referido}</code>
            <button
              onClick={copiarCodigo}
              className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              title="Copiar código"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={copiarCodigo}>
            <Share2 className="w-3 h-3" /> Compartir
          </Button>
        </div>

        <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2">
          Usos exitosos: <span className="font-bold">{suscripcion.usos_referido}</span> · Recompensa acumulada: {suscripcion.usos_referido * 30} días
        </p>
      </div>
    </div>
  );
}

/* ═════════════════════ GESTIÓN DE DATOS (ORIGINAL) ═════════════════════ */

function DatosManager() {
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [limpiando, setLimpiando] = useState(false);

  const limpiarTodo = () => {
    setLimpiando(true);
    setTimeout(() => {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("pd_") || k.startsWith("planeadocente_")) {
          localStorage.removeItem(k);
        }
      });
      setLimpiando(false);
      setConfirmando(null);
      toast.success("Todos los datos locales han sido eliminados.");
      setTimeout(() => window.location.reload(), 1200);
    }, 800);
  };

  const limpiarTabla = (tabla: string, setter: () => void) => {
    setter();
    toast.success(`Datos de ${tabla} eliminados.`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Zona de Peligro</h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Eliminar todos los datos locales es irreversible. Se perderán alumnos, tutores, padres, asistencias, justificaciones, observaciones, avisos, tareas y mensajes.
            </p>
            {confirmando === "todo" ? (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfirmando(null)}>
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
                <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={limpiarTodo} disabled={limpiando}>
                  {limpiando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {limpiando ? "Eliminando..." : "Sí, eliminar todo"}
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" className="mt-3 text-xs gap-1" onClick={() => setConfirmando("todo")}>
                <Trash2 className="w-3 h-3" /> Eliminar todos los datos
              </Button>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Limpiar por sección</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <LimpiarBoton label="Alumnos" onClick={() => limpiarTabla("Alumnos", () => store.alumnos.set([]))} />
          <LimpiarBoton label="Tutores" onClick={() => limpiarTabla("Tutores", () => store.tutores.set([]))} />
          <LimpiarBoton label="Padres" onClick={() => limpiarTabla("Padres", () => store.padres.set([]))} />
          <LimpiarBoton label="Justificaciones" onClick={() => limpiarTabla("Justificaciones", () => store.justificaciones.set([]))} />
          <LimpiarBoton label="Observaciones" onClick={() => limpiarTabla("Observaciones", () => store.observaciones.set([]))} />
          <LimpiarBoton label="Asistencia" onClick={() => limpiarTabla("Asistencia", () => store.asistencia.set([]))} />
          <LimpiarBoton label="Avisos" onClick={() => limpiarTabla("Avisos", () => store.avisos.set([]))} />
          <LimpiarBoton label="Tareas" onClick={() => limpiarTabla("Tareas", () => store.tareas.set([]))} />
          <LimpiarBoton label="Mensajes" onClick={() => limpiarTabla("Mensajes", () => store.mensajes.set([]))} />
        </div>
      </div>

      <RespaldoUI />
    </div>
  );
}

function LimpiarBoton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-red-50 hover:text-red-600 text-xs font-medium transition-colors border border-border"
    >
      <Trash2 className="w-3 h-3" />
      {label}
    </button>
  );
}

/* ═════════════════════ RESPALDO UI (REUTILIZABLE) ═════════════════════ */

function RespaldoUI() {
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);

  const exportarRespaldo = () => {
    setExportando(true);
    setTimeout(() => {
      const data: BackupData = {
        version: "3.2.0",
        fecha: new Date().toISOString(),
        alumnos: store.alumnos.get(),
        tutores: store.tutores.get(),
        padres: store.padres.get(),
        justificaciones: store.justificaciones.get(),
        observaciones: store.observaciones.get(),
        asistencia: store.asistencia.get(),
        avisos: store.avisos.get(),
        tareas: store.tareas.get(),
        mensajes: store.mensajes.get(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planeadocente_respaldo_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportando(false);
      toast.success("Respaldo exportado correctamente.");
    }, 600);
  };

  const importarRespaldo = (file: File) => {
    setImportando(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: BackupData = JSON.parse(e.target?.result as string);
        if (!data.version || !data.fecha) throw new Error("Archivo inválido");
        if (data.alumnos) store.alumnos.set(data.alumnos);
        if (data.tutores) store.tutores.set(data.tutores);
        if (data.padres) store.padres.set(data.padres);
        if (data.justificaciones) store.justificaciones.set(data.justificaciones);
        if (data.observaciones) store.observaciones.set(data.observaciones);
        if (data.asistencia) store.asistencia.set(data.asistencia);
        if (data.avisos) store.avisos.set(data.avisos);
        if (data.tareas) store.tareas.set(data.tareas);
        if (data.mensajes) store.mensajes.set(data.mensajes);
        setImportando(false);
        toast.success("Respaldo restaurado correctamente.");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportando(false);
        toast.error("Error al importar: archivo corrupto o formato incorrecto.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Respaldo y restauración</h4>
      <div className="grid grid-cols-2 gap-3">
        <Button size="sm" variant="outline" className="gap-1 text-xs w-full" onClick={exportarRespaldo} disabled={exportando}>
          {exportando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          {exportando ? "Exportando..." : "Exportar JSON"}
        </Button>
        <label className="inline-flex w-full">
          <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarRespaldo(f); e.target.value = ""; }} />
          <Button size="sm" variant="outline" className="gap-1 text-xs w-full cursor-pointer" disabled={importando} asChild>
            <span>
              {importando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              {importando ? "Importando..." : "Importar JSON"}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
}

/* ═════════════════════ INFORMACIÓN DEL SISTEMA ═════════════════════ */

function InfoManager() {
  const [alumnos] = useStoreItem(store.alumnos);
  const [tutores] = useStoreItem(store.tutores);
  const [padres] = useStoreItem(store.padres);
  const [justificaciones] = useStoreItem(store.justificaciones);
  const [observaciones] = useStoreItem(store.observaciones);
  const [asistencia] = useStoreItem(store.asistencia);
  const [avisos] = useStoreItem(store.avisos);
  const [tareas] = useStoreItem(store.tareas);
  const [mensajes] = useStoreItem(store.mensajes);

  const calcularTamaño = () => {
    let total = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("pd_") || k.startsWith("planeadocente_") || k === STORAGE_CONFIG) {
        total += localStorage.getItem(k)?.length || 0;
      }
    });
    return (total / 1024).toFixed(2);
  };

  const stats = [
    { label: "Alumnos", value: alumnos.length, icon: Database, color: "text-blue-600" },
    { label: "Tutores", value: tutores.length, icon: Database, color: "text-cyan-600" },
    { label: "Padres", value: padres.length, icon: Database, color: "text-emerald-600" },
    { label: "Justificaciones", value: justificaciones.length, icon: FileWarning, color: "text-amber-600" },
    { label: "Observaciones", value: observaciones.length, icon: FileWarning, color: "text-purple-600" },
    { label: "Registros asist.", value: asistencia.length, icon: Clock, color: "text-indigo-600" },
    { label: "Avisos", value: avisos.length, icon: Database, color: "text-rose-600" },
    { label: "Tareas", value: tareas.length, icon: Database, color: "text-orange-600" },
    { label: "Mensajes", value: mensajes.length, icon: Database, color: "text-teal-600" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-muted/50 rounded-lg p-3 border border-border text-center">
              <Icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Almacenamiento local</h4>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Espacio utilizado en localStorage</span>
          <Badge variant="secondary" className="text-xs">{calcularTamaño()} KB</Badge>
        </div>
        <div className="mt-2 w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(calcularTamaño()) / 50 * 100, 100)}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Límite recomendado: ~5 MB por dominio</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Versión del store: v2.0 · Datos persistentes en este navegador</span>
      </div>
    </div>
  );
}

/* ═════════════════════ UTILIDADES ═════════════════════ */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="font-medium text-xs truncate">{value || "—"}</span>
    </div>
  );
}