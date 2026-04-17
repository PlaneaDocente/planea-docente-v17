
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Smartphone, Globe, CheckCircle2,
  Star, Shield, Zap, WifiOff, ArrowRight,
  Info, Package, Laptop, Tablet, ChevronDown, ChevronUp,
  AlertCircle, Clock, Share2, PlusSquare, Chrome,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const platforms = [
  {
    id: "windows",
    name: "Windows (Chrome / Edge)",
    version: "Windows 10 / 11",
    icon: Monitor,
    color: "from-blue-500 to-blue-700",
    size: "Sin descarga",
    format: "Acceso web + instalar PWA",
    badge: "⭐ Recomendado",
    badgeColor: "bg-emerald-500",
    emoji: "🖥️",
    steps: [
      { step: "Abre Google Chrome o Microsoft Edge en tu computadora", icon: Globe },
      { step: "Ve a la dirección: planeadocente.vercel.app (o el enlace que te compartieron)", icon: ArrowRight },
      { step: "Inicia sesión con tu cuenta de maestro", icon: CheckCircle2 },
      { step: "En la barra de direcciones, haz clic en el ícono de instalar (⊕) que aparece a la derecha", icon: PlusSquare },
      { step: "Haz clic en 'Instalar' en el cuadro que aparece", icon: Package },
      { step: "¡Listo! PlaneaDocente aparecerá como app en tu escritorio y menú de inicio", icon: CheckCircle2 },
    ],
    requirements: "Google Chrome 90+ o Microsoft Edge 90+ · Conexión a internet",
    note: "Si no ves el ícono de instalar, ve al menú (⋮) → 'Instalar PlaneaDocente' o 'Guardar en pantalla de inicio'.",
  },
  {
    id: "mac",
    name: "macOS (Chrome / Safari)",
    version: "macOS 12 Monterey o superior",
    icon: Laptop,
    color: "from-gray-600 to-gray-900",
    size: "Sin descarga",
    format: "Acceso web + instalar PWA",
    badge: "🍎 Compatible",
    badgeColor: "bg-gray-600",
    emoji: "💻",
    steps: [
      { step: "Abre Google Chrome o Safari en tu Mac", icon: Globe },
      { step: "Ve a la dirección de PlaneaDocente que te compartieron", icon: ArrowRight },
      { step: "Inicia sesión con tu cuenta", icon: CheckCircle2 },
      { step: "En Chrome: haz clic en el ícono de instalar (⊕) en la barra de direcciones", icon: PlusSquare },
      { step: "En Safari: haz clic en el ícono de compartir (□↑) → 'Añadir al Dock'", icon: Share2 },
      { step: "¡Listo! PlaneaDocente aparecerá en tu Dock o Launchpad como una app nativa", icon: CheckCircle2 },
    ],
    requirements: "Google Chrome 90+ o Safari 15+ · macOS 12 o superior · Conexión a internet",
    note: "En Safari, la opción 'Añadir al Dock' está disponible desde macOS Sonoma (14). En versiones anteriores usa Chrome.",
  },
  {
    id: "android",
    name: "Android (Chrome)",
    version: "Android 8.0 o superior",
    icon: Smartphone,
    color: "from-emerald-500 to-green-700",
    size: "Sin descarga",
    format: "Instalar desde Chrome",
    badge: "🤖 Android",
    badgeColor: "bg-emerald-600",
    emoji: "📱",
    steps: [
      { step: "Abre Google Chrome en tu teléfono Android", icon: Globe },
      { step: "Ve a la dirección de PlaneaDocente que te compartieron", icon: ArrowRight },
      { step: "Inicia sesión con tu cuenta de maestro", icon: CheckCircle2 },
      { step: "Aparecerá automáticamente un banner en la parte inferior: 'Añadir PlaneaDocente a la pantalla de inicio'", icon: PlusSquare },
      { step: "Si no aparece el banner: toca el menú (⋮) → 'Añadir a pantalla de inicio'", icon: Package },
      { step: "¡Listo! El ícono de PlaneaDocente aparecerá en tu pantalla de inicio como cualquier app", icon: CheckCircle2 },
    ],
    requirements: "Google Chrome para Android · Android 8.0 o superior · Conexión a internet",
    note: "La app instalada funciona como una app nativa: pantalla completa, sin barra del navegador, y con acceso rápido desde tu pantalla de inicio.",
  },
  {
    id: "ios",
    name: "iPhone / iPad (Safari)",
    version: "iOS 15 o superior",
    icon: Tablet,
    color: "from-sky-500 to-indigo-600",
    size: "Sin descarga",
    format: "Añadir desde Safari",
    badge: "🍏 iOS / iPadOS",
    badgeColor: "bg-sky-500",
    emoji: "📲",
    steps: [
      { step: "Abre Safari en tu iPhone o iPad (debe ser Safari, no Chrome)", icon: Globe },
      { step: "Ve a la dirección de PlaneaDocente que te compartieron", icon: ArrowRight },
      { step: "Inicia sesión con tu cuenta de maestro", icon: CheckCircle2 },
      { step: "Toca el ícono de compartir (□↑) en la barra inferior de Safari", icon: Share2 },
      { step: "Desplázate hacia abajo en el menú y toca 'Añadir a pantalla de inicio'", icon: PlusSquare },
      { step: "¡Listo! El ícono de PlaneaDocente aparecerá en tu pantalla de inicio", icon: CheckCircle2 },
    ],
    requirements: "Safari (iOS) · iPhone 8 o superior · iOS 15 o superior · Conexión a internet",
    note: "En iPhone e iPad DEBES usar Safari para instalar la app. Chrome en iOS no permite instalar apps en la pantalla de inicio.",
  },
];

