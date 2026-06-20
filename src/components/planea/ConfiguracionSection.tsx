"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Trash2, AlertTriangle, RefreshCw, Database,
  Download, Upload, Save, Check, X, Loader2, Info,
  Shield, HardDrive, Clock, FileWarning, School, User,
  Palette, Moon, Sun, Monitor, Crown, Gift, Share2,
  Image, Type, Phone, Mail, MapPin, GraduationCap,
  CreditCard, CheckCircle2, Zap, Star, ArrowRight,
  Copy, ExternalLink, Eye, EyeOff, Lock, Unlock,
  Cloud, CloudOff, Building2, MapPinned, DoorOpen, BookOpenCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  store, useStoreItem,
  type Alumno, type Tutor, type Padre, type Justificacion,
  type Observacion, type RegistroAsistencia, type Aviso,
  type TareaDigital, type Mensaje,
} from "./planeadocente-store";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PLANEADOCENTE â€“ CONFIGURACIÃ“N COMPLETA V2
   IntegraciÃ³n: Supabase + localStorage (modo hÃ­brido)
   NEM: CCT, Zona Escolar, Sector, Turno, Nivel Educativo
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€â”€ TIPOS â”€â”€â”€ */

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
  // Campos NEM
  cct: string;
  zona_escolar: string;
  sector: string;
  turno: string;
  nivel_educativo: string;
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

/* â”€â”€â”€ CONSTANTES â”€â”€â”€ */

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
  "Respaldo automÃ¡tico en la nube",
];

const NIVELES_NEM = [
  "Preescolar â€” 1er Grado",
  "Preescolar â€” 2do Grado",
  "Preescolar â€” 3er Grado",
  "Primaria â€” 1er Grado",
  "Primaria â€” 2do Grado",
  "Primaria â€” 3er Grado",
  "Primaria â€” 4to Grado",
  "Primaria â€” 5to Grado",
  "Primaria â€” 6to Grado",
  "Secundaria â€” 1er Grado",
  "Secundaria â€” 2do Grado",
  "Secundaria â€” 3er Grado",
];

const TURNOS_NEM = ["Matutino", "Vespertino", "Nocturno", "Discontinuo", "Continuo"];

/* â”€â”€â”€ AUTH HOOK â”€â”€â”€ */

function useAuthUser(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return userId;
}

/* â”€â”€â”€ HELPERS LOCALSTORAGE CONFIG â”€â”€â”€ */

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
    pais: "MÃ©xico",
    cct: "",
    zona_escolar: "",
    sector: "",
    turno: "Matutino",
    nivel_educativo: "Primaria â€” 1er Grado",
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

