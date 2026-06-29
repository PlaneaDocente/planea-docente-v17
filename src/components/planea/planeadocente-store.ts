"use client";

/* ═══════════════════════════════════════════════════
   PLANEADOCENTE – STORE COMPARTIDO Y UTILIDADES
   Sincroniza: Alumnos ↔ Tutores ↔ Padres ↔ Asistencia ↔ Actividades
   ═══════════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from "react";

/* ─── TIPOS ─── */

export interface Alumno {
  id: string;
  nombre: string;
  grupo: string;
  activo: boolean;
  creado_en: string;
}

export interface Tutor {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  nombre: string;
  parentesco: string;
  telefono: string;
  email: string;
  creado_en: string;
}

export interface Padre {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  grupo: string;
  nombre_hijo: string;
  alumno_id: string;
  activo: boolean;
  creado_en: string;
}

export interface Justificacion {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  desde: string;
  hasta: string;
  motivo: string;
  creado_en: string;
}

export interface Observacion {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  fecha: string;
  tipo: "positiva" | "negativa" | "neutra";
  descripcion: string;
  creado_en: string;
}

export interface RegistroAsistencia {
  id: string;
  fecha: string;
  grupo: string;
  registros: {
    alumno_id: string;
    alumno_nombre: string;
    estado: "presente" | "ausente" | "retardo" | "justificado";
    nota?: string;
  }[];
}

export type TabId = "avisos" | "tareas" | "mensajes" | "padres";
export type AvisoTipo = "aviso" | "tarea" | "evento" | "urgente";
export type TareaEstado = "pendiente" | "enviada" | "vencida";

export interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: AvisoTipo;
  fecha: string;
  grupo: string;
  leidos: number;
  total: number;
  enviado_whatsapp: boolean;
  enviado_email: boolean;
  creado_en: string;
}

export interface TareaDigital {
  id: string;
  titulo: string;
  materia: string;
  descripcion: string;
  fecha_entrega: string;
  grupo: string;
  enviadas: number;
  total: number;
  estado: TareaEstado;
}

export interface Mensaje {
  id: string;
  texto: string;
  remitente: "maestro" | "padre";
  nombre_remitente: string;
  grupo_id: string;
  leido: boolean;
  creado_en: string;
}

/* ─── TIPOS NEM – ACTIVIDADES ─── */

export type TipoActividad = "tarea" | "proyecto" | "clase";
export type NivelDesempeño = "inicial" | "en_desarrollo" | "suficiente" | "sobresaliente";

export interface Actividad {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  materia: string;
  campoFormativo: string;
  grupo: string;
  fechaEntrega: string;
  descripcion: string;
  competencias: string;
  aprendizajesEsperados: string;
  evidencias: string;
  criteriosEvaluacion: string;
  indicadoresLogro?: string;
  nivelDesempeño?: NivelDesempeño;
  entregadas: number;
  total: number;
  creadoEn: string;
}

/* ─── CONSTANTES ─── */

export const GRUPOS = ["1°A","1°B","1°C","1°D","2°A","2°B","2°C","2°D","3°A","3°B","3°C","3°D","4°A","4°B","4°C","4°D","5°A","5°B","5°C","5°D","6°A","6°B","6°C","6°D"];

export const CAMPOS_FORMATIVOS_NEM = [
  "Lenguajes",
  "Saberes y Pensamiento Científico",
  "Ética, Naturaleza y Sociedades",
  "De lo Humano y lo Comunitario",
  "Artes y Creatividad",
  "Educación Socioemocional",
];

