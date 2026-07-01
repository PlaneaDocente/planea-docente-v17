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
      rubrica: `Crea una rúbrica de evaluación COMPLETA para la Nueva Escuela Mexicana (NEM).
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Devuelve 5 indicadores y, para CADA indicador, un descriptor claro para cada uno de los 4 niveles de logro.
El campo_formativo debe ser EXACTAMENTE uno de: "Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario".

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Rúbrica: ${tema}",
  "tipo": "rubrica",
  "campo_formativo": "Lenguajes",
  "niveles": ["Excelente (4)", "Satisfactorio (3)", "Suficiente (2)", "Requiere apoyo (1)"],
  "filas": [
    { "indicador": "Indicador 1 claro y medible", "descriptores": ["Descriptor nivel Excelente", "Descriptor nivel Satisfactorio", "Descriptor nivel Suficiente", "Descriptor nivel Requiere apoyo"] },
    { "indicador": "Indicador 2", "descriptores": ["...", "...", "...", "..."] },
    { "indicador": "Indicador 3", "descriptores": ["...", "...", "...", "..."] },
    { "indicador": "Indicador 4", "descriptores": ["...", "...", "...", "..."] },
    { "indicador": "Indicador 5", "descriptores": ["...", "...", "...", "..."] }
  ],
  "descripcion": "Breve descripción de la rúbrica"
}`,

      cotejo: `Crea una lista de cotejo COMPLETA para la Nueva Escuela Mexicana (NEM).
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Devuelve 8 indicadores observables. Para cada indicador, un descriptor breve para cada nivel.
El campo_formativo debe ser EXACTAMENTE uno de: "Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario".

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Lista de Cotejo: ${tema}",
  "tipo": "cotejo",
  "campo_formativo": "Saberes y Pensamiento Científico",
  "niveles": ["Logrado", "En proceso", "No logrado"],
  "filas": [
    { "indicador": "Indicador observable 1", "descriptores": ["Lo realiza correctamente", "Lo realiza con apoyo", "Aún no lo realiza"] },
    { "indicador": "Indicador observable 2", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 3", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 4", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 5", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 6", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 7", "descriptores": ["...", "...", "..."] },
    { "indicador": "Indicador observable 8", "descriptores": ["...", "...", "..."] }
  ],
  "descripcion": "Breve descripción"
}`,

      examen: `Crea las preguntas de un examen NEM.
Datos: Materia: ${materia}, Grado: ${grado}, Tema: ${tema}

Devuelve entre 6 y 10 preguntas claras y adecuadas al grado.
El campo_formativo debe ser EXACTAMENTE uno de: "Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario".

Responde SOLO con JSON válido, sin markdown, sin texto extra:
{
  "titulo": "Examen: ${tema}",
  "tipo": "examen",
  "campo_formativo": "Saberes y Pensamiento Científico",
  "criterios": [
    "Pregunta 1 del examen",
    "Pregunta 2 del examen",
    "Pregunta 3 del examen",
    "Pregunta 4 del examen",
    "Pregunta 5 del examen",
    "Pregunta 6 del examen"
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

    let evaluacion: any;
    try {
      evaluacion = JSON.parse(clean);
    } catch {
      // Si no es JSON válido, crear estructura básica
      const nivelesFb = tipo === "cotejo" ? ["Logrado", "En proceso", "No logrado"] : ["Excelente (4)", "Satisfactorio (3)", "Suficiente (2)", "Requiere apoyo (1)"];
      const indicadoresFb = ["Comprensión del tema", "Participación activa", "Trabajo en equipo", "Expresión oral y escrita", "Aplicación del conocimiento"];
      evaluacion = {
        titulo: `${tipo === "rubrica" ? "Rúbrica" : tipo === "cotejo" ? "Lista de Cotejo" : "Examen"}: ${tema}`,
        tipo,
        campo_formativo: "Saberes y Pensamiento Científico",
        niveles: nivelesFb,
        filas: tipo === "examen" ? undefined : indicadoresFb.map((ind) => ({ indicador: ind, descriptores: nivelesFb.map(() => "") })),
        criterios: indicadoresFb,
        descripcion: `Evaluación de ${materia} sobre ${tema} para ${grado}`,
      };
    }

    const CAMPOS = ["Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario"];
    if (!CAMPOS.includes(evaluacion.campo_formativo)) evaluacion.campo_formativo = "Saberes y Pensamiento Científico";

    // Para rúbrica y cotejo: armar la matriz (estructura) y derivar criterios de las filas
    if ((tipo === "rubrica" || tipo === "cotejo") && Array.isArray(evaluacion.filas)) {
      const niveles = Array.isArray(evaluacion.niveles) && evaluacion.niveles.length > 0
        ? evaluacion.niveles
        : (tipo === "cotejo" ? ["Logrado", "En proceso", "No logrado"] : ["Excelente (4)", "Satisfactorio (3)", "Suficiente (2)", "Requiere apoyo (1)"]);
      const filas = evaluacion.filas.map((f: any) => ({
        indicador: String(f?.indicador || "").trim(),
        descriptores: niveles.map((_: string, i: number) => String(f?.descriptores?.[i] || "").trim()),
      })).filter((f: any) => f.indicador);
      evaluacion.niveles = niveles;
      evaluacion.filas = filas;
      evaluacion.estructura = { campo_formativo: evaluacion.campo_formativo, niveles, filas };
      evaluacion.criterios = filas.map((f: any) => f.indicador);
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
