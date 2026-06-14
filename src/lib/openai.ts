/**
 * lib/openai.ts — Helper de IA para PlaneaDocente V17
 *
 * Usa Groq (ultra-rápido, gratuito en tier básico) para generación
 * de planeaciones NEM. La imagen educativa usa Pollinations.ai (gratis, sin key).
 *
 * Para usar directamente desde componentes cliente usa las rutas API:
 *   POST /next_api/ai/generate-plan  → genera planeación NEM
 *   POST /next_api/ai/generate-image → genera imagen educativa
 *
 * Este helper es para uso en SERVER COMPONENTS o API routes únicamente.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama3-8b-8192";

export interface PlaneacionInput {
  materia: string;
  grado: string;
  tema: string;
}

/**
 * Genera una planeación NEM usando Groq.
 * Solo llamar desde Server Components o API routes (necesita GROQ_API_KEY).
 */
export async function generarPlaneacionNEM(input: PlaneacionInput): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY no configurada en variables de entorno.");
  }

  const { materia, grado, tema } = input;

  const prompt = `Eres un experto docente de la Nueva Escuela Mexicana (NEM).
Genera una planeación didáctica detallada para el grado "${grado}" en la materia de "${materia}" sobre el tema: "${tema}".

Incluye:
1. Campo formativo y eje articulador
2. Aprendizajes esperados
3. Secuencia didáctica (Inicio, Desarrollo, Cierre) — mínimo 3 actividades por fase
4. Estrategias de evaluación formativa
5. Recursos y materiales necesarios

Usa formato claro con secciones bien definidas.`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error Groq API: ${res.status} — ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No se pudo generar la planeación.";
}

/**
 * Genera URL de imagen educativa usando Pollinations.ai (sin API key).
 * Se puede llamar desde el cliente directamente.
 */
export function generarUrlImagenEducativa(
  prompt: string,
  width = 1024,
  height = 576
): string {
  const enhanced = `${prompt}, educational illustration, colorful, child-friendly, Mexican school, high quality`;
  const encoded = encodeURIComponent(enhanced);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Date.now()}`;
}
