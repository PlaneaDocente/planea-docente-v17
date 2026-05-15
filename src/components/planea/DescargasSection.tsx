"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Smartphone, Globe, CheckCircle2,
  Star, Shield, Zap, WifiOff, ArrowRight,
  Info, Package, Laptop, Tablet, ChevronDown, ChevronUp,
  AlertCircle, Clock, Share2, PlusSquare, Chrome,
  Download, Copy, Check, QrCode, X, PartyPopper,
  RotateCcw, ExternalLink, SmartphoneNfc
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ═════════════════════ TIPOS ═════════════════════ */

interface PlatformStep {
  step: string;
  icon: React.ElementType;
}

interface Platform {
  id: string;
  name: string;
  version: string;
  icon: React.ElementType;
  color: string;
  size: string;
  format: string;
  badge: string;
  badgeColor: string;
  emoji: string;
  steps: PlatformStep[];
  requirements: string;
  note: string;
}

/* ═════════════════════ CONSTANTES ═════════════════════ */

const platforms: Platform[] = [
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
      { step: "Ve a la dirección de PlaneaDocente que te compartieron", icon: ArrowRight },
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

/* ═════════════════════ UTILIDADES ═════════════════════ */

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh|Mac OS X/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  return "windows";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function DescargasSection() {
  const detected = detectPlatform();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(detected);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [appUrl, setAppUrl] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsStandaloneMode(isStandalone());
    setAppUrl(window.location.href);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Detectar si ya está instalada
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsStandaloneMode(e.matches);
    };
    mediaQuery.addEventListener("change", handleChange as any);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mediaQuery.removeEventListener("change", handleChange as any);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      toast.info("Tu navegador no soporta instalación directa. Sigue los pasos manuales de abajo.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      toast.success("¡PlaneaDocente se está instalando!");
      setCanInstall(false);
      setDeferredPrompt(null);
    } else {
      toast.info("Instalación cancelada.");
    }
  }, [deferredPrompt]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  }, [appUrl]);

  return (
    <div className="space-y-8">
      <HeroDownload
        isStandalone={isStandaloneMode}
        canInstall={canInstall}
        onInstall={handleInstall}
        detectedPlatform={detected}
      />

      {!isStandaloneMode && (
        <>
          <InstallActionsBar
            appUrl={appUrl}
            onCopy={handleCopyLink}
            copied={copied}
            onToggleQr={() => setShowQr((p) => !p)}
            showQr={showQr}
          />
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
                isDetected={detected === p.id}
              />
            ))}
          </div>
          <WhatIsPWA />
        </>
      )}

      {isStandaloneMode && <StandaloneCelebration />}
    </div>
  );
}

/* ═════════════════════ HERO ═════════════════════ */

function HeroDownload({
  isStandalone,
  canInstall,
  onInstall,
  detectedPlatform,
}: {
  isStandalone: boolean;
  canInstall: boolean;
  onInstall: () => void;
  detectedPlatform: string;
}) {
  const platformNames: Record<string, string> = {
    windows: "Windows",
    mac: "macOS",
    android: "Android",
    ios: "iPhone / iPad",
  };

  if (isStandalone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-2">¡PlaneaDocente ya está instalado!</h2>
        <p className="text-white/80 text-lg">Estás usando la versión instalada en tu dispositivo.</p>
      </motion.div>
    );
  }

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
          {detectedPlatform && (
            <Badge className="mt-3 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              Detectado: {platformNames[detectedPlatform] ?? detectedPlatform}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {canInstall && (
            <Button
              onClick={onInstall}
              className="gap-2 bg-white text-primary hover:bg-white/90 font-semibold"
              size="lg"
            >
              <Download className="w-4 h-4" /> Instalar ahora
            </Button>
          )}
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

/* ═════════════════════ BARRA DE ACCIONES ═════════════════════ */

