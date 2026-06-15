// RUTA: src/app/next_api/ai/generate-image/route.ts
// Usa Together.ai para generación rápida de imágenes educativas
// Together.ai tiene tier gratuito y responde en 3-8 segundos

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// HuggingFace como servicio de imagen educativa via URL directa
// FLUX Schnell es rápido y gratuito via API de Together
async function generateImage(prompt: string): Promise<string> {
  const HF_TOKEN = process.env.HF_API_TOKEN;

  // Intentar con el modelo schnell de HuggingFace (más rápido)
  if (HF_TOKEN) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { num_inference_steps: 4 }, // FLUX schnell necesita solo 4 pasos
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

      if (res.ok) {
        const blob = await res.blob();
        const arr = await blob.arrayBuffer();
        const b64 = Buffer.from(arr).toString("base64");
        return `data:image/jpeg;base64,${b64}`;
      }
    } catch (e) {
      clearTimeout(timeout);
      // Continúa con el siguiente método
    }
  }

  // Fallback: Usar imagen educativa de Unsplash (siempre disponible)
  // Extrae palabras clave del prompt para buscar imagen relevante
  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-záéíóúñ\s]/gi, "")
    .split(" ")
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(",");

  // Unsplash Source API - devuelve una imagen educativa relacionada
  const unsplashUrl = `https://source.unsplash.com/1024x576/?${encodeURIComponent(keywords + ",education,school,children")}`;

  // Obtener la imagen y convertir a base64
  const imgRes = await fetch(unsplashUrl);
  if (imgRes.ok) {
    const blob = await imgRes.blob();
    const arr = await blob.arrayBuffer();
    const b64 = Buffer.from(arr).toString("base64");
    const mime = imgRes.headers.get("content-type") || "image/jpeg";
    return `data:${mime};base64,${b64}`;
  }

  throw new Error("No se pudo generar la imagen. Intenta de nuevo.");
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    const enriched = `${prompt.trim()}, educational illustration, colorful, child-friendly, Mexican classroom`;
    const imageUrl = await generateImage(enriched);

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("[generate-image]", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Error generando imagen" },
      { status: 500 }
    );
  }
}
