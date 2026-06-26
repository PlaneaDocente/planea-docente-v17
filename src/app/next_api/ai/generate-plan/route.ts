// RUTA: src/app/next_api/ai/generate-plan/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROQ_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    const {
      materia = "",
      grado = "",
      tema = "",
      campo_formativo = "General",
      semanas = 1,
    } = await req.json();

    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });
    }
    if (!tema.trim()) {
      return NextResponse.json({ error: "El tema es obligatorio" }, { status: 400 });
    }

    const prompt = `Eres un experto docente de la Nueva Escuela Mexicana (NEM) de México.
Genera una planeación didáctica COMPLETA, DETALLADA y PROFESIONAL para:
- Materia: ${materia || "Materia General"}
- Grado: ${grado || "Primaria"}
- Tema/Contenido: ${tema}
- Campo Formativo NEM: ${campo_formativo}
- Duración: ${semanas} semana(s)

La planeación DEBE incluir TODAS estas secciones con contenido REAL y DETALLADO:

## DATOS GENERALES
Título, materia, grado, ciclo escolar, campo formativo, eje articulador, tiempo estimado.

## PROPÓSITO
Qué aprenderán los alumnos y para qué sirve en su vida cotidiana (2-3 párrafos).

## PROCESO DE DESARROLLO DE APRENDIZAJE (PDA)
Descripción específica del proceso de aprendizaje alineado a la NEM.

## APRENDIZAJES ESPERADOS
Lista de 4-6 aprendizajes concretos y medibles que los alumnos lograrán.

## INICIO (15-20 minutos)
- Actividad de detonador (pregunta detonadora, situación problema o exploración de saberes previos)
- Descripción detallada de la actividad
- Preguntas guía para el maestro
- Materiales necesarios

## DESARROLLO (30-40 minutos)
- Actividad principal detallada paso a paso
- Estrategias de trabajo (individual, parejas, equipos)
- Descripción de cada actividad con instrucciones claras
- Preguntas de reflexión
- Materiales y recursos

## CIERRE (10-15 minutos)
- Actividad de síntesis o metacognición
- Cómo se comparten los aprendizajes
- Producto o evidencia del aprendizaje

## RECURSOS Y MATERIALES
Lista completa de materiales, libros de texto SEP, recursos digitales y herramientas.

## EVALUACIÓN
- Tipo de evaluación (formativa/sumativa)
- Instrumento de evaluación (rúbrica, lista de cotejo, etc.)
- Criterios de evaluación específicos
- Cómo se retroalimenta a los alumnos

## ADECUACIONES CURRICULARES
Estrategias de inclusión para alumnos con diferentes ritmos de aprendizaje, con discapacidad o en situación vulnerable.

## OBSERVACIONES Y RECOMENDACIONES
Notas importantes para el docente, posibles dificultades y cómo resolverlas.

Escribe en español, lenguaje docente profesional, contenido real y aplicable en aulas mexicanas.
NO generes contenido genérico. Sé específico con el tema: "${tema}".`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "Eres un experto en pedagogía de la Nueva Escuela Mexicana (NEM) de México. Generas planeaciones didácticas profesionales, detalladas y aplicables para maestros de educación básica mexicana. Siempre escribes en español con lenguaje docente profesional.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 3000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("Límite de IA alcanzado. Espera 1 minuto e intenta de nuevo. (Groq 429)");
      }
      throw new Error(`Error generando planeación: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (!content.trim()) {
      throw new Error("La IA no generó contenido");
    }

    return NextResponse.json({ success: true, content });

  } catch (e: any) {
    console.error("[generate-plan]", e.message);
    return NextResponse.json(
      { success: false, error: e.message || "Error al generar planeación" },
      { status: 500 }
    );
  }
}
