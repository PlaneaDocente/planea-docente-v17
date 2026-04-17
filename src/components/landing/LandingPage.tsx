
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Brain, Users, BookOpen, BarChart3,
  MessageSquare, CheckCircle2, Star, ArrowRight, Zap,
  Shield, Clock, TrendingUp, Award, ChevronDown, ChevronUp,
  Play, Sparkles, CreditCard, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav onGetStarted={onGetStarted} />
      <HeroSection onGetStarted={onGetStarted} />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection onGetStarted={onGetStarted} />
      <TestimonialsSection />
      <AffiliateSection onGetStarted={onGetStarted} />
      <FaqSection />
      <CtaSection onGetStarted={onGetStarted} />
      <LandingFooter />
    </div>
  );
}

function LandingNav({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">PlaneaDocente</span>
          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 hidden sm:inline-flex">
            Beta
          </Badge>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {["Características", "Precios", "Afiliados", "FAQ"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-foreground transition-colors">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onGetStarted}>Iniciar sesión</Button>
          <Button size="sm" onClick={onGetStarted} className="gap-1.5">
            Prueba gratis <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-purple-600/5" />
      <div className="max-w-6xl mx-auto px-4 text-center relative">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Plataforma #1 para maestros mexicanos
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Automatiza tu trabajo docente
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              con Inteligencia Artificial
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Genera planeaciones NEM, controla asistencia, evalúa alumnos y comunícate con padres.
            Todo en un solo lugar, diseñado para maestros mexicanos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button size="lg" onClick={onGetStarted} className="gap-2 text-base px-8 h-12">
              <Zap className="w-5 h-5" /> Comenzar gratis — 15 días
            </Button>
            <Button size="lg" variant="outline" onClick={onGetStarted} className="gap-2 text-base h-12">
              <Play className="w-5 h-5" /> Ver demo
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {[
              { icon: Shield, text: "Sin tarjeta de crédito" },
              { icon: Clock, text: "15 días gratis" },
              { icon: CheckCircle2, text: "Cancela cuando quieras" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-emerald-500" />
                {text}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16"
        >
          <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary to-purple-600 p-4 flex items-center gap-3">
              <div className="flex gap-1.5">
                {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c) => (
                  <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
                ))}
              </div>
              <span className="text-white/80 text-xs font-mono">planeadocente.com — Dashboard</span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Alumnos", value: "32", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
                { label: "Asistencia", value: "94%", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
                { label: "Planeaciones", value: "12", color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950" },
                { label: "Actividades", value: "8", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "5,000+", label: "Maestros activos", icon: Users },
    { value: "150,000+", label: "Planeaciones generadas", icon: BookOpen },
    { value: "98%", label: "Satisfacción", icon: Star },
    { value: "30 min", label: "Ahorro diario promedio", icon: Clock },
  ];
  return (
    <section className="py-12 bg-muted/30 border-y border-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Brain, title: "IA Generadora de Planeaciones", desc: "Genera planeaciones completas basadas en la NEM en segundos. Incluye campos formativos, ejes articuladores y estrategias didácticas.", color: "from-violet-500 to-purple-600", badge: "⭐ Más usado" },
    { icon: Users, title: "Control de Alumnos", desc: "Gestiona tu lista de alumnos, registra asistencia diaria, lleva calificaciones por bimestre y genera reportes automáticos.", color: "from-blue-500 to-cyan-600" },
    { icon: BarChart3, title: "Evaluaciones Inteligentes", desc: "Crea exámenes, rúbricas y listas de cotejo con IA. Genera reportes de desempeño individual y grupal.", color: "from-emerald-500 to-teal-600" },
    { icon: MessageSquare, title: "Comunicación con Padres", desc: "Envía comunicados, avisos y mensajes directos a los padres de familia. Lleva registro de lecturas y respuestas.", color: "from-amber-500 to-orange-600" },
    { icon: BookOpen, title: "Biblioteca Didáctica", desc: "Accede a cientos de actividades, proyectos y recursos educativos listos para usar en tu clase.", color: "from-rose-500 to-pink-600" },
    { icon: TrendingUp, title: "Reportes y Estadísticas", desc: "Visualiza el progreso de tus alumnos con gráficas interactivas. Exporta reportes en PDF para directivos y padres.", color: "from-indigo-500 to-blue-600" },
  ];

  return (
    <section id="características" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Características</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Todo lo que necesitas para enseñar mejor
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Herramientas diseñadas específicamente para el sistema educativo mexicano
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
                className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-shadow group"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-foreground">{f.title}</h3>
                  {f.badge && (
                    <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
    { num: "01", title: "Crea tu cuenta gratis", desc: "Regístrate con tu correo o Google en menos de 1 minuto. Sin tarjeta de crédito." },
    { num: "02", title: "Configura tu grupo", desc: "Agrega tus alumnos, materias y horarios. El sistema se adapta a tu escuela." },
    { num: "03", title: "Genera con IA", desc: "Describe el tema y la IA crea tu planeación completa basada en NEM al instante." },
    { num: "04", title: "Enseña y evalúa", desc: "Registra asistencia, califica actividades y comunícate con padres desde un solo lugar." },
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Cómo funciona</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Empieza en 4 pasos simples</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <div className="text-4xl font-black text-primary/20 mb-3">{s.num}</div>
              <h3 className="font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ onGetStarted }: { onGetStarted: () => void }) {
  const plans = [
    {
      name: "Básico", price: "$99", period: "/mes", desc: "Para maestros que inician",
      features: ["Hasta 35 alumnos", "Asistencia digital", "Planeaciones básicas", "Reportes simples", "Soporte por email"],
      gradient: "from-blue-500 to-blue-700",
    },
    {
      name: "Profesional", price: "$199", period: "/mes", desc: "El más popular",
      features: ["Alumnos ilimitados", "IA para planeaciones", "Generador de imágenes IA", "Evidencias y portafolio", "Comunicación con padres", "Reportes avanzados", "Soporte prioritario"],
      gradient: "from-violet-600 to-purple-700",
      popular: true,
    },
    {
      name: "Institucional", price: "$499", period: "/mes", desc: "Para escuelas completas",
      features: ["Todo lo de Profesional", "Múltiples maestros", "Panel de director", "Gestión de grupos", "Reportes institucionales", "Capacitación incluida", "Soporte 24/7"],
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <section id="precios" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Precios</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Planes para cada maestro</h2>
          <p className="text-muted-foreground">15 días de prueba gratis en todos los planes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`bg-card rounded-2xl border overflow-hidden flex flex-col ${plan.popular ? "border-primary shadow-xl shadow-primary/10 scale-[1.02]" : "border-border"}`}
            >
              {plan.popular && <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />}
              <div className={`bg-gradient-to-br ${plan.gradient} p-6 text-white`}>
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-white/70 text-sm mb-3">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-white/70 mb-1">{plan.period}</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">15 días gratis incluidos</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={onGetStarted}
                  className={`w-full ${plan.popular ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  Comenzar prueba gratis
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
    { name: "Ana Martínez", role: "Maestra de 3° Primaria, CDMX", text: "PlaneaDocente me ahorra 2 horas diarias. Las planeaciones con IA son increíbles y están perfectamente alineadas con la NEM.", avatar: "AM", stars: 5 },
    { name: "Carlos Rodríguez", role: "Director, Escuela Primaria Toluca", text: "Implementamos PlaneaDocente en toda la escuela. Los reportes institucionales nos ayudan a tomar mejores decisiones.", avatar: "CR", stars: 5 },
    { name: "Laura Sánchez", role: "Maestra de 5° Primaria, Guadalajara", text: "La comunicación con padres mejoró muchísimo. Ahora todos están al tanto del progreso de sus hijos.", avatar: "LS", stars: 5 },
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Testimonios</Badge>
          <h2 className="text-3xl font-bold text-foreground mb-4">Lo que dicen los maestros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 border border-border"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{t.avatar}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AffiliateSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section id="afiliados" className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-white/20 text-white border-white/30">
                <Award className="w-3.5 h-3.5 mr-1.5" />
                Programa de Afiliados
              </Badge>
              <h2 className="text-3xl font-bold mb-4">Gana dinero recomendando PlaneaDocente</h2>
              <p className="text-white/80 mb-6 leading-relaxed">
                Comparte tu código de referido con otros maestros y gana el 20% de comisión
                por cada suscripción que generes. Sin límite de ganancias.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { value: "20%", label: "Comisión" },
                  { value: "∞", label: "Sin límite" },
                  { value: "30 días", label: "Cookie" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-white/70 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              <Button onClick={onGetStarted} className="bg-white text-orange-600 hover:bg-white/90 font-bold gap-2">
                <Globe className="w-4 h-4" />
                Unirme al programa
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { step: "1", title: "Regístrate como afiliado", desc: "Crea tu cuenta y obtén tu código único de referido" },
                { step: "2", title: "Comparte tu enlace", desc: "Compártelo en redes sociales, grupos de maestros o WhatsApp" },
                { step: "3", title: "Gana comisiones", desc: "Recibe el 20% de cada suscripción que generes automáticamente" },
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-4 bg-white/10 rounded-2xl p-4">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 font-bold text-sm">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{s.title}</p>
                    <p className="text-white/70 text-xs">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: "¿Necesito tarjeta de crédito para la prueba?", a: "No. Puedes usar PlaneaDocente gratis por 15 días sin proporcionar datos de pago. Solo necesitas tu correo electrónico." },
    { q: "¿Las planeaciones están alineadas con la NEM?", a: "Sí. Nuestro generador de IA está entrenado con los planes y programas de la Nueva Escuela Mexicana, incluyendo campos formativos, ejes articuladores y contenidos prioritarios." },
    { q: "¿Puedo usar PlaneaDocente en mi celular?", a: "Sí. PlaneaDocente es completamente responsivo y funciona en cualquier dispositivo: computadora, tablet o smartphone." },
    { q: "¿Cómo funciona el programa de afiliados?", a: "Recibes un código único de referido. Cada vez que alguien se suscribe usando tu código, ganas el 20% de comisión de forma automática y recurrente." },
    { q: "¿Puedo cancelar en cualquier momento?", a: "Sí, sin penalizaciones ni contratos. Puedes cancelar tu suscripción desde tu panel en cualquier momento." },
  ];

  return (
    <section id="faq" className="py-20 bg-muted/20">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">FAQ</Badge>
          <h2 className="text-3xl font-bold text-foreground mb-4">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-sm text-foreground">{faq.q}</span>
                {open === i ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="px-5 pb-5"
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-primary via-violet-600 to-purple-700 rounded-3xl p-10 md:p-16 text-white"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para transformar tu práctica docente?
          </h2>
          <p className="text-white/80 mb-8 text-lg">
            Únete a más de 5,000 maestros que ya usan PlaneaDocente
          </p>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="bg-white text-primary hover:bg-white/90 font-bold gap-2 text-base px-8 h-12"
          >
            <CreditCard className="w-5 h-5" />
            Comenzar prueba gratis — 15 días
          </Button>
          <p className="text-white/60 text-sm mt-4">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </motion.div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">PlaneaDocente</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          © 2025 PlaneaDocente. Todos los derechos reservados. · planeadocente.com
        </p>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <a href="#" className="hover:text-foreground">Privacidad</a>
          <a href="#" className="hover:text-foreground">Términos</a>
          <a href="#" className="hover:text-foreground">Contacto</a>
        </div>
      </div>
    </footer>
  );
}
