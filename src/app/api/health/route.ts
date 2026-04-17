import { NextResponse } from "next/server";

// Forzamos que esta ruta sea dinámica para que no se ejecute durante el Build
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    message: "Sistema activo - PlaneaDocente V17",
    timestamp: new Date().toISOString()
  }, { status: 200 });
}