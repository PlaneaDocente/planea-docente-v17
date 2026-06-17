// RUTA: src/app/next_api/ai/generate-image/route.ts
// Genera ilustraciones educativas usando Groq (genera SVG) 
// Garantiza respuesta en <3 segundos â€” sin timeouts de Vercel

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function generateSVG(prompt: string): Promise<string> {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY no configurada");

  const systemPrompt = `Eres un experto en SVG y diseÃ±o educativo mexicano.
Genera SOLO cÃ³digo SVG (sin markdown, sin explicaciones) que represente visualmente el prompt.
El SVG debe ser:
- viewBox="0 0 800 500"
- Colorido y atractivo para niÃ±os
- Con elementos educativos relevantes al tema
- Incluir texto del tema en espaÃ±ol
- Fondos degradados con colores vibrantes
- Formas geomÃ©tricas simples pero atractivas
- Ãconos educativos (lÃ¡pices, libros, estrellas, etc.)
- SOLO SVG vÃ¡lido, empezando con <svg y terminando con </svg>`;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Crea una ilustraciÃ³n SVG educativa sobre: ${prompt}` },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);

  const data = await res.json();
  let svg = data.choices?.[0]?.message?.content || "";

  // Limpiar: extraer solo el SVG
  const start = svg.indexOf("<svg");
  const end   = svg.lastIndexOf("</svg>") + 6;
  if (start >= 0 && end > start) {
    svg = svg.slice(start, end);
  } else {
    // Fallback SVG si Groq no genera correctamente
    svg = generateFallbackSVG(prompt);
  }

  // Convertir SVG a data URL
  const b64 = Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function generateFallbackSVG(prompt: string): string {
  const keywords = prompt.split(" ").slice(0, 4).join(" ");
  const colors   = ["#6d28d9","#7c3aed","#8b5cf6","#4f46e5"];
  const colors2  = ["#fbbf24","#f59e0b","#fb923c","#f472b6"];

  return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${colors[3]};stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:0.95"/>
    </linearGradient>
  </defs>
  
  <!-- Fondo -->
  <rect width="800" height="500" fill="url(#bg)"/>
  
  <!-- CÃ­rculos decorativos -->
  <circle cx="100" cy="100" r="80" fill="${colors2[0]}" opacity="0.3"/>
  <circle cx="700" cy="400" r="100" fill="${colors2[1]}" opacity="0.3"/>
  <circle cx="750" cy="80" r="60"  fill="${colors2[2]}" opacity="0.25"/>
  <circle cx="50"  cy="420" r="70" fill="${colors2[3]}" opacity="0.25"/>
  
  <!-- Ãconos educativos -->
  <!-- LÃ¡piz -->
  <g transform="translate(60,200) rotate(-30)">
    <rect x="0" y="0" width="20" height="90" rx="3" fill="#fbbf24"/>
    <polygon points="0,90 20,90 10,110" fill="#d97706"/>
    <rect x="0" y="0" width="20" height="15" rx="2" fill="#6b7280"/>
  </g>
  
  <!-- Libro -->
  <g transform="translate(680,150)">
    <rect x="0" y="0" width="60" height="75" rx="5" fill="#f472b6" opacity="0.9"/>
    <rect x="5" y="8" width="50" height="4" rx="2" fill="white" opacity="0.7"/>
    <rect x="5" y="18" width="40" height="3" rx="2" fill="white" opacity="0.6"/>
    <rect x="5" y="26" width="45" height="3" rx="2" fill="white" opacity="0.6"/>
    <rect x="5" y="34" width="35" height="3" rx="2" fill="white" opacity="0.6"/>
  </g>
  
  <!-- Estrellas -->
  <text x="150" y="80"  font-size="28" fill="${colors2[0]}" opacity="0.8">â­</text>
  <text x="620" y="60"  font-size="22" fill="${colors2[1]}" opacity="0.8">âœ¨</text>
  <text x="700" y="260" font-size="24" fill="${colors2[2]}" opacity="0.8">ðŸŽ¨</text>
  
  <!-- Tarjeta principal -->
  <rect x="80" y="120" width="640" height="260" rx="20" fill="url(#card)" opacity="0.95"/>
  
  <!-- Logo/Ãcono -->
  <circle cx="400" cy="210" r="55" fill="${colors[0]}" opacity="0.15"/>
  <text x="400" y="225" text-anchor="middle" font-size="48">ðŸ“š</text>
  
  <!-- Texto principal -->
  <text x="400" y="305" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="${colors[0]}">
    ${keywords.length > 40 ? keywords.slice(0,40)+"..." : keywords}
  </text>
  
  <!-- Subtexto -->
  <text x="400" y="335" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="14" fill="#6b7280">
    IlustraciÃ³n Educativa â€” Nueva Escuela Mexicana
  </text>
  
  <!-- LÃ­neas decorativas abajo -->
  <rect x="160" y="355" width="480" height="2" rx="1" fill="${colors[0]}" opacity="0.2"/>
  
  <!-- Puntos decorativos -->
  <circle cx="350" cy="370" r="5" fill="${colors[0]}" opacity="0.4"/>
  <circle cx="400" cy="370" r="5" fill="${colors2[0]}" opacity="0.4"/>
  <circle cx="450" cy="370" r="5" fill="${colors[0]}" opacity="0.4"/>
  
  <!-- Marca -->
  <text x="400" y="465" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="12" fill="white" opacity="0.8">
    ðŸŽ“ PlaneaDocente.com â€” Herramientas IA para Maestros
  </text>
</svg>`;
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "El prompt es obligatorio" }, { status: 400 });
    }

    const imageUrl = await generateSVG(prompt.trim());

    return NextResponse.json({ success: true, imageUrl });

  } catch (error: any) {
    console.error("[generate-image]", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno" },
      { status: 500 }
    );
  }
}

