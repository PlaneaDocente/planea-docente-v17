// RUTA: src/app/privacidad/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Aviso de Privacidad — PlaneaDocente",
  description: "Aviso de Privacidad de PlaneaDocente.com conforme a la LFPDPPP de México",
};

export default function PrivacidadPage() {
  const fecha = "16 de junio de 2026";
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-violet-700 font-bold text-lg">
            🎓 PlaneaDocente
          </Link>
          <Link href="/login" className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12">
          <div className="mb-10 pb-8 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              🔒 Aviso Legal — LFPDPPP México
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Aviso de Privacidad</h1>
            <p className="text-slate-500 text-sm">Última actualización: {fecha}</p>
            <p className="text-slate-600 mt-3 leading-relaxed">
              En cumplimiento a lo dispuesto por la <strong>Ley Federal de Protección de Datos Personales
              en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento, <strong>PlaneaDocente</strong> pone
              a disposición el presente Aviso de Privacidad.
            </p>
          </div>
          <div className="space-y-10 text-slate-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                Identidad y domicilio del Responsable
              </h2>
              <div className="bg-slate-50 rounded-2xl p-5">
                <table className="text-sm w-full">
                  <tbody className="space-y-2">
                    <tr className="border-b border-slate-200"><td className="py-2 font-semibold text-slate-600 w-40">Responsable</td><td className="py-2">PlaneaDocente</td></tr>
                    <tr className="border-b border-slate-200"><td className="py-2 font-semibold text-slate-600">Sitio web</td><td className="py-2"><a href="https://www.planeadocente.com" className="text-violet-600 hover:underline">www.planeadocente.com</a></td></tr>
                    <tr className="border-b border-slate-200"><td className="py-2 font-semibold text-slate-600">País</td><td className="py-2">México</td></tr>
                    <tr><td className="py-2 font-semibold text-slate-600">Contacto</td><td className="py-2"><a href="mailto:privacidad@planeadocente.com" className="text-violet-600 hover:underline">privacidad@planeadocente.com</a></td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                Datos personales que recabamos
              </h2>
              <p className="mb-4">Recabamos las siguientes categorías de datos personales:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { cat:"Datos de identificación", items:["Nombre completo","Correo electrónico","Foto de perfil (opcional, via Google)"] },
                  { cat:"Datos de contacto", items:["Teléfono (opcional)","Correo electrónico"] },
                  { cat:"Datos académicos del maestro", items:["Nombre de escuela","Grado y grupo","Planeaciones y evaluaciones"] },
                  { cat:"Datos de pago", items:["Procesados por Stripe (no almacenamos datos de tarjeta)","Historial de suscripción"] },
                  { cat:"Datos de uso", items:["Dirección IP","Navegador y dispositivo","Páginas visitadas en la plataforma"] },
                  { cat:"Datos de alumnos (tratados por el maestro)", items:["Nombre del alumno","Asistencia","Calificaciones y evaluaciones"] },
                ].map(c => (
                  <div key={c.cat} className="bg-slate-50 rounded-xl p-4">
                    <p className="font-semibold text-slate-800 mb-2 text-sm">{c.cat}</p>
                    <ul className="text-sm space-y-1">{c.items.map(i => <li key={i} className="flex items-center gap-2"><span className="text-violet-500">•</span>{i}</li>)}</ul>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Datos de menores de edad:</strong> La información académica de alumnos es ingresada
                  directamente por el maestro (Responsable del tratamiento). PlaneaDocente actúa como
                  <strong> Encargado del tratamiento</strong> y no utiliza estos datos para fines propios.
                  El maestro es responsable de contar con el consentimiento de los tutores cuando corresponda.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                Finalidades del tratamiento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-slate-800 mb-3 text-sm">Finalidades primarias (necesarias para el servicio)</p>
                  <ul className="space-y-2 text-sm">
                    {["Crear y gestionar tu cuenta de usuario","Procesar pagos y gestionar suscripciones","Prestación del servicio educativo SaaS","Enviar notificaciones del servicio (facturas, alertas de cuenta)","Soporte técnico y atención al cliente","Cumplir obligaciones legales y fiscales"].map(f => (
                      <li key={f} className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span>{f}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-3 text-sm">Finalidades secundarias (puedes oponerte)</p>
                  <ul className="space-y-2 text-sm">
                    {["Envío de correos promocionales y novedades de PlaneaDocente","Encuestas de satisfacción del servicio","Análisis estadístico de uso para mejorar la plataforma"].map(f => (
                      <li key={f} className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">○</span>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-sm mt-4 text-slate-500">
                Para oponerte al tratamiento con finalidades secundarias, escribe a{" "}
                <a href="mailto:privacidad@planeadocente.com" className="text-violet-600 hover:underline">privacidad@planeadocente.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                Proveedores y transferencias de datos
              </h2>
              <p className="mb-4">PlaneaDocente utiliza proveedores tecnológicos de terceros para operar el servicio:</p>
              <div className="overflow-x-auto">
                <table className="text-sm w-full border-collapse">
                  <thead>
                    <tr className="bg-violet-50">
                      <th className="text-left p-3 rounded-tl-lg font-semibold text-slate-700">Proveedor</th>
                      <th className="text-left p-3 font-semibold text-slate-700">Uso</th>
                      <th className="text-left p-3 rounded-tr-lg font-semibold text-slate-700">País</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Supabase","Base de datos, autenticación y almacenamiento","EE.UU."],
                      ["Vercel","Infraestructura del sitio web","EE.UU."],
                      ["Stripe","Procesamiento de pagos","EE.UU."],
                      ["Google OAuth","Inicio de sesión con Google","EE.UU."],
                      ["Groq","Generación de texto con IA (prompts educativos)","EE.UU."],
                      ["Pollinations.ai","Generación de imágenes educativas","Europa"],
                    ].map(([p,u,pa],i) => (
                      <tr key={p} className={i%2===0?"bg-slate-50":""}>
                        <td className="p-3 font-medium text-violet-700">{p}</td>
                        <td className="p-3 text-slate-600">{u}</td>
                        <td className="p-3 text-slate-500">{pa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm mt-3 text-slate-500">
                Todos los proveedores cuentan con políticas de privacidad y medidas de seguridad adecuadas.
                No vendemos ni compartimos tus datos personales con terceros para fines comerciales propios.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
                Derechos ARCO
              </h2>
              <p className="mb-4">
                Tienes derecho a <strong>Acceder, Rectificar, Cancelar u Oponerte (ARCO)</strong> al
                tratamiento de tus datos personales en cualquier momento.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { letra:"A", nombre:"Acceso", desc:"Conocer qué datos tenemos sobre ti" },
                  { letra:"R", nombre:"Rectificación", desc:"Corregir datos inexactos o incompletos" },
                  { letra:"C", nombre:"Cancelación", desc:"Solicitar la eliminación de tus datos" },
                  { letra:"O", nombre:"Oposición", desc:"Oponerte al tratamiento para ciertos fines" },
                ].map(d => (
                  <div key={d.letra} className="bg-violet-50 rounded-xl p-4 text-center">
                    <span className="text-2xl font-black text-violet-600">{d.letra}</span>
                    <p className="font-semibold text-slate-800 text-sm mt-1">{d.nombre}</p>
                    <p className="text-xs text-slate-500 mt-1">{d.desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <p className="font-semibold mb-2">Para ejercer tus derechos ARCO:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Envía un correo a <a href="mailto:privacidad@planeadocente.com" className="text-violet-600 hover:underline">privacidad@planeadocente.com</a></li>
                  <li>Indica en el asunto: "Ejercicio de Derechos ARCO"</li>
                  <li>Incluye tu nombre completo y correo de registro</li>
                  <li>Describe claramente el derecho que deseas ejercer</li>
                  <li>Responderemos en un plazo máximo de <strong>20 días hábiles</strong></li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">6</span>
                Seguridad de los datos
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Todos los datos se transmiten con cifrado <strong>TLS/HTTPS</strong>.</li>
                <li>La base de datos utiliza <strong>Row Level Security (RLS)</strong> — cada maestro solo puede ver sus propios datos.</li>
                <li>Las contraseñas se almacenan con hash seguro (gestionado por Supabase Auth).</li>
                <li>Los datos de tarjetas de crédito son procesados directamente por <strong>Stripe</strong> (PCI DSS compliant) — PlaneaDocente nunca almacena datos de tarjeta.</li>
                <li>Realizamos revisiones periódicas de seguridad en nuestra infraestructura.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">7</span>
                Cookies y tecnologías de rastreo
              </h2>
              <p>
                PlaneaDocente utiliza cookies de sesión necesarias para el funcionamiento de la autenticación.
                No utilizamos cookies de rastreo publicitario de terceros. Al usar la plataforma,
                aceptas el uso de cookies de sesión indispensables para el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">8</span>
                Cambios al Aviso de Privacidad
              </h2>
              <p>
                Podemos actualizar este Aviso de Privacidad cuando sea necesario.
                Te notificaremos cambios significativos por correo electrónico con al menos
                <strong> 10 días de anticipación</strong>. La versión vigente siempre estará disponible
                en <a href="https://www.planeadocente.com/privacidad" className="text-violet-600 hover:underline">planeadocente.com/privacidad</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-sm font-bold">9</span>
                Autoridad competente
              </h2>
              <p>
                Si consideras que tus derechos han sido vulnerados, puedes acudir ante el
                <strong> Instituto Nacional de Transparencia, Acceso a la Información y Protección
                de Datos Personales (INAI)</strong>:
              </p>
              <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm">
                <p>🌐 <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">www.inai.org.mx</a></p>
                <p className="mt-1">📞 800 835 4324</p>
              </div>
            </section>

            <section className="bg-violet-50 rounded-2xl p-6 border border-violet-100">
              <h2 className="text-lg font-bold text-violet-900 mb-3">📬 Contacto de Privacidad</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium text-slate-700">Privacidad y ARCO</p><a href="mailto:privacidad@planeadocente.com" className="text-violet-600 hover:underline">privacidad@planeadocente.com</a></div>
                <div><p className="font-medium text-slate-700">Soporte general</p><a href="mailto:soporte@planeadocente.com" className="text-violet-600 hover:underline">soporte@planeadocente.com</a></div>
              </div>
            </section>
          </div>
        </div>
      </main>
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