export const NIVELES_DESEMPENO: { value: NivelDesempeño; label: string; color: string }[] = [
  { value: "inicial", label: "Inicial", color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  { value: "en_desarrollo", label: "En desarrollo", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  { value: "suficiente", label: "Suficiente", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  { value: "sobresaliente", label: "Sobresaliente", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
];

const STORAGE = {
  alumnos: "pd_alumnos_v2",
  tutores: "pd_tutores_v2",
  padres: "pd_padres_v2",
  justificaciones: "pd_justificaciones_v2",
  observaciones: "pd_observaciones_v2",
  asistencia: "pd_asistencia_v2",
  avisos: "pd_avisos_v2",
  tareas: "pd_tareas_v2",
  mensajes: "pd_mensajes_v2",
  actividades: "pd_actividades_nem_v1",
};

/* ─── HELPERS LOCALSTORAGE ─── */

function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("pd-store-update", { detail: key }));
}

/* ─── DATOS INICIALES ─── */

const ALUMNOS_INICIALES: Alumno[] = [
  { id: "al-1", nombre: "Fernando Garcia Robles", grupo: "3°A", activo: true, creado_en: "2025-01-01" },
  { id: "al-2", nombre: "Jose Alfredo Infante", grupo: "3°A", activo: true, creado_en: "2025-01-01" },
  { id: "al-3", nombre: "Ana Pérez", grupo: "3°A", activo: true, creado_en: "2025-01-01" },
  { id: "al-4", nombre: "Luis López", grupo: "3°A", activo: true, creado_en: "2025-01-01" },
  { id: "al-5", nombre: "Sofía Ruiz", grupo: "3°A", activo: true, creado_en: "2025-01-01" },
];

const TUTORES_INICIALES: Tutor[] = [
  { id: "t1", alumno_id: "al-1", alumno_nombre: "Fernando Garcia Robles", nombre: "María de la Luz Garcia", parentesco: "Madre", telefono: "3221569887", email: "maria@gmail.com", creado_en: "2025-01-01" },
];

const PADRES_INICIALES: Padre[] = [
  { id: "p1", nombre: "María del Rosario García", telefono: "3221458965", email: "rosario@gmail.com", grupo: "3°A", nombre_hijo: "Fernando", alumno_id: "al-1", activo: true, creado_en: "2025-01-01" },
  { id: "p2", nombre: "Pedro Infante", telefono: "523221156987", email: "pedro.infante@gmail.com", grupo: "3°A", nombre_hijo: "Jose Alfredo Infante", alumno_id: "al-2", activo: true, creado_en: "2025-01-01" },
  { id: "p3", nombre: "Juan Pérez García", telefono: "5215512345678", email: "juan.perez@email.com", grupo: "3°A", nombre_hijo: "Ana Pérez", alumno_id: "al-3", activo: true, creado_en: "2025-01-01" },
  { id: "p4", nombre: "María López Sánchez", telefono: "5215587654321", email: "maria.lopez@email.com", grupo: "3°A", nombre_hijo: "Luis López", alumno_id: "al-4", activo: true, creado_en: "2025-01-01" },
  { id: "p5", nombre: "Carlos Ruiz Martínez", telefono: "5215511122233", email: "carlos.ruiz@email.com", grupo: "3°A", nombre_hijo: "Sofía Ruiz", alumno_id: "al-5", activo: true, creado_en: "2025-01-01" },
];

const JUSTIFICACIONES_INICIALES: Justificacion[] = [];
const OBSERVACIONES_INICIALES: Observacion[] = [];
const ASISTENCIA_INICIALES: RegistroAsistencia[] = [];

const AVISOS_INICIALES: Aviso[] = [
  { id: "a1", titulo: "Reunión de padres de familia", mensaje: "Se convoca a todos los padres a la reunión mensual este viernes a las 18:00 hrs.", tipo: "aviso", fecha: "2025-01-13", grupo: "3°A", leidos: 18, total: 32, enviado_whatsapp: true, enviado_email: false, creado_en: "2025-01-10T10:00:00Z" },
  { id: "a2", titulo: "Tarea de matemáticas para el viernes", mensaje: "Los alumnos deben completar los ejercicios del libro página 45-48.", tipo: "tarea", fecha: "2025-01-12", grupo: "3°A", leidos: 28, total: 32, enviado_whatsapp: true, enviado_email: true, creado_en: "2025-01-11T09:00:00Z" },
  { id: "a3", titulo: "Recordatorio: Uniforme completo", mensaje: "A partir de la próxima semana es obligatorio el uso de uniforme completo.", tipo: "aviso", fecha: "2025-01-10", grupo: "3°A", leidos: 30, total: 32, enviado_whatsapp: false, enviado_email: true, creado_en: "2025-01-09T08:00:00Z" },
];

const TAREAS_INICIALES: TareaDigital[] = [
  { id: "t1", titulo: "Ejercicios de fracciones", materia: "Matemáticas", descripcion: "Resolver los ejercicios 1 al 20 de la página 34 del libro.", fecha_entrega: "2025-01-15", grupo: "3°A", enviadas: 28, total: 32, estado: "enviada" },
];

const MENSAJES_INICIALES: Mensaje[] = [
  { id: "m1", texto: "buenas tardes", remitente: "padre", nombre_remitente: "Juan Pérez", grupo_id: "3°A", leido: true, creado_en: "2026-04-24T16:17:08Z" },
  { id: "m2", texto: "hola", remitente: "padre", nombre_remitente: "María López", grupo_id: "3°A", leido: true, creado_en: "2026-04-24T01:18:26Z" },
  { id: "m3", texto: "hola", remitente: "padre", nombre_remitente: "Carlos Ruiz", grupo_id: "3°A", leido: false, creado_en: "2026-04-23T18:25:23Z" },
];

const ACTIVIDADES_INICIALES: Actividad[] = [
  {
    id: "act-1",
    titulo: "Proyecto de investigación: Ecosistemas locales",
    tipo: "proyecto",
    materia: "Ciencias Naturales",
    campoFormativo: "Saberes y Pensamiento Científico",
    grupo: "3°A",
    fechaEntrega: "2026-05-25",
    descripcion: "Los estudiantes investigarán un ecosistema de su localidad, identificando flora, fauna y factores bióticos/abióticos. Entregable: infografía digital y exposición oral de 5 min.",
    competencias: "Explora el mundo natural y social con curiosidad y reconocimiento de la diversidad. Comunica ideas científicas de manera clara.",
    aprendizajesEsperados: "Identifica elementos bióticos y abióticos de un ecosistema local. Reconoce la interdependencia entre los seres vivos y su entorno.",
    evidencias: "Infografía digital (cámara de evidencias) y rúbrica de exposición oral.",
    criteriosEvaluacion: "Precisión de la información (40%), calidad visual (30%), participación colaborativa (30%).",
    indicadoresLogro: "Relaciona elementos bióticos y abióticos con ejemplos concretos.",
    nivelDesempeño: "suficiente",
    entregadas: 18,
    total: 25,
    creadoEn: "2026-05-01T10:00:00Z",
  },
  {
    id: "act-2",
    titulo: "Lectura comprensiva: 'El principito'",
    tipo: "tarea",
    materia: "Español",
    campoFormativo: "Lenguajes",
    grupo: "3°A",
    fechaEntrega: "2026-05-18",
    descripcion: "Lectura de los capítulos 1-5. Responder cuestionario de comprensión lectora y elaborar un dibujo de la interpretación personal del planeta del Principito.",
    competencias: "Lee, escribe y comunica ideas con pensamiento crítico y creatividad.",
    aprendizajesEsperados: "Comprende el sentido literal e inferencial de textos narrativos. Expresa opiniones fundamentadas sobre lecturas.",
    evidencias: "Cuestionario respondido y dibujo con pie de foto descriptivo.",
    criteriosEvaluacion: "Comprensión literal (50%), inferencia (30%), expresión artística (20%).",
    entregadas: 22,
    total: 25,
    creadoEn: "2026-05-02T09:00:00Z",
  },
  {
    id: "act-3",
    titulo: "Resolución de problemas con fracciones",
    tipo: "clase",
    materia: "Matemáticas",
    campoFormativo: "Saberes y Pensamiento Científico",
    grupo: "3°A",
    fechaEntrega: "2026-05-15",
    descripcion: "Sesión de trabajo en parejas para resolver problemas contextualizados con fracciones equivalentes y comparación. Uso de material concreto (fractalátero).",
    competencias: "Piensa crítica y reflexivamente al resolver problemas matemáticos.",
    aprendizajesEsperados: "Resuelve problemas aditivos y multiplicativos con fracciones en contextos cotidianos.",
    evidencias: "Bitácora de trabajo en parejas y lista de cotejo de observación directa.",
    criteriosEvaluacion: "Procedimiento matemático (40%), argumentación (30%), trabajo colaborativo (30%).",
    entregadas: 25,
    total: 25,
    creadoEn: "2026-05-03T08:00:00Z",
  },
];

/* ─── STORE CRUDO ─── */

export const store = {
  alumnos: {
    _key: STORAGE.alumnos,
    get: () => get<Alumno[]>(STORAGE.alumnos, ALUMNOS_INICIALES),
    set: (v: Alumno[]) => set(STORAGE.alumnos, v),
  },
  tutores: {
    _key: STORAGE.tutores,
    get: () => get<Tutor[]>(STORAGE.tutores, TUTORES_INICIALES),
    set: (v: Tutor[]) => set(STORAGE.tutores, v),
  },
  padres: {
    _key: STORAGE.padres,
    get: () => get<Padre[]>(STORAGE.padres, PADRES_INICIALES),
    set: (v: Padre[]) => set(STORAGE.padres, v),
  },
  justificaciones: {
    _key: STORAGE.justificaciones,
    get: () => get<Justificacion[]>(STORAGE.justificaciones, JUSTIFICACIONES_INICIALES),
    set: (v: Justificacion[]) => set(STORAGE.justificaciones, v),
  },
  observaciones: {
    _key: STORAGE.observaciones,
    get: () => get<Observacion[]>(STORAGE.observaciones, OBSERVACIONES_INICIALES),
    set: (v: Observacion[]) => set(STORAGE.observaciones, v),
  },
  asistencia: {
    _key: STORAGE.asistencia,
    get: () => get<RegistroAsistencia[]>(STORAGE.asistencia, ASISTENCIA_INICIALES),
    set: (v: RegistroAsistencia[]) => set(STORAGE.asistencia, v),
  },
  avisos: {
    _key: STORAGE.avisos,
    get: () => get<Aviso[]>(STORAGE.avisos, AVISOS_INICIALES),
    set: (v: Aviso[]) => set(STORAGE.avisos, v),
  },
  tareas: {
    _key: STORAGE.tareas,
    get: () => get<TareaDigital[]>(STORAGE.tareas, TAREAS_INICIALES),
    set: (v: TareaDigital[]) => set(STORAGE.tareas, v),
  },
  mensajes: {
    _key: STORAGE.mensajes,
    get: () => get<Mensaje[]>(STORAGE.mensajes, MENSAJES_INICIALES),
    set: (v: Mensaje[]) => set(STORAGE.mensajes, v),
  },
  actividades: {
    _key: STORAGE.actividades,
    get: () => get<Actividad[]>(STORAGE.actividades, ACTIVIDADES_INICIALES),
    set: (v: Actividad[]) => set(STORAGE.actividades, v),
  },
};

/* ─── HOOK REACTIVO ─── */

export function useStoreItem<T>(item: { _key: string; get: () => T; set: (v: T) => void }): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(item.get);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail === item._key) {
        setState(item.get());
      }
    };
    window.addEventListener("pd-store-update", handler);
    return () => window.removeEventListener("pd-store-update", handler);
  }, [item]);

  const updater = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        item.set(next);
        return next;
      });
    },
    [item]
  );

  return [state, updater];
}

