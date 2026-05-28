"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Procesando autenticación...");

  useEffect(() => {
    let mounted = true;

    const processAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[AuthCallback] Session error:", sessionError);
          if (!mounted) return;
          setStatus("error");
          setMessage("Error al obtener la sesión. Intenta de nuevo.");
          toast.error("Error de autenticación: " + sessionError.message);
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        if (!session) {
          const code = searchParams?.get("code");
          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error("[AuthCallback] Exchange error:", exchangeError);
              if (!mounted) return;
              setStatus("error");
              setMessage("Error al validar el código de autenticación.");
              toast.error("Error OAuth: " + exchangeError.message);
              setTimeout(() => router.push("/login"), 3000);
              return;
            }
          } else {
            if (!mounted) return;
            setStatus("error");
            setMessage("No se encontró código de autenticación.");
            setTimeout(() => router.push("/login"), 3000);
            return;
          }
        }

        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (!finalSession?.user) {
          if (!mounted) return;
          setStatus("error");
          setMessage("No se pudo establecer la sesión.");
          setTimeout(() => router.push("/login"), 3000);
          return;
        }

        if (!mounted) return;
        setStatus("success");
        setMessage("¡Autenticación exitosa! Redirigiendo...");
        toast.success("¡Bienvenido a PlaneaDocente!");

        // ✅ CORRECCIÓN: incluir el token
        const token = finalSession.access_token;
        try {
          const res = await fetch(`/api/user-subscription`, {
            cache: "no-store",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) {
            router.push("/dashboard");
            return;
          }

          const json = await res.json();
          const sub = json.data?.subscription;
          const hasActivePlan = sub && (sub.estado === "active" || sub.estado === "trialing");

          if (hasActivePlan) {
            router.push("/dashboard");
          } else {
            toast.info("Activa un plan para comenzar.");
            router.push("/suscripcion?source=oauth_no_sub");
          }
        } catch {
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        if (!mounted) return;
        setStatus("error");
        setMessage("Error inesperado durante la autenticación.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    const timer = setTimeout(processAuth, 500);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-xl">
          {status === "processing" ? (
            <GraduationCap className="w-10 h-10 text-white" />
          ) : status === "success" ? (
            <CheckCircle2 className="w-10 h-10 text-white" />
          ) : (
            <AlertCircle className="w-10 h-10 text-white" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {status === "processing"
              ? "Procesando..."
              : status === "success"
              ? "¡Listo!"
              : "Algo salió mal"}
          </h1>
          <p className="text-muted-foreground">{message}</p>
        </div>

        {status === "processing" && (
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        )}

        {status === "error" && (
          <Button onClick={() => router.push("/login")} variant="outline">
            Volver al login
          </Button>
        )}
      </motion.div>
    </div>
  );
}