/* â”€â”€â”€ HOOK CONFIG REACTIVO â”€â”€â”€ */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• COMPONENTE PRINCIPAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
          <h2 className="text-xl font-bold">ConfiguraciÃ³n del Sistema</h2>
        </div>
        <p className="text-white/70 text-sm">
          Personaliza PlaneaDocente: datos de tu escuela NEM, docente, apariencia, cuenta y suscripciÃ³n.
        </p>
      </motion.div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ConfigCard
          id="escuela"
          icon={School}
          title="Datos de la Escuela"
          description="Nombre, CCT, direcciÃ³n, director, ciclo escolar y logo."
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
          description="Tu informaciÃ³n personal y de contacto."
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
          title="SuscripciÃ³n y Afiliados"
          description="Tu plan real, beneficios y cÃ³digo de referido."
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
          title="GestiÃ³n de Datos"
          description="Respaldo local, sincronizaciÃ³n cloud y limpieza."
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
          title="InformaciÃ³n del Sistema"
          description="EstadÃ­sticas de almacenamiento local y nube."
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TARJETA DE CONFIGURACIÃ“N â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ESCUELA (NEM) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function EscuelaManager() {
  const userId = useAuthUser();
  const [escuela, setEscuela] = useConfigItem<EscuelaData>("escuela");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(escuela);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Cargar desde Supabase al montar
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("configuracion")
        .select("escuela")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) {
        if (data?.escuela) {
          const remoto = data.escuela as EscuelaData;
          setEscuela(remoto);
          setForm(remoto);
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    // Guardar local
    setEscuela(form);
    // Guardar nube
    if (userId) {
      const { error } = await supabase.from("configuracion").upsert(
        { user_id: userId, escuela: form, actualizado_en: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) toast.error("Error al sincronizar escuela: " + error.message);
      else toast.success("Escuela sincronizada con la nube.");
    }
    setSaving(false);
    setEditando(false);
    toast.success("Datos de la escuela actualizados.");
  };

  const handleSyncNow = async () => {
    if (!userId) { toast.error("Inicia sesiÃ³n para sincronizar."); return; }
    setSyncing(true);
    const { error } = await supabase.from("configuracion").upsert(
      { user_id: userId, escuela, actualizado_en: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setSyncing(false);
    if (error) toast.error(error.message);
    else toast.success("SincronizaciÃ³n completada.");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando configuraciÃ³n...
      </div>
    );
  }

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
              {escuela.cct && <p className="text-[10px] text-muted-foreground">CCT: {escuela.cct}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <InfoRow icon={Building2} label="CCT" value={escuela.cct} />
            <InfoRow icon={MapPinned} label="Zona Escolar" value={escuela.zona_escolar} />
            <InfoRow icon={MapPin} label="Sector" value={escuela.sector} />
            <InfoRow icon={DoorOpen} label="Turno" value={escuela.turno} />
            <InfoRow icon={BookOpenCheck} label="Nivel NEM" value={escuela.nivel_educativo} />
            <InfoRow icon={MapPin} label="DirecciÃ³n" value={escuela.direccion} />
            <InfoRow icon={Phone} label="TelÃ©fono" value={escuela.telefono} />
            <InfoRow icon={Mail} label="Email" value={escuela.email} />
            <InfoRow icon={User} label="Director" value={escuela.director} />
            <InfoRow icon={MapPin} label="Estado" value={escuela.estado} />
            <InfoRow icon={MapPin} label="PaÃ­s" value={escuela.pais} />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => { setForm(escuela); setEditando(true); }}>
              <Settings className="w-3.5 h-3.5" /> Editar informaciÃ³n
            </Button>
            <Button size="sm" variant="secondary" className="gap-2" onClick={handleSyncNow} disabled={syncing}>
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
              {syncing ? "Sync..." : "Sincronizar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre de la escuela</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">CCT (Clave Centro Trabajo)</label>
              <input value={form.cct} onChange={(e) => setForm({ ...form, cct: e.target.value })} placeholder="Ej: 14DPR1234A" className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ciclo escolar</label>
              <input value={form.ciclo_escolar} onChange={(e) => setForm({ ...form, ciclo_escolar: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Zona escolar</label>
              <input value={form.zona_escolar} onChange={(e) => setForm({ ...form, zona_escolar: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Sector</label>
              <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Turno</label>
              <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary">
                {TURNOS_NEM.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nivel educativo NEM</label>
              <select value={form.nivel_educativo} onChange={(e) => setForm({ ...form, nivel_educativo: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary">
                {NIVELES_NEM.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Director</label>
            <input value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">DirecciÃ³n completa</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">TelÃ©fono</label>
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">PaÃ­s</label>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DOCENTE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function DocenteManager() {
  const userId = useAuthUser();
  const [docente, setDocente] = useConfigItem<DocenteData>("docente");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(docente);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase.from("configuracion").select("docente").eq("user_id", userId).maybeSingle();
      if (!cancelled && data?.docente) {
        const remoto = data.docente as DocenteData;
        setDocente(remoto);
        setForm(remoto);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setDocente(form);
    if (userId) {
      await supabase.from("configuracion").upsert(
        { user_id: userId, docente: form, actualizado_en: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }
    setSaving(false);
    setEditando(false);
    toast.success("Perfil del docente actualizado.");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando perfil...
      </div>
    );
  }

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
            <InfoRow icon={Phone} label="TelÃ©fono" value={docente.telefono} />
            <InfoRow icon={GraduationCap} label="Especialidad" value={docente.especialidad} />
            <InfoRow icon={Shield} label="CÃ©dula" value={docente.cedula} />
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
              <label className="text-xs font-medium text-muted-foreground mb-1 block">TelÃ©fono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Especialidad</label>
              <input value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">CÃ©dula profesional</label>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• APARIENCIA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function AparienciaManager() {
  const userId = useAuthUser();
  const [apariencia, setApariencia] = useConfigItem<AparienciaData>("apariencia");
  const [aplicando, setAplicando] = useState(false);

  const aplicarTema = async () => {
    setAplicando(true);
    const root = document.documentElement;
    if (apariencia.tema === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (apariencia.tema === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    root.style.setProperty("--primary-color", apariencia.color_primario);
    const radios = { small: "0.5rem", medium: "0.75rem", large: "1rem" };
    root.style.setProperty("--radius", radios[apariencia.radio_borde]);
    const escalas = { compact: "14px", normal: "16px", large: "18px" };
    root.style.setProperty("--base-font-size", escalas[apariencia.fuente_escala]);

    if (userId) {
      await supabase.from("configuracion").upsert(
        { user_id: userId, apariencia, actualizado_en: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    }
    setAplicando(false);
    toast.success("Apariencia aplicada y sincronizada. Recarga si no ves todos los cambios.");
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
            { id: "small" as const, label: "PequeÃ±o", demo: "rounded-lg" },
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
        <label className="text-xs font-medium text-muted-foreground mb-2 block">TamaÃ±o de texto</label>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SUSCRIPCIÃ“N REAL (SUPABASE) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function SuscripcionManager() {
  const userId = useAuthUser();
  const [suscripcionLocal, setSuscripcionLocal] = useConfigItem<SuscripcionData>("suscripcion");
  const [suscripcionReal, setSuscripcionReal] = useState<any>(null);
  const [planReal, setPlanReal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSuscripcionReal(sub);
        if (sub?.plan) setPlanReal(sub.plan);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  // Generar cÃ³digo de referido si no existe (local)
  useEffect(() => {
    if (!suscripcionLocal.codigo_referido) {
      const codigo = "PD" + Math.random().toString(36).substring(2, 8).toUpperCase();
      setSuscripcionLocal((prev) => ({ ...prev, codigo_referido: codigo }));
    }
  }, [suscripcionLocal.codigo_referido]);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(suscripcionLocal.codigo_referido).then(() => {
      setCopiado(true);
      toast.success("CÃ³digo copiado al portapapeles");
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const planes: Record<string, { label: string; precio: string; color: string; badge: string }> = {
    free: { label: "Gratuito", precio: "$0", color: "text-gray-600", badge: "bg-gray-100 text-gray-700" },
    pro: { label: "PRO", precio: "$99/mes", color: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
    escuela: { label: "Escuela", precio: "$299/mes", color: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
  };

  const planId = suscripcionReal?.status === "trialing" || suscripcionReal?.status === "active"
    ? (planReal?.id || "pro")
    : suscripcionLocal.plan;
  const planActual = planes[planId] || planes.free;
  const expira = suscripcionReal?.current_period_end
    ? new Date(suscripcionReal.current_period_end).toLocaleDateString("es-MX")
    : (suscripcionLocal.expira ? new Date(suscripcionLocal.expira).toLocaleDateString("es-MX") : "");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Consultando suscripciÃ³n...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Plan actual */}
      <div className={`rounded-xl p-4 border ${planId === "free" ? "border-gray-200 bg-gray-50" : planId === "pro" ? "border-amber-200 bg-amber-50" : "border-purple-200 bg-purple-50"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className={`w-5 h-5 ${planActual.color}`} />
            <h4 className="font-semibold text-sm">Plan actual</h4>
          </div>
          <Badge className={planActual.badge}>{planActual.label}</Badge>
        </div>
        <p className="text-2xl font-bold">{planActual.precio}</p>
        {expira && (
          <p className="text-xs text-muted-foreground mt-1">
            {suscripcionReal?.status === "trialing" ? "Trial hasta: " : "PrÃ³xima renovaciÃ³n: "} {expira}
          </p>
        )}
        {suscripcionReal?.stripe_subscription_id && (
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">ID: {suscripcionReal.stripe_subscription_id.slice(0, 12)}...</p>
        )}
      </div>

      {/* Cambiar plan */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Cambiar plan (modo local)</label>
        <div className="space-y-2">
          {Object.entries(planes).map(([key, p]) => {
            const active = suscripcionLocal.plan === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSuscripcionLocal((prev) => ({ ...prev, plan: key as SuscripcionData["plan"] }));
                  toast.success(`Plan local cambiado a ${p.label}`);
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
      {suscripcionLocal.plan !== "free" && (
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
          Comparte tu cÃ³digo y gana 30 dÃ­as gratis por cada docente que se registre.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
            <code className="text-sm font-mono text-blue-700 dark:text-blue-300">{suscripcionLocal.codigo_referido}</code>
            <button
              onClick={copiarCodigo}
              className="p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              title="Copiar cÃ³digo"
            >
              {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={copiarCodigo}>
            <Share2 className="w-3 h-3" /> Compartir
          </Button>
        </div>

        <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2">
          Usos exitosos: <span className="font-bold">{suscripcionLocal.usos_referido}</span> Â· Recompensa acumulada: {suscripcionLocal.usos_referido * 30} dÃ­as
        </p>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• GESTIÃ“N DE DATOS (HÃBRIDA) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function DatosManager() {
  const userId = useAuthUser();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [limpiando, setLimpiando] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const sincronizarNube = async () => {
    if (!userId) { toast.error("Inicia sesiÃ³n para sincronizar."); return; }
    setSyncing(true);
    try {
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
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
      const fileName = `backup_${userId}_${Date.now()}.json`;
      const { error } = await supabase.storage.from("backups").upload(fileName, blob, { upsert: true });
      if (error) throw error;
      toast.success("Respaldo subido a la nube correctamente.");
    } catch (e: any) {
      toast.error("Error al subir: " + (e.message || "Desconocido"));
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">Zona de Peligro</h4>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Eliminar todos los datos locales es irreversible. Se perderÃ¡n alumnos, tutores, padres, asistencias, justificaciones, observaciones, avisos, tareas y mensajes.
            </p>
            {confirmando === "todo" ? (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setConfirmando(null)}>
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
                <Button variant="destructive" size="sm" className="text-xs gap-1" onClick={limpiarTodo} disabled={limpiando}>
                  {limpiando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {limpiando ? "Eliminando..." : "SÃ­, eliminar todo"}
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
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Limpiar por secciÃ³n</h4>
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

      <div className="pt-2 border-t border-border">
        <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">SincronizaciÃ³n cloud</h4>
        <Button size="sm" variant="secondary" className="gap-2 w-full" onClick={sincronizarNube} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
          {syncing ? "Subiendo respaldo..." : "Subir respaldo a la nube"}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1">
          Requiere sesiÃ³n iniciada. El archivo se guarda en Supabase Storage bucket "backups".
        </p>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• RESPALDO UI (REUTILIZABLE) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
        if (!data.version || !data.fecha) throw new Error("Archivo invÃ¡lido");
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
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Respaldo y restauraciÃ³n local</h4>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• INFORMACIÃ“N DEL SISTEMA (REAL) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function InfoManager() {
  const userId = useAuthUser();
  const [alumnos] = useStoreItem(store.alumnos);
  const [tutores] = useStoreItem(store.tutores);
  const [padres] = useStoreItem(store.padres);
  const [justificaciones] = useStoreItem(store.justificaciones);
  const [observaciones] = useStoreItem(store.observaciones);
  const [asistencia] = useStoreItem(store.asistencia);
  const [avisos] = useStoreItem(store.avisos);
  const [tareas] = useStoreItem(store.tareas);
  const [mensajes] = useStoreItem(store.mensajes);
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  const calcularTamano = useMemo(() => {
    let total = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("pd_") || k.startsWith("planeadocente_") || k === STORAGE_CONFIG) {
        total += localStorage.getItem(k)?.length || 0;
      }
    });
    return (total / 1024).toFixed(2);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoadingCounts(true);
    Promise.all([
      supabase.from("alumnos").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("padres").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("avisos").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("tareas_digitales").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("mensajes").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ]).then(([a, p, av, t, m]) => {
      setDbCounts({
        alumnos: a.count || 0,
        padres: p.count || 0,
        avisos: av.count || 0,
        tareas: t.count || 0,
        mensajes: m.count || 0,
      });
      setLoadingCounts(false);
    });
  }, [userId]);

  const stats = [
    { label: "Alumnos", value: alumnos.length, db: dbCounts.alumnos, icon: Database, color: "text-blue-600" },
    { label: "Tutores", value: tutores.length, icon: Database, color: "text-cyan-600" },
    { label: "Padres", value: padres.length, db: dbCounts.padres, icon: Database, color: "text-emerald-600" },
    { label: "Justificaciones", value: justificaciones.length, icon: FileWarning, color: "text-amber-600" },
    { label: "Observaciones", value: observaciones.length, icon: FileWarning, color: "text-purple-600" },
    { label: "Registros asist.", value: asistencia.length, icon: Clock, color: "text-indigo-600" },
    { label: "Avisos", value: avisos.length, db: dbCounts.avisos, icon: Database, color: "text-rose-600" },
    { label: "Tareas", value: tareas.length, db: dbCounts.tareas, icon: Database, color: "text-orange-600" },
    { label: "Mensajes", value: mensajes.length, db: dbCounts.mensajes, icon: Database, color: "text-teal-600" },
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
              {s.db !== undefined && (
                <p className="text-[10px] text-muted-foreground">Nube: {s.db}</p>
              )}
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
          <Badge variant="secondary" className="text-xs">{calcularTamano} KB</Badge>
        </div>
        <div className="mt-2 w-full bg-muted rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(parseFloat(calcularTamano) / 50 * 100, 100)}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">LÃ­mite recomendado: ~5 MB por dominio</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>VersiÃ³n del store: v2.0 Â· Datos persistentes en este navegador y Supabase</span>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• UTILIDADES â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="font-medium text-xs truncate">{value || "â€”"}</span>
    </div>
  );
}
