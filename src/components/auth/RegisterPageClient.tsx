"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Chrome,
  User,
  ArrowLeft,
  CheckCircle2,
  Gift,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sanitiza texto para mostrar en UI y evitar XSS básico */
function sanitizeText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export default function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawReferralCode = searchParams?.get("ref") ?? "";
  const referralCode = sanitizeText(rawReferralCode.slice(0, 50)); // limitar longitud

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [trialCreated, setTrialCreated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  /**
   * Si ya hay sesión activa, redirigir al dashboard.
   */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        router.replace("/dashboard");
      } else {
        setIsCheckingSession(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  /**
   * Crea una suscripción de prueba automáticamente para un usuario recién registrado.
   */
  const createTrialSubscription = async (userId: string): Promise<boolean> => {
    try {
      const plansRes = await fetch("/api/subscription-plans", { cache: "no-store" });
      const plansJson = await plansRes.json();

      if (!plansRes.ok || !plansJson.success || !plansJson.data?.length) {
        console.warn("[Register] No subscription plans available for trial.");
        return false;
      }

      const plans = plansJson.data as Array<{ id: string; nombre: string }>;
      const trialPlan =
        plans.find((p) => p.nombre.toLowerCase().includes("profesional")) ??
        plans.find((p) => p.nombre.toLowerCase().includes("trial")) ??
        plans.find((p) => p.nombre.toLowerCase().includes("prueba")) ??
        plans[0];

      if (!trialPlan) {
        console.warn("[Register] Could not determine trial plan.");
        return false;
      }

      const subRes = await fetch("/api/user-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          plan_id: trialPlan.id,
          estado: "trialing",
          metadata: {
            source: "auto_trial_on_register",
            referral_code: referralCode || null,
            registered_at: new Date().toISOString(),
          },
        }),
      });

      const subJson = await subRes.json();

      if (!subRes.ok || !subJson.success) {
        console.error("[Register] Trial creation failed:", subJson.error);
        return false;
      }

      console.log("[Register] Trial subscription created:", trialPlan.nombre);
      return true;
    } catch (err) {
      console.error("[Register] Error creating trial subscription:", err);
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      toast.error("Por favor completa todos los campos.");
      return;
    }
    if (trimmedName.length < 2) {
      toast.error("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      toast.error("Por favor ingresa un email válido.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("La contraseña debe incluir al menos una mayúscula y un número.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            referral_code: referralCode,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        let message = error.message;
        if (error.message.includes("User already registered")) {
          message = "Este email ya está registrado. Intenta iniciar sesión.";
        } else if (error.message.includes("rate limit")) {
          message = "Demasiados intentos. Por favor espera unos minutos.";
        } else if (error.message.includes("password")) {
          message = "La contraseña no cumple con los requisitos de seguridad.";
        }
        toast.error(message);
        return;
      }

      const userId = data.user?.id;
      let trialOk = false;
      if (userId) {
        trialOk = await createTrialSubscription(userId);
      }
      setTrialCreated(trialOk);

      if (trialOk) {
        toast.success("¡Cuenta creada! Tu prueba gratuita de 15 días ha sido activada.");
      } else {
        toast.success("¡Cuenta creada! Revisa tu email para confirmarla.");
        if (userId) {
          toast.warning(
            "No pudimos activar tu prueba automáticamente. Contacta soporte si no ves tus funciones premium.",
            { duration: 6000 }
          );
        }
      }

      setDone(true);
    } catch (err) {
      console.error("[Register] Unexpected error:", err);
      toast.error("Error al crear la cuenta. Intenta de nuevo más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    if (!acceptedTerms) {
      toast.error("Debes aceptar los términos y condiciones para continuar.");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: referralCode
            ? { access_type: "offline", prompt: "consent", state: referralCode }
            : { access_type: "offline", prompt: "consent" },
        },
      });

      if (error) {
        toast.error("Error al registrarse con Google: " + error.message);
      }
    } catch (err) {
      console.error("[Register] Google OAuth error:", err);
      toast.error("Error al conectar con Google. Intenta de nuevo.");
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
            <div className="h-11 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card rounded-3xl shadow-2xl border border-border p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">¡Cuenta creada!</h2>
          <p className="text-muted-foreground mb-4">
            Revisa tu correo <strong>{email}</strong> para confirmar tu cuenta.
          </p>

          {trialCreated ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg mb-6">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                🎁 Tu prueba gratuita de 15 días en el plan Profesional ha sido activada.
                Una vez confirmes tu email, podrás acceder a todas las funciones.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg mb-6">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Tu cuenta fue creada, pero no pudimos activar la prueba automáticamente.
                Contacta soporte si no ves tus funciones premium después de confirmar tu email.
              </p>
            </div>
          )}

          <Button onClick={() => router.push("/login")} className="w-full">
            Ir a Iniciar Sesión
          </Button>
        </motion.div>
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
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Crear Cuenta Gratis</h1>
            <p className="text-muted-foreground text-sm mt-1">
              15 días de prueba · Sin tarjeta de crédito
            </p>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
            <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
              🎁 15 días gratis en el plan Profesional
            </p>
          </div>

          {referralCode && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 mb-6">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                🎉 Código de referido aplicado: <strong>{referralCode}</strong>
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3 mb-6 h-11"
            onClick={handleGoogleRegister}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            Registrarse con Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Maestra Ana García"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  autoComplete="name"
                  required
                />
              </div>
            </div>

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
                  onChange={(e) => setEmail(e.target.value)}
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
                  placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres, incluir mayúscula y número.
              </p>
            </div>

            {/* Términos y condiciones — requerido legalmente */}
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Acepto los{" "}
                <Link href="/terminos" className="text-primary hover:underline" target="_blank">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
                  Política de Privacidad
                </Link>
                . Confirmo que soy mayor de edad o cuento con autorización de mi tutor legal.
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Crear Cuenta Gratis
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="text-primary font-semibold hover:underline"
              >
                Iniciar Sesión
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
