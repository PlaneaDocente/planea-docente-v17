import { NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { materia, grado, tema } = await req.json();

    if (!materia || !grado || !tema) {
      return NextResponse.json(
        { error: "Faltan campos: materia, grado, tema" },
        { status: 400 }
      );
    }

    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const prompt = `
Eres un experto docente de la Nueva Escuela Mexicana (NEM).
Genera una planeación didáctica detallada para el grado "${grado}" en la materia de "${materia}" sobre el tema: "${tema}".

Incluye:
1. Objetivos de aprendizaje (campos formativos NEM)
2. Contenidos (conceptos, habilidades, actitudes)
3. Metodología (inicio, desarrollo, cierre)
4. Recursos didácticos
5. Evaluación (criterios e instrumentos)
6. Tiempo estimado (sesiones de 50 min)

Formato claro con viñetas y subtítulos.
`;

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente experto en planeación educativa basada en la Nueva Escuela Mexicana.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "Error de Groq" },
        { status: response.status }
      );
    }

    const planeacion = data.choices?.[0]?.message?.content || "Sin respuesta";

    return NextResponse.json({ success: true, planeacion });
  } catch (error: any) {
    console.error("Error generando planeación:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}