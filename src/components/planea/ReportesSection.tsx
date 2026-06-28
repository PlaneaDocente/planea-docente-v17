"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download, FileText, BarChart3, TrendingUp, Users, Loader2,
  AlertCircle, RefreshCw, Calendar, CheckCircle, XCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";

type TabReporte = "asistencia" | "evaluacion" | "planeacion" | "evidencias";

export default function ReportesSection() {
  const [activeTab, setActiveTab] = useState<TabReporte>("asistencia");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar grupos desde alumnos (distinct)
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        const { data } = await supabase
          .from("alumnos")
          .select("grupo")
          .eq("user_id", user.id)
          .neq("grupo", null);

        if (data && data.length > 0) {
          const gruposUnicos = [...new Set(data.map((a: any) => a.grupo).filter(Boolean))].sort();
          setGrupos(gruposUnicos);
          setGrupoSeleccionado(gruposUnicos[0]);
        }
      } catch (err) {
        console.error("[Reportes] Error cargando grupos:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const tabs = [
    { id: "asistencia" as const, label: "📅 Asistencia" },
    { id: "evaluacion" as const, label: "📊 Evaluación" },
    { id: "planeacion" as const, label: "📝 Planeación" },
    { id: "evidencias" as const, label: "📷 Evidencias" },
  ];

  if (loading) {
    return (
      <div className="space-y-5" id="reporte-print-area">
        <div className="h-40 animate-pulse bg-muted rounded-2xl" />
      </div>
    );
  }

  // ── Exportar PDF via browser print ──────────────────────────────────────────
  const handleExportPDF = () => {
    const el = document.getElementById("reporte-print-area");
    if (!el) { toast.error("No hay datos para exportar"); return; }
    const win = window.open("", "_blank", "width=850,height=700");
    if (!win) { toast.error("Activa ventanas emergentes e intenta de nuevo"); return; }
    win.document.write(
      `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
      <title>Reporte PlaneaDocente</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{color:#6d28d9;font-size:18px;border-bottom:2px solid #6d28d9;padding-bottom:6px}
        table{width:100%;border-collapse:collapse;margin:12px 0;font-size:12px}
        th{background:#6d28d9;color:#fff;padding:6px 10px;text-align:left}
        td{padding:5px 10px;border-bottom:1px solid #e5e7eb}
        tr:nth-child(even){background:#f9fafb}
        button,select,input,textarea,[role="button"]{display:none !important}
        svg{max-width:100% !important;height:auto !important}
        .footer{margin-top:20px;font-size:10px;color:#9ca3af;text-align:right}
      </style></head><body>
      <h1>Reporte PlaneaDocente — NEM</h1>
      <p style="font-size:11px;color:#6b7280">
        Generado: ${new Date().toLocaleDateString("es-MX",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
      </p>
      ${el.innerHTML}
      <div class="footer">PlaneaDocente.com</div>
      </body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
    toast.success("Preparando PDF — usa Ctrl+P para guardar como PDF");
  };


  return (
    <div className="space-y-5" id="reporte-print-area">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-sm text-muted-foreground">Análisis y estadísticas del ciclo escolar</p>
        </div>
      </div>

      {grupos.length > 0 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
          <select
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value)}
            className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
          >
            {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={handleExportPDF}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {!grupoSeleccionado && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-800 font-medium">No hay grupos registrados</p>
            <p className="text-xs text-amber-600 mt-1">Registra alumnos primero en la sección de Alumnos para ver reportes.</p>
          </CardContent>
        </Card>
      )}

      {grupoSeleccionado && activeTab === "asistencia" && <ReporteAsistencia grupo={grupoSeleccionado} userId={userId} />}
      {grupoSeleccionado && activeTab === "evaluacion" && <ReporteEvaluacion grupo={grupoSeleccionado} userId={userId} />}
      {grupoSeleccionado && activeTab === "planeacion" && <ReportePlaneacion userId={userId} />}
      {grupoSeleccionado && activeTab === "evidencias" && <ReporteEvidencias grupo={grupoSeleccionado} userId={userId} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Asistencia (adaptado a tabla con JSONB registros)
// ─────────────────────────────────────────────────────────────────────────────
function ReporteAsistencia({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [stats, setStats] = useState({ presentes: 0, ausentes: 0, justificados: 0, retardos: 0, total: 0 });
  const [mensual, setMensual] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupo || !userId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        // La tabla asistencia tiene: user_id, grupo, fecha, registros (JSONB)
        const { data, error } = await supabase
          .from("asistencia")
          .select("fecha, registros")
          .eq("user_id", userId)
          .eq("grupo", grupo)
          .order("fecha", { ascending: false })
          .limit(100);

        if (error) throw error;

        const conteo = { presentes: 0, ausentes: 0, justificados: 0, retardos: 0, total: 0 };
        (data || []).forEach((row: any) => {
          const regs = Array.isArray(row.registros) ? row.registros : [];
          regs.forEach((r: any) => {
            conteo.total++;
            if (r.estado === "presente") conteo.presentes++;
            else if (r.estado === "ausente") conteo.ausentes++;
            else if (r.estado === "justificado") conteo.justificados++;
            else if (r.estado === "retardo") conteo.retardos++;
          });
        });
        setStats(conteo);

        // Por mes (últimos 6 meses)
        const hoy = new Date();
        const meses: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
          const mesStr = d.toISOString().slice(0, 7);
          const finMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

          const { data: mesData } = await supabase
            .from("asistencia")
            .select("registros")
            .eq("user_id", userId)
            .eq("grupo", grupo)
            .gte("fecha", `${mesStr}-01`)
            .lte("fecha", finMes);

          let p = 0, a = 0;
          (mesData || []).forEach((row: any) => {
            const regs = Array.isArray(row.registros) ? row.registros : [];
            regs.forEach((r: any) => {
              if (r.estado === "presente") p++;
              else if (r.estado === "ausente") a++;
            });
          });

          meses.push({
            mes: d.toLocaleString("es-MX", { month: "short" }),
            presentes: p,
            ausentes: a,
          });
        }
        setMensual(meses);
      } catch (err: any) {
        console.error("[ReporteAsistencia] Error:", err);
        toast.error("Error cargando asistencia: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupo, userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const promedio = stats.total > 0 ? ((stats.presentes / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Promedio Asistencia", value: `${promedio}%`, color: "text-emerald-600", icon: CheckCircle },
          { label: "Ausentes", value: stats.ausentes.toString(), color: "text-red-600", icon: XCircle },
          { label: "Justificados", value: stats.justificados.toString(), color: "text-blue-600", icon: FileText },
          { label: "Retardos", value: stats.retardos.toString(), color: "text-amber-600", icon: Clock },
        ].map((s) => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Asistencia Mensual</h3>
          {mensual.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mensual}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="presentes" fill="#10b981" name="Presentes" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ausentes" fill="#ef4444" name="Ausentes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos de asistencia</p>}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Evaluación
// ─────────────────────────────────────────────────────────────────────────────
function ReporteEvaluacion({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupo || !userId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        // Obtener evaluaciones del usuario para este grupo
        const { data: evals, error: evalError } = await supabase
          .from("evaluaciones")
          .select("id, materia, grupo")
          .eq("user_id", userId)
          .eq("grupo", grupo);

        if (evalError) throw evalError;

        const resultados: any[] = [];
        for (const ev of (evals || [])) {
          const { data: cals, error: calError } = await supabase
            .from("calificaciones_nem")
            .select("nota")
            .eq("evaluacion_id", ev.id);

          if (calError) throw calError;

          const notas = cals?.map((c: any) => Number(c.nota)).filter((n: number) => !isNaN(n)) || [];
          const promedio = notas.length > 0 ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(1) : "0";
          resultados.push({ materia: ev.materia, promedio: Number(promedio) });
        }

        // Agrupar por materia
        const agrupado: Record<string, number[]> = {};
        resultados.forEach((r) => {
          if (!agrupado[r.materia]) agrupado[r.materia] = [];
          agrupado[r.materia].push(r.promedio);
        });

        const final = Object.entries(agrupado).map(([materia, notas]) => ({
          materia,
          promedio: Number((notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(1)),
        }));

        setData(final);
      } catch (err: any) {
        console.error("[ReporteEvaluacion] Error:", err);
        toast.error("Error cargando evaluaciones: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupo, userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500" /> Promedios por Materia</h3>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
              <YAxis dataKey="materia" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="promedio" fill="#6366f1" name="Promedio" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground text-center py-8">Sin evaluaciones registradas</p>}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Planeación
// ─────────────────────────────────────────────────────────────────────────────
function ReportePlaneacion({ userId }: { userId: string | null }) {
  const [semanal, setSemanal] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPlaneaciones, setTotalPlaneaciones] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("planeaciones")
          .select("created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTotalPlaneaciones(data?.length || 0);

        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anioActual = ahora.getFullYear();

        const semanas = [
          { semana: "S1", creadas: 0 },
          { semana: "S2", creadas: 0 },
          { semana: "S3", creadas: 0 },
          { semana: "S4", creadas: 0 },
        ];

        (data || []).forEach((p: any) => {
          const fecha = new Date(p.created_at);
          if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
            const dia = fecha.getDate();
            const idx = Math.min(Math.floor((dia - 1) / 7), 3);
            semanas[idx].creadas++;
          }
        });

        setSemanal(semanas);
      } catch (err: any) {
        console.error("[ReportePlaneacion] Error:", err);
        toast.error("Error cargando planeaciones: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalPlaneaciones}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de planeaciones creadas</p>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" /> Planeaciones por Semana (Mes Actual)</h3>
          {semanal.some((s) => s.creadas > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={semanal}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="creadas" stroke="#10b981" name="Creadas" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No hay planeaciones creadas este mes.</p>
              <p className="text-xs text-muted-foreground mt-1">Total acumulado: {totalPlaneaciones}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Evidencias
// ─────────────────────────────────────────────────────────────────────────────
function ReporteEvidencias({ grupo, userId }: { grupo: string; userId: string | null }) {
  const [conteo, setConteo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupo || !userId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("evidencias")
          .select("tipo")
          .eq("user_id", userId)
          .eq("grupo", grupo);

        if (error) throw error;

        const tipos = { foto: 0, documento: 0, video: 0 };
        (data || []).forEach((e: any) => {
          if (tipos[e.tipo as keyof typeof tipos] !== undefined) tipos[e.tipo as keyof typeof tipos]++;
        });

        setConteo([
          { tipo: "Fotos", cantidad: tipos.foto },
          { tipo: "Documentos", cantidad: tipos.documento },
          { tipo: "Videos", cantidad: tipos.video },
        ]);
      } catch (err: any) {
        console.error("[ReporteEvidencias] Error:", err);
        toast.error("Error cargando evidencias: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupo, userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const total = conteo.reduce((a, b) => a + b.cantidad, 0);
  const COLORS = ["#f43f5e", "#3b82f6", "#a855f7"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {conteo.map((d) => (
          <Card key={d.tipo} className="border-border">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{d.cantidad}</p>
              <p className="text-xs text-muted-foreground mt-1">{d.tipo}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border shadow-sm">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-rose-500" /> Evidencias por Tipo</h3>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={conteo} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%" outerRadius={70} label>
                  {conteo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sin evidencias registradas</p>}
        </CardContent>
      </Card>
    </div>
  );
}