const features = [
  { icon: Shield, label: "100% Seguro", desc: "Datos cifrados y protegidos", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
  { icon: Zap, label: "Ultra Rápido", desc: "Carga instantánea", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
  { icon: WifiOff, label: "Sin instalador", desc: "No necesitas .exe ni .apk", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  { icon: Star, label: "100% Gratis", desc: "Sin costo, sin suscripción", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
];

export default function DescargasSection() {
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>("windows");

  return (
    <div className="space-y-8">
      <HeroDownload />
      <ImportantNotice />
      <FeaturesRow />
      <div className="space-y-4">
        {platforms.map((p, i) => (
          <PlatformAccordion
            key={p.id}
            platform={p}
            index={i}
            isExpanded={expandedPlatform === p.id}
            onToggle={() => setExpandedPlatform(expandedPlatform === p.id ? null : p.id)}
          />
        ))}
      </div>
      <WhatIsPWA />
    </div>
  );
}

function HeroDownload() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Globe className="w-10 h-10" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold mb-2">Instala PlaneaDocente en tu dispositivo</h2>
          <p className="text-white/80 text-lg mb-1">Disponible en Windows, macOS, Android e iOS</p>
          <p className="text-white/60 text-sm">Sin descargar archivos · Sin instaladores · Funciona como app nativa</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {["🖥️ Windows & Mac", "📱 Android", "📲 iPhone / iPad"].map((p) => (
            <div key={p} className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ImportantNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">
            ¿Por qué no hay un archivo .exe o .apk para descargar?
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
            PlaneaDocente es una <strong>aplicación web progresiva (PWA)</strong>. Esto significa que
            funciona directamente desde tu navegador y puedes instalarla en tu dispositivo
            <strong> sin necesitar descargar ningún instalador</strong>. Es más seguro, más rápido
            y siempre tendrás la versión más actualizada automáticamente.
          </p>
          <div className="flex flex-wrap gap-2">
            {["✅ Sin virus ni malware", "✅ Siempre actualizado", "✅ Funciona en todos los dispositivos", "✅ Instalación en 1 minuto"].map((item) => (
              <span key={item} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturesRow() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {features.map((f, i) => {
        const Icon = f.icon;
        return (
          <motion.div
            key={f.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`${f.bg} rounded-xl p-4 border border-border text-center`}
          >
            <Icon className={`w-6 h-6 ${f.color} mx-auto mb-2`} />
            <p className="text-sm font-semibold">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function PlatformAccordion({
  platform,
  index,
  isExpanded,
  onToggle,
}: {
  platform: (typeof platforms)[0];
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = platform.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors text-left"
      >
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center shrink-0 shadow-md`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg text-foreground">{platform.emoji} {platform.name}</h3>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${platform.badgeColor} text-white`}>
              {platform.badge}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{platform.version}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" /> {platform.size}
            </span>
            <span className="text-xs text-muted-foreground">{platform.format}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border pt-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-primary" />
                    Pasos para instalar en {platform.name}:
                  </h4>
                  <ol className="space-y-3">
                    {platform.steps.map((s, i) => {
                      const StepIcon = s.icon;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex items-start gap-2 flex-1">
                            <StepIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground">{s.step}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-primary" /> Requisitos:
                    </h4>
                    <p className="text-sm text-muted-foreground">{platform.requirements}</p>
                  </div>

                  {platform.note && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">{platform.note}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-4 border border-primary/20 text-center">
                    <div className="text-5xl mb-3">{platform.emoji}</div>
                    <p className="text-sm font-semibold text-foreground mb-1">PlaneaDocente</p>
                    <p className="text-xs text-muted-foreground mb-3">{platform.name} · Instalación gratuita</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Sigue los pasos de la izquierda para instalar
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WhatIsPWA() {
  const benefits = [
    { icon: Globe, title: "Siempre actualizado", desc: "No necesitas actualizar manualmente. Cada vez que abres la app, ya tienes la versión más reciente.", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { icon: Shield, title: "Más seguro", desc: "No descargas archivos desconocidos. La app viene directamente del servidor oficial.", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { icon: Zap, title: "Instalación en 1 minuto", desc: "Sin asistentes de instalación, sin permisos complicados, sin reiniciar el equipo.", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
    { icon: Chrome, title: "Funciona como app nativa", desc: "Una vez instalada, se abre en pantalla completa sin barra del navegador, igual que cualquier app.", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
  ];

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
        <Info className="w-5 h-5 text-primary" /> ¿Qué es una PWA y por qué es mejor?
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        PlaneaDocente usa tecnología <strong>PWA (Progressive Web App)</strong> — el estándar moderno
        que usan apps como Twitter, Spotify y Google Maps para instalarse sin tiendas de apps.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {benefits.map((b, i) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`${b.bg} rounded-xl p-4 border border-border`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${b.color} shrink-0 mt-0.5`} />
                <div>
                  <p className="text-sm font-semibold mb-1">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-5 border border-primary/20">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Resumen rápido: ¿Cómo instalo PlaneaDocente?
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: "1️⃣", text: "Abre tu navegador (Chrome, Edge o Safari)" },
            { emoji: "2️⃣", text: "Ve a la dirección de PlaneaDocente" },
            { emoji: "3️⃣", text: "Inicia sesión con tu cuenta" },
            { emoji: "4️⃣", text: "Toca 'Instalar' o 'Añadir a pantalla de inicio'" },
          ].map((step) => (
            <div key={step.emoji} className="flex items-start gap-2 bg-background rounded-lg p-3 border border-border">
              <span className="text-xl shrink-0">{step.emoji}</span>
              <p className="text-xs text-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
