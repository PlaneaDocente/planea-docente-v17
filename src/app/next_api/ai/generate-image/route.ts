// RUTA: src/app/next_api/ai/generate-image/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BLOCKED = /violencia|sangre|arma|droga|desnud|sexual|politic|adulto|terror|matar|gore/i;

export async function POST(req: Request) {
  try {
    const {
      prompt = "",
      level = "",
      nemField = "",
      style = "infantil",
      width = 1920,
      height = 1080
    } = await req.json();

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Describe la imagen que necesitas" }, { status: 400 });
    }

    if (BLOCKED.test(prompt)) {
      return NextResponse.json({
        error: "Esta solicitud no es adecuada para un entorno escolar. Reformulala con un enfoque educativo, seguro e inclusivo."
      }, { status: 400 });
    }

    const isEnglish = /\b(educational|children|school|illustration|colorful|Mexican|NEM)\b/i.test(prompt);

    const finalPrompt = isEnglish ? prompt : [
      "educational illustration for Mexican school",
      "child-friendly colorful artwork",
      prompt.trim(),
      level ? level + " level" : "",
      nemField && nemField !== "General" ? nemField + " subject" : "",
      style !== "infantil" ? style : "infantil cartoon style",
      "Nueva Escuela Mexicana NEM",
      "diverse Mexican children, inclusive",
      "no text overlay, no watermark, high quality"
    ].filter(Boolean).join(", ");

    const seed = Math.floor(Math.random() * 999999);
    const encoded = encodeURIComponent(finalPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`;

    return NextResponse.json({ success: true, imageUrl, enhancedPrompt: finalPrompt });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
