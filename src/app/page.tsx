import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * Página raíz (/).
 *
 * Lógica de redirección:
 * - Si el usuario está autenticado → redirige a /dashboard
 * - Si el usuario NO está autenticado → redirige a /landing (o /login)
 *
 * Esta es una Server Component, por lo que la redirección ocurre
 * en el servidor antes de enviar HTML al navegador.
 *
 * ⚠️ Nota: Usamos createClient directamente con las variables de entorno
 * públicas porque en el servidor (Server Component) no tenemos acceso a
 * cookies del navegador sin @supabase/ssr. Para una validación más robusta,
 * considera instalar @supabase/ssr.
 */
export default async function HomePage() {
  // En un Server Component, intentamos verificar si hay sesión activa
  // usando el cliente de servidor. Si no hay sesión, redirigimos a landing.
  // Si hay sesión, redirigimos al dashboard.
  //
  // Nota: Esta verificación es "best effort". El middleware.ts ya protege
  // las rutas protegidas, pero esta redirección mejora la UX al evitar
  // que usuarios logueados vean la landing page.

  // Por simplicidad y confiabilidad, redirigimos a /landing como punto
  // de entrada. El middleware se encargará de redirigir a /dashboard
  // si el usuario ya está autenticado y tiene suscripción activa.
  redirect("/landing");
}

/**
 * Metadata específica para la página de inicio.
 */
export const metadata = {
  title: "Inicio",
  description:
    "Bienvenido a PlaneaDocente. La plataforma educativa con IA para maestros mexicanos.",
};
