"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bell, MessageSquare, Plus, CheckCircle2, Loader2, Users,
  Megaphone, BookOpen, Trash2, X, Search, Phone, Mail,
  Smartphone, UserPlus, Hash, Eye,
  RefreshCw, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  store, useStoreItem, GRUPOS, formatDate, timeAgo,
  sendWhatsApp, sendEmail, getPadresPorGrupo, syncPadreToTutores,
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

/* ═════════════════════ AVISOS ═════════════════════ */

function AvisosView() {
  const [avisos, setAvisos] = useStoreItem(store.avisos);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");

  const filtered = avisos.filter((a) => {
    const matchSearch = a.titulo.toLowerCase().includes(search.toLowerCase()) || a.mensaje.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || a.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este aviso?")) return;
    setAvisos((prev) => prev.filter((a) => a.id !== id));
    toast.success("Aviso eliminado.");
  };

  const handleSendWhatsApp = (aviso: Aviso) => {
    const padres = getPadresPorGrupo(aviso.grupo);
    if (padres.length === 0) { toast.error("No hay padres registrados en este grupo."); return; }
    const msg = `📢 *${aviso.titulo}*\n\n${aviso.mensaje}\n\n_Fecha: ${formatDate(aviso.fecha)}_\n_Enviado desde PlaneaDocente_`;
    padres.forEach((p) => sendWhatsApp(p.telefono, msg));
    setAvisos((prev) => prev.map((a) => a.id === aviso.id ? { ...a, enviado_whatsapp: true } : a));
    toast.success(`Mensaje enviado a ${padres.length} padres por WhatsApp.`);
  };

  const handleSendEmail = (aviso: Aviso) => {
    const padres = getPadresPorGrupo(aviso.grupo);
    if (padres.length === 0) { toast.error("No hay padres registrados en este grupo."); return; }
    const subject = `📢 ${aviso.titulo}`;
    const body = `${aviso.mensaje}\n\nFecha: ${formatDate(aviso.fecha)}\nEnviado desde PlaneaDocente`;
    padres.forEach((p) => sendEmail(p.email, subject, body));
    setAvisos((prev) => prev.map((a) => a.id === aviso.id ? { ...a, enviado_email: true } : a));
    toast.success(`Correo enviado a ${padres.length} padres.`);
  };

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
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
                    <button onClick={() => handleSendWhatsApp(a)} className={`p-1.5 rounded-lg transition-colors ${a.enviado_whatsapp ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50"}`} title="Enviar por WhatsApp">
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleSendEmail(a)} className={`p-1.5 rounded-lg transition-colors ${a.enviado_email ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground hover:text-blue-600 hover:bg-blue-50"}`} title="Enviar por Email">
                      <Mail className="w-3.5 h-3.5" />
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
    </div>
  );
}

/* ═════════════════════ TAREAS DIGITALES ═════════════════════ */

