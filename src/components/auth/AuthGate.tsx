"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Chrome,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  BookOpen,
  Users,
  Brain,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthMode = "login" | "register";

interface AuthGateProps {
  onAuthenticated: (user: User, subscription: { hasPlan: boolean; planName: string | null }) => void;
}

export default function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // ── Capturar parámetro de referido ─────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
      localStorage.setItem("affiliate_ref", refCode);
    }
  }, []);

  /**
   * Consulta la suscripción del usuario y notifica al padre con
   * información completa (no solo el User).
   * ✅ CORREGIDO: se añade el token Bearer
   */
  const checkSubscriptionAndNotify = useCallback(
    async (user: User) => {
      try {
        // Obtener token de sesión
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          console.warn("[AuthGate] No token available, cannot fetch subscription");
          onAuthenticated(user, { hasPlan: false, planName: null });
          return;
        }

        const res = await fetch(`/api/user-subscription?user_id=${user.id}`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          console.warn("[AuthGate] Subscription check failed:", json.error);
          onAuthenticated(user, { hasPlan: false, planName: null });
          return;
        }

        const sub = json.data?.subscription;
        const plan = json.data?.plan;
        const hasPlan = sub && ["trialing", "active", "past_due"].includes(sub.estado);

        onAuthenticated(user, {
          hasPlan: !!hasPlan,
          planName: plan?.nombre ?? null,
        });
      } catch (err) {
        console.error("[AuthGate] Error checking subscription:", err);
        onAuthenticated(user, { hasPlan: false, planName: null });
      }
    },
    [onAuthenticated]
  );

  // ── Verificar sesión existente al montar ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        checkSubscriptionAndNotify(data.session.user);
      } else {
        setCheckingSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          checkSubscriptionAndNotify(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [checkSubscriptionAndNotify]);

  /**
   * Crea una suscripción de prueba automáticamente para un usuario recién registrado.
   * ✅ CORREGIDO: se añade el token Bearer al POST
   */
  const createTrialSubscription = async (userId: string): Promise<boolean> => {
    try {
      // Obtener token de sesión (después de registro, el usuario aún no está autenticado,
      // pero para crear la suscripción usamos el service role en el backend, así que
      // en realidad no necesitamos token aquí si la API está abierta para creación.
      // Sin embargo, por seguridad, la API debería aceptar crear suscripciones sin token
      // solo para usuarios recién creados? Mejor obtenemos el token si existe.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const plansRes = await fetch("/api/subscription-plans", { cache: "no-store" });
      const plansJson = await plansRes.json();

      if (!plansRes.ok || !plansJson.success || !plansJson.data?.length) {
        console.warn("[AuthGate] No plans available for trial.");
        return false;
      }

      const plans = plansJson.data as Array<{ id: string; nombre: string }>;
      const trialPlan =
        plans.find((p) => p.nombre.toLowerCase().includes("profesional")) ??
        plans.find((p) => p.nombre.toLowerCase().includes("trial")) ??
        plans.find((p) => p.nombre.toLowerCase().includes("prueba")) ??
        plans[0];

      if (!trialPlan) return false;

      const refCode = localStorage.getItem("affiliate_ref");

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const subRes = await fetch("/api/user-subscription", {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: userId,
          plan_id: trialPlan.id,
          estado: "trialing",
          metadata: {
            source: "auto_trial_on_authgate_register",
            referral_code: refCode || null,
            registered_at: new Date().toISOString(),
          },
        }),
      });

      const subJson = await subRes.json();
      return subRes.ok && subJson.success;
    } catch (err) {
      console.error("[AuthGate] Error creating trial:", err);
      return false;
    }
  };

  /**
   * Guarda el referido en la base de datos (envuelto en try-catch para no romper el registro).
   */
  const saveReferral = async (userEmail: string) => {
    try {
      const refCode = localStorage.getItem("affiliate_ref");
      if (!refCode) return;

      const { data: affiliate } = await supabase
        .from("affiliate_programs")
        .select("id")
        .eq("codigo_referido", refCode)
        .maybeSingle();

      if (affiliate) {
        await supabase.from("affiliate_referrals").insert({
          affiliate_id: affiliate.id,
          email_referido: userEmail,
          estado: "registrado",
        });
      }
      localStorage.removeItem("affiliate_ref");
    } catch (err) {
      console.warn("[AuthGate] Referral save failed (non-blocking):", err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    // ── Validaciones cliente ─────────────────────────────────────────────────
    if (!trimmedEmail || !password) {
      setError("Por favor ingresa tu email y contraseña.");
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Por favor ingresa un email válido.");
      return;
    }

    if (mode === "register") {
      if (!trimmedName || trimmedName.length < 2) {
        setError("El nombre debe tener al menos 2 caracteres.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError("La contraseña debe incluir al menos una mayúscula y un número.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "register") {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { full_name: trimmedName },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (signUpError) throw signUpError;

        // Guardar referido (no bloqueante)
        await saveReferral(trimmedEmail);

        // Crear trial automáticamente
        const userId = signUpData.user?.id;
        let trialCreated = false;
        if (userId) {
          trialCreated = await createTrialSubscription(userId);
        }

        if (trialCreated) {
          toast.success("¡Cuenta creada! Tu prueba gratuita de 15 días ha sido activada.");
        } else {
          toast.success("¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.");
          toast.warning(
            "No pudimos activar tu prueba automáticamente. Contacta soporte si no ves tus funciones premium.",
            { duration: 6000 }
          );
        }

        // Cambiar a modo login para que el usuario inicie sesión
        setMode("login");
        setPassword("");
      } else {
        // Login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);

          let message = signInError.message;
          if (signInError.message.includes("Invalid login credentials")) {
            message = "Correo o contraseña incorrectos.";
          } else if (signInError.message.includes("Email not confirmed")) {
            message = "Confirma tu correo antes de iniciar sesión.";
          } else if (signInError.message.includes("rate limit")) {
            message = "Demasiados intentos. Espera un momento.";
          }
          setError(message);
          return;
        }

        setFailedAttempts(0);
        toast.success("¡Bienvenido de vuelta!");

        if (data.user) {
          await checkSubscriptionAndNotify(data.user);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth (redirect directo, sin popup) ────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Debe ir al handler de callback (igual que login/registro), que hace
          // el intercambio de código y enruta según la suscripción.
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) throw oauthError;
      // signInWithOAuth redirige automáticamente el navegador.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error con Google";
      setError(translateError(msg));
      setGoogleLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <LandingPanel />
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">PlaneaDocente</h1>
              <p className="text-xs text-muted-foreground">Sistema Educativo IA</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta gratis"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login"
              ? "Ingresa a tu panel de maestro"
              : "15 días de prueba gratis, sin tarjeta de crédito"}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3 h-11 mb-4 font-medium"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4 text-blue-500" />
            )}
            Continuar con Google
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">o con email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence>
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej: Ana Martínez López"
                    required={mode === "register"}
                    autoComplete="name"
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  className="w-full bg-muted rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Mínimo 8 caracteres, 1 mayúscula, 1 número" : "••••••••"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full bg-muted rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {mode === "register" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 8 caracteres, incluir mayúscula y número.
                </p>
              )}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {failedAttempts >= 3 && mode === "login" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Has fallado {failedAttempts} veces. Si olvidaste tu contraseña,
                  contacta soporte o crea una nueva cuenta.
                </span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2 h-11 font-semibold"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta Gratis"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
                setFailedAttempts(0);
              }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "login" ? "Regístrate gratis" : "Inicia sesión"}
            </button>
          </p>

          {mode === "register" && (
            <div className="mt-4 space-y-1.5">
              {[
                "15 días de prueba gratis",
                "Sin tarjeta de crédito",
                "Cancela cuando quieras",
              ].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function LandingPanel() {
  const features = [
    {
      icon: Brain,
      label: "IA Generadora de Planeaciones",
      desc: "Crea planeaciones NEM en segundos",
    },
    {
      icon: Users,
      label: "Control de Alumnos",
      desc: "Asistencia, calificaciones y más",
    },
    {
      icon: BookOpen,
      label: "Biblioteca Didáctica",
      desc: "Cientos de actividades listas",
    },
    {
      icon: Star,
      label: "Reportes Avanzados",
      desc: "Estadísticas en tiempo real",
    },
  ];

  return (
    <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-primary via-violet-600 to-purple-700 text-white p-12 w-[480px] shrink-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl">PlaneaDocente</h1>
            <p className="text-white/70 text-sm">La plataforma #1 para maestros</p>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-3 leading-tight">
          Transforma tu práctica docente con IA
        </h2>
        <p className="text-white/80 mb-8 text-sm leading-relaxed">
          Genera planeaciones, controla asistencia, evalúa alumnos y comunícate con padres,
          todo en un solo lugar.
        </p>

        <div className="space-y-4 mb-10">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-4 bg-white/10 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.label}</p>
                  <p className="text-white/70 text-xs">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4">
          <Sparkles className="w-5 h-5 text-yellow-300 shrink-0" />
          <p className="text-sm text-white/90">
            <strong>+5,000 maestros</strong> ya usan PlaneaDocente en México
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed"))
    return "Confirma tu correo antes de iniciar sesión.";
  if (msg.includes("User already registered"))
    return "Este correo ya está registrado. Inicia sesión.";
  if (msg.includes("Password should be at least"))
    return "La contraseña debe tener al menos 8 caracteres.";
  if (msg.includes("rate limit"))
    return "Demasiados intentos. Espera un momento.";
  return msg;
}