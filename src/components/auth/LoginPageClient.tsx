"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Chrome,
  ArrowLeft,
  AlertCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSiteUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }
  return "https://planeadocente.com";
}

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams?.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        handlePostLoginRedirect(session.user.id);
      } else {
        setIsCheckingSession(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_IN" && session?.user) {
          toast.success("¡Sesión iniciada correctamente!");
          await handlePostLoginRedirect(session.user.id);
        }
        if (event === "USER_UPDATED" && session?.user) {
          toast.success("¡Cuenta verificada! Redirigiendo...");
          await handlePostLoginRedirect(session.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * REDIRECCIÓN POST-LOGIN MEJORADA:
   * - Si tiene suscripción activa/trialing → /dashboard
   * - Si NO tiene suscripción → /dashboard con query param para mostrar banner
   * - NUNCA bloquear al usuario en /suscripcion solo por no tener suscripción
   */
  const handlePostLoginRedirect = useCallback(
    async (userId: string) => {
      try {
        const res = await fetch(
          `/api/user-subscription?user_id=${encodeURIComponent(userId)}`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );

        if (!res.ok) {
          console.warn("[Login] Subscription API error:", res.status);
          router.push("/dashboard?welcome=back");
          return;
        }

        const json = await res.json();
        const sub = json.data?.subscription;
        const hasActivePlan = sub && (sub.estado === "active" || sub.estado === "trialing");

        if (hasActivePlan) {
          router.push("/dashboard?welcome=back");
        } else {
          // ⭐ CAMBIO CRÍTICO: No bloquear en /suscripcion. Ir al dashboard
          // con un flag que el dashboard puede leer para mostrar banner.
          toast.info("Bienvenido. Activa un plan para desbloquear todas las funciones.");
          router.push("/dashboard?needs_subscription=true");
        }
      } catch (err) {
        console.error("[Login] Error checking subscription:", err);
        router.push("/dashboard?welcome=back");
      }
    },
    [router]
  );

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailNotConfirmed(false);

    if (!email.trim() || !password) {
      toast.error("Por favor ingresa tu email y contraseña.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Por favor ingresa un email válido.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);

        let message = error.message;
        if (error.message.includes("Invalid login credentials")) {
          message = "Email o contraseña incorrectos.";
        } else if (
          error.message.includes("Email not confirmed") ||
          error.message.includes("not confirmed")
        ) {
          message = "Tu email aún no ha sido confirmado. Revisa tu bandeja de entrada.";
          setEmailNotConfirmed(true);
        } else if (error.message.includes("rate limit")) {
          message = "Demasiados intentos. Por favor espera unos minutos.";
        }

        toast.error(message);
        return;
      }

      setFailedAttempts(0);
      const userId = data.user?.id;
      if (userId) {
        await handlePostLoginRedirect(userId);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("[Login] Unexpected error:", err);
      toast.error("Error al iniciar sesión. Intenta de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      toast.error("Ingresa un email válido para reenviar la confirmación.");
      return;
    }
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) {
        toast.error("Error al reenviar: " + error.message);
      } else {
        toast.success("¡Correo de confirmación reenviado! Revisa tu bandeja de entrada.");
        setEmailNotConfirmed(false);
      }
    } catch (err) {
      toast.error("Error inesperado al reenviar.");
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${getSiteUrl()}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        toast.error("Error al conectar con Google: " + error.message);
      }
    } catch (err) {
      console.error("[Login] Google OAuth error:", err);
      toast.error("Error inesperado al conectar con Google. Intenta de nuevo.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-muted mx-auto animate-pulse" />
            <div className="h-6 bg-muted rounded w-3/4 mx-auto animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-11 bg-muted rounded-xl animate-pulse" />
            <div className="h-11 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-3xl shadow-2xl border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Accede a tu cuenta de PlaneaDocente
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3 mb-6 h-11"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            Continuar con Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="maestro@escuela.edu.mx"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailNotConfirmed(false);
                  }}
                  className="pl-10"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {emailNotConfirmed && (
              <div
                className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300"
                role="alert"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Tu email aún no ha sido confirmado. Revisa tu bandeja de
                    entrada (incluyendo spam).
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendConfirmation}
                  disabled={isResendingEmail}
                  className="w-full gap-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  {isResendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Reenviar correo de confirmación
                </Button>
              </div>
            )}

            {failedAttempts >= 3 && !emailNotConfirmed && (
              <div
                className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Has fallado {failedAttempts} veces. Si olvidaste tu contraseña,
                  contacta soporte o crea una nueva cuenta.
                </span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/registro" className="text-primary font-semibold hover:underline">
                Regístrate gratis
              </Link>
            </p>
            <Link
              href="/landing"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3 h-3" /> Volver al inicio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
