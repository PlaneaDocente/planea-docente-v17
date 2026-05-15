import { Suspense } from "react";
import SuccessRedirectClient from "./SuccessRedirectClient";

export const metadata = {
  title: "Confirmando Pago – PlaneaDocente",
  description: "Estamos confirmando tu pago. Serás redirigido automáticamente.",
  robots: { index: false, follow: false },
};

function SuccessFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">
          Confirmando tu pago...
        </h2>
        <p className="text-sm text-muted-foreground">
          Estamos procesando tu información.
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessRedirectClient />
    </Suspense>
  );
}