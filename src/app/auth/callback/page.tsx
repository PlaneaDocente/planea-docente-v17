import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export const metadata = {
  title: "Procesando autenticación – PlaneaDocente",
  robots: { index: false, follow: false },
};

function CallbackFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-xl animate-pulse">
          <div className="w-10 h-10 bg-white/30 rounded-full" />
        </div>
        <h1 className="text-xl font-bold">Procesando...</h1>
        <p className="text-muted-foreground">Validando tu sesión</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
