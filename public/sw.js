// Service worker mínimo de PlaneaDocente.
// Su único propósito es habilitar la instalación de la PWA (el navegador
// exige un service worker con manejador de fetch para ofrecer "Instalar").
// Es passthrough (no cachea), para NO servir contenido viejo: siempre carga
// la versión más reciente desde el servidor.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough: dejamos que el navegador maneje la petición normalmente.
  // (No llamamos a event.respondWith, así no se cachea nada.)
});
