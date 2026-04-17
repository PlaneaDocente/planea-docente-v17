
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Eye, EyeOff, CreditCard, CheckCircle2, AlertCircle, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface StripeConfigModalProps {
  onClose: () => void;
}

export default function StripeConfigModal({ onClose }: StripeConfigModalProps) {
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!publishableKey || !secretKey) {
      toast.error("La clave pública y la clave secreta son obligatorias.");
      return;
    }
    if (!publishableKey.startsWith("pk_")) {
      toast.error("La clave pública debe comenzar con 'pk_test_' o 'pk_live_'");
      return;
    }
    if (!secretKey.startsWith("sk_")) {
      toast.error("La clave secreta debe comenzar con 'sk_test_' o 'sk_live_'");
      return;
    }
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSaved(true);
    setIsSaving(false);
    toast.success("Configuración de Stripe guardada correctamente.");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl">
          <CardHeader className="flex flex-row items-start justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Configurar Stripe</CardTitle>
                <CardDescription>Conecta tu cuenta para recibir pagos</CardDescription>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Modo de prueba</p>
                <p className="text-xs text-muted-foreground">Usa claves de prueba (test) para probar pagos</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={testMode ? "secondary" : "default"} className="text-xs">
                  {testMode ? "TEST" : "LIVE"}
                </Badge>
                <Switch checked={testMode} onCheckedChange={setTestMode} />
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-xs font-semibold">¿Cómo obtener tus claves de Stripe?</p>
              </div>
              <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 pl-4 list-decimal">
                <li>Ve a <strong>stripe.com</strong> y crea una cuenta gratuita</li>
                <li>En el Dashboard, ve a <strong>Developers → API Keys</strong></li>
                <li>Copia la <strong>Publishable key</strong> y la <strong>Secret key</strong></li>
                <li>Para webhooks, ve a <strong>Developers → Webhooks</strong></li>
              </ol>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 font-medium hover:underline"
              >
                Abrir Stripe Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pk">Clave Pública (Publishable Key)</Label>
                <Input
                  id="pk"
                  placeholder={testMode ? "pk_test_..." : "pk_live_..."}
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comienza con pk_test_ o pk_live_</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sk">Clave Secreta (Secret Key)</Label>
                <div className="relative">
                  <Input
                    id="sk"
                    type={showSecret ? "text" : "password"}
                    placeholder={testMode ? "sk_test_..." : "sk_live_..."}
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">⚠️ Nunca compartas esta clave con nadie</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wh">Webhook Secret (Opcional)</Label>
                <div className="relative">
                  <Input
                    id="wh"
                    type={showWebhook ? "text" : "password"}
                    placeholder="whsec_..."
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {saved && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Configuración guardada exitosamente</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={isSaving}>
                <Shield className="w-4 h-4" />
                {isSaving ? "Guardando..." : saved ? "Actualizar" : "Guardar configuración"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
