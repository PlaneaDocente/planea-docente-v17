/**
 * MOCK DATA - PlaneaDocente V17
 * Actualizado con estructura de la Nueva Escuela Mexicana (NEM)
 */

export const mockStats = {
  alumnosRegistrados: 32,
  asistenciaHoy: 30,
  planeacionesPendientes: 2,
  actividadesPendientes: 5,
  evaluacionesEstemes: 8,
  mensajesNuevos: 3,
};

// ─── NEM: Campos Formativos y Fases ───
export const camposFormativosNEM = [
  { id: "lenguajes", nombre: "Lenguajes", descripcion: "Comunicación oral, escrita y artística" },
  { id: "saberes", nombre: "Saberes y Pensamiento Científico", descripcion: "Matemáticas, ciencias naturales, tecnología" },
  { id: "etica", nombre: "Ética, Naturaleza y Sociedades", descripcion: "Formación cívica, historia, geografía" },
  { id: "ser", nombre: "De lo Humano y lo Comunitario", descripcion: "Desarrollo personal, socioemocional, artes" },
];

export const fasesAprendizajeNEM = [
  { id: "inicio", nombre: "Inicio", descripcion: "Exploración de saberes previos" },
  { id: "desarrollo", nombre: "Desarrollo", descripcion: "Construcción de nuevos aprendizajes" },
  { id: "cierre", nombre: "Cierre", descripcion: "Socialización y metacognición" },
];

export const competenciasGenericasNEM = [
  "Aprende por iniciativa e interés propio",
  "Participa y colabora de manera efectiva en equipos diversos",
  "Piensa crítica y reflexivamente",
  "Se comunica en distintos contextos",
  "Trabaja con autonomía y responsabilidad",
];

// ─── ALUMNOS ───
export const mockAlumnos = [
  { id: "1", nombre: "Ana García López", grado: "3°A", promedio: 9.2, asistencia: 95, estado: "activo", nec: "Sin necesidades especiales", tutor: "María López", telefono: "3312345678" },
  { id: "2", nombre: "Carlos Martínez Ruiz", grado: "3°A", promedio: 8.5, asistencia: 88, estado: "activo", nec: "Sin necesidades especiales", tutor: "Laura Ruiz", telefono: "3323456789" },
  { id: "3", nombre: "María Hernández Soto", grado: "3°A", promedio: 9.8, asistencia: 98, estado: "activo", nec: "Sin necesidades especiales", tutor: "Pedro Hernández", telefono: "3334567890" },
  { id: "4", nombre: "Luis Pérez Torres", grado: "3°A", promedio: 7.3, asistencia: 82, estado: "activo", nec: "Atención especial", tutor: "Rosa Torres", telefono: "3345678901" },
  { id: "5", nombre: "Sofía Ramírez Vega", grado: "3°A", promedio: 8.9, asistencia: 91, estado: "activo", nec: "Sin necesidades especiales", tutor: "Jorge Ramírez", telefono: "3356789012" },
  { id: "6", nombre: "Diego López Morales", grado: "3°A", promedio: 6.8, asistencia: 75, estado: "activo", nec: "Apoyo psicopedagógico", tutor: "Diana Morales", telefono: "3367890123" },
  { id: "7", nombre: "Valentina Cruz Jiménez", grado: "3°A", promedio: 9.5, asistencia: 97, estado: "activo", nec: "Sin necesidades especiales", tutor: "Roberto Cruz", telefono: "3378901234" },
  { id: "8", nombre: "Emilio Flores Castillo", grado: "3°A", promedio: 7.9, asistencia: 85, estado: "activo", nec: "Sin necesidades especiales", tutor: "Andrea Castillo", telefono: "3389012345" },
];

// ─── ASISTENCIA ───
export const mockAsistencia = [
  { fecha: "2025-01-13", presentes: 30, ausentes: 2, justificados: 1 },
  { fecha: "2025-01-12", presentes: 28, ausentes: 4, justificados: 2 },
  { fecha: "2025-01-11", presentes: 31, ausentes: 1, justificados: 0 },
  { fecha: "2025-01-10", presentes: 29, ausentes: 3, justificados: 1 },
  { fecha: "2025-01-09", presentes: 32, ausentes: 0, justificados: 0 },
];

