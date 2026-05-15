import { NextResponse } from "next/server";

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "El prompt es obligatorio" },
        { status: 400 }
      );
    }

    if (!HF_API_TOKEN) {
      return NextResponse.json(
        { error: "HF_API_TOKEN no configurada" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Hugging Face error: ${errText}` },
        { status: response.status }
      );
    }

    // La API devuelve la imagen como blob
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("Error generando imagen:", error);
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}