import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const BLOCKED = /violencia|sangre|arma|droga|desnud|sexual|politic|relig|adult|terror|matar|muerte/i;

function buildPrompt(userPrompt: string): string {
  return [
    "educational illustration for Mexican elementary school",
    "child-friendly, colorful, safe for classroom",
    userPrompt.trim(),
    "Nueva Escuela Mexicana NEM style",
    "diverse Mexican children, inclusive",
    "no text overlay, no watermark",
    "clean professional artwork, bright colors"
  ].join(", ");
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Escribe una descripcion para la imagen" }, { status: 400 });
    }

    if (BLOCKED.test(prompt)) {
      return NextResponse.json({
        error: "Esta solicitud no es adecuada para un entorno escolar. Reformulala con un enfoque educativo, seguro e inclusivo."
      }, { status: 400 });
    }

    const enhanced = buildPrompt(prompt);
    const seed = Math.floor(Math.random() * 999999);
    const encoded = encodeURIComponent(enhanced);

    // Pollinations.ai genera imagenes reales via URL directa
    // El cliente carga la imagen — sin timeout del servidor
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;

    return NextResponse.json({
      success: true,
      imageUrl,
      enhancedPrompt: enhanced
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}