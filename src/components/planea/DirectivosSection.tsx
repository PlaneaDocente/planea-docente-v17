"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2, LayoutDashboard, UserCog, GraduationCap, CalendarDays,
  Megaphone, Boxes, Plus, Trash2, Loader2, Mail, Smartphone, Send,
  Users, DollarSign, School, Wrench, CheckCircle2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type DirTab = "panel" | "personal" | "maestros" | "eventos" | "admin" | "avisos";

const TABS: { id: DirTab; label: string; icon: React.ElementType }[] = [
  { id: "panel", label: "Panel", icon: LayoutDashboard },
  { id: "personal", label: "Personal", icon: UserCog },
  { id: "maestros", label: "Maestros", icon: GraduationCap },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
  { id: "admin", label: "Administración", icon: Boxes },
  { id: "avisos", label: "Avisos internos", icon: Megaphone },
];

const ROLES = ["Director(a)", "Subdirector(a)", "Secretario(a)", "Intendente", "Prefecto(a)", "Trabajo Social", "Otro"];

function useUserId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id || null));
  }, []);
  return uid;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function DirectivosSection() {
  const userId = useUserId();
  const [unlocked, setUnlocked] = useState(false);
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { data } = await supabase.from("configuracion").select("directivo_pin").eq("user_id", userId).maybeSingle();
        setPinSet(!!(data as { directivo_pin?: string } | null)?.directivo_pin);
      } catch { setPinSet(false); }
    })();
  }, [userId]);

  const crearPin = async () => {
    if (!/^\d{4,8}$/.test(pin)) { toast.error("El PIN debe ser de 4 a 8 dígitos."); return; }
    if (pin !== pinConfirm) { toast.error("Los PIN no coinciden."); return; }
    if (!userId) return;
    setBusy(true);
    const hash = await sha256(pin);
    const { error } = await supabase.from("configuracion").upsert(
      { user_id: userId, directivo_pin: hash, actualizado_en: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setBusy(false);
    if (error) { toast.error(error.code === "42703" ? "Falta la columna del PIN: corre el SQL de Directivos PIN en Supabase." : error.message); return; }
    toast.success("PIN de directivo creado.");
    setPin(""); setPinConfirm(""); setPinSet(true); setUnlocked(true);
  };

  const verificarPin = async () => {
    if (!userId || pin.length < 4) { toast.error("Ingresa tu PIN."); return; }
    setBusy(true);
    const hash = await sha256(pin);
    const { data } = await supabase.from("configuracion").select("directivo_pin").eq("user_id", userId).maybeSingle();
    setBusy(false);
    if ((data as { directivo_pin?: string } | null)?.directivo_pin === hash) {
      setUnlocked(true); setPin("");
    } else {
      toast.error("PIN incorrecto.");
    }
  };

  if (unlocked) {
    return (
      <div>
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setUnlocked(false)}>
            <Lock className="w-4 h-4" /> Bloquear
          </Button>
        </div>
        <DirectivosContent />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-6">
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Área de Directivos protegida</h2>
          <p className="text-sm text-muted-foreground">
            {pinSet === null ? "Verificando…" : pinSet
              ? "Ingresa tu PIN de directivo para acceder."
              : "Crea un PIN para proteger esta área. Los maestros no podrán entrar sin él."}
          </p>
        </div>

        {pinSet === false && (
          <div className="space-y-2">
            <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="Nuevo PIN (4 a 8 dígitos)" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-center tracking-widest border border-border outline-none" maxLength={8} />
            <input type="password" inputMode="numeric" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))} placeholder="Confirmar PIN" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-center tracking-widest border border-border outline-none" maxLength={8} />
            <Button className="w-full gap-2" onClick={crearPin} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Crear PIN y entrar
            </Button>
          </div>
        )}

        {pinSet === true && (
          <div className="space-y-2">
            <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") verificarPin(); }} placeholder="PIN de directivo" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm text-center tracking-widest border border-border outline-none" maxLength={8} autoFocus />
            <Button className="w-full gap-2" onClick={verificarPin} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Entrar
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground">El PIN se guarda cifrado en tu cuenta. Si lo olvidas, puedes restablecerlo desde Supabase (columna directivo_pin).</p>
      </div>
    </div>
  );
}

