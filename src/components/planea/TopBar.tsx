
"use client";

import { Menu, Bell, Search, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const sectionTitles: Record<string, string> = {
  inicio: "Dashboard",
  alumnos: "Alumnos",
  asistencia: "Asistencia",
  planeacion: "Planeación",
  actividades: "Actividades",
  evaluaciones: "Evaluaciones",
  evidencias: "Evidencias",
  reportes: "Reportes",
  padres: "Comunicación con Padres",
  configuracion: "Configuración",
  descargas: "Descargar PlaneaDocente",
  "herramientas-ia": "Herramientas IA",
  suscripcion: "Planes y Suscripción",
  afiliados: "Programa de Afiliados",
};

interface TopBarProps {
  user?: User;
}

export default function TopBar({ user }: TopBarProps) {
  const { toggleSidebar, activeSection } = useAppStore();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada correctamente");
    window.location.reload();
  };

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Maestro";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-4 gap-4 sticky top-0 z-10 shadow-sm">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1">
        <h2 className="font-semibold text-base text-foreground">
          {sectionTitles[activeSection] ?? "PlaneaDocente"}
        </h2>
        <p className="text-xs text-muted-foreground">Ciclo Escolar 2024-2025</p>
      </div>

      <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Buscar..."
          className="bg-transparent text-sm outline-none w-40 placeholder:text-muted-foreground"
        />
      </div>

      <Button variant="ghost" size="icon" className="relative">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>

      {user && (
        <div className="flex items-center gap-2">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{displayName}</p>
            <p className="text-xs text-muted-foreground leading-tight">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
