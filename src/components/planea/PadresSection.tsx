"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bell, MessageSquare, Plus, CheckCircle2, Loader2, Users,
  Megaphone, BookOpen, Trash2, X, Search, Phone, Mail,
  Smartphone, UserPlus, Hash, Eye, Pencil,
  RefreshCw, Info, CloudOff, Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  store, useStoreItem, GRUPOS, formatDate, timeAgo,
  type TabId, type AvisoTipo, type TareaEstado, type Aviso,
  type TareaDigital, type Mensaje, type Padre, type Alumno,
} from "./planeadocente-store";

/* ═════════════════════ CONSTANTES ═════════════════════ */

const TABS = [
  { id: "avisos" as TabId, label: "Avisos", icon: Megaphone },
  { id: "tareas" as TabId, label: "Tareas Digitales", icon: BookOpen },
  { id: "mensajes" as TabId, label: "Mensajes", icon: MessageSquare },
  { id: "padres" as TabId, label: "Padres de Familia", icon: Users },
];

function getTipoBadge(tipo: AvisoTipo) {
  const map: Record<AvisoTipo, { label: string; className: string }> = {
    aviso: { label: "Aviso", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200" },
    tarea: { label: "Tarea", className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border-amber-200" },
    evento: { label: "Evento", className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border-purple-200" },
    urgente: { label: "Urgente", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200" },
  };
  return map[tipo] ?? map.aviso;
}

function getEstadoBadge(estado: TareaEstado) {
  const map: Record<TareaEstado, { label: string; className: string }> = {
    pendiente: { label: "Pendiente", className: "bg-gray-100 text-gray-700 border-gray-200" },
    enviada: { label: "Enviada", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    vencida: { label: "Vencida", className: "bg-red-100 text-red-700 border-red-200" },
  };
  return map[estado];
}

/* ─── AUTH HOOK ─── */

function useAuthUser(): string | null {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  return userId;
}

/* ─── HELPERS COMUNICACIÓN ─── */

function openWhatsApp(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "");
  if (!clean) { toast.error("Teléfono inválido"); return; }
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function openEmail(email: string, subject: string, body: string) {
  if (!email || !email.includes("@")) { toast.error("Email inválido"); return; }
  const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openEmailMultiple(emails: string[], subject: string, body: string) {
  const validos = emails.filter((e) => e && e.includes("@"));
  if (validos.length === 0) { toast.error("No hay correos válidos entre los padres."); return; }
  const url = `mailto:?bcc=${encodeURIComponent(validos.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function EnviarAPadresModal({ grupo, asunto, cuerpo, userId, onClose }: {
  grupo: string; asunto: string; cuerpo: string; userId: string | null; onClose: () => void;
}) {
  const [padres, setPadres] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase.from("padres")
        .select("id, nombre, telefono, email, nombre_hijo, activo, grupo")
        .eq("user_id", userId);
      const objetivo = normGrupo(grupo);
      const todosActivos = (data || []).filter((p: any) => p.activo !== false);
      setTodos(todosActivos);
      const activos = todosActivos.filter((p: any) => normGrupo(p.grupo) === objetivo);
      setPadres(activos);
      const all: Record<string, boolean> = {};
      activos.forEach((p: any) => { all[p.id] = true; });
      setSel(all);
      setLoading(false);
    };
    load();
  }, [userId, grupo]);

  const seleccionados = padres.filter((p) => sel[p.id]);
  const todosSel = padres.length > 0 && seleccionados.length === padres.length;
  const toggle = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const toggleTodos = () => {
    const v = !todosSel;
    const n: Record<string, boolean> = {};
    padres.forEach((p) => { n[p.id] = v; });
    setSel(n);
  };

  const correoASeleccionados = () => {
    const emails = seleccionados.map((p) => p.email).filter(Boolean);
    if (emails.length === 0) { toast.error("Los padres seleccionados no tienen correo."); return; }
    openEmailMultiple(emails, asunto, cuerpo);
    toast.success(`Abriendo correo para ${emails.length} padre(s).`);
  };

  const whatsappASeleccionados = () => {
    const conTel = seleccionados.filter((p) => p.telefono);
    if (conTel.length === 0) { toast.error("Los padres seleccionados no tienen teléfono."); return; }
    conTel.forEach((p) => openWhatsApp(p.telefono, `Hola ${p.nombre}: ${cuerpo}`));
    toast.success(`Abriendo WhatsApp para ${conTel.length} padre(s). Si el navegador bloquea ventanas, toca "permitir".`);
  };

  return (
    <ModalWrapper title="Enviar a padres de familia" icon={Send} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">Grupo <b>{grupo}</b>{asunto ? <> · asunto: <b>{asunto}</b></> : null}</div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : padres.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>No hay padres activos registrados en <b>{grupo}</b>.</p>
            {todos.length > 0 && (
              <p>Sí tienes padres registrados en: <b>{Array.from(new Set(todos.map((p) => p.grupo))).join(", ")}</b>. Verifica que el grupo del aviso/mensaje coincida con el de esos padres, o registra padres en {grupo} desde la pestaña Padres de Familia.</p>
            )}
            {todos.length === 0 && <p>Aún no tienes padres registrados. Agrégalos en la pestaña Padres de Familia.</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button onClick={toggleTodos} className="text-xs font-medium text-primary">{todosSel ? "Quitar todos" : "Seleccionar todos"}</button>
              <span className="text-xs text-muted-foreground">{seleccionados.length} de {padres.length} seleccionados</span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
              {padres.map((p) => (
                <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50">
                  <input type="checkbox" checked={!!sel[p.id]} onChange={() => toggle(p.id)} className="w-4 h-4 accent-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombre}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.nombre_hijo ? `Hijo/a: ${p.nombre_hijo} · ` : ""}{p.telefono || "sin tel"} · {p.email || "sin correo"}
                    </p>
                  </div>
                  <button onClick={() => p.telefono ? openWhatsApp(p.telefono, cuerpo) : toast.error("Sin teléfono")} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50" title="WhatsApp a este padre"><Smartphone className="w-4 h-4" /></button>
                  <button onClick={() => p.email ? openEmail(p.email, asunto, cuerpo) : toast.error("Sin correo")} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-blue-600 hover:bg-blue-50" title="Correo a este padre"><Mail className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5">
              <p className="text-[11px] text-blue-700 dark:text-blue-300">El <b>correo</b> se envía a todos los seleccionados de una vez (copia oculta). El <b>WhatsApp</b> se abre uno por uno (WhatsApp web no permite envío masivo).</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={whatsappASeleccionados} disabled={seleccionados.length === 0}>
                  <Smartphone className="w-4 h-4" /> WhatsApp a seleccionados
                </Button>
                <Button className="flex-1 gap-2" onClick={correoASeleccionados} disabled={seleccionados.length === 0}>
                  <Mail className="w-4 h-4" /> Correo a seleccionados
                </Button>
              </div>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </div>
    </ModalWrapper>
  );
}

function normGrupo(s: string): string {
  return (s || "")
    .replace(/[º°]/g, "°")   // unifica símbolo de grado (U+00BA y U+00B0)
    .replace(/\s+/g, "")      // quita TODOS los espacios
    .toUpperCase()
    .trim();
}

function useGruposReales(): string[] {
  const userId = useAuthUser();
  const [grupos, setGrupos] = useState<string[]>(GRUPOS);
  useEffect(() => {
    if (!userId) return;
    supabase.from("alumnos").select("grupo").eq("user_id", userId).eq("activo", true)
      .then(({ data }) => {
        // Dedupe por forma normalizada, conservando la primera variante vista
        const vistos = new Set<string>();
        const lista: string[] = [];
        (data || []).forEach((a: any) => {
          const g = (a.grupo || "").trim();
          if (!g) return;
          const key = normGrupo(g);
          if (!vistos.has(key)) { vistos.add(key); lista.push(g); }
        });
        lista.sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
        if (lista.length > 0) setGrupos(lista);
      });
  }, [userId]);
  return grupos;
}

/* ═════════════════════ COMPONENTE PRINCIPAL ═════════════════════ */

export default function PadresSection() {
  const [activeTab, setActiveTab] = useState<TabId>("avisos");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TabId>("avisos");

  const openModal = (type: TabId) => {
    setModalType(type);
    setShowModal(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        <Button size="sm" className="gap-2" onClick={() => openModal(activeTab)}>
          <Plus className="w-4 h-4" /> Nuevo
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "avisos" && <AvisosView />}
          {activeTab === "tareas" && <TareasDigitalesView />}
          {activeTab === "mensajes" && <MensajesView />}
          {activeTab === "padres" && <PadresView />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <DynamicModal
            type={modalType}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═════════════════════ AVISOS (SUPABASE) ═════════════════════ */

function AvisosView() {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [avisos, setAvisos] = useStoreItem(store.avisos);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviarAviso, setEnviarAviso] = useState<Aviso | null>(null);

  // Cargar desde Supabase
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("avisos")
        .select("*")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false });
      if (!cancelled) {
        if (data) {
          setAvisos(data as Aviso[]);
        }
        if (error) toast.error("Error cargando avisos: " + error.message);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const filtered = avisos.filter((a) => {
    const matchSearch = a.titulo.toLowerCase().includes(search.toLowerCase()) || a.mensaje.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || normGrupo(a.grupo) === normGrupo(grupoFilter);
    return matchSearch && matchGrupo;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este aviso?")) return;
    if (userId) {
      const { error } = await supabase.from("avisos").delete().eq("id", id).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    }
    setAvisos((prev) => prev.filter((a) => a.id !== id));
    toast.success("Aviso eliminado.");
  };

  const handleSendWhatsApp = async (aviso: Aviso) => {
    if (!userId) { toast.error("Inicia sesión."); return; }
    const { data: padres } = await supabase.from("padres").select("*").eq("user_id", userId).eq("grupo", aviso.grupo);
    if (!padres?.length) { toast.error("No hay padres registrados en este grupo."); return; }
    const msg = `📢 *${aviso.titulo}*\n\n${aviso.mensaje}\n\n_Fecha: ${formatDate(aviso.fecha)}_\n_Enviado desde PlaneaDocente_`;
    padres.forEach((p) => openWhatsApp(p.telefono, msg));
    if (userId) {
      await supabase.from("avisos").update({ enviado_whatsapp: true }).eq("id", aviso.id).eq("user_id", userId);
    }
    setAvisos((prev) => prev.map((a) => a.id === aviso.id ? { ...a, enviado_whatsapp: true } : a));
    toast.success(`Mensaje enviado a ${padres.length} padres por WhatsApp.`);
  };

  const handleSendEmail = async (aviso: Aviso) => {
    if (!userId) { toast.error("Inicia sesión."); return; }
    const { data: padres } = await supabase.from("padres").select("*").eq("user_id", userId).eq("grupo", aviso.grupo);
    if (!padres?.length) { toast.error("No hay padres registrados en este grupo."); return; }
    const subject = `📢 ${aviso.titulo}`;
    const body = `${aviso.mensaje}\n\nFecha: ${formatDate(aviso.fecha)}\nEnviado desde PlaneaDocente`;
    padres.forEach((p) => openEmail(p.email, subject, body));
    if (userId) {
      await supabase.from("avisos").update({ enviado_email: true }).eq("id", aviso.id).eq("user_id", userId);
    }
    setAvisos((prev) => prev.map((a) => a.id === aviso.id ? { ...a, enviado_email: true } : a));
    toast.success(`Correo enviado a ${padres.length} padres.`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando avisos desde la nube...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6" />
          <h3 className="font-bold text-lg">Sistema de Avisos a Padres</h3>
        </div>
        <p className="text-white/80 text-sm">Envía avisos instantáneos a todos los padres de familia del grupo por WhatsApp o correo.</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar avisos..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
        </div>
        <select value={grupoFilter} onChange={(e) => setGrupoFilter(e.target.value)} className="bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary">
          <option value="">Todos los grupos</option>
          {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay avisos que coincidan con tu búsqueda.</p>
          </div>
        )}
        {filtered.map((a, i) => {
          const tipo = getTipoBadge(a.tipo);
          const pct = Math.round((a.leidos / a.total) * 100);
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold">{a.titulo}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${tipo.className}`}>{tipo.label}</span>
                    <span className="text-xs text-muted-foreground">{a.grupo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{formatDate(a.fecha)}</p>
                  <p className="text-sm text-foreground line-clamp-2">{a.mensaje}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <Eye className="w-3 h-3" />
                    <span>{a.leidos}/{a.total} leídos</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEnviarAviso(a)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Enviar a padres del grupo">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                <motion.div className="bg-emerald-500 h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {enviarAviso && (
        <EnviarAPadresModal
          grupo={enviarAviso.grupo}
          asunto={`📢 ${enviarAviso.titulo}`}
          cuerpo={`${enviarAviso.titulo}\n\n${enviarAviso.mensaje}\n\nFecha: ${formatDate(enviarAviso.fecha)}\nEnviado desde PlaneaDocente`}
          userId={userId}
          onClose={() => setEnviarAviso(null)}
        />
      )}
    </div>
  );
}

/* ═════════════════════ TAREAS DIGITALES (SUPABASE) ═════════════════════ */

function TareasDigitalesView() {
  const userId = useAuthUser();
  const [tareas, setTareas] = useStoreItem(store.tareas);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviarTarea, setEnviarTarea] = useState<TareaDigital | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("tareas_digitales")
        .select("*")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false });
      if (!cancelled) {
        if (data) setTareas(data as TareaDigital[]);
        if (error) toast.error("Error cargando tareas: " + error.message);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const filtered = tareas.filter((t) => t.titulo.toLowerCase().includes(search.toLowerCase()) || t.materia.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    if (userId) {
      const { error } = await supabase.from("tareas_digitales").delete().eq("id", id).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    }
    setTareas((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarea eliminada.");
  };

  const handleSendWhatsApp = async (tarea: TareaDigital) => {
    if (!userId) { toast.error("Inicia sesión."); return; }
    const { data: padres } = await supabase.from("padres").select("*").eq("user_id", userId).eq("grupo", tarea.grupo);
    if (!padres?.length) { toast.error("No hay padres registrados en este grupo."); return; }
    const msg = `📚 *Nueva Tarea: ${tarea.titulo}*\n\nMateria: ${tarea.materia}\n${tarea.descripcion}\n\n📅 Entrega: ${formatDate(tarea.fecha_entrega)}\n_Enviado desde PlaneaDocente_`;
    padres.forEach((p) => openWhatsApp(p.telefono, msg));
    await supabase.from("tareas_digitales").update({ enviadas: padres.length, estado: "enviada" }).eq("id", tarea.id).eq("user_id", userId);
    setTareas((prev) => prev.map((t) => t.id === tarea.id ? { ...t, enviadas: padres.length, estado: "enviada" } : t));
    toast.success(`Tarea enviada a ${padres.length} padres por WhatsApp.`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando tareas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar tareas..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay tareas registradas.</p>
          </div>
        )}
        {filtered.map((t, i) => {
          const estado = getEstadoBadge(t.estado);
          const pct = Math.round((t.enviadas / t.total) * 100);
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-semibold">{t.titulo}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${estado.className}`}>{estado.label}</span>
                    <span className="text-xs text-muted-foreground">{t.grupo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{t.materia} · Entrega: {formatDate(t.fecha_entrega)}</p>
                  <p className="text-sm text-foreground">{t.descripcion}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{t.enviadas}/{t.total}</p>
                    <p className="text-xs text-muted-foreground">enviadas</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEnviarTarea(t)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Enviar a padres del grupo">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                <motion.div className="bg-primary h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {enviarTarea && (
        <EnviarAPadresModal
          grupo={enviarTarea.grupo}
          asunto={`📚 Nueva tarea: ${enviarTarea.titulo}`}
          cuerpo={`📚 Nueva tarea: ${enviarTarea.titulo}\n\nMateria: ${enviarTarea.materia}\n${enviarTarea.descripcion}\n\n📅 Entrega: ${formatDate(enviarTarea.fecha_entrega)}\nEnviado desde PlaneaDocente`}
          userId={userId}
          onClose={() => setEnviarTarea(null)}
        />
      )}
    </div>
  );
}

/* ═════════════════════ MENSAJES (SUPABASE + REALTIME) ═════════════════════ */

function MensajesView() {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [mensajes, setMensajes] = useStoreItem(store.mensajes);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("3°A");

  useEffect(() => {
    if (gruposReales.length > 0 && !gruposReales.includes(grupoSeleccionado)) {
      setGrupoSeleccionado(gruposReales[0]);
    }
  }, [gruposReales, grupoSeleccionado]);
  const [newMsg, setNewMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [padresGrupo, setPadresGrupo] = useState<any[]>([]);
  const [msgPadres, setMsgPadres] = useState("");
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  useEffect(() => {
    const cargarPadres = async () => {
      if (!userId || !grupoSeleccionado) { setPadresGrupo([]); return; }
      const { data } = await supabase
        .from("padres")
        .select("id, nombre, telefono, email, nombre_hijo, activo, grupo")
        .eq("user_id", userId);
      const objetivo = normGrupo(grupoSeleccionado);
      setPadresGrupo((data || []).filter((p: any) => p.activo !== false && normGrupo(p.grupo) === objetivo));
    };
    cargarPadres();
  }, [userId, grupoSeleccionado]);

  // Cargar mensajes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("user_id", userId)
        .eq("grupo_id", grupoSeleccionado)
        .order("creado_en", { ascending: true });
      if (!cancelled) {
        if (data) setMensajes(data as Mensaje[]);
        if (error) toast.error("Error cargando mensajes: " + error.message);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, grupoSeleccionado]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`mensajes-${grupoSeleccionado}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensajes",
        filter: `grupo_id=eq.${grupoSeleccionado}`,
      }, (payload) => {
        const nuevo = payload.new as Mensaje;
        if ((nuevo as any).user_id === userId) {
          setMensajes((prev) => [...prev, nuevo]);
          if (nuevo.remitente === "padre") {
            toast.info(`Nuevo mensaje de ${nuevo.nombre_remitente}`, { duration: 4000 });
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [grupoSeleccionado, userId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes, grupoSeleccionado]);

  const filtered = mensajes.filter((m) => m.grupo_id === grupoSeleccionado);
  const noLeidos = filtered.filter((m) => !m.leido && m.remitente === "padre").length;

  const enviarMensaje = async () => {
    if (!newMsg.trim() || !userId) return;
    setEnviando(true);
    const msg: Omit<Mensaje, "id"> = {
      texto: newMsg.trim(),
      remitente: "maestro",
      nombre_remitente: "Maestro",
      grupo_id: grupoSeleccionado,
      leido: true,
      creado_en: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("mensajes").insert({ ...msg, user_id: userId }).select().maybeSingle();
    if (error) {
      toast.error("Error enviando: " + error.message);
      setEnviando(false);
      return;
    }
    if (data) setMensajes((prev) => [...prev, data as Mensaje]);
    setNewMsg("");
    setEnviando(false);
    toast.success("Mensaje enviado.");
  };

  const marcarLeido = async (id: string) => {
    if (!userId) return;
    await supabase.from("mensajes").update({ leido: true }).eq("id", id).eq("user_id", userId);
    setMensajes((prev) => prev.map((m) => m.id === id ? { ...m, leido: true } : m));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando mensajes...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <select value={grupoSeleccionado} onChange={(e) => setGrupoSeleccionado(e.target.value)} className="bg-transparent text-sm font-medium outline-none">
            {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {noLeidos > 0 && <Badge variant="destructive" className="text-xs">{noLeidos} nuevo{noLeidos > 1 ? "s" : ""}</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{padresGrupo.length} padre{padresGrupo.length === 1 ? "" : "s"} registrado{padresGrupo.length === 1 ? "" : "s"} en {grupoSeleccionado}</span>
        </div>
      </div>

      {/* Enviar el mensaje a los padres registrados del grupo */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-500" /> Enviar a padres de {grupoSeleccionado}
        </p>
        {padresGrupo.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No hay padres registrados en este grupo. Agrégalos en la pestaña <span className="font-medium">Padres de Familia</span> para poder enviarles mensajes.
          </p>
        ) : (
          <>
            <textarea
              value={msgPadres}
              onChange={(e) => setMsgPadres(e.target.value)}
              placeholder="Escribe aquí el mensaje para los padres…"
              rows={3}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-2 text-green-700 border-green-300"
                onClick={() => {
                  if (!msgPadres.trim()) { toast.error("Escribe el mensaje primero."); return; }
                  const conTel = padresGrupo.filter((p) => p.telefono);
                  if (conTel.length === 0) { toast.error("Ningún padre del grupo tiene teléfono."); return; }
                  conTel.forEach((p) => openWhatsApp(p.telefono, `Hola ${p.nombre}: ${msgPadres.trim()}`));
                  toast.success(`Abriendo WhatsApp para ${conTel.length} padre(s). Permite las ventanas si el navegador las bloquea.`);
                }}>
                <Smartphone className="w-4 h-4" /> WhatsApp a todos ({padresGrupo.filter((p) => p.telefono).length})
              </Button>
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => {
                  if (!msgPadres.trim()) { toast.error("Escribe el mensaje primero."); return; }
                  openEmailMultiple(padresGrupo.map((p) => p.email), `Mensaje del maestro — ${grupoSeleccionado}`, msgPadres.trim());
                }}>
                <Mail className="w-4 h-4" /> Correo a todos ({padresGrupo.filter((p) => p.email).length})
              </Button>
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => {
                  if (!msgPadres.trim()) { toast.error("Escribe el mensaje primero."); return; }
                  setSelectorAbierto(true);
                }}>
                <Users className="w-4 h-4" /> Elegir destinatarios…
              </Button>
              <span className="text-[11px] text-muted-foreground self-center">· o envía individual abajo (WhatsApp es uno por uno)</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {padresGrupo.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 bg-muted/40 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombre}</p>
                    {p.nombre_hijo && <p className="text-[11px] text-muted-foreground truncate">Hijo/a: {p.nombre_hijo}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (!msgPadres.trim()) { toast.error("Escribe el mensaje primero."); return; }
                        if (!p.telefono) { toast.error("Este padre no tiene teléfono."); return; }
                        openWhatsApp(p.telefono, `Hola ${p.nombre}: ${msgPadres.trim()}`);
                      }}
                      className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50" title="Enviar por WhatsApp">
                      <Smartphone className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (!msgPadres.trim()) { toast.error("Escribe el mensaje primero."); return; }
                        if (!p.email) { toast.error("Este padre no tiene correo."); return; }
                        openEmail(p.email, `Mensaje del maestro — ${grupoSeleccionado}`, `Estimado/a ${p.nombre}:\n\n${msgPadres.trim()}`);
                      }}
                      className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-blue-600 hover:bg-blue-50" title="Enviar por correo">
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-cyan-500" />
            Mensajes del Grupo {grupoSeleccionado}
          </h3>
          <span className="text-xs text-muted-foreground">{filtered.length} mensajes</span>
        </div>

        <div ref={scrollRef} className="divide-y divide-border max-h-[400px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay mensajes en este grupo.</p>
              <p className="text-xs">Sé el primero en enviar uno.</p>
            </div>
          )}
          {filtered.map((m) => {
            const isMaestro = m.remitente === "maestro";
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl mb-2 ${isMaestro ? "bg-primary/5 ml-8" : "bg-muted/50 mr-8"}`} onClick={() => !m.leido && m.remitente === "padre" && marcarLeido(m.id)}>
                <div className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMaestro ? "bg-primary text-primary-foreground" : "bg-cyan-100 text-cyan-700"}`}>
                    {isMaestro ? "M" : m.nombre_remitente?.[0] || "P"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{isMaestro ? "Tú" : m.nombre_remitente}</span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(m.creado_en)}</span>
                      {!m.leido && m.remitente === "padre" && <span className="w-2 h-2 bg-red-500 rounded-full" title="No leído" />}
                    </div>
                    <p className="text-sm text-foreground mt-0.5">{m.texto}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && enviarMensaje()} placeholder="Escribe un mensaje para los padres..." className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
            <Button size="sm" className="gap-2" onClick={enviarMensaje} disabled={enviando || !newMsg.trim()}>
              <Send className="w-4 h-4" />
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </div>

      {selectorAbierto && (
        <EnviarAPadresModal
          grupo={grupoSeleccionado}
          asunto={`Mensaje del maestro — ${grupoSeleccionado}`}
          cuerpo={msgPadres.trim()}
          userId={userId}
          onClose={() => setSelectorAbierto(false)}
        />
      )}
    </div>
  );
}

/* ═════════════════════ PADRES DE FAMILIA (SUPABASE) ═════════════════════ */

function PadresView() {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [padres, setPadres] = useStoreItem(store.padres);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingPadre, setEditingPadre] = useState<Padre | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from("padres")
        .select("*")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false });
      if (!cancelled) {
        if (data) setPadres(data as Padre[]);
        if (error) toast.error("Error cargando padres: " + error.message);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const filtered = padres.filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.nombre_hijo.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || normGrupo(p.grupo) === normGrupo(grupoFilter);
    return matchSearch && matchGrupo;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este padre de familia?")) return;
    if (userId) {
      const { error } = await supabase.from("padres").delete().eq("id", id).eq("user_id", userId);
      if (error) { toast.error(error.message); return; }
    }
    setPadres((prev) => prev.filter((p) => p.id !== id));
    const tutores = store.tutores.get().filter((t) => t.id !== id);
    store.tutores.set(tutores);
    toast.success("Padre eliminado.");
  };

  const handleToggleActivo = async (id: string, actual: boolean) => {
    const nuevo = !actual;
    if (userId) {
      await supabase.from("padres").update({ activo: nuevo }).eq("id", id).eq("user_id", userId);
    }
    setPadres((prev) => prev.map((p) => p.id === id ? { ...p, activo: nuevo } : p));
    toast.success(nuevo ? "Padre activado" : "Padre desactivado");
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success("Teléfono copiado."));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando padres...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total padres", value: padres.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
          { label: "Activos", value: padres.filter((p) => p.activo).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
          { label: "Con WhatsApp", value: padres.filter((p) => p.telefono).length, icon: Smartphone, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
          { label: "Con Email", value: padres.filter((p) => p.email).length, icon: Mail, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-3 border border-border text-center`}>
              <Icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Buscar padre o hijo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-muted rounded-xl pl-9 pr-3 py-2 text-sm outline-none border border-border focus:border-primary transition-colors" />
        </div>
        <select value={grupoFilter} onChange={(e) => setGrupoFilter(e.target.value)} className="bg-muted rounded-xl px-3 py-2 text-sm outline-none border border-border focus:border-primary">
          <option value="">Todos los grupos</option>
          {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay padres registrados.</p>
            <p className="text-xs">Usa "Nuevo" para dar de alta un padre de familia.</p>
          </div>
        )}
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{p.nombre?.[0] || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold">{p.nombre}</h4>
                    <Badge
                      variant={p.activo ? "default" : "secondary"}
                      className={`text-xs cursor-pointer ${p.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      onClick={() => handleToggleActivo(p.id, p.activo)}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{p.grupo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Hijo/a: <span className="font-medium text-foreground">{p.nombre_hijo}</span></p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {p.telefono && (
                      <button onClick={() => handleCopyPhone(p.telefono)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                        <Phone className="w-3 h-3" /> {p.telefono}
                      </button>
                    )}
                    {p.email && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Mail className="w-3 h-3" /> {p.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {p.telefono && (
                  <button onClick={() => openWhatsApp(p.telefono, `Hola ${p.nombre}, soy el maestro de ${p.nombre_hijo}.`)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Enviar WhatsApp">
                    <Smartphone className="w-4 h-4" />
                  </button>
                )}
                {p.email && (
                  <button onClick={() => openEmail(p.email, `Mensaje sobre ${p.nombre_hijo}`, `Estimado/a ${p.nombre},\n\n`)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Enviar Email">
                    <Mail className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setEditingPadre(p)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editingPadre && (
          <EditarPadreModal
            padre={editingPadre}
            onClose={() => setEditingPadre(null)}
            onSaved={(actualizado) => {
              setPadres((prev) => prev.map((x) => x.id === actualizado.id ? actualizado : x));
              setEditingPadre(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Editar Padre ─── */

function EditarPadreModal({ padre, onClose, onSaved }: { padre: Padre; onClose: () => void; onSaved: (p: Padre) => void }) {
  const userId = useAuthUser();
  const [nombre, setNombre] = useState(padre.nombre);
  const [telefono, setTelefono] = useState(padre.telefono || "");
  const [email, setEmail] = useState(padre.email || "");
  const [grupo, setGrupo] = useState(padre.grupo || GRUPOS[0]);
  const [alumnoId, setAlumnoId] = useState(padre.alumno_id || "");
  const [nombreHijo, setNombreHijo] = useState(padre.nombre_hijo || "");
  const [saving, setSaving] = useState(false);
  const [alumnos, setAlumnos] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("alumnos").select("id, nombre, grupo, activo")
      .eq("user_id", userId).eq("activo", true).order("nombre", { ascending: true })
      .then(({ data }) => setAlumnos(data || []));
  }, [userId]);

  const handleUpdate = async () => {
    if (!nombre.trim() || !alumnoId) { toast.error("El nombre del padre/madre y el alumno vinculado son obligatorios."); return; }
    if (!userId) { toast.error("Inicia sesión para guardar."); return; }
    const alumno = alumnos.find((a) => a.id === alumnoId);
    setSaving(true);
    const cambios = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      grupo: alumno?.grupo || grupo,
      nombre_hijo: alumno?.nombre || nombreHijo.trim(),
      alumno_id: alumnoId || null,
    };
    const { data, error } = await supabase.from("padres").update(cambios).eq("id", padre.id).eq("user_id", userId).select().maybeSingle();
    setSaving(false);
    if (error) { toast.error("Error guardando: " + error.message); return; }
    toast.success("Padre actualizado correctamente.");
    onSaved((data as Padre) || { ...padre, ...cambios, alumno_id: alumnoId } as Padre);
  };

  return (
    <ModalWrapper title="Editar Padre de Familia" icon={Pencil} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo del padre/madre *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno vinculado (hijo/a) *</label>
          <select
            value={alumnoId}
            onChange={(e) => {
              const al = alumnos.find((a) => a.id === e.target.value);
              setAlumnoId(e.target.value);
              setNombreHijo(al?.nombre || "");
              if (al?.grupo) setGrupo(al.grupo);
            }}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary"
          >
            <option value="">Selecciona un alumno…</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}{a.grupo ? ` — ${a.grupo}` : ""}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Teléfono (WhatsApp)</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleUpdate} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ═════════════════════ MODAL DINÁMICO ═════════════════════ */

function DynamicModal({ type, onClose }: { type: TabId; onClose: () => void }) {
  switch (type) {
    case "avisos": return <NuevoAvisoModal onClose={onClose} />;
    case "tareas": return <NuevaTareaModal onClose={onClose} />;
    case "mensajes": return <NuevoMensajeModal onClose={onClose} />;
    case "padres": return <NuevoPadreModal onClose={onClose} />;
    default: return null;
  }
}

function ModalWrapper({ title, icon: Icon, children, onClose }: { title: string; icon: React.ElementType; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-card rounded-2xl border border-border shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Nuevo Aviso ─── */

function NuevoAvisoModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState<AvisoTipo>("aviso");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  useEffect(() => { if (gruposReales.length > 0 && !gruposReales.includes(grupo)) setGrupo(gruposReales[0]); }, [gruposReales]); // grupo por defecto = primer grupo real
  const [saving, setSaving] = useState(false);
  const [, setAvisos] = useStoreItem(store.avisos);

  const handleSave = async () => {
    if (!titulo.trim() || !mensaje.trim()) { toast.error("Completa todos los campos obligatorios."); return; }
    if (!userId) { toast.error("Inicia sesión para guardar."); return; }
    setSaving(true);
    const nuevo: Omit<Aviso, "id"> = {
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      tipo,
      fecha: new Date().toISOString().split("T")[0],
      grupo,
      leidos: 0,
      total: 32,
      enviado_whatsapp: false,
      enviado_email: false,
      creado_en: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("avisos").insert({ ...nuevo, user_id: userId }).select().maybeSingle();
    if (error) {
      toast.error("Error guardando: " + error.message);
      setSaving(false);
      return;
    }
    if (data) setAvisos((prev) => [data as Aviso, ...prev]);
    setSaving(false);
    toast.success("Aviso creado correctamente.");
    onClose();
  };

  return (
    <ModalWrapper title="Nuevo Aviso" icon={Megaphone} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Reunión de padres" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensaje *</label>
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Escribe el contenido del aviso..." rows={4} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as AvisoTipo)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
              <option value="aviso">Aviso</option>
              <option value="tarea">Tarea</option>
              <option value="evento">Evento</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
              {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Guardando..." : "Crear Aviso"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ─── Nueva Tarea ─── */

function NuevaTareaModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  useEffect(() => { if (gruposReales.length > 0 && !gruposReales.includes(grupo)) setGrupo(gruposReales[0]); }, [gruposReales]); // grupo por defecto = primer grupo real
  const [saving, setSaving] = useState(false);
  const [, setTareas] = useStoreItem(store.tareas);

  const handleSave = async () => {
    if (!titulo.trim() || !materia.trim() || !fechaEntrega) { toast.error("Completa todos los campos obligatorios."); return; }
    if (!userId) { toast.error("Inicia sesión para guardar."); return; }
    setSaving(true);
    const nueva: Omit<TareaDigital, "id"> = {
      titulo: titulo.trim(),
      materia: materia.trim(),
      descripcion: descripcion.trim(),
      fecha_entrega: fechaEntrega,
      grupo,
      enviadas: 0,
      total: 32,
      estado: "pendiente",
    };
    const { data, error } = await supabase.from("tareas_digitales").insert({ ...nueva, user_id: userId }).select().maybeSingle();
    if (error) {
      toast.error("Error guardando: " + error.message);
      setSaving(false);
      return;
    }
    if (data) setTareas((prev) => [data as TareaDigital, ...prev]);
    setSaving(false);
    toast.success("Tarea creada correctamente.");
    onClose();
  };

  return (
    <ModalWrapper title="Nueva Tarea Digital" icon={BookOpen} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Ejercicios de fracciones" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Materia *</label>
            <input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ej: Matemáticas" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fecha de entrega *</label>
            <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Instrucciones de la tarea..." rows={3} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Guardando..." : "Crear Tarea"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ─── Nuevo Mensaje ─── */

function NuevoMensajeModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  useEffect(() => { if (gruposReales.length > 0 && !gruposReales.includes(grupo)) setGrupo(gruposReales[0]); }, [gruposReales]); // grupo por defecto = primer grupo real
  const [saving, setSaving] = useState(false);
  const [, setMensajes] = useStoreItem(store.mensajes);

  const handleSave = async () => {
    if (!texto.trim()) { toast.error("Escribe un mensaje."); return; }
    if (!userId) { toast.error("Inicia sesión para guardar."); return; }
    setSaving(true);
    const nuevo: Omit<Mensaje, "id"> = {
      texto: texto.trim(),
      remitente: "maestro",
      nombre_remitente: "Maestro",
      grupo_id: grupo,
      leido: true,
      creado_en: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("mensajes").insert({ ...nuevo, user_id: userId }).select().maybeSingle();
    if (error) {
      toast.error("Error enviando: " + error.message);
      setSaving(false);
      return;
    }
    if (data) setMensajes((prev) => [...prev, data as Mensaje]);
    setSaving(false);
    toast.success("Mensaje enviado.");
    onClose();
  };

  return (
    <ModalWrapper title="Nuevo Mensaje" icon={MessageSquare} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Mensaje</label>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu mensaje..." rows={4} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {saving ? "Enviando..." : "Enviar Mensaje"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}

/* ─── Nuevo Padre ─── */

function NuevoPadreModal({ onClose }: { onClose: () => void }) {
  const userId = useAuthUser();
  const gruposReales = useGruposReales();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [nombreHijo, setNombreHijo] = useState("");
  const [alumnoId, setAlumnoId] = useState("");
  const [saving, setSaving] = useState(false);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [, setPadres] = useStoreItem(store.padres);

  useEffect(() => {
    if (!userId) return;
    supabase.from("alumnos").select("id, nombre, grupo, activo")
      .eq("user_id", userId).eq("activo", true).order("nombre", { ascending: true })
      .then(({ data }) => setAlumnos(data || []));
  }, [userId]);

  const handleSave = async () => {
    if (!nombre.trim() || !alumnoId) { toast.error("El nombre del padre/madre y el alumno vinculado son obligatorios."); return; }
    if (!userId) { toast.error("Inicia sesión para guardar."); return; }

    const alumno = alumnos.find((a) => a.id === alumnoId);

    setSaving(true);
    const nuevo: Omit<Padre, "id"> = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      grupo: alumno?.grupo || grupo,
      nombre_hijo: alumno?.nombre || nombreHijo.trim(),
      alumno_id: alumnoId,
      activo: true,
      creado_en: new Date().toISOString(),
    };

    const alumnoIdParaDB = nuevo.alumno_id === "" ? null : nuevo.alumno_id;
    const { data, error } = await supabase.from("padres").insert({ ...nuevo, alumno_id: alumnoIdParaDB, user_id: userId }).select().maybeSingle();
    if (error) {
      toast.error("Error guardando: " + error.message);
      setSaving(false);
      return;
    }
    if (data) {
      setPadres((prev) => [data as Padre, ...prev]);
      // Sincronizar con tutores local si aplica
      if (alumno) {
        const tutor = {
          id: data.id,
          nombre: data.nombre,
          telefono: data.telefono,
          email: data.email,
          grupo: data.grupo,
          alumno_id: data.alumno_id,
          alumno_nombre: data.nombre_hijo,
          parentesco: "Padre/Madre",
          activo: true,
          creado_en: data.creado_en || new Date().toISOString(),
        };
        store.tutores.set([tutor, ...store.tutores.get()]);
      }
    }

    setSaving(false);
    toast.success("Padre de familia registrado correctamente.");
    onClose();
  };

  return (
    <ModalWrapper title="Nuevo Padre de Familia" icon={UserPlus} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo del padre/madre *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez García" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alumno vinculado (hijo/a) *</label>
          <select
            value={alumnoId}
            onChange={(e) => {
              const al = alumnos.find((a) => a.id === e.target.value);
              setAlumnoId(e.target.value);
              setNombreHijo(al?.nombre || "");
              if (al?.grupo) setGrupo(al.grupo);
            }}
            className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary"
          >
            <option value="">Selecciona un alumno…</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}{a.grupo ? ` — ${a.grupo}` : ""}</option>
            ))}
          </select>
          {alumnos.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No tienes alumnos registrados. Agrégalos primero en la sección Alumnos.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Teléfono (WhatsApp)</label>
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 5215512345678" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ej: padre@email.com" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {gruposReales.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-3 h-3 inline mr-1" />
            El teléfono debe incluir código de país (ej: 52 para México). Se usará para enviar mensajes por WhatsApp.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {saving ? "Guardando..." : "Registrar Padre"}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}