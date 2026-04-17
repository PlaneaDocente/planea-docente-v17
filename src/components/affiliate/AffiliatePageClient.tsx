
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Copy, CheckCircle2, Users, DollarSign,
  Gift, Share2, ArrowRight, Loader2, LogIn, GraduationCap,
  Award, BarChart3, Clock, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";

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

export default function AffiliatePageClient() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData?.session?.user;
      if (!sessionUser) {
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", sessionUser.id)
        .maybeSingle();

      setUser({
        id: sessionUser.id,
        email: profile?.email ?? sessionUser.email ?? "",
        full_name: profile?.full_name ?? sessionUser.user_metadata?.full_name ?? "Maestro",
      });

      const { data: affiliateData } = await supabase
        .from("affiliate_programs")
        .select("*")
        .eq("user_id", sessionUser.id)
        .maybeSingle();

      if (affiliateData) {
        setAffiliate(affiliateData as AffiliateData);

        const { data: refs } = await supabase
          .from("affiliate_referrals")
          .select("id, email_referido, estado, comision_centavos, fecha_registro")
          .eq("affiliate_id", affiliateData.id)
          .order("fecha_registro", { ascending: false })
          .limit(20);

        setReferrals((refs ?? []) as ReferralRecord[]);
      }
    } catch (err) {
      console.error("Error loading affiliate data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = async () => {
    if (!user) return;
    setIsApplying(true);
    try {
      const code = `REF${user.id.slice(0, 6).toUpperCase()}`;
      const { data, error } = await supabase
        .from("affiliate_programs")
        .insert({
          user_id: user.id,
          codigo_referido: code,
          nombre_afiliado: user.full_name,
          email_afiliado: user.email,
          porcentaje_comision: 20,
          estado: "activo",
        })
        .select()
        .maybeSingle();

      if (error) {
        toast.error("Error al registrarte como afiliado. Intenta de nuevo.");
        return;
      }
      setAffiliate(data as AffiliateData);
      toast.success("¡Bienvenido al programa de afiliados!");
    } catch {
      toast.error("Error inesperado. Intenta de nuevo.");
    } finally {
      setIsApplying(false);
    }
  };

  const copyCode = () => {
    if (!affiliate) return;
    const url = `${window.location.origin}/registro?ref=${affiliate.codigo_referido}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("¡Enlace copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <NotLoggedInView onLogin={() => router.push("/login")} />;
  }

  if (!affiliate) {
    return <ApplyView user={user} onApply={handleApply} isApplying={isApplying} />;
  }

  return (
    <AffiliateDashboard
      affiliate={affiliate}
      referrals={referrals}
      onCopy={copyCode}
      copied={copied}
    />
  );
}

function NotLoggedInView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl shadow-2xl border border-border p-8 max-w-md w-full text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto mb-6">
          <TrendingUp className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Programa de Afiliados</h2>
        <p className="text-muted-foreground mb-6">
          Inicia sesión para acceder al programa de afiliados y comenzar a ganar comisiones.
        </p>
        <Button onClick={onLogin} className="w-full gap-2">
          <LogIn className="w-4 h-4" /> Iniciar Sesión
        </Button>
      </motion.div>
    </div>
  );
}

function ApplyView({
  user, onApply, isApplying,
}: {
  user: { full_name: string };
  onApply: () => void;
  isApplying: boolean;
}) {
  const benefits = [
    { icon: DollarSign, title: "20% de comisión", desc: "Por cada maestro que se suscriba con tu código" },
    { icon: Clock, title: "Pagos mensuales", desc: "Recibe tus ganancias el primer día de cada mes" },
    { icon: Users, title: "Sin límite de referidos", desc: "Refiere a cuantos maestros quieras" },
    { icon: Award, title: "Bonos especiales", desc: "Gana bonos extra por volumen de referidos" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-4">Programa de Afiliados</h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Hola <strong>{user.full_name}</strong>, gana dinero recomendando PlaneaDocente a otros maestros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{b.title}</h3>
                  <p className="text-muted-foreground text-sm">{b.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            onClick={onApply}
            disabled={isApplying}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg px-10 py-6 gap-3 shadow-xl"
          >
            {isApplying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Gift className="w-5 h-5" />
            )}
            Unirme al Programa Ahora
          </Button>
          <p className="text-muted-foreground text-sm mt-3">Gratis · Activación inmediata</p>
        </div>
      </div>
    </div>
  );
}

function AffiliateDashboard({
  affiliate, referrals, onCopy, copied,
}: {
  affiliate: AffiliateData;
  referrals: ReferralRecord[];
  onCopy: () => void;
  copied: boolean;
}) {
  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : "https://planeadocente.com"}/registro?ref=${affiliate.codigo_referido}`;
  const pendingEarnings = affiliate.total_ganado_centavos - affiliate.total_pagado_centavos;

  const stats = [
    { label: "Total Referidos", value: affiliate.total_referidos, icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-950" },
    { label: "Convertidos", value: affiliate.total_convertidos, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950" },
    { label: "Total Ganado", value: `$${(affiliate.total_ganado_centavos / 100).toFixed(0)} MXN`, icon: DollarSign, color: "text-amber-600 bg-amber-100 dark:bg-amber-950" },
    { label: "Por Cobrar", value: `$${(pendingEarnings / 100).toFixed(0)} MXN`, icon: TrendingUp, color: "text-violet-600 bg-violet-100 dark:bg-violet-950" },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">Panel de Afiliado</h1>
              <p className="text-white/80">Hola, <strong>{affiliate.nombre_afiliado}</strong> · Comisión: {affiliate.porcentaje_comision}%</p>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
              {affiliate.estado === "activo" ? "✅ Activo" : affiliate.estado}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-500" /> Tu Enlace de Referido
            </CardTitle>
            <CardDescription>Comparte este enlace para ganar comisiones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input value={referralUrl} readOnly className="font-mono text-sm" />
              <Button onClick={onCopy} className="gap-2 shrink-0">
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-3">
              <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Código: <strong className="text-foreground font-mono">{affiliate.codigo_referido}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Historial de Referidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aún no tienes referidos</p>
                <p className="text-sm mt-1">Comparte tu enlace para comenzar a ganar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{r.email_referido ?? "Referido anónimo"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.fecha_registro).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.comision_centavos > 0 && (
                        <span className="text-sm font-semibold text-emerald-600">
                          +${(r.comision_centavos / 100).toFixed(0)} MXN
                        </span>
                      )}
                      <Badge variant={r.estado === "convertido" ? "default" : "secondary"} className="text-xs">
                        {r.estado}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
