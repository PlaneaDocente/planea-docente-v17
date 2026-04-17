import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/server";


// Escudo obligatorio para evitar el error en Vercel Build
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Si estamos en fase de construcción y no hay URL, respondemos algo vacío pero exitoso
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ message: "Build mode skipping" }, { status: 200 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}