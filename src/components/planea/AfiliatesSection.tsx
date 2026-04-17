
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Award, Copy, CheckCircle2, TrendingUp, DollarSign,
  Users, Share2, Loader2, RefreshCw, Globe, Gift, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/app-store";

interface AffiliateData {
  id: string;
  codigo_referido: string;
  nombre_afiliado: string;
  email_afiliado: string;
  porcentaje_comision: number;
  total_referidos: number;
  total_convertidos: number;
  total_ganado_centavos: number;
  total_pagado_centavos: number;
  estado: string;
}

interface ReferralRecord {
  id: string;
  email_referido: string | null;
  estado: string;
  comision_centavos: number;
  fecha_registro: string;
}

function formatMXN(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} MXN`;
}

export default function AfiliatesSection() {
  const { currentUser } = useAppStore();
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAffiliate = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("affiliate_programs")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();

    if (data) {
      setAffiliate(data as AffiliateData);
      const { data: refs } = await supabase
        .from("affiliate_referrals")
        .select("id, email_referido, estado, comision_centavos, fecha_registro")
        .eq("affiliate_id", data.id)
        .order("fecha_registro", { ascending: false })
        .limit(10);
      setReferrals((refs ?? []) as ReferralRecord[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      loadAffiliate(currentUser.id);
    } else {
      setLoading(false);
    }
  }, [currentUser, loadAffiliate]);

  const handleCreate = async () => {
    if (!currentUser) return;
    setCreating(true);
    try {
      const code = `PLANEA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const displayName =
        currentUser.user_metadata?.full_name ?? currentUser.email ?? "Maestro";
      const { data, error } = await supabase
        .from("affiliate_programs")
        .insert({
          user_id: currentUser.id,
          codigo_referido: code,
          nombre_afiliado: displayName,
          email_afiliado: currentUser.email ?? "",
          porcentaje_comision: 20,
          estado: "activo",
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      setAffiliate(data as AffiliateData);
      toast.success("¡Cuenta de afiliado creada! Ya puedes empezar a ganar comisiones.");
    } catch (err) {
      console.error(err);
      toast.error("Error al crear la cuenta de afiliado. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const referralLink = affiliate
    ? `https://planeadocente.com/?ref=${affiliate.codigo_referido}`
    : "";

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeroBanner />
      {!affiliate ? (
        <JoinAffiliateCta onCreate={handleCreate} creating={creating} />
      ) : (
        <>
          <StatsCards affiliate={affiliate} />
          <ReferralLinkCard link={referralLink} code={affiliate.codigo_referido} onCopy={handleCopy} copied={copied} />
          <HowToShareCard />
          <CommissionHistoryCard referrals={referrals} onRefresh={() => currentUser && loadAffiliate(currentUser.id)} />
        </>
      )}
      <ProgramDetailsCard />
    </div>
  );
}

function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-8 text-white shadow-xl"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Award className="w-10 h-10" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold mb-2">Programa de Afiliados</h2>
          <p className="text-white/80 text-lg mb-1">Gana dinero recomendando PlaneaDocente</p>
          <p className="text-white/60 text-sm">20% de comisión · Sin límite de ganancias · Pagos automáticos</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {["💰 20% de comisión", "🔗 Enlace único", "📊 Estadísticas en tiempo real"].map((f) => (
            <div key={f} className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function JoinAffiliateCta({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-8 border border-border text-center shadow-sm"
    >
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Gift className="w-8 h-8 text-amber-600" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">¡Únete al programa de afiliados!</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Crea tu cuenta de afiliado gratis y empieza a ganar el 20% de comisión por cada maestro
        que se suscriba usando tu enlace de referido.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 max-w-lg mx-auto">
        {[
          { value: "20%", label: "Comisión por referido" },
          { value: "∞", label: "Sin límite de ganancias" },
          { value: "30 días", label: "Duración de cookie" },
        ].map((s) => (
          <div key={s.label} className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <Button
        onClick={onCreate}
        disabled={creating}
        size="lg"
        className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
        Crear mi cuenta de afiliado
      </Button>
    </motion.div>
  );
}

function StatsCards({ affiliate }: { affiliate: AffiliateData }) {
  const pendingCents = affiliate.total_ganado_centavos - affiliate.total_pagado_centavos;
  const conversionRate =
    affiliate.total_referidos > 0
      ? Math.round((affiliate.total_convertidos / affiliate.total_referidos) * 100)
      : 0;

  const stats = [
    { label: "Total Referidos", value: affiliate.total_referidos.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { label: "Convertidos", value: `${affiliate.total_convertidos} (${conversionRate}%)`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
    { label: "Total Ganado", value: formatMXN(affiliate.total_ganado_centavos), icon: DollarSign, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950" },
    { label: "Por Cobrar", value: formatMXN(pendingCents), icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`${s.bg} rounded-2xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

function ReferralLinkCard({
  link, code, onCopy, copied,
}: {
  link: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="w-4 h-4 text-primary" />
          Tu enlace de referido
        </CardTitle>
        <CardDescription>Comparte este enlace para ganar comisiones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono text-sm text-muted-foreground overflow-hidden">
            <span className="truncate block">{link}</span>
          </div>
          <Button onClick={onCopy} variant="outline" className="gap-2 shrink-0">
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Código:</span>
            <span className="font-mono font-bold text-foreground">{code}</span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            Activo
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function HowToShareCard() {
  const channels = [
    { icon: "💬", name: "WhatsApp", desc: "Comparte en grupos de maestros" },
    { icon: "📘", name: "Facebook", desc: "Publica en grupos educativos" },
    { icon: "📸", name: "Instagram", desc: "Stories y publicaciones" },
    { icon: "🐦", name: "Twitter/X", desc: "Tuits y hilos educativos" },
    { icon: "📧", name: "Email", desc: "Envía a colegas directamente" },
    { icon: "🎓", name: "Grupos SEP", desc: "Comparte en reuniones de CTE" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          ¿Cómo compartir tu enlace?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {channels.map((c) => (
            <div key={c.name} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommissionHistoryCard({
  referrals, onRefresh,
}: {
  referrals: ReferralRecord[];
  onRefresh: () => void;
}) {
  const statusColor: Record<string, string> = {
    registrado: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    suscrito: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    pagado: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    cancelado: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Historial de Referidos
          </CardTitle>
          <CardDescription>Tus últimos 10 referidos</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aún no tienes referidos.</p>
            <p className="text-xs text-muted-foreground mt-1">Comparte tu enlace para empezar a ganar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.email_referido ?? "Anónimo"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.fecha_registro).toLocaleDateString("es-MX")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.estado] ?? "bg-muted text-muted-foreground"}`}>
                    {r.estado}
                  </span>
                  {r.comision_centavos > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                      +{formatMXN(r.comision_centavos)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgramDetailsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Detalles del Programa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[
            { label: "Comisión", value: "20% por suscripción", icon: DollarSign },
            { label: "Duración de cookie", value: "30 días", icon: Globe },
            { label: "Mínimo de pago", value: "$500 MXN", icon: TrendingUp },
            { label: "Frecuencia de pago", value: "Mensual", icon: CheckCircle2 },
          ].map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.label} className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-semibold text-foreground">{d.value}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">📋 Términos del programa:</p>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc pl-4">
            <li>Las comisiones se acreditan cuando el referido completa su primer pago</li>
            <li>Los pagos se procesan el primer día hábil de cada mes</li>
            <li>Se requiere un mínimo de $500 MXN para solicitar el pago</li>
            <li>Las comisiones son recurrentes mientras el referido mantenga su suscripción</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