// ─── PLANEACIONES CON ESTRUCTURA NEM ───
export const mockPlaneaciones = [
  {
    id: "1",
    titulo: "Semana 1 - Matemáticas: Fracciones",
    tipo: "semanal",
    materia: "Matemáticas",
    campoFormativo: "Saberes y Pensamiento Científico",
    faseAprendizaje: "Desarrollo",
    objetivosAprendizaje: [
      "Resuelve problemas de suma y resta con fracciones homogéneas",
      "Representa fracciones en distintos contextos",
    ],
    desempeños: [
      "Identifica la parte y el todo en situaciones cotidianas",
      "Aplica algoritmos de suma/resta de fracciones",
    ],
    evidencias: [
      "Ejercicios resueltos en cuaderno",
      "Problema contextualizado resuelto en equipo",
    ],
    competenciasGenericas: ["Piensa crítica y reflexivamente", "Se comunica en distintos contextos"],
    fechaInicio: "2025-01-13",
    fechaFin: "2025-01-17",
    estado: "publicado",
    generadaPorIA: false,
  },
  {
    id: "2",
    titulo: "Proyecto: Ciencias Naturales - Ecosistemas",
    tipo: "proyecto",
    materia: "Ciencias Naturales",
    campoFormativo: "Saberes y Pensamiento Científico",
    faseAprendizaje: "Inicio",
    objetivosAprendizaje: [
      "Identifica los componentes bióticos y abióticos de un ecosistema",
      "Reconoce las interacciones entre seres vivos y su entorno",
    ],
    desempeños: [
      "Diferencia entre componentes bióticos y abióticos",
      "Describe cadenas alimentarias simples",
    ],
    evidencias: [
      "Maqueta o infografía del ecosistema",
      "Exposición oral del proyecto",
    ],
    competenciasGenericas: ["Aprende por iniciativa e interés propio", "Participa y colabora de manera efectiva"],
    fechaInicio: "2025-01-20",
    fechaFin: "2025-02-07",
    estado: "borrador",
    generadaPorIA: true,
  },
  {
    id: "3",
    titulo: "Semana 2 - Español: Comprensión lectora",
    tipo: "semanal",
    materia: "Español",
    campoFormativo: "Lenguajes",
    faseAprendizaje: "Cierre",
    objetivosAprendizaje: [
      "Infiere el sentido implícito de textos narrativos",
      "Opina sobre acciones de personajes con argumentos",
    ],
    desempeños: [
      "Predice eventos a partir de pistas del texto",
      "Argumenta su punto de vista con ejemplos del texto",
    ],
    evidencias: [
      "Ficha de lectura completada",
      "Debate sobre valores en la lectura",
    ],
    competenciasGenericas: ["Se comunica en distintos contextos", "Trabaja con autonomía y responsabilidad"],
    fechaInicio: "2025-01-20",
    fechaFin: "2025-01-24",
    estado: "borrador",
    generadaPorIA: false,
  },
];

// ─── ACTIVIDADES ───
export const mockActividades = [
  { id: "1", titulo: "Tarea: Ejercicios de fracciones", tipo: "tarea", materia: "Matemáticas", campoFormativo: "Saberes y Pensamiento Científico", fechaEntrega: "2025-01-15", entregadas: 25, total: 32 },
  { id: "2", titulo: "Proyecto: Maqueta del sistema solar", tipo: "proyecto", materia: "Ciencias", campoFormativo: "Saberes y Pensamiento Científico", fechaEntrega: "2025-01-31", entregadas: 10, total: 32 },
  { id: "3", titulo: "Actividad: Lectura en voz alta", tipo: "clase", materia: "Español", campoFormativo: "Lenguajes", fechaEntrega: "2025-01-14", entregadas: 32, total: 32 },
];

// ─── EVALUACIONES ───
export const mockEvaluaciones = [
  { id: "1", titulo: "Examen Bimestral - Matemáticas", tipo: "examen", materia: "Matemáticas", campoFormativo: "Saberes y Pensamiento Científico", fecha: "2025-01-20", promedio: 8.4, aplicados: 32 },
  { id: "2", titulo: "Rúbrica - Proyecto Ecosistemas", tipo: "rubrica", materia: "Ciencias", campoFormativo: "Saberes y Pensamiento Científico", fecha: "2025-02-07", promedio: null, aplicados: 0 },
  { id: "3", titulo: "Lista de cotejo - Lectura", tipo: "lista_cotejo", materia: "Español", campoFormativo: "Lenguajes", fecha: "2025-01-14", promedio: 9.1, aplicados: 30 },
];

