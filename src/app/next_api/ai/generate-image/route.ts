// RUTA: src/app/next_api/ai/generate-image/route.ts
// Genera imágenes educativas usando HuggingFace
// Incluye retry automático si el modelo está cargando (503)

import { NextResponse } from "next/server";

const HF_API_TOKEN = process.env.HF_API_TOKEN;

// Modelos en orden de preferencia (el primero suele estar cargado)
const HF_MODELS = [
  "black-forest-labs/FLUX.1-schnell",          // Rápido y moderno
  "runwayml/stable-diffusion-v1-5",            // Clásico, siempre disponible
  "stabilityai/stable-diffusion-2-1",          // Buena calidad
];

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel: 60s máximo

async function generateWithModel(
  model: string,
  prompt: string,
  retries = 2
): Promise<{ success: true; imageUrl: string } | { success: false; error: string; retry?: boolean }> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
        "x-wait-for-model": "true", // Esperar si está cargando
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_inference_steps: 20, guidance_scale: 7.5 },
      }),
    }
  );

  // 503 = modelo cargando → reintentar
  if (res.status === 503 && retries > 0) {
    console.log(`[generate-image] Modelo ${model} cargando, reintentando...`);
    await new Promise((r) => setTimeout(r, 5000)); // esperar 5s
    return generateWithModel(model, prompt, retries - 1);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    return { success: false, error: `${model}: ${res.status} - ${errText}` };
  }

  // Verificar que la respuesta es una imagen
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    const text = await res.text();
    return { success: false, error: `Respuesta inesperada de ${model}: ${text.slice(0, 200)}` };
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = contentType.split(";")[0];
  const imageUrl = `data:${mimeType};base64,${base64}`;

  return { success: true, imageUrl };
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    if (!HF_API_TOKEN) {
      return NextResponse.json(
        { error: "HF_API_TOKEN no configurada en variables de entorno de Vercel" },
        { status: 500 }
      );
    }

    // Enriquecer el prompt para contexto educativo mexicano
    const enrichedPrompt = `${prompt.trim()}, educational illustration, colorful, child-friendly, Mexican school context, digital art, high quality, detailed`;

    // Intentar con cada modelo en orden
    let lastError = "";
    for (const model of HF_MODELS) {
      const result = await generateWithModel(model, enrichedPrompt);
      if (result.success) {
        return NextResponse.json({ success: true, imageUrl: result.imageUrl });
      }
      lastError = result.error;
      console.warn(`[generate-image] Falló ${model}:`, result.error);
    }

    // Todos los modelos fallaron
    return NextResponse.json(
      { error: `No se pudo generar la imagen. Último error: ${lastError}` },
      { status: 500 }
    );

  } catch (error: any) {
    console.error("[generate-image] Error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
