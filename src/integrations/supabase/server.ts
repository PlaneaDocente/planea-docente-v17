import { createClient } from "@supabase/supabase-js";

// Usamos placeholders para que el build de Vercel no falle si las variables no están listas
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.DATABASE_SERVICE_ROLE_KEY || "placeholder-key"
);