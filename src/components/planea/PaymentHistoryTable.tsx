
"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, Clock, CreditCard, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PaymentRecord {
  id: string;
  fecha_pago: string;
  descripcion: string | null;
  monto_centavos: number;
  moneda: string;
  estado: "succeeded" | "pending" | "failed" | "refunded";
  stripe_payment_intent_id: string | null;
}

const estadoBadge = {
  succeeded: {
    label: "Pagado",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  pending: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  failed: {
    label: "Fallido",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  refunded: {
    label: "Reembolsado",
    icon: RefreshCw,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
};

function formatAmount(cents: number, moneda: string): string {
  const amount = cents / 100;
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ${moneda.toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PaymentHistoryTable() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPayments = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        setPayments([]);
        return;
      }

      const res = await fetch(`/api/payment-history?user_id=${userId}`);
      const json = await res.json();

      if (json.success) {
        setPayments(json.data ?? []);
      }
    } catch (err) {
      console.error("Error fetching payment history:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Historial de Pagos</CardTitle>
          <CardDescription>Registro de todos tus pagos y suscripciones</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchPayments(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay pagos registrados aún</p>
            <p className="text-xs mt-1">Los pagos aparecerán aquí después de suscribirte</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => {
              const status = estadoBadge[p.estado] ?? estadoBadge.pending;
              const StatusIcon = status.icon;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {p.descripcion ?? "Suscripción PlaneaDocente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.fecha_pago)}
                        {p.stripe_payment_intent_id && (
                          <span className="ml-1 font-mono opacity-60">
                            · {p.stripe_payment_intent_id.slice(-8)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatAmount(p.monto_centavos, p.moneda)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