function TareasDigitalesView() {
  const [tareas, setTareas] = useStoreItem(store.tareas);
  const [search, setSearch] = useState("");

  const filtered = tareas.filter((t) => t.titulo.toLowerCase().includes(search.toLowerCase()) || t.materia.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    setTareas((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarea eliminada.");
  };

  const handleSendWhatsApp = (tarea: TareaDigital) => {
    const padres = getPadresPorGrupo(tarea.grupo);
    if (padres.length === 0) { toast.error("No hay padres registrados en este grupo."); return; }
    const msg = `📚 *Nueva Tarea: ${tarea.titulo}*\n\nMateria: ${tarea.materia}\n${tarea.descripcion}\n\n📅 Entrega: ${formatDate(tarea.fecha_entrega)}\n_Enviado desde PlaneaDocente_`;
    padres.forEach((p) => sendWhatsApp(p.telefono, msg));
    toast.success(`Tarea enviada a ${padres.length} padres por WhatsApp.`);
  };

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
                    <button onClick={() => handleSendWhatsApp(t)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Enviar por WhatsApp">
                      <Smartphone className="w-3.5 h-3.5" />
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
    </div>
  );
}

/* ═════════════════════ MENSAJES ═════════════════════ */

function MensajesView() {
  const [mensajes, setMensajes] = useStoreItem(store.mensajes);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("3°A");
  const [newMsg, setNewMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes, grupoSeleccionado]);

  const filtered = mensajes.filter((m) => m.grupo_id === grupoSeleccionado);
  const noLeidos = filtered.filter((m) => !m.leido && m.remitente === "padre").length;

  const enviarMensaje = () => {
    if (!newMsg.trim()) return;
    setEnviando(true);
    const msg: Mensaje = {
      id: `m-${Date.now()}`,
      texto: newMsg.trim(),
      remitente: "maestro",
      nombre_remitente: "Maestro",
      grupo_id: grupoSeleccionado,
      leido: true,
      creado_en: new Date().toISOString(),
    };
    setTimeout(() => {
      setMensajes((prev) => [...prev, msg]);
      setNewMsg("");
      setEnviando(false);
      toast.success("Mensaje enviado.");
    }, 400);
  };

  const marcarLeido = (id: string) => {
    setMensajes((prev) => prev.map((m) => m.id === id ? { ...m, leido: true } : m));
  };

  const simularRespuestaPadre = () => {
    const nombres = ["Juan Pérez", "María López", "Carlos Ruiz", "Ana García", "Luis Torres"];
    const textos = ["Gracias por la información", "Entendido, maestro", "¿A qué hora es la reunión?", "Mi hijo entregará la tarea", "Buenas tardes"];
    const nombre = nombres[Math.floor(Math.random() * nombres.length)];
    const texto = textos[Math.floor(Math.random() * textos.length)];
    const msg: Mensaje = {
      id: `m-${Date.now()}`,
      texto,
      remitente: "padre",
      nombre_remitente: nombre,
      grupo_id: grupoSeleccionado,
      leido: false,
      creado_en: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, msg]);
    toast.info(`Nuevo mensaje de ${nombre}`, { duration: 4000 });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
          <Hash className="w-4 h-4 text-muted-foreground" />
          <select value={grupoSeleccionado} onChange={(e) => setGrupoSeleccionado(e.target.value)} className="bg-transparent text-sm font-medium outline-none">
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {noLeidos > 0 && <Badge variant="destructive" className="text-xs">{noLeidos} nuevo{noLeidos > 1 ? "s" : ""}</Badge>}
        </div>
        <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={simularRespuestaPadre}>
          <RefreshCw className="w-3 h-3" /> Simular mensaje de padre
        </Button>
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
                    {isMaestro ? "M" : m.nombre_remitente[0]}
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
    </div>
  );
}

/* ═════════════════════ PADRES DE FAMILIA ═════════════════════ */