/* ─── SINCRONIZACIÓN TUTORES ↔ PADRES ─── */

export function syncTutorToPadres(tutor: Tutor) {
  const padres = store.padres.get();
  const existe = padres.find((p) => p.nombre === tutor.nombre && p.alumno_id === tutor.alumno_id);
  if (existe) return;
  const alumno = store.alumnos.get().find((a) => a.id === tutor.alumno_id);
  const nuevoPadre: Padre = {
    id: tutor.id,
    nombre: tutor.nombre,
    telefono: tutor.telefono,
    email: tutor.email,
    grupo: alumno?.grupo || "3°A",
    nombre_hijo: alumno?.nombre || tutor.alumno_nombre,
    alumno_id: tutor.alumno_id,
    activo: true,
    creado_en: tutor.creado_en,
  };
  store.padres.set([nuevoPadre, ...padres]);
}

export function syncPadreToTutores(padre: Padre) {
  const tutores = store.tutores.get();
  const existe = tutores.find((t) => t.nombre === padre.nombre && t.alumno_id === padre.alumno_id);
  if (existe) return;
  const nuevoTutor: Tutor = {
    id: padre.id,
    alumno_id: padre.alumno_id,
    alumno_nombre: padre.nombre_hijo,
    nombre: padre.nombre,
    parentesco: "Tutor",
    telefono: padre.telefono,
    email: padre.email,
    creado_en: padre.creado_en,
  };
  store.tutores.set([nuevoTutor, ...tutores]);
}

/* ─── UTILIDADES ─── */

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function sendWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function sendEmail(email: string, subject: string, body: string) {
  const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank");
}

export function getPadresPorGrupo(grupo: string): Padre[] {
  return store.padres.get().filter((p) => p.grupo === grupo && p.activo);
}

export function getAlumnosPorGrupo(grupo: string): Alumno[] {
  return store.alumnos.get().filter((a) => a.grupo === grupo && a.activo);
}

/* ─── UTILIDADES ACTIVIDADES NEM ─── */

export function getActividadesPorGrupo(grupo: string): Actividad[] {
  return store.actividades.get().filter((a) => a.grupo === grupo);
}

export function getActividadesPorCampoFormativo(campo: string): Actividad[] {
  return store.actividades.get().filter((a) => a.campoFormativo === campo);
}

export function getNivelDesempeñoLabel(valor?: NivelDesempeño): string {
  return NIVELES_DESEMPENO.find((n) => n.value === valor)?.label || "Sin definir";
}

export function getNivelDesempeñoColor(valor?: NivelDesempeño): string {
  return NIVELES_DESEMPENO.find((n) => n.value === valor)?.color || "bg-gray-100 text-gray-700";
}