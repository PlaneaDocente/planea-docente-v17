
import { supabaseAdmin } from "@/integrations/supabase/server";
import { seedDefaultPlans } from "@/lib/supabase-subscriptions";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Auto-seed default plans if the table is empty
    await seedDefaultPlans();

    const { data, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("Error fetching plans:", error);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("Plans route error:", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
