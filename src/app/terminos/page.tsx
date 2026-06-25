// RUTA: src/app/terminos/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Términos de Servicio — PlaneaDocente",
  description: "Términos y condiciones de uso de la plataforma PlaneaDocente.com",
};

export default function TerminosPage() {
  const fecha = "16 de junio de 2026";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">

      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-violet-700 font-bold text-lg">
            🎓 PlaneaDocente
          </Link>
          <Link href="/login"
            className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">

          {/* Header */}
          <div className="mb-10 pb-8 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              📋 Documento Legal
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Términos de Servicio</h1>
            <p className="text-slate-500 text-sm">Última actualización: {fecha}</p>
            <p className="text-slate-600 mt-3 leading-relaxed">
              Bienvenido a <strong>PlaneaDocente.com</strong>. Antes de utilizar nuestros servicios,
              lee con atención los siguientes términos y condiciones. Al registrarte o usar la plataforma,
              aceptas estos términos en su totalidad.
            </p>
          </div>

          <div className="space-y-10 text-slate-700 leading-relaxed">

            {/* 1 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                Acerca de PlaneaDocente
              </h2>
              <p>
                <strong>PlaneaDocente.com</strong> es una plataforma de software como servicio (SaaS) diseñada
                exclusivamente para maestros y docentes de educación básica en México, orientada al enfoque
                de la <strong>Nueva Escuela Mexicana (NEM)</strong>. Ofrece herramientas digitales para
                planeaciones didácticas, control de asistencia, evaluaciones, evidencias de aprendizaje,
                generación de imágenes educativas con inteligencia artificial y comunicación con padres de familia.
              </p>
              <p className="mt-3">
                El servicio es operado por <strong>PlaneaDocente</strong>, con domicilio en México.
                Para consultas legales: <a href="mailto:legal@planeadocente.com"
                className="text-violet-600 hover:underline">legal@planeadocente.com</a>
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Registro y cuenta de usuario
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Para usar PlaneaDocente debes crear una cuenta con datos verídicos y actualizados.</li>
                <li>Eres responsable de mantener la confidencialidad de tu contraseña y de todas las actividades realizadas desde tu cuenta.</li>
                <li>Debes ser mayor de 18 años para registrarte como titular de la cuenta.</li>
                <li>Una cuenta es personal e intransferible. No puedes ceder tu cuenta a terceros.</li>
                <li>PlaneaDocente se reserva el derecho de suspender cuentas que violen estos términos, sin previo aviso y sin reembolso.</li>
                <li>Al registrarte aceptas recibir comunicaciones del servicio (actualizaciones, facturas, avisos de suscripción). Puedes desactivar correos promocionales desde tu perfil.</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                Planes y suscripciones
              </h2>
              <div className="bg-slate-50 rounded-2xl p-5 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { plan:"Plan Básico", precio:"$99 MXN/mes", desc:"Hasta 35 alumnos, planeaciones y reportes básicos" },
                    { plan:"Plan Profesional", precio:"$199 MXN/mes", desc:"Alumnos ilimitados, Herramientas IA, reportes avanzados" },
                    { plan:"Plan Institucional", precio:"$499 MXN/mes", desc:"Múltiples maestros, panel directivo, soporte 24/7" },
                  ].map(p => (
                    <div key={p.plan} className="bg-white rounded-xl p-4 border border-slate-200">
                      <p className="font-bold text-violet-700">{p.plan}</p>
                      <p className="text-lg font-bold text-slate-900 mt-1">{p.precio}</p>
                      <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Todos los planes incluyen <strong>15 días de prueba gratuita</strong>. No se requiere tarjeta de crédito para iniciar el trial (según disponibilidad).</li>
                <li>Al terminar el periodo de prueba, se realiza el cargo automático al método de pago registrado.</li>
                <li>Los precios están expresados en Pesos Mexicanos (MXN) e incluyen IVA (16%).</li>
                <li>PlaneaDocente se reserva el derecho de modificar los precios con 30 días de aviso previo por correo electrónico.</li>
                <li>Las suscripciones se renuevan automáticamente cada mes salvo que se cancelen antes del periodo de renovación.</li>
              </ul>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                Política de cancelación y reembolsos
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Puedes cancelar tu suscripción en cualquier momento desde el Portal de Facturación en tu perfil.</li>
                <li>Al cancelar, mantendrás acceso al plan activo hasta el final del periodo ya pagado.</li>
                <li><strong>No se otorgan reembolsos</strong> por periodos parciales o meses no utilizados, salvo en casos previstos por la Ley Federal de Protección al Consumidor (PROFECO).</li>
                <li>Si experimentas un problema técnico imputable a PlaneaDocente que impida el uso del servicio por más de 72 horas continuas, puedes solicitar un crédito proporcional escribiendo a <a href="mailto:soporte@planeadocente.com" className="text-violet-600 hover:underline">soporte@planeadocente.com</a></li>
                <li>Las pruebas gratuitas no son reembolsables en caso de activar el cobro por error de configuración del usuario.</li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
                Uso permitido y prohibiciones
              </h2>
              <p className="mb-3">Al utilizar PlaneaDocente te comprometes a:</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Utilizar la plataforma únicamente con fines educativos legítimos.</li>
                <li>No compartir tu cuenta con otros usuarios no autorizados.</li>
                <li>No cargar contenido ilegal, ofensivo, violento, sexual o discriminatorio.</li>
                <li>No intentar acceder a datos de otros usuarios.</li>
                <li>No usar la plataforma para fines comerciales ajenos al uso educativo personal.</li>
              </ul>
              <p>PlaneaDocente se reserva el derecho de eliminar contenido y suspender cuentas que violen estas reglas, sin responsabilidad por daños derivados de dicha suspensión.</p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">6</span>
                Propiedad intelectual
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>El diseño, código, marcas, logotipos y contenido original de PlaneaDocente son propiedad exclusiva de PlaneaDocente y están protegidos por la Ley Federal del Derecho de Autor de México.</li>
                <li>Las planeaciones, evaluaciones y materiales que el maestro crea dentro de la plataforma son de su propiedad intelectual. PlaneaDocente no reclama derechos sobre el contenido generado por los usuarios.</li>
                <li>Las imágenes generadas con IA (vía Pollinations.ai / FLUX) se generan bajo licencias de uso libre. El usuario es responsable de verificar el uso permitido según las condiciones del proveedor.</li>
                <li>Queda prohibida la reproducción, distribución o modificación de elementos de PlaneaDocente sin autorización escrita.</li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">7</span>
                Datos de alumnos y menores de edad
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-amber-800 font-semibold text-sm">⚠️ Importante — Protección de menores</p>
              </div>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>PlaneaDocente puede utilizarse para registrar datos académicos de alumnos menores de edad. El maestro es el responsable directo del tratamiento de esos datos.</li>
                <li>No compartas datos personales sensibles de alumnos (como fotografías de identificación, CURP, domicilios completos) sin el consentimiento explícito de sus tutores.</li>
                <li>PlaneaDocente actúa como encargado del tratamiento (procesador de datos) y el maestro como responsable, de conformidad con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</li>
                <li>Aplicamos medidas técnicas de seguridad (cifrado, RLS en base de datos, acceso por roles) para proteger la información de los menores.</li>
              </ul>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">8</span>
                Limitación de responsabilidad
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>PlaneaDocente proporciona el servicio "tal como está" y no garantiza disponibilidad ininterrumpida. Nos esforzamos por mantener una disponibilidad del 99% mensual.</li>
                <li>No somos responsables por pérdida de datos causada por mal uso del usuario, fallas en dispositivos del usuario o interrupciones de proveedores externos (Supabase, Vercel, Stripe).</li>
                <li>En ningún caso la responsabilidad total de PlaneaDocente excederá el monto pagado por el usuario en los últimos 3 meses de suscripción.</li>
                <li>Las imágenes generadas con IA son creadas por algoritmos externos. PlaneaDocente no garantiza su precisión, calidad o adecuación para todos los usos educativos.</li>
              </ul>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">9</span>
                Modificaciones a los términos
              </h2>
              <p>
                PlaneaDocente puede actualizar estos Términos de Servicio cuando sea necesario. Te notificaremos
                los cambios significativos por correo electrónico con al menos <strong>15 días de anticipación</strong>.
                El uso continuado de la plataforma después de la fecha efectiva de los cambios constituye tu aceptación.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">10</span>
                Ley aplicable y jurisdicción
              </h2>
              <p>
                Estos Términos de Servicio se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>.
                Para cualquier controversia derivada del uso de PlaneaDocente, las partes se someten a la
                jurisdicción de los tribunales competentes de la <strong>Ciudad de México</strong>,
                renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios
                presentes o futuros.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-violet-50 rounded-2xl p-6 border border-violet-100">
              <h2 className="text-lg font-bold text-violet-900 mb-3">📬 Contacto legal</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700">Soporte general</p>
                  <a href="mailto:soporte@planeadocente.com" className="text-violet-600 hover:underline">soporte@planeadocente.com</a>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Asuntos legales</p>
                  <a href="mailto:legal@planeadocente.com" className="text-violet-600 hover:underline">legal@planeadocente.com</a>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Cancelaciones y facturación</p>
                  <a href="mailto:facturacion@planeadocente.com" className="text-violet-600 hover:underline">facturacion@planeadocente.com</a>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Sitio web</p>
                  <a href="https://www.planeadocente.com" className="text-violet-600 hover:underline">www.planeadocente.com</a>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link href="/privacidad" className="hover:text-violet-600 transition-colors">Aviso de Privacidad</Link>
          <span>·</span>
          <Link href="/terminos" className="hover:text-violet-600 transition-colors">Términos de Servicio</Link>
          <span>·</span>
          <Link href="/" className="hover:text-violet-600 transition-colors">Inicio</Link>
        </div>
        <p>© {new Date().getFullYear()} PlaneaDocente.com — Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
