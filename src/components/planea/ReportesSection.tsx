"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, FileText, BarChart3, TrendingUp, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell
} from "recharts";

type TabReporte = "asistencia" | "evaluacion" | "planeacion" | "evidencias";

export default function ReportesSection() {
  const [activeTab, setActiveTab] = useState<TabReporte>("asistencia");
  const [grupoId, setGrupoId] = useState<string>("");
  const [grupos, setGrupos] = useState<{ id: string; nombre: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("grupos").select("id,nombre").eq("maestro_id", user.id);
      if (data?.length) {
        setGrupos(data);
        setGrupoId(data[0].id);
      }
    };
    cargar();
  }, []);

  const tabs = [
    { id: "asistencia" as const, label: "📅 Asistencia" },
    { id: "evaluacion" as const, label: "📊 Evaluación" },
    { id: "planeacion" as const, label: "📝 Planeación" },
    { id: "evidencias" as const, label: "📷 Evidencias" },
  ] as const;

  return (
    <div className="space-y-5">
      {grupos.length > 1 && (
        <div className="bg-card rounded-xl p-3 border border-border">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
          <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm outline-none border border-border">
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => toast.info("Exportar PDF — próximamente")}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {activeTab === "asistencia" && <ReporteAsistencia grupoId={grupoId} />}
      {activeTab === "evaluacion" && <ReporteEvaluacion grupoId={grupoId} />}
      {activeTab === "planeacion" && <ReportePlaneacion userId={userId} />}
      {activeTab === "evidencias" && <ReporteEvidencias grupoId={grupoId} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Asistencia
// ─────────────────────────────────────────────────────────────────────────────
function ReporteAsistencia({ grupoId }: { grupoId: string }) {
  const [stats, setStats] = useState({ presentes: 0, ausentes: 0, justificados: 0, retardos: 0, total: 0 });
  const [mensual, setMensual] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupoId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("asistencia").select("estado").eq("grupo_id", grupoId);
        if (error) throw error;
        
        const conteo = { presentes: 0, ausentes: 0, justificados: 0, retardos: 0, total: data?.length || 0 };
        data?.forEach(r => {
          if (r.estado === "presente") conteo.presentes++;
          else if (r.estado === "ausente") conteo.ausentes++;
          else if (r.estado === "justificado") conteo.justificados++;
          else if (r.estado === "retardo") conteo.retardos++;
        });
        setStats(conteo);

        // Por mes (últimos 6 meses)
        const hoy = new Date();
        const meses: any[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
          const mesStr = d.toISOString().slice(0, 7);
          const finMes = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 10);
          
          const { data: mesData, error: mesError } = await supabase
            .from("asistencia")
            .select("estado")
            .eq("grupo_id", grupoId)
            .gte("fecha", `${mesStr}-01`)
            .lt("fecha", finMes);
          
          if (mesError) throw mesError;
          
          const p = mesData?.filter(r => r.estado === "presente").length || 0;
          const a = mesData?.filter(r => r.estado === "ausente").length || 0;
          meses.push({ mes: d.toLocaleString("es-MX", { month: "short" }), presentes: p, ausentes: a });
        }
        setMensual(meses);
      } catch (err: any) {
        console.error("Error cargando asistencia:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupoId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const promedio = stats.total > 0 ? ((stats.presentes / stats.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Promedio Asistencia", value: `${promedio}%`, color: "text-emerald-600" },
          { label: "Ausentes", value: stats.ausentes.toString(), color: "text-red-600" },
          { label: "Justificados", value: stats.justificados.toString(), color: "text-blue-600" },
          { label: "Retardos", value: stats.retardos.toString(), color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Evaluación
// ─────────────────────────────────────────────────────────────────────────────
function ReporteEvaluacion({ grupoId }: { grupoId: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupoId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const { data: evals, error: evalError } = await supabase.from("evaluaciones").select("id,materia").eq("grupo_id", grupoId);
        if (evalError) throw evalError;
        
        const resultados: any[] = [];
        for (const ev of (evals || [])) {
          const { data: cals, error: calError } = await supabase.from("calificaciones").select("nota").eq("evaluacion_id", ev.id);
          if (calError) throw calError;
          
          const notas = cals?.map(c => Number(c.nota)).filter(n => !isNaN(n)) || [];
          const promedio = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1) : "0";
          resultados.push({ materia: ev.materia, promedio: Number(promedio) });
        }
        
        const agrupado: Record<string, number[]> = {};
        resultados.forEach(r => {
          if (!agrupado[r.materia]) agrupado[r.materia] = [];
          agrupado[r.materia].push(r.promedio);
        });
        
        const final = Object.entries(agrupado).map(([materia, notas]) => ({
          materia,
          promedio: Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1))
        }));
        
        setData(final);
      } catch (err: any) {
        console.error("Error cargando evaluaciones:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupoId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Planeación (CORREGIDO - recibe userId directamente)
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
          .eq("maestro_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setTotalPlaneaciones(data?.length || 0);

        // Distribuir por semanas del mes actual
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
          // Solo contar si es del mes actual
          if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
            const dia = fecha.getDate();
            const idx = Math.min(Math.floor((dia - 1) / 7), 3);
            semanas[idx].creadas++;
          }
        });
        
        setSemanal(semanas);
      } catch (err: any) {
        console.error("Error cargando planeaciones:", err);
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
      <div className="bg-card rounded-xl p-4 border border-border text-center">
        <p className="text-2xl font-bold text-primary">{totalPlaneaciones}</p>
        <p className="text-xs text-muted-foreground mt-1">Total de planeaciones creadas</p>
      </div>
      
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" /> Planeaciones por Semana (Mes Actual)</h3>
        {semanal.some(s => s.creadas > 0) ? (
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE: Evidencias
// ─────────────────────────────────────────────────────────────────────────────
function ReporteEvidencias({ grupoId }: { grupoId: string }) {
  const [conteo, setConteo] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!grupoId) return;
    const cargar = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("evidencias").select("tipo").eq("grupo_id", grupoId);
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
        console.error("Error cargando evidencias:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [grupoId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const total = conteo.reduce((a, b) => a + b.cantidad, 0);
  const COLORS = ["#f43f5e", "#3b82f6", "#a855f7"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {conteo.map(d => (
          <div key={d.tipo} className="bg-card rounded-xl p-4 border border-border text-center">
            <p className="text-2xl font-bold text-primary">{d.cantidad}</p>
            <p className="text-xs text-muted-foreground mt-1">{d.tipo}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
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
      </div>
    </div>
  );
}