// ─── CALENDARIO ───
export const mockCalendario = [
  { id: "1", titulo: "Examen Bimestral", fecha: "2025-01-20", tipo: "examen", color: "#ef4444" },
  { id: "2", titulo: "Entrega de calificaciones", fecha: "2025-01-31", tipo: "administrativo", color: "#f59e0b" },
  { id: "3", titulo: "Día del Maestro", fecha: "2025-05-15", tipo: "festivo", color: "#10b981" },
  { id: "4", titulo: "Reunión de padres", fecha: "2025-01-17", tipo: "reunion", color: "#6366f1" },
  { id: "5", titulo: "Proyecto Ecosistemas", fecha: "2025-02-07", tipo: "proyecto", color: "#8b5cf6" },
];

// ─── COMUNICADOS ───
export const mockComunicados = [
  { id: "1", titulo: "Reunión de padres de familia", tipo: "aviso", fecha: "2025-01-13", leidos: 18, total: 32 },
  { id: "2", titulo: "Tarea de matemáticas para el viernes", tipo: "tarea", fecha: "2025-01-12", leidos: 28, total: 32 },
  { id: "3", titulo: "Recordatorio: Uniforme completo", tipo: "aviso", fecha: "2025-01-10", leidos: 30, total: 32 },
];

// ─── EVIDENCIAS ───
export const mockEvidencias = [
  { id: "1", titulo: "Proyecto de ciencias - Grupo 3A", tipo: "foto", alumno: "Grupo 3°A", fecha: "2025-01-10", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400" },
  { id: "2", titulo: "Examen bimestral resuelto", tipo: "documento", alumno: "Ana García", fecha: "2025-01-08", url: "" },
  { id: "3", titulo: "Exposición oral - Ecosistemas", tipo: "video", alumno: "Carlos Martínez", fecha: "2025-01-07", url: "" },
];

// ─── REPORTES ───
export const mockReportes = {
  asistenciaMensual: [
    { mes: "Sep", presentes: 92, ausentes: 8 },
    { mes: "Oct", presentes: 88, ausentes: 12 },
    { mes: "Nov", presentes: 95, ausentes: 5 },
    { mes: "Dic", presentes: 85, ausentes: 15 },
    { mes: "Ene", presentes: 94, ausentes: 6 },
  ],
  promediosMaterias: [
    { materia: "Matemáticas", promedio: 8.4 },
    { materia: "Español", promedio: 9.1 },
    { materia: "Ciencias", promedio: 8.7 },
    { materia: "Historia", promedio: 8.9 },
    { materia: "Geografía", promedio: 8.2 },
  ],
  promediosPorCampoFormativo: [
    { campo: "Lenguajes", promedio: 9.0 },
    { campo: "Saberes y Pensamiento Científico", promedio: 8.5 },
    { campo: "Ética, Naturaleza y Sociedades", promedio: 8.8 },
    { campo: "De lo Humano y lo Comunitario", promedio: 8.6 },
  ],
};

// ─── BIBLIOTECA DE ACTIVIDADES ───
export const mockBibliotecaActividades = [
  { id: "1", titulo: "Resolución de problemas con fracciones", materia: "Matemáticas", campoFormativo: "Saberes y Pensamiento Científico", grado: "3°", duracion: 50, usada: 45, ia: false },
  { id: "2", titulo: "Comprensión lectora: El principito", materia: "Español", campoFormativo: "Lenguajes", grado: "3°", duracion: 60, usada: 38, ia: false },
  { id: "3", titulo: "Experimento: Ciclo del agua", materia: "Ciencias", campoFormativo: "Saberes y Pensamiento Científico", grado: "3°", duracion: 90, usada: 52, ia: true },
  { id: "4", titulo: "Mapa conceptual: La Revolución Mexicana", materia: "Historia", campoFormativo: "Ética, Naturaleza y Sociedades", grado: "3°", duracion: 45, usada: 29, ia: false },
  { id: "5", titulo: "Debate: Cuidado del medio ambiente", materia: "Formación Cívica", campoFormativo: "Ética, Naturaleza y Sociedades", grado: "3°", duracion: 50, usada: 21, ia: true },
];