function InstallActionsBar({
  appUrl,
  onCopy,
  copied,
  onToggleQr,
  showQr,
}: {
  appUrl: string;
  onCopy: () => void;
  copied: boolean;
  onToggleQr: () => void;
  showQr: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Enlace de PlaneaDocente</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={appUrl}
                className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border font-mono text-muted-foreground"
              />
              <Button variant="outline" size="sm" onClick={onCopy} className="gap-2 shrink-0">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onToggleQr} className="gap-2 shrink-0">
            <QrCode className="w-4 h-4" /> {showQr ? "Ocultar QR" : "Ver QR"}
          </Button>
        </div>

        <AnimatePresence>
          {showQr && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-5 mt-5 border-t border-border flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground text-center">
                  Escanea este código QR con tu teléfono para abrir PlaneaDocente
                </p>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`}
                    alt="QR Code"
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{appUrl}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═════════════════════ AVISO IMPORTANTE ═════════════════════ */

function ImportantNotice() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
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

/* ═════════════════════ CARACTERÍSTICAS ═════════════════════ */

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
            className={`${f.bg} rounded-xl p-4 border border-border text-center hover:shadow-md transition-shadow`}
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

/* ═════════════════════ ACORDEÓN DE PLATAFORMA ═════════════════════ */

function PlatformAccordion({
  platform,
  index,
  isExpanded,
  onToggle,
  isDetected,
}: {
  platform: Platform;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isDetected: boolean;
}) {
  const Icon = platform.icon;
  const storageKey = `planeadocente_install_steps_${platform.id}`;
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) next.delete(stepIndex);
      else next.add(stepIndex);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const progress = Math.round((completedSteps.size / platform.steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`bg-card rounded-2xl border shadow-sm overflow-hidden transition-all ${
        isDetected ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
      }`}
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
            {isDetected && (
              <Badge variant="outline" className="border-primary text-primary text-xs">
                <SmartphoneNfc className="w-3 h-3 mr-1" /> Tu dispositivo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{platform.version}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" /> {platform.size}
            </span>
            <span className="text-xs text-muted-foreground">{platform.format}</span>
          </div>
          {isExpanded && progress > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[120px]">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{progress}% completado</span>
            </div>
          )}
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
                      const isDone = completedSteps.has(i);
                      return (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-start gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                            isDone ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "hover:bg-muted/30"
                          }`}
                          onClick={() => toggleStep(i)}
                        >
                          <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isDone ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"
                          }`}>
                            {isDone ? <Check className="w-4 h-4" /> : i + 1}
                          </div>
                          <div className="flex items-start gap-2 flex-1">
                            <StepIcon className={`w-4 h-4 shrink-0 mt-0.5 ${isDone ? "text-emerald-500" : "text-muted-foreground"}`} />
                            <p className={`text-sm ${isDone ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-foreground"}`}>
                              {s.step}
                            </p>
                          </div>
                        </motion.li>
                      );
                    })}
                  </ol>
                  {progress === 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¡Todos los pasos completados!</p>
                    </motion.div>
                  )}
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

/* ═════════════════════ CELEBRACIÓN STANDALONE ═════════════════════ */

function StandaloneCelebration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white text-center shadow-xl">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
        >
          <PartyPopper className="w-12 h-12" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">¡Excelente!</h2>
        <p className="text-white/90 text-lg mb-1">PlaneaDocente está instalado y funcionando como app nativa.</p>
        <p className="text-white/60 text-sm">Disfruta de la experiencia completa sin necesidad de navegador.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: "Acceso rápido", desc: "Abre desde tu pantalla de inicio o dock" },
          { icon: Shield, title: "Seguro", desc: "Sin archivos de terceros ni instaladores" },
          { icon: RotateCcw, title: "Siempre actualizado", desc: "Recibe mejoras automáticamente" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-card rounded-xl p-5 border border-border text-center">
              <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═════════════════════ ¿QUÉ ES PWA? ═════════════════════ */

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
              className={`${b.bg} rounded-xl p-4 border border-border hover:shadow-md transition-shadow`}
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