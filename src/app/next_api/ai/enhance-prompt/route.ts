// RUTA: src/app/next_api/ai/enhance-prompt/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const GROQ_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const { prompt = "", level = "Primaria", grade = "General", nemField = "General", style = "infantil" } = body;

  if (!prompt.trim()) return NextResponse.json({ error: "Prompt vacío" }, { status: 400 });

  // Si no hay Groq, mejorar con template
  if (!GROQ_KEY) {
    const enhanced = `Educational illustration for Mexican ${level} school, grade ${grade}, ${style} style, ${prompt}, ${nemField} field, Nueva Escuela Mexicana NEM approach, diverse Mexican children, inclusive, colorful, child-friendly, safe for classroom, no text overlay, high quality artwork`;
    return NextResponse.json({ enhancedPrompt: enhanced });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Eres experto en la Nueva Escuela Mexicana (NEM) y en prompts para generadores de imágenes con IA.
Tu tarea: transformar el texto simple de un maestro en un prompt profesional en INGLÉS para generar imágenes educativas.
El prompt debe: incluir nivel educativo, campo formativo NEM, estilo visual, contexto mexicano, diversidad, inclusión, seguridad para menores.
SOLO devuelve el prompt en inglés, máximo 120 palabras, sin explicaciones, sin comillas.`
          },
          {
            role: "user",
            content: `Texto del maestro: "${prompt}"
Nivel educativo: ${level}
Grado: ${grade}
Campo formativo NEM: ${nemField}
Estilo visual: ${style}

Crea el prompt profesional en inglés:`
          }
        ],
        max_tokens: 180,
        temperature: 0.5
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim() || "";
    if (!enhancedPrompt) throw new Error("Groq vacío");
    return NextResponse.json({ enhancedPrompt });

  } catch {
    // Fallback sin Groq
    const enhanced = `Educational illustration for Mexican ${level} school, ${style} style, ${prompt}, ${nemField} NEM field, diverse Mexican children, inclusive, colorful, child-friendly, safe for classroom, high quality`;
    return NextResponse.json({ enhancedPrompt: enhanced });
  }
}
