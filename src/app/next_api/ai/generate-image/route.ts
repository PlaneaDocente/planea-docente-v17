import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const GROQ_KEY = process.env.GROQ_API_KEY;

function getTheme(p: string) {
  const s = p.toLowerCase();
  if (/matem|numer|suma|resta|fraccion|geometr/.test(s)) return { bg1:"#1e40af",bg2:"#3b82f6",icon:"MATEMATICAS",emoji:"d83d dcd0",items:["2795","2716 fe0f","d83d dcca","d83d dd22"] };
  if (/ciencia|biolog|quim|natur|experiment|planet/.test(s)) return { bg1:"#065f46",bg2:"#10b981",icon:"CIENCIAS",emoji:"d83d dd2c",items:["2697 fe0f","d83e uddec","d83c df3f","d83d dd2d"] };
  if (/histor|mexic|revoluc|aztec|maya|cultura/.test(s)) return { bg1:"#78350f",bg2:"#d97706",icon:"HISTORIA",emoji:"d83c dfd7 fe0f",items:["d83d dcdc","d5ba","2694 fe0f","d83d udc51"] };
  if (/geograf|mapa|mundo|pais|continen/.test(s)) return { bg1:"#1e3a5f",bg2:"#0ea5e9",icon:"GEOGRAFIA",emoji:"d83c udf0e",items:["d83d uddfa fe0f","d83c udfd4 fe0f","d83c udf0a","270c fe0f"] };
  if (/espanol|leer|escribir|libro|cuento|lenguaj/.test(s)) return { bg1:"#581c87",bg2:"#9333ea",icon:"ESPANOL",emoji:"d83d udcda",items:["270f fe0f","d83d udcd6","d83d udd0a","d83d udcdd"] };
  return { bg1:"#4c1d95",bg2:"#7c3aed",icon:"EDUCACION",emoji:"d83c udf93",items:["2b50","d83d udcda","270f fe0f","d83c udfe2"] };
}

function makeSVG(prompt: string): string {
  const t = getTheme(prompt);
  const title = prompt.length > 45 ? prompt.slice(0,45)+"..." : prompt;
  return `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="${t.bg1}"/>
<stop offset="100%" stop-color="${t.bg2}"/>
</linearGradient>
<filter id="sh"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.25"/></filter>
</defs>
<rect width="800" height="500" fill="url(#g1)"/>
<circle cx="720" cy="80" r="130" fill="white" opacity="0.07"/>
<circle cx="80" cy="420" r="110" fill="white" opacity="0.07"/>
<circle cx="400" cy="480" r="90" fill="white" opacity="0.05"/>
<rect x="50" y="80" width="700" height="340" rx="28" fill="white" opacity="0.95" filter="url(#sh)"/>
<rect x="50" y="80" width="700" height="10" rx="5" fill="${t.bg2}"/>
<rect x="50" y="410" width="700" height="10" rx="5" fill="${t.bg2}" opacity="0.5"/>
<circle cx="400" cy="230" r="75" fill="${t.bg1}" opacity="0.1"/>
<text x="400" y="260" text-anchor="middle" font-size="72" font-family="Segoe UI Emoji,Arial">${t.icon === "HISTORIA" ? "\uD83C\uDFD7" : t.icon === "CIENCIAS" ? "\uD83D\uDD2C" : t.icon === "MATEMATICAS" ? "\uD83D\uDCD0" : t.icon === "GEOGRAFIA" ? "\uD83C\uDF0E" : t.icon === "ESPANOL" ? "\uD83D\uDCDA" : "\uD83C\uDF93"}</text>
<text x="400" y="335" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" fill="${t.bg1}">${title}</text>
<rect x="310" y="350" width="180" height="3" rx="2" fill="${t.bg2}" opacity="0.5"/>
<text x="400" y="378" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="13" fill="#6b7280">Ilustracion Educativa - Nueva Escuela Mexicana</text>
<circle cx="360" cy="396" r="4" fill="${t.bg2}" opacity="0.6"/>
<circle cx="400" cy="396" r="4" fill="${t.bg1}" opacity="0.6"/>
<circle cx="440" cy="396" r="4" fill="${t.bg2}" opacity="0.6"/>
<rect x="0" y="468" width="800" height="32" fill="${t.bg1}" opacity="0.5"/>
<text x="400" y="489" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="12" fill="white">PlaneaDocente.com - IA Educativa para Maestros</text>
</svg>`;
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error:"Prompt requerido" },{ status:400 });
    let svg = "";
    if (GROQ_KEY) {
      try {
        const r = await fetch("https://api.groq.com/openai/v1/chat/completions",{
          method:"POST",
          headers:{ Authorization:`Bearer ${GROQ_KEY}`,"Content-Type":"application/json" },
          body: JSON.stringify({ model:"llama-3.1-8b-instant", messages:[
            { role:"system", content:"Generate ONLY valid SVG code (viewBox 0 0 800 500) for educational content. Colorful, child-friendly, with gradient background and educational icons. Start with <svg end with </svg>. No markdown." },
            { role:"user", content:`Educational SVG about: ${prompt.trim()}` }
          ], max_tokens:1800, temperature:0.4 }),
          signal: AbortSignal.timeout(7000)
        });
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || "";
          const s = raw.indexOf("<svg"), e = raw.lastIndexOf("</svg>")+6;
          if (s>=0 && e>s && (e-s)>600) svg = raw.slice(s,e);
        }
      } catch {}
    }
    if (!svg) svg = makeSVG(prompt.trim());
    const b64 = Buffer.from(svg,"utf-8").toString("base64");
    return NextResponse.json({ success:true, imageUrl:`data:image/svg+xml;base64,${b64}` });
  } catch(e:any) {
    return NextResponse.json({ success:false, error:e.message },{ status:500 });
  }
}