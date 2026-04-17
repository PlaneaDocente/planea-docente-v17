
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, Loader2,
  Chrome, CheckCircle2, AlertCircle, ArrowRight,
  Sparkles, BookOpen, Users, Brain, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type AuthMode = "login" | "register";

interface AuthGateProps {
  onAuthenticated: (user: User) => void;
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

  const handleAuthenticated = useCallback(
    (user: User) => { onAuthenticated(user); },
    [onAuthenticated]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        handleAuthenticated(data.session.user);
      } else {
        setCheckingSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) handleAuthenticated(session.user);
    });

    return () => subscription.unsubscribe();
  }, [handleAuthenticated]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (signUpError) throw signUpError;
        toast.success("¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(translateError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: true,
        },
      });
      if (oauthError) throw oauthError;
      if (data?.url) {
        const popup = window.open(data.url, "google-login", "width=500,height=600,left=200,top=100");
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            popup?.close();
            subscription.unsubscribe();
            setGoogleLoading(false);
          }
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error con Google";
      setError(translateError(msg));
      setGoogleLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-muted rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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

            <Button type="submit" className="w-full gap-2 h-11 font-semibold" disabled={loading}>
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
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "login" ? "Regístrate gratis" : "Inicia sesión"}
            </button>
          </p>

          {mode === "register" && (
            <div className="mt-4 space-y-1.5">
              {["15 días de prueba gratis", "Sin tarjeta de crédito", "Cancela cuando quieras"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
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
    { icon: Brain, label: "IA Generadora de Planeaciones", desc: "Crea planeaciones NEM en segundos" },
    { icon: Users, label: "Control de Alumnos", desc: "Asistencia, calificaciones y más" },
    { icon: BookOpen, label: "Biblioteca Didáctica", desc: "Cientos de actividades listas" },
    { icon: Star, label: "Reportes Avanzados", desc: "Estadísticas en tiempo real" },
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
  if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (msg.includes("Email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
  if (msg.includes("User already registered")) return "Este correo ya está registrado. Inicia sesión.";
  if (msg.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (msg.includes("rate limit")) return "Demasiados intentos. Espera un momento.";
  return msg;
}
