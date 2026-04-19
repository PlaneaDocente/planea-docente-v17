export default function Terminos() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <header className="border-b border-gray-100 pb-6 mb-8">
          <h1 className="text-3xl font-extrabold text-[#4F46E5] mb-2">Términos del Servicio</h1>
          <p className="text-gray-500">PlaneaDocente · Ciclo Escolar 2025-2026</p>
        </header>
        
        <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Acceso al Servicio</h2>
            <p>PlaneaDocente ofrece herramientas de gestión para maestros. El uso de la cuenta es personal e intransferible.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Suscripción PRO</h2>
            <p>El acceso a funciones avanzadas requiere una suscripción activa. El periodo de prueba de 15 días es gratuito y puede cancelarse en cualquier momento.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Responsabilidad</h2>
            <p>El usuario es responsable del contenido ingresado en las planeaciones y del manejo de los datos de sus alumnos.</p>
          </section>
        </div>
      </div>
    </div>
  );
}