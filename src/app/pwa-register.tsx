"use client";

import { useEffect } from "react";

/**
 * Registra el service worker para que PlaneaDocente sea instalable como app
 * (habilita el botón "Instalar ahora" en Descargar App en Chrome/Edge/Android).
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* si falla el registro, la app sigue funcionando normal */
        });
      };
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);
  return null;
}
