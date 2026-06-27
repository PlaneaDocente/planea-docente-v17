// RUTA: src/app/next_api/ai/generate-evaluation/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROQ_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    const { tipo = "rubrica", materia = "", grado = "", tema = "", grupo = "" } = await req.json();

    if (!GROQ_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });
    }

    if (!tema.trim()) {
      return NextResponse.json({ error: "El tema es obligatorio" }, { status: 400 });
    }

    const prompts: Record<string, string> = {
      rubrica: `Crea una rúbrica de evaluación para la Nueva Escuela Mexicana (NEM).
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Rúbrica: [tema]",
  "tipo": "rubrica",
  "criterios": [
    "Criterio 1 claro y medible",
    "Criterio 2 claro y medible",
    "Criterio 3 claro y medible",
    "Criterio 4 claro y medible",
    "Criterio 5 claro y medible"
  ],
  "descripcion": "Breve descripción de la rúbrica"
}`,

      cotejo: `Crea una lista de cotejo para la Nueva Escuela Mexicana (NEM).
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Lista de Cotejo: [tema]",
  "tipo": "cotejo",
  "criterios": [
    "Indicador observable 1",
    "Indicador observable 2",
    "Indicador observable 3",
    "Indicador observable 4",
    "Indicador observable 5",
    "Indicador observable 6",
    "Indicador observable 7",
    "Indicador observable 8"
  ],
  "descripcion": "Breve descripción"
}`,

      examen: `Crea los criterios de evaluación para un examen NEM.
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Examen: [tema]",
  "tipo": "examen",
  "criterios": [
    "Comprensión del concepto principal",
    "Aplicación práctica del conocimiento",
    "Análisis crítico del tema",
    "Resolución de problemas relacionados",
    "Expresión escrita clara y ordenada"
  ],
  "descripcion": "Breve descripción del examen"
}`
    };

    const prompt = prompts[tipo] || prompts.rubrica;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content: "Eres un experto en evaluación educativa de la Nueva Escuela Mexicana (NEM) de México. Siempre respondes SOLO con JSON válido, sin texto adicional, sin markdown, sin bloques de código."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.6,
      }),
      signal: AbortSignal.timeout(40000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Groq ${res.status}: ${errBody.slice(0, 250)}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";

    // Limpiar posibles backticks de markdown
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let evaluacion;
    try {
      evaluacion = JSON.parse(clean);
    } catch {
      // Si no es JSON válido, crear estructura básica
      evaluacion = {
        titulo: `${tipo === "rubrica" ? "Rúbrica" : tipo === "cotejo" ? "Lista de Cotejo" : "Examen"}: ${tema}`,
        tipo,
        criterios: [
          "Comprensión del tema",
          "Participación activa",
          "Trabajo en equipo",
          "Expresión oral y escrita",
          "Aplicación del conocimiento"
        ],
        descripcion: `Evaluación de ${materia} sobre ${tema} para ${grado}`
      };
    }

    // Agregar datos del contexto
    evaluacion.materia = materia;
    evaluacion.grupo   = grupo;
    evaluacion.estado  = "borrador";

    return NextResponse.json({ success: true, evaluacion });

  } catch (e: any) {
    console.error("[generate-evaluation]", e.message);
    return NextResponse.json(
      { success: false, error: e.message || "Error generando evaluación" },
      { status: 500 }
    );
  }
}
