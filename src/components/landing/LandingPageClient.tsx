
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Brain, CheckCircle2, Star, Users, Zap,
  ArrowRight, Menu, X, ChevronDown, Shield, Clock,
  BookOpen, BarChart3, MessageSquare, Camera, CreditCard,
  Gift, TrendingUp, Award, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

export default function LandingPageClient() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data?.session?.user);
    });
  }, []);

  const goToDashboard = () => router.push("/");
  const goToLogin = () => router.push("/login");
  const goToRegister = () => router.push("/registro");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        isLoggedIn={isLoggedIn}
        onDashboard={goToDashboard}
        onLogin={goToLogin}
        onRegister={goToRegister}
      />
      <HeroSection onRegister={goToRegister} onLogin={goToLogin} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection onRegister={goToRegister} />
      <TestimonialsSection />
      <AffiliateTeaser router={router} />
      <FinalCTA onRegister={goToRegister} />
      <LandingFooter />
    </div>
  );
}

function LandingNav({
  menuOpen, setMenuOpen, isLoggedIn, onDashboard, onLogin, onRegister,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isLoggedIn: boolean;
  onDashboard: () => void;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">PlaneaDocente</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {["Características", "Precios", "Afiliados"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Button onClick={onDashboard} className="gap-2">
              <Zap className="w-4 h-4" /> Mi Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onLogin}>Iniciar Sesión</Button>
              <Button onClick={onRegister} className="gap-2">
                Prueba Gratis <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3"
          >
            {isLoggedIn ? (
              <Button onClick={onDashboard} className="w-full gap-2">
                <Zap className="w-4 h-4" /> Mi Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onLogin} className="w-full">Iniciar Sesión</Button>
                <Button onClick={onRegister} className="w-full gap-2">
                  Prueba Gratis <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function HeroSection({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 text-white py-20 md:py-32">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1920&q=20')] bg-cover bg-center opacity-10" />
      <div className="relative max-w-7xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Badge className="bg-white/20 text-white border-white/30 mb-6 text-sm px-4 py-1.5">
            🎉 15 días de prueba GRATIS · Sin tarjeta de crédito
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            La plataforma educativa<br />
            <span className="text-yellow-300">#1 para maestros</span><br />
            mexicanos
          </h1>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Genera planeaciones con IA, controla asistencia, evalúa alumnos y comunícate con padres.
            Todo en un solo lugar, basado en la Nueva Escuela Mexicana.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onRegister}
              className="bg-white text-purple-700 hover:bg-white/90 font-bold text-lg px-8 gap-2 shadow-xl"
            >
              <Gift className="w-5 h-5" /> Comenzar Gratis Ahora
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={onLogin}
              className="border-white/40 text-white hover:bg-white/10 text-lg px-8 gap-2"
            >
              <Play className="w-5 h-5" /> Ver Demo
            </Button>
          </div>
          <p className="text-white/60 text-sm mt-4">
            ✅ Sin tarjeta · ✅ 15 días gratis · ✅ Cancela cuando quieras
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "5,000+", label: "Maestros activos" },
    { value: "150,000+", label: "Planeaciones generadas" },
    { value: "98%", label: "Satisfacción" },
    { value: "15 días", label: "Prueba gratuita" },
  ];
  return (
    <section className="bg-primary text-primary-foreground py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold">{s.value}</p>
              <p className="text-primary-foreground/70 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Brain, color: "text-violet-600 bg-violet-100 dark:bg-violet-950", title: "IA Generadora de Planeaciones", desc: "Crea planeaciones completas basadas en la NEM en segundos. Incluye campos formativos, ejes articuladores y estrategias didácticas." },
    { icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-950", title: "Control de Alumnos", desc: "Gestiona tu grupo completo: datos personales, asistencia, calificaciones y comunicación con padres." },
    { icon: BarChart3, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950", title: "Evaluaciones Inteligentes", desc: "Genera exámenes, rúbricas y listas de cotejo con IA. Registra calificaciones y genera reportes automáticos." },
    { icon: MessageSquare, color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-950", title: "Comunicación con Padres", desc: "Envía comunicados, avisos y mensajes directos a los padres de familia de forma rápida y organizada." },
    { icon: Camera, color: "text-rose-600 bg-rose-100 dark:bg-rose-950", title: "Portafolio de Evidencias", desc: "Sube fotos, videos y documentos como evidencias del trabajo de tus alumnos. Organizado por alumno y materia." },
    { icon: BookOpen, color: "text-amber-600 bg-amber-100 dark:bg-amber-950", title: "Biblioteca Didáctica", desc: "Accede a cientos de actividades y recursos educativos listos para usar en tu clase." },
  ];

  return (
    <section id="características" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <Badge className="mb-4">✨ Funcionalidades</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas para enseñar mejor</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Una plataforma completa diseñada específicamente para el sistema educativo mexicano.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "01", title: "Crea tu cuenta gratis", desc: "Regístrate en 30 segundos con tu email o cuenta de Google. Sin tarjeta de crédito." },
    { num: "02", title: "Configura tu grupo", desc: "Agrega tus alumnos, materias y horarios. La plataforma se adapta a tu escuela." },
    { num: "03", title: "Genera con IA", desc: "Usa la IA para crear planeaciones, exámenes y rúbricas en segundos." },
    { num: "04", title: "Enseña y evalúa", desc: "Registra asistencia, califica y comunícate con padres desde un solo lugar." },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <Badge className="mb-4">🚀 Cómo funciona</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Empieza en minutos, no en horas</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-extrabold mx-auto mb-4 shadow-lg">
                {s.num}
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onRegister }: { onRegister: () => void }) {
  const plans = [
    {
      name: "Básico",
      price: "$99",
      period: "/mes",
      desc: "Para maestros que inician",
      features: ["Hasta 35 alumnos", "Asistencia y calificaciones", "Planeaciones básicas", "Reportes simples", "Soporte por email"],
      gradient: "from-blue-500 to-blue-700",
      popular: false,
    },
    {
      name: "Profesional",
      price: "$199",
      period: "/mes",
      desc: "El más elegido por maestros",
      features: ["Alumnos ilimitados", "IA para planeaciones", "Generador de imágenes IA", "Evidencias y portafolio", "Comunicación con padres", "Reportes avanzados", "Soporte prioritario"],
      gradient: "from-violet-600 to-purple-700",
      popular: true,
    },
    {
      name: "Institucional",
      price: "$499",
      period: "/mes",
      desc: "Para escuelas completas",
      features: ["Todo lo de Profesional", "Múltiples maestros", "Panel de director", "Reportes institucionales", "Integración SEP", "Capacitación incluida", "Soporte 24/7"],
      gradient: "from-amber-500 to-orange-600",
      popular: false,
    },
  ];

  return (
    <section id="precios" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <Badge className="mb-4">💳 Precios</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Planes para cada maestro</h2>
          <p className="text-muted-foreground text-lg">15 días de prueba gratis en todos los planes. Sin tarjeta de crédito.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col ${plan.popular ? "border-primary shadow-lg shadow-primary/10 scale-[1.03]" : "border-border"}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
              )}
              <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white`}>
                {plan.popular && (
                  <Badge className="bg-white/20 text-white border-white/30 mb-3 text-xs">⭐ Más Popular</Badge>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-white/70 text-sm mb-3">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-white/70 mb-1">{plan.period}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2 flex items-center gap-2 mb-4">
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">15 días de prueba gratis</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onRegister}
                  className={`w-full font-semibold ${plan.popular ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  Comenzar Prueba Gratis
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    { name: "Maestra Ana García", school: "Primaria Benito Juárez, CDMX", text: "PlaneaDocente me ahorra 3 horas cada semana. Las planeaciones con IA son increíbles y están perfectamente alineadas con la NEM.", avatar: "AG", rating: 5 },
    { name: "Maestro Carlos López", school: "Secundaria Técnica, Guadalajara", text: "La comunicación con padres mejoró muchísimo. Ahora todos están al tanto de las actividades y tareas de sus hijos.", avatar: "CL", rating: 5 },
    { name: "Directora María Soto", school: "Escuela Primaria, Monterrey", text: "Implementamos PlaneaDocente en toda la escuela. El panel de director nos da visibilidad total del desempeño académico.", avatar: "MS", rating: 5 },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-14">
          <Badge className="mb-4">⭐ Testimonios</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen nuestros maestros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.school}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AffiliateTeaser({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <section id="afiliados" className="py-20 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white text-center shadow-2xl">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8" />
          </div>
          <Badge className="bg-white/20 text-white border-white/30 mb-4">💰 Programa de Afiliados</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Gana dinero recomendando PlaneaDocente</h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Comparte tu código de referido con otros maestros y gana el <strong>20% de comisión</strong> por cada suscripción que generes. Sin límite de ganancias.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Award, title: "20% de comisión", desc: "Por cada maestro que se suscriba con tu código" },
              { icon: CreditCard, title: "Pagos mensuales", desc: "Recibe tus ganancias directamente en tu cuenta" },
              { icon: Users, title: "Sin límite", desc: "Refiere a cuantos maestros quieras" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white/10 rounded-2xl p-4">
                  <Icon className="w-6 h-6 mb-2 mx-auto" />
                  <p className="font-bold">{item.title}</p>
                  <p className="text-white/70 text-sm">{item.desc}</p>
                </div>
              );
            })}
          </div>
          <Button
            size="lg"
            onClick={() => router.push("/afiliados")}
            className="bg-white text-orange-600 hover:bg-white/90 font-bold text-lg px-8 gap-2"
          >
            <TrendingUp className="w-5 h-5" /> Unirme al Programa
          </Button>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="py-20 bg-gradient-to-br from-violet-600 to-indigo-700 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            ¿Listo para transformar<br />tu forma de enseñar?
          </h2>
          <p className="text-white/80 text-xl mb-10">
            Únete a más de 5,000 maestros que ya usan PlaneaDocente. Empieza gratis hoy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={onRegister}
              className="bg-white text-purple-700 hover:bg-white/90 font-bold text-xl px-10 py-6 gap-2 shadow-2xl"
            >
              <Gift className="w-6 h-6" /> Comenzar 15 Días Gratis
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-white/60 text-sm">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Sin tarjeta</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 15 días gratis</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Cancela cuando quieras</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">PlaneaDocente</span>
            </div>
            <p className="text-muted-foreground text-sm">La plataforma educativa #1 para maestros mexicanos.</p>
          </div>
          {[
            { title: "Producto", links: ["Características", "Precios", "Afiliados"] },
            { title: "Soporte", links: ["Centro de ayuda", "Contacto", "Estado del sistema"] },
            { title: "Legal", links: ["Privacidad", "Términos de uso", "Cookies"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground text-sm hover:text-foreground transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 text-center text-muted-foreground text-sm">
          <p>© 2025 PlaneaDocente. Todos los derechos reservados. · planeadocente.com</p>
        </div>
      </div>
    </footer>
  );
}
