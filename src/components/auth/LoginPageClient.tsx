"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  Loader2, Chrome, ArrowLeft
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { toast }    from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPageClient() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authTimeout,    setAuthTimeout]    = useState(false); // fallback si redirect falla
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPassword,   setShowPassword]   = useState(false);
  const [isLoading,      setIsLoading]      = useState(false);
  const [isGoogleLoading,setIsGoogleLoading]= useState(false);

  // ── Detectar sesión existente — redirige a /dashboard directamente ──────
  useEffect(() => {
    let redirected = false;

    // Si el redirect demora más de 4s, mostrar botón manual
    const fallbackTimer = setTimeout(() => {
      setAuthTimeout(true);
      setIsCheckingAuth(false);
    }, 4000);

    const doRedirect = () => {
      if (!redirected) {
        redirected = true;
        clearTimeout(fallbackTimer);
        router.replace("/dashboard");
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        doRedirect();
      } else {
        // No hay sesión: mostrar formulario de login
        clearTimeout(fallbackTimer);
        setIsCheckingAuth(false);
      }
    });

    // Capturar callback de Google OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          doRedirect();
        }
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [router]);

  // ── Spinner mientras verifica sesión ────────────────────────────────────
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          {authTimeout ? (
            <>
              <p className="text-sm text-muted-foreground">Sesión detectada</p>
              <Button className="w-full" onClick={() => router.replace("/dashboard")}>
                Ir al Dashboard →
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verificando sesión...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Login con email ─────────────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor ingresa tu email y contraseña.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "Email o contraseña incorrectos."
            : error.message
        );
        return;
      }
      toast.success("¡Bienvenido de vuelta!");
      router.push("/dashboard");  // ← DIRECTO al dashboard, nunca a /
    } catch {
      toast.error("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login con Google ────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // ← /auth/callback procesa el código y redirige a /dashboard
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error("Error al conectar con Google: " + error.message);
        setIsGoogleLoading(false);
      }
      // Supabase redirige automáticamente — no hacer nada más
    } catch (err) {
      console.error("Error en flujo Google:", err);
      toast.error("Error inesperado al conectar con Google.");
      setIsGoogleLoading(false);
    }
  };

  // ── Formulario ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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

          {/* Google */}
          <Button
            variant="outline"
            className="w-full gap-3 mb-6 h-11"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Chrome className="w-4 h-4" />}
            Continuar con Google
          </Button>

          {/* Separador */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          {/* Email + Password */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="maestro@escuela.edu.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Iniciar Sesión
            </Button>
          </form>

          {/* Links */}
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
