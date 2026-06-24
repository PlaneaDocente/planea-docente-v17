import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function makeSVG(prompt: string): string {
  const s = prompt.toLowerCase();
  let bg1 = "#4c1d95", bg2 = "#7c3aed", icon = "U+1F393", label = "EDUCACION";
  if (/matem|numer|suma|resta|fraccion|geometr/.test(s)) { bg1="#1e40af"; bg2="#3b82f6"; icon="U+1F4D0"; label="MATEMATICAS"; }
  else if (/ciencia|biolog|quim|natur|experiment/.test(s)) { bg1="#065f46"; bg2="#10b981"; icon="U+1F52C"; label="CIENCIAS"; }
  else if (/histor|mexic|revoluc|aztec|maya/.test(s)) { bg1="#78350f"; bg2="#d97706"; icon="U+1F3DB"; label="HISTORIA"; }
  else if (/geograf|mapa|mundo|pais|continen/.test(s)) { bg1="#1e3a5f"; bg2="#0ea5e9"; icon="U+1F30E"; label="GEOGRAFIA"; }
  else if (/espanol|leer|escribir|libro|cuento/.test(s)) { bg1="#581c87"; bg2="#9333ea"; icon="U+1F4DA"; label="ESPANOL"; }
  else if (/arte|dibujar|pintar|musica/.test(s)) { bg1="#831843"; bg2="#ec4899"; icon="U+1F3A8"; label="ARTE"; }

  const title = prompt.length > 48 ? prompt.slice(0,48)+"..." : prompt;

  return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="${bg1}"/>
<stop offset="100%" stop-color="${bg2}"/>
</linearGradient>
<filter id="sh"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.2"/></filter>
</defs>
<rect width="800" height="500" fill="url(#g1)"/>
<circle cx="700" cy="80" r="140" fill="white" opacity="0.06"/>
<circle cx="100" cy="420" r="110" fill="white" opacity="0.06"/>
<rect x="50" y="75" width="700" height="350" rx="28" fill="white" opacity="0.96" filter="url(#sh)"/>
<rect x="50" y="75" width="700" height="12" rx="6" fill="${bg2}"/>
<rect x="50" y="413" width="700" height="12" rx="6" fill="${bg2}" opacity="0.4"/>
<circle cx="400" cy="230" r="80" fill="${bg1}" opacity="0.09"/>
<circle cx="400" cy="230" r="58" fill="${bg1}" opacity="0.06"/>
<text x="150" y="155" font-size="42" opacity="0.15" font-family="Segoe UI Emoji,Arial">\u2B50</text>
<text x="590" y="155" font-size="42" opacity="0.15" font-family="Segoe UI Emoji,Arial">\u2B50</text>
<text x="400" y="265" text-anchor="middle" font-size="70" font-family="Segoe UI Emoji,Arial">\uD83C\uDF93</text>
<text x="400" y="320" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="4" fill="${bg2}" opacity="0.8">${label}</text>
<text x="400" y="355" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="20" font-weight="700" fill="${bg1}">${title}</text>
<rect x="320" y="370" width="160" height="3" rx="2" fill="${bg2}" opacity="0.5"/>
<text x="400" y="398" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="#6b7280">Nueva Escuela Mexicana - Ilustracion Educativa</text>
<rect x="0" y="465" width="800" height="35" fill="${bg1}" opacity="0.45"/>
<text x="400" y="487" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="white">\uD83C\uDF93 PlaneaDocente.com - IA Educativa para Maestros Mexicanos</text>
</svg>`;
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt requerido" }, { status: 400 });
    }
    const svg = makeSVG(prompt.trim());
    const b64 = Buffer.from(svg, "utf-8").toString("base64");
    return NextResponse.json({ success: true, imageUrl: `data:image/svg+xml;base64,${b64}` });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
