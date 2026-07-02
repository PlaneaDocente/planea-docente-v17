"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessagesSquare, Send, Loader2, Copy, Check, Building2,
  LogIn, RefreshCw, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MensajeInst {
  id: string;
  institucion_codigo: string;
  remitente_id: string;
  remitente_nombre: string | null;
  remitente_rol: string | null;
  mensaje: string;
  creado_en: string;
}

export default function MensajeriaInstitucionalSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string>("Maestro");
  const [codigo, setCodigo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [codigoInput, setCodigoInput] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Cargar usuario + código de institución
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setNombre(user.user_metadata?.full_name || user.email || "Maestro");
      try {
        const { data } = await supabase.from("configuracion").select("institucion_codigo").eq("user_id", user.id).maybeSingle();
        setCodigo((data as { institucion_codigo?: string } | null)?.institucion_codigo || "");
      } catch { /* columna aún no existe */ }
      setLoading(false);
    })();
  }, []);

  const guardarCodigo = async (nuevo: string) => {
    if (!userId) return;
    const limpio = nuevo.trim().toUpperCase();
    if (limpio.length < 4) { toast.error("El código debe tener al menos 4 caracteres."); return; }
    setGuardando(true);
    const { error } = await supabase.from("configuracion").upsert(
      { user_id: userId, institucion_codigo: limpio, actualizado_en: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    // Registrar en el directorio de miembros (para mensajes privados)
    await supabase.from("miembros_institucion").upsert(
      { user_id: userId, institucion_codigo: limpio, nombre, actualizado_en: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setGuardando(false);
    if (error) { toast.error(error.code === "42703" ? "Falta la columna: corre el SQL de Mensajería en Supabase." : error.message); return; }
    setCodigo(limpio);
    toast.success("Te uniste a la institución.");
  };

  const generarCodigo = () => {
    const code = "INST-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    guardarCodigo(code);
  };

  const salirInstitucion = async () => {
    if (!userId) return;
    if (!confirm("¿Salir de esta institución? Dejarás de ver sus mensajes.")) return;
    await supabase.from("configuracion").upsert({ user_id: userId, institucion_codigo: null, actualizado_en: new Date().toISOString() }, { onConflict: "user_id" });
    await supabase.from("miembros_institucion").delete().eq("user_id", userId);
    setCodigo("");
    toast.success("Saliste de la institución.");
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white">
          <MessagesSquare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Mensajería Institucional</h2>
          <p className="text-sm text-muted-foreground">Comunicación entre maestros y directivos de la misma escuela</p>
        </div>
      </div>

      {!codigo ? (
        <UnirseView onGenerar={generarCodigo} onUnirse={guardarCodigo} codigoInput={codigoInput} setCodigoInput={setCodigoInput} guardando={guardando} />
      ) : (
        <InstitucionTabs userId={userId} nombre={nombre} codigo={codigo} onSalir={salirInstitucion} />
      )}
    </div>
  );
}

/* ─────────── Unirse / crear institución ─────────── */
function UnirseView({ onGenerar, onUnirse, codigoInput, setCodigoInput, guardando }: {
  onGenerar: () => void; onUnirse: (c: string) => void;
  codigoInput: string; setCodigoInput: (v: string) => void; guardando: boolean;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        <h3 className="font-semibold">Soy directivo: crear institución</h3>
        <p className="text-sm text-muted-foreground">Genera un código y compártelo con tus maestros para que se unan.</p>
        <Button onClick={onGenerar} disabled={guardando} className="w-full gap-2">
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />} Generar código de institución
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center"><LogIn className="w-5 h-5" /></div>
        <h3 className="font-semibold">Unirme a mi institución</h3>
        <p className="text-sm text-muted-foreground">Escribe el código que te compartió tu director(a).</p>
        <input value={codigoInput} onChange={(e) => setCodigoInput(e.target.value.toUpperCase())} placeholder="Ej. INST-A1B2C" className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm border border-border outline-none tracking-wider" />
        <Button onClick={() => onUnirse(codigoInput)} disabled={guardando} variant="outline" className="w-full gap-2">
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} Unirme
        </Button>
      </div>
    </div>
  );
}

/* ─────────── Pestañas: Grupo / Privados ─────────── */
function InstitucionTabs({ userId, nombre, codigo, onSalir }: {
  userId: string | null; nombre: string; codigo: string; onSalir: () => void;
}) {
  const [vista, setVista] = useState<"grupo" | "privados">("grupo");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setVista("grupo")} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-colors ${vista === "grupo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          <Users className="w-4 h-4" /> Grupo
        </button>
        <button onClick={() => setVista("privados")} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-colors ${vista === "privados" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          <MessagesSquare className="w-4 h-4" /> Privados (1 a 1)
        </button>
      </div>
      {vista === "grupo"
        ? <ChatView userId={userId} nombre={nombre} codigo={codigo} onSalir={onSalir} />
        : <PrivadosView userId={userId} nombre={nombre} codigo={codigo} />}
    </div>
  );
}

/* ─────────── Mensajes privados 1 a 1 ─────────── */
function PrivadosView({ userId, nombre, codigo }: { userId: string | null; nombre: string; codigo: string }) {
  const [miembros, setMiembros] = useState<{ user_id: string; nombre: string | null; rol: string | null }[]>([]);
  const [sel, setSel] = useState<{ user_id: string; nombre: string | null } | null>(null);
  const [mensajes, setMensajes] = useState<MensajeInst[]>([]);
  const [texto, setTexto] = useState("");
  const [loadingM, setLoadingM] = useState(true);
  const [loadingC, setLoadingC] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const cargarMiembros = useCallback(async () => {
    setLoadingM(true);
    const { data } = await supabase.from("miembros_institucion")
      .select("user_id, nombre, rol").eq("institucion_codigo", codigo);
    setMiembros(((data as any[]) || []).filter((m) => m.user_id !== userId));
    setLoadingM(false);
  }, [codigo, userId]);
  useEffect(() => { cargarMiembros(); }, [cargarMiembros]);

  const cargarConversacion = useCallback(async () => {
    if (!sel || !userId) return;
    const { data } = await supabase.from("mensajes_institucion")
      .select("*").eq("institucion_codigo", codigo)
      .not("destinatario_id", "is", null)
      .or(`and(remitente_id.eq.${userId},destinatario_id.eq.${sel.user_id}),and(remitente_id.eq.${sel.user_id},destinatario_id.eq.${userId})`)
      .order("creado_en", { ascending: true });
    setMensajes((data as MensajeInst[]) || []);
    setLoadingC(false);
  }, [sel, userId, codigo]);

  useEffect(() => {
    if (!sel) { setMensajes([]); return; }
    setLoadingC(true);
    cargarConversacion();
    const iv = setInterval(cargarConversacion, 8000);
    return () => clearInterval(iv);
  }, [sel, cargarConversacion]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes.length]);

  const enviar = async () => {
    if (!texto.trim() || !userId || !sel) return;
    setEnviando(true);
    const { error } = await supabase.from("mensajes_institucion").insert({
      institucion_codigo: codigo,
      remitente_id: userId,
      remitente_nombre: nombre,
      destinatario_id: sel.user_id,
      mensaje: texto.trim(),
    });
    setEnviando(false);
    if (error) { toast.error(error.message); return; }
    setTexto("");
    cargarConversacion();
  };

  const fmt = (d: string) => new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {/* Directorio */}
      <div className="bg-card rounded-2xl border border-border p-3 sm:col-span-1 max-h-[56vh] overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Miembros de la institución</p>
        {loadingM ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : miembros.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">Aún no hay otros miembros. Comparte el código <b>{codigo}</b> para que se unan.</p>
        ) : (
          <div className="space-y-1">
            {miembros.map((m) => (
              <button key={m.user_id} onClick={() => setSel({ user_id: m.user_id, nombre: m.nombre })}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${sel?.user_id === m.user_id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {(m.nombre || "M").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.nombre || "Maestro"}</p>
                  {m.rol && <p className="text-[10px] text-muted-foreground truncate">{m.rol}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversación */}
      <div className="bg-card rounded-2xl border border-border sm:col-span-2 h-[56vh] flex flex-col">
        {!sel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <MessagesSquare className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Elige a un miembro de la izquierda para chatear en privado.</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs font-bold">{(sel.nombre || "M").slice(0, 1).toUpperCase()}</div>
              <p className="text-sm font-semibold">{sel.nombre || "Maestro"}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingC ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : mensajes.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Inicia la conversación con {sel.nombre || "este maestro"}.</p>
              ) : (
                mensajes.map((m) => {
                  const propio = m.remitente_id === userId;
                  return (
                    <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${propio ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.mensaje}</p>
                        <p className={`text-[10px] mt-1 ${propio ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmt(m.creado_en)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <input value={texto} onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder={`Mensaje para ${sel.nombre || "maestro"}…`}
                className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm border border-border outline-none" />
              <Button onClick={enviar} disabled={enviando || !texto.trim()} className="gap-2">
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────── Chat grupal de la institución ─────────── */
function ChatView({ userId, nombre, codigo, onSalir }: {
  userId: string | null; nombre: string; codigo: string; onSalir: () => void;
}) {
  const [mensajes, setMensajes] = useState<MensajeInst[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("mensajes_institucion")
      .select("*").eq("institucion_codigo", codigo).is("destinatario_id", null).order("creado_en", { ascending: true });
    setMensajes((data as MensajeInst[]) || []);
    setLoading(false);
  }, [codigo]);

  useEffect(() => {
    cargar();
    // Refresco periódico ligero (cada 8s) para recibir mensajes nuevos
    const iv = setInterval(cargar, 8000);
    return () => clearInterval(iv);
  }, [cargar]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes.length]);

  const enviar = async () => {
    if (!texto.trim() || !userId) return;
    setEnviando(true);
    const { error } = await supabase.from("mensajes_institucion").insert({
      institucion_codigo: codigo,
      remitente_id: userId,
      remitente_nombre: nombre,
      mensaje: texto.trim(),
    });
    setEnviando(false);
    if (error) { toast.error(error.code === "42P01" ? "Corre el SQL de Mensajería en Supabase." : error.message); return; }
    setTexto("");
    cargar();
  };

  const eliminar = async (id: string) => {
    await supabase.from("mensajes_institucion").delete().eq("id", id);
    setMensajes((prev) => prev.filter((m) => m.id !== id));
  };

  const copiarCodigo = () => {
    navigator.clipboard?.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const fmt = (d: string) => new Date(d).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card rounded-xl border border-border p-3">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-muted-foreground">Institución:</span>
          <span className="font-bold tracking-wider">{codigo}</span>
          <button onClick={copiarCodigo} className="p-1 rounded hover:bg-muted" title="Copiar código">
            {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="gap-1" onClick={cargar}><RefreshCw className="w-3.5 h-3.5" /> Actualizar</Button>
          <Button size="sm" variant="ghost" className="gap-1 text-red-500" onClick={onSalir}>Salir</Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border h-[52vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : mensajes.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <MessagesSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aún no hay mensajes. ¡Escribe el primero!</p>
              <p className="text-xs mt-1">Comparte el código <b>{codigo}</b> con tus compañeros para que se unan.</p>
            </div>
          ) : (
            mensajes.map((m) => {
              const propio = m.remitente_id === userId;
              return (
                <div key={m.id} className={`flex ${propio ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 group relative ${propio ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {!propio && <p className="text-[11px] font-semibold mb-0.5 opacity-80">{m.remitente_nombre || "Maestro"}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.mensaje}</p>
                    <p className={`text-[10px] mt-1 ${propio ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{fmt(m.creado_en)}</p>
                    {propio && (
                      <button onClick={() => eliminar(m.id)} className="absolute -left-7 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-100 text-red-500 opacity-0 group-hover:opacity-100" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribe un mensaje para tu institución…"
            className="flex-1 bg-muted rounded-xl px-3 py-2.5 text-sm border border-border outline-none"
          />
          <Button onClick={enviar} disabled={enviando || !texto.trim()} className="gap-2">
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar
          </Button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Todos los miembros con el código <b>{codigo}</b> ven y responden estos mensajes. Los mensajes se actualizan automáticamente cada pocos segundos.</p>
    </div>
  );
}
