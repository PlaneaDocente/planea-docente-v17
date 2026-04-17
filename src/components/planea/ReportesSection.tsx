
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, FileText, BarChart3, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockReportes } from "@/data/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";

export default function ReportesSection() {
  const [activeTab, setActiveTab] = useState<"asistencia" | "evaluacion" | "planeacion" | "evidencias">("asistencia");

  const tabs = [
    { id: "asistencia", label: "📅 Asistencia" },
    { id: "evaluacion", label: "📊 Evaluación" },
    { id: "planeacion", label: "📝 Planeación" },
    { id: "evidencias", label: "📷 Evidencias" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
        </div>
      </div>

      {activeTab === "asistencia" && <ReporteAsistencia />}
      {activeTab === "evaluacion" && <ReporteEvaluacion />}
      {activeTab === "planeacion" && <ReportePlaneacion />}
      {activeTab === "evidencias" && <ReporteEvidencias />}
    </div>
  );
}

function ReporteAsistencia() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Promedio Asistencia", value: "93.7%", color: "text-emerald-600" },
          { label: "Total Inasistencias", value: "24", color: "text-red-600" },
          { label: "Justificadas", value: "8", color: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-4 border border-border text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Asistencia Mensual
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mockReportes.asistenciaMensual}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="presentes" fill="#10b981" name="Presentes" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ausentes" fill="#ef4444" name="Ausentes" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReporteEvaluacion() {
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" /> Promedios por Materia
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mockReportes.promediosMaterias} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 12 }} />
            <YAxis dataKey="materia" type="category" tick={{ fontSize: 11 }} width={90} />
            <Tooltip />
            <Bar dataKey="promedio" fill="#6366f1" name="Promedio" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReportePlaneacion() {
  const data = [
    { semana: "S1", completadas: 3, pendientes: 1 },
    { semana: "S2", completadas: 4, pendientes: 0 },
    { semana: "S3", completadas: 2, pendientes: 2 },
    { semana: "S4", completadas: 5, pendientes: 0 },
  ];
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4 text-amber-500" /> Planeaciones por Semana
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="completadas" stroke="#10b981" name="Completadas" strokeWidth={2} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="pendientes" stroke="#f59e0b" name="Pendientes" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReporteEvidencias() {
  const data = [
    { tipo: "Fotos", cantidad: 24 },
    { tipo: "Documentos", cantidad: 18 },
    { tipo: "Videos", cantidad: 6 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {data.map(d => (
          <div key={d.tipo} className="bg-card rounded-xl p-4 border border-border text-center">
            <p className="text-2xl font-bold text-primary">{d.cantidad}</p>
            <p className="text-xs text-muted-foreground mt-1">{d.tipo}</p>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" /> Evidencias por Alumno
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#f43f5e" name="Cantidad" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
