import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/outline'; // Asegúrate de tener heroicons o cámbialo por un emoji ✅

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1e293b] rounded-2xl p-8 text-center shadow-2xl border border-blue-500/20">
        <div className="flex justify-center mb-6">
          <div className="bg-green-500/10 p-4 rounded-full">
            <span className="text-5xl">🎉</span>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4">
          ¡Bienvenido al Plan Pro!
        </h1>
        
        <p className="text-gray-400 mb-8">
          Tu suscripción a <strong>PlaneaDocente</strong> se ha activado correctamente. 
          Ya puedes generar planeaciones ilimitadas con IA y acceder a todas las herramientas exclusivas.
        </p>

        <Link 
          href="/dashboard" 
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
        >
          Ir a mi Dashboard
        </Link>
        
        <p className="mt-6 text-sm text-gray-500">
          Se ha enviado un recibo de pago a tu correo electrónico.
        </p>
      </div>
    </div>
  );
}