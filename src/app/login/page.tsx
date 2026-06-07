// RUTA: src/app/login/page.tsx
// FIX: Envuelto en Suspense porque LoginPageClient usa useSearchParams()
// Sin Suspense → Next.js lanza error de hidratación → skeleton infinito

import { Suspense } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import LoginPageClient from "@/components/auth/LoginPageClient";

export const metadata = {
  title: "Iniciar Sesión – PlaneaDocente",
  description: "Accede a tu cuenta de PlaneaDocente",
};

// Fallback mientras se resuelven los searchParams (se ve menos de 1 segundo)
function LoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
