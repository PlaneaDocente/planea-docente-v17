
import { Suspense } from "react";
import RegisterPageClient from "@/components/auth/RegisterPageClient";

export const metadata = {
  title: "Crear Cuenta – PlaneaDocente",
  description: "Regístrate gratis en PlaneaDocente",
};

function RegisterFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 animate-pulse">
        <div className="h-14 w-14 rounded-2xl bg-muted mx-auto mb-4" />
        <div className="h-6 bg-muted rounded w-3/4 mx-auto mb-2" />
        <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPageClient />
    </Suspense>
  );
}