function openEmailMultiple(emails: string[], subject: string, body: string) {
  const clean = emails.filter(Boolean);
  if (clean.length === 0) { toast.error("No hay correos disponibles."); return; }
  const a = document.createElement("a");
  a.href = `mailto:?bcc=${encodeURIComponent(clean.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function openWhatsApp(phone: string, message: string) {
  const num = (phone || "").replace(/[^\d]/g, "");
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");
}

function DirectivosContent() {
  const [tab, setTab] = useState<DirTab>("panel");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Directivos</h2>
          <p className="text-sm text-muted-foreground">Gestión administrativa del plantel · Plan Institucional</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "panel" && <PanelView />}
      {tab === "personal" && <PersonalView />}
      {tab === "maestros" && <MaestrosView />}
      {tab === "eventos" && <EventosView />}
      {tab === "admin" && <AdminView />}
      {tab === "avisos" && <AvisosView />}
    </div>
  );
}

/* ════════════════════════ PANEL ════════════════════════ */
function PanelView() {
  const userId = useUserId();
  const [stats, setStats] = useState({ alumnos: 0, maestros: 0, grupos: 0, eventos: 0, ingresos: 0, egresos: 0 });
  const [porGrado, setPorGrado] = useState<{ grado: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const [al, ma, ev, fin] = await Promise.all([
          supabase.from("alumnos").select("grupo, grado, activo").eq("user_id", userId).eq("activo", true),
          supabase.from("directivos_maestros").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("activo", true),
          supabase.from("directivos_eventos").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("estado", "pendiente"),
          supabase.from("directivos_finanzas").select("tipo, monto").eq("user_id", userId),
        ]);
        const alumnos = al.data || [];
        const grupos = new Set(alumnos.map((a: any) => (a.grupo || "").trim()).filter(Boolean));
        const gradMap: Record<string, number> = {};
        alumnos.forEach((a: any) => {
          const g = (a.grado || (a.grupo || "").match(/^\d+°/)?.[0] || "—").trim();
          gradMap[g] = (gradMap[g] || 0) + 1;
        });
        const ingresos = (fin.data || []).filter((f: any) => f.tipo === "ingreso").reduce((s: number, f: any) => s + Number(f.monto || 0), 0);
        const egresos = (fin.data || []).filter((f: any) => f.tipo === "egreso").reduce((s: number, f: any) => s + Number(f.monto || 0), 0);
        setStats({ alumnos: alumnos.length, maestros: ma.count || 0, grupos: grupos.size, eventos: ev.count || 0, ingresos, egresos });
        setPorGrado(Object.entries(gradMap).sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true })).map(([grado, total]) => ({ grado, total })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  const cards = [
    { label: "Alumnos", value: stats.alumnos, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Maestros", value: stats.maestros, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Grupos", value: stats.grupos, icon: School, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
    { label: "Eventos pendientes", value: stats.eventos, icon: CalendarDays, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`rounded-2xl p-4 border border-border ${c.bg}`}>
              <Icon className={`w-5 h-5 mb-2 ${c.color}`} />
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Alumnos por grado</p>
          {porGrado.length === 0 ? <p className="text-xs text-muted-foreground">Aún no hay alumnos registrados.</p> : (
            <div className="space-y-2">
              {porGrado.map((g) => (
                <div key={g.grado} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-10">{g.grado}</span>
                  <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (g.total / Math.max(1, stats.alumnos)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{g.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Resumen económico (informativo)</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Ingresos</span><span className="font-semibold text-emerald-600">${stats.ingresos.toLocaleString("es-MX")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Egresos</span><span className="font-semibold text-red-600">${stats.egresos.toLocaleString("es-MX")}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="font-medium">Saldo</span><span className={`font-bold ${stats.ingresos - stats.egresos >= 0 ? "text-emerald-600" : "text-red-600"}`}>${(stats.ingresos - stats.egresos).toLocaleString("es-MX")}</span></div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Registra ingresos y egresos en la pestaña Administración.</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ PERSONAL ════════════════════════ */
function PersonalView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ rol: ROLES[0], nombre: "", telefono: "", email: "", funcion: "" });
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("directivos_personal").select("*").eq("user_id", userId).eq("activo", true).order("creado_en", { ascending: true });
    setItems(data || []); setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    if (!form.nombre.trim()) { toast.error("Escribe el nombre."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_personal").insert({ user_id: userId, ...form, nombre: form.nombre.trim() });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Personal agregado."); setForm({ rol: ROLES[0], nombre: "", telefono: "", email: "", funcion: "" }); cargar();
  };
  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await supabase.from("directivos_personal").delete().eq("id", id); cargar();
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Agregar personal del plantel</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono (WhatsApp)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Correo" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.funcion} onChange={(e) => setForm({ ...form, funcion: e.target.value })} placeholder="Función / notas (opcional)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none sm:col-span-2" />
        </div>
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar</Button>
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aún no hay personal registrado.</p> : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0"><UserCog className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.nombre} <span className="text-xs font-normal text-primary">· {p.rol}</span></p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.funcion ? `${p.funcion} · ` : ""}{p.telefono || "sin tel"} · {p.email || "sin correo"}</p>
                </div>
                {p.telefono && <button onClick={() => openWhatsApp(p.telefono, `Hola ${p.nombre}`)} className="p-2 rounded-lg hover:bg-green-50 text-green-600"><Smartphone className="w-4 h-4" /></button>}
                <button onClick={() => eliminar(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ════════════════════════ MAESTROS ════════════════════════ */
function MaestrosView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nombre: "", grupos: "", telefono: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState("");

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("directivos_maestros").select("*").eq("user_id", userId).eq("activo", true).order("nombre", { ascending: true });
    setItems(data || []); setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    if (!form.nombre.trim()) { toast.error("Escribe el nombre del maestro."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_maestros").insert({ user_id: userId, ...form, nombre: form.nombre.trim() });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Maestro agregado."); setForm({ nombre: "", grupos: "", telefono: "", email: "" }); cargar();
  };
  const eliminar = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("directivos_maestros").delete().eq("id", id); cargar(); };

  const correoATodos = () => {
    if (!avisoMsg.trim()) { toast.error("Escribe el aviso primero."); return; }
    openEmailMultiple(items.map((m) => m.email).filter(Boolean), "Aviso de Dirección", avisoMsg.trim());
  };
  const whatsappATodos = () => {
    if (!avisoMsg.trim()) { toast.error("Escribe el aviso primero."); return; }
    const conTel = items.filter((m) => m.telefono);
    if (conTel.length === 0) { toast.error("Ningún maestro tiene teléfono."); return; }
    conTel.forEach((m) => openWhatsApp(m.telefono, `Hola ${m.nombre}: ${avisoMsg.trim()}`));
    toast.success(`Abriendo WhatsApp para ${conTel.length} maestro(s).`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Registrar maestro</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del maestro(a)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.grupos} onChange={(e) => setForm({ ...form, grupos: e.target.value })} placeholder="Grupos (ej. 1°A, 2°B)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Teléfono (WhatsApp)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Correo" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
        </div>
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar maestro</Button>
      </div>

      {items.length > 0 && (
        <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-900 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Send className="w-4 h-4 text-green-600" /> Aviso a los maestros</p>
          <textarea value={avisoMsg} onChange={(e) => setAvisoMsg(e.target.value)} rows={2} placeholder="Escribe un aviso para todos los maestros…" className="w-full bg-card rounded-xl px-3 py-2 text-sm border border-border outline-none resize-none" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={whatsappATodos}><Smartphone className="w-4 h-4" /> WhatsApp a todos</Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={correoATodos}><Mail className="w-4 h-4" /> Correo a todos</Button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Aún no hay maestros registrados.</p> : (
          <div className="space-y-2">
            {items.map((m) => (
              <div key={m.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{m.nombre}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.grupos ? `Grupos: ${m.grupos} · ` : ""}{m.telefono || "sin tel"} · {m.email || "sin correo"}</p>
                </div>
                {m.telefono && <button onClick={() => openWhatsApp(m.telefono, `Hola ${m.nombre}`)} className="p-2 rounded-lg hover:bg-green-50 text-green-600"><Smartphone className="w-4 h-4" /></button>}
                <button onClick={() => eliminar(m.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ════════════════════════ EVENTOS ════════════════════════ */
function EventosView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: "", fecha: "", responsable: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("directivos_eventos").select("*").eq("user_id", userId).order("fecha", { ascending: true });
    setItems(data || []); setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    if (!form.titulo.trim()) { toast.error("Escribe el título del evento."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_eventos").insert({ user_id: userId, titulo: form.titulo.trim(), fecha: form.fecha || null, responsable: form.responsable, notas: form.notas, estado: "pendiente" });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Evento agregado."); setForm({ titulo: "", fecha: "", responsable: "", notas: "" }); cargar();
  };
  const toggleEstado = async (ev: any) => { await supabase.from("directivos_eventos").update({ estado: ev.estado === "listo" ? "pendiente" : "listo" }).eq("id", ev.id); cargar(); };
  const eliminar = async (id: string) => { if (!confirm("¿Eliminar evento?")) return; await supabase.from("directivos_eventos").delete().eq("id", id); cargar(); };

  const fmt = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "sin fecha";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Nuevo evento por organizar</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título (ej. Junta de Consejo Técnico)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Responsable" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
        </div>
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar evento</Button>
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No hay eventos registrados.</p> : (
          <div className="space-y-2">
            {items.map((ev) => (
              <div key={ev.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <button onClick={() => toggleEstado(ev)} className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ev.estado === "listo" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`} title={ev.estado === "listo" ? "Marcar pendiente" : "Marcar listo"}>
                  {ev.estado === "listo" ? <CheckCircle2 className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${ev.estado === "listo" ? "line-through text-muted-foreground" : ""}`}>{ev.titulo}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{fmt(ev.fecha)}{ev.responsable ? ` · ${ev.responsable}` : ""}{ev.notas ? ` · ${ev.notas}` : ""}</p>
                </div>
                <button onClick={() => eliminar(ev.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ════════════════════════ ADMINISTRACIÓN ════════════════════════ */
function AdminView() {
  const [sub, setSub] = useState<"inventario" | "finanzas">("inventario");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSub("inventario")} className={`px-3 py-1.5 rounded-lg text-sm ${sub === "inventario" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Materiales e instalaciones</button>
        <button onClick={() => setSub("finanzas")} className={`px-3 py-1.5 rounded-lg text-sm ${sub === "finanzas" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Económico</button>
      </div>
      {sub === "inventario" ? <InventarioView /> : <FinanzasView />}
    </div>
  );
}

function InventarioView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tipo: "material", nombre: "", cantidad: "1", estado: "bueno", notas: "" });
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("directivos_inventario").select("*").eq("user_id", userId).order("creado_en", { ascending: false });
    setItems(data || []); setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const agregar = async () => {
    if (!form.nombre.trim()) { toast.error("Escribe el nombre."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_inventario").insert({ user_id: userId, tipo: form.tipo, nombre: form.nombre.trim(), cantidad: parseInt(form.cantidad) || 1, estado: form.estado, notas: form.notas });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Registrado."); setForm({ tipo: "material", nombre: "", cantidad: "1", estado: "bueno", notas: "" }); cargar();
  };
  const eliminar = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("directivos_inventario").delete().eq("id", id); cargar(); };

  const estadoColor = (e: string) => e === "bueno" ? "text-emerald-600 bg-emerald-50" : e === "regular" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-primary" /> Agregar material o instalación</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none">
            <option value="material">Material</option>
            <option value="instalacion">Instalación</option>
          </select>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre (ej. Proyectores / Baños)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input type="number" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="Cantidad" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none">
            <option value="bueno">Estado: Bueno</option>
            <option value="regular">Estado: Regular</option>
            <option value="malo">Estado: Malo</option>
          </select>
          <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none sm:col-span-2" />
        </div>
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Agregar</Button>
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin registros de inventario.</p> : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">{it.tipo === "instalacion" ? <School className="w-5 h-5 text-violet-600" /> : <Boxes className="w-5 h-5 text-blue-600" />}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.nombre} <span className="text-xs font-normal text-muted-foreground">×{it.cantidad}</span></p>
                  <p className="text-[11px] text-muted-foreground truncate">{it.tipo === "instalacion" ? "Instalación" : "Material"}{it.notas ? ` · ${it.notas}` : ""}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${estadoColor(it.estado)}`}>{it.estado}</span>
                <button onClick={() => eliminar(it.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function FinanzasView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tipo: "ingreso", concepto: "", monto: "", fecha: "", notas: "" });
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("directivos_finanzas").select("*").eq("user_id", userId).order("fecha", { ascending: false });
    setItems(data || []); setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const ingresos = items.filter((f) => f.tipo === "ingreso").reduce((s, f) => s + Number(f.monto || 0), 0);
  const egresos = items.filter((f) => f.tipo === "egreso").reduce((s, f) => s + Number(f.monto || 0), 0);

  const agregar = async () => {
    if (!form.concepto.trim()) { toast.error("Escribe el concepto."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_finanzas").insert({ user_id: userId, tipo: form.tipo, concepto: form.concepto.trim(), monto: parseFloat(form.monto) || 0, fecha: form.fecha || null, notas: form.notas });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Registrado."); setForm({ tipo: "ingreso", concepto: "", monto: "", fecha: "", notas: "" }); cargar();
  };
  const eliminar = async (id: string) => { if (!confirm("¿Eliminar?")) return; await supabase.from("directivos_finanzas").delete().eq("id", id); cargar(); };
  const fmt = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center"><p className="text-[11px] text-muted-foreground">Ingresos</p><p className="text-lg font-bold text-emerald-600">${ingresos.toLocaleString("es-MX")}</p></div>
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-center"><p className="text-[11px] text-muted-foreground">Egresos</p><p className="text-lg font-bold text-red-600">${egresos.toLocaleString("es-MX")}</p></div>
        <div className="bg-muted rounded-xl p-3 text-center"><p className="text-[11px] text-muted-foreground">Saldo</p><p className={`text-lg font-bold ${ingresos - egresos >= 0 ? "text-emerald-600" : "text-red-600"}`}>${(ingresos - egresos).toLocaleString("es-MX")}</p></div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Registrar movimiento</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none">
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </select>
          <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} placeholder="Concepto (ej. Cooperación)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input type="number" min="0" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} placeholder="Monto $" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
          <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas (opcional)" className="bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none sm:col-span-2" />
        </div>
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Registrar</Button>
        <p className="text-[10px] text-muted-foreground">Este apartado es informativo (control interno). No procesa pagos reales.</p>
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados.</p> : (
          <div className="space-y-2">
            {items.map((f) => (
              <div key={f.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.tipo === "ingreso" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}><DollarSign className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{f.concepto}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{fmt(f.fecha)}{f.notas ? ` · ${f.notas}` : ""}</p>
                </div>
                <span className={`text-sm font-bold ${f.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"}`}>{f.tipo === "ingreso" ? "+" : "−"}${Number(f.monto).toLocaleString("es-MX")}</span>
                <button onClick={() => eliminar(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ════════════════════════ AVISOS INTERNOS ════════════════════════ */
function AvisosView() {
  const userId = useUserId();
  const [items, setItems] = useState<any[]>([]);
  const [maestros, setMaestros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo: "", mensaje: "" });
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [{ data: avisos }, { data: maes }] = await Promise.all([
      supabase.from("directivos_avisos").select("*").eq("user_id", userId).order("creado_en", { ascending: false }),
      supabase.from("directivos_maestros").select("*").eq("user_id", userId).eq("activo", true),
    ]);
    setItems(avisos || []);
    setMaestros(maes || []);
    setLoading(false);
  }, [userId]);
  useEffect(() => { cargar(); }, [cargar]);

  const textoAviso = (a: any) => a.mensaje ? `📢 ${a.titulo}\n\n${a.mensaje}` : `📢 ${a.titulo}`;

  const enviarWhatsApp = (a: any) => {
    const conTel = maestros.filter((m) => m.telefono);
    if (conTel.length === 0) { toast.error("No hay maestros con teléfono registrados (pestaña Maestros)."); return; }
    conTel.forEach((m) => openWhatsApp(m.telefono, `Hola ${m.nombre}: ${textoAviso(a)}`));
    toast.success(`Abriendo WhatsApp para ${conTel.length} maestro(s).`);
  };
  const enviarCorreo = (a: any) => {
    const emails = maestros.map((m) => m.email).filter(Boolean);
    if (emails.length === 0) { toast.error("No hay maestros con correo registrados (pestaña Maestros)."); return; }
    openEmailMultiple(emails, `Aviso de Dirección: ${a.titulo}`, textoAviso(a));
  };

  const agregar = async () => {
    if (!form.titulo.trim()) { toast.error("Escribe el título del aviso."); return; }
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("directivos_avisos").insert({ user_id: userId, titulo: form.titulo.trim(), mensaje: form.mensaje });
    setSaving(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Directivos en Supabase." : error.message); return; }
    toast.success("Aviso publicado."); setForm({ titulo: "", mensaje: "" }); cargar();
  };
  const eliminar = async (id: string) => { if (!confirm("¿Eliminar aviso?")) return; await supabase.from("directivos_avisos").delete().eq("id", id); cargar(); };
  const fmt = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Nuevo aviso interno (para maestros)</p>
        <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título del aviso" className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none" />
        <textarea value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} rows={3} placeholder="Mensaje…" className="w-full bg-muted rounded-xl px-3 py-2 text-sm border border-border outline-none resize-none" />
        <Button onClick={agregar} disabled={saving} className="gap-2">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Publicar aviso</Button>
        <p className="text-[11px] text-muted-foreground">Al publicar, el aviso queda en el tablero. Para que <b>llegue</b> a los maestros, usa los botones de <b>WhatsApp</b> o <b>Correo</b> en cada aviso (usa los maestros de la pestaña Maestros).</p>
      </div>

      {loading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> :
        items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No hay avisos internos.</p> : (
          <div className="space-y-2">
            {items.map((a) => (
              <div key={a.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">{fmt(a.creado_en)}</p>
                  </div>
                  <button onClick={() => eliminar(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
                </div>
                {a.mensaje && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{a.mensaje}</p>}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => enviarWhatsApp(a)}>
                    <Smartphone className="w-4 h-4" /> WhatsApp a maestros
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => enviarCorreo(a)}>
                    <Mail className="w-4 h-4" /> Correo a maestros
                  </Button>
                  <span className="text-[11px] text-muted-foreground self-center">{maestros.length} maestro(s) registrado(s)</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