function PadresView() {
  const [padres, setPadres] = useStoreItem(store.padres);
  const [search, setSearch] = useState("");
  const [grupoFilter, setGrupoFilter] = useState("");

  const filtered = padres.filter((p) => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.nombre_hijo.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchGrupo = !grupoFilter || p.grupo === grupoFilter;
    return matchSearch && matchGrupo;
  });

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar este padre de familia?")) return;
    setPadres((prev) => prev.filter((p) => p.id !== id));
    const tutores = store.tutores.get().filter((t) => t.id !== id);
    store.tutores.set(tutores);
    toast.success("Padre eliminado.");
  };

  const handleToggleActivo = (id: string) => {
    setPadres((prev) => prev.map((p) => p.id === id ? { ...p, activo: !p.activo } : p));
    toast.success("Estado actualizado.");
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => toast.success("Teléfono copiado."));
  };

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
          {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">{p.nombre[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-semibold">{p.nombre}</h4>
                    <Badge variant={p.activo ? "default" : "secondary"} className={`text-xs cursor-pointer ${p.activo ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`} onClick={() => handleToggleActivo(p.id)}>
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
                  <button onClick={() => sendWhatsApp(p.telefono, `Hola ${p.nombre}, soy el maestro de ${p.nombre_hijo}.`)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors" title="Enviar WhatsApp">
                    <Smartphone className="w-4 h-4" />
                  </button>
                )}
                {p.email && (
                  <button onClick={() => sendEmail(p.email, `Mensaje sobre ${p.nombre_hijo}`, `Estimado/a ${p.nombre},\n\n`)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Enviar Email">
                    <Mail className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
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
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState<AvisoTipo>("aviso");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [saving, setSaving] = useState(false);
  const [, setAvisos] = useStoreItem(store.avisos);

  const handleSave = () => {
    if (!titulo.trim() || !mensaje.trim()) { toast.error("Completa todos los campos obligatorios."); return; }
    setSaving(true);
    const nuevo: Aviso = {
      id: `a-${Date.now()}`,
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
    setAvisos((prev) => [nuevo, ...prev]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Aviso creado correctamente.");
      onClose();
    }, 500);
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
              {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [saving, setSaving] = useState(false);
  const [, setTareas] = useStoreItem(store.tareas);

  const handleSave = () => {
    if (!titulo.trim() || !materia.trim() || !fechaEntrega) { toast.error("Completa todos los campos obligatorios."); return; }
    setSaving(true);
    const nueva: TareaDigital = {
      id: `t-${Date.now()}`,
      titulo: titulo.trim(),
      materia: materia.trim(),
      descripcion: descripcion.trim(),
      fecha_entrega: fechaEntrega,
      grupo,
      enviadas: 0,
      total: 32,
      estado: "pendiente",
    };
    setTareas((prev) => [nueva, ...prev]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Tarea creada correctamente.");
      onClose();
    }, 500);
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
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
  const [texto, setTexto] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [saving, setSaving] = useState(false);
  const [, setMensajes] = useStoreItem(store.mensajes);

  const handleSave = () => {
    if (!texto.trim()) { toast.error("Escribe un mensaje."); return; }
    setSaving(true);
    const nuevo: Mensaje = {
      id: `m-${Date.now()}`,
      texto: texto.trim(),
      remitente: "maestro",
      nombre_remitente: "Maestro",
      grupo_id: grupo,
      leido: true,
      creado_en: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, nuevo]);
    setTimeout(() => {
      setSaving(false);
      toast.success("Mensaje enviado.");
      onClose();
    }, 400);
  };

  return (
    <ModalWrapper title="Nuevo Mensaje" icon={MessageSquare} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Grupo</label>
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary">
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [grupo, setGrupo] = useState(GRUPOS[0]);
  const [nombreHijo, setNombreHijo] = useState("");
  const [saving, setSaving] = useState(false);
  const [alumnos] = useStoreItem(store.alumnos);
  const [, setPadres] = useStoreItem(store.padres);

  const handleSave = () => {
    if (!nombre.trim() || !nombreHijo.trim()) { toast.error("Nombre del padre y del hijo son obligatorios."); return; }

    const alumno = alumnos.find((a) => a.nombre.toLowerCase().includes(nombreHijo.toLowerCase()) || nombreHijo.toLowerCase().includes(a.nombre.toLowerCase()));

    setSaving(true);
    const nuevo: Padre = {
      id: `p-${Date.now()}`,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      grupo,
      nombre_hijo: nombreHijo.trim(),
      alumno_id: alumno?.id || "",
      activo: true,
      creado_en: new Date().toISOString(),
    };

    setPadres((prev) => [nuevo, ...prev]);

    if (alumno) {
      syncPadreToTutores(nuevo);
    }

    setTimeout(() => {
      setSaving(false);
      toast.success("Padre de familia registrado correctamente.");
      onClose();
    }, 500);
  };

  return (
    <ModalWrapper title="Nuevo Padre de Familia" icon={UserPlus} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre completo del padre/madre *</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez García" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre del hijo/a *</label>
          <input value={nombreHijo} onChange={(e) => setNombreHijo(e.target.value)} placeholder="Ej: Ana Pérez" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary" />
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
            {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
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