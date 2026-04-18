export default function Privacidad() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <header className="border-b border-gray-100 pb-6 mb-8">
          <h1 className="text-3xl font-extrabold text-[#4F46E5] mb-2">Política de Privacidad</h1>
          <p className="text-gray-500">PlaneaDocente · Actualizado: 17 de abril de 2026</p>
        </header>
        
        <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Información Recopilada</h2>
            <p>Utilizamos Google Auth para facilitar su acceso. Solo guardamos su nombre y correo electrónico para identificar su cuenta y sus planeaciones de forma segura.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Seguridad de Datos</h2>
            <p>Sus datos están protegidos mediante el cifrado de Supabase y no son compartidos con terceros ajenos a la operación del servicio (Google y Stripe).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Uso de Stripe</h2>
            <p>Los datos de su tarjeta nunca tocan nuestros servidores; son procesados directamente por Stripe bajo sus estándares internacionales de seguridad.</p>
          </section>
        </div>
      </div>
    </div>
  );
}