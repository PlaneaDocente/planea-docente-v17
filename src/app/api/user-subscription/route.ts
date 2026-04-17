
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return Response.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return Response.json({ success: false, error: subError.message }, { status: 500 });
    }

    if (!subscription) {
      return Response.json({ success: true, data: null });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (planError) {
      console.error("Error fetching plan:", planError);
    }

    return Response.json({ success: true, data: { subscription, plan: plan ?? null } });
  } catch (err) {
    console.error("User subscription route error:", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, plan_id, estado, metadata } = body;

    if (!user_id || !plan_id) {
      return Response.json(
        { success: false, error: "user_id and plan_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id,
        plan_id,
        estado: estado ?? "trialing",
        metadata: metadata ?? {},
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error creating subscription:", error);
      return Response.json({ success: false, error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Create subscription route error:", err);
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
