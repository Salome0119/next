import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { Scale, Check, ArrowLeft, HandHeart, Sparkles, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos de Servicio',
  description: 'Uso correcto de PlanAI, naturaleza gratuita de la plataforma y compromiso de uso responsable.',
};

const acceptableUse = [
  'Usar PlanAI para gestionar tus propias tareas, proyectos o los de tu equipo.',
  'Invitar únicamente a personas reales a tus workspaces y con su consentimiento.',
  'Emplear el generador de IA como asistente: revisar, editar y validar lo que genera antes de compartirlo.',
];

const unacceptableUse = [
  'Usar la plataforma para generar spam, estafas, contenido ilegal o suplantar identidades.',
  'Intentar vulnerar la seguridad del servicio, sobrecargar la infraestructura o automatizar abusos.',
  'Crear cuentas falsas ni compartir credenciales de terceros sin autorización.',
];

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-body antialiased">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-600/15 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-heading font-bold tracking-tight" aria-label="PlanAI - Inicio">
              <Logo size={28} priority />
              <span className="bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">PlanAI</span>
            </Link>
            <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-violet-300 transition-colors font-medium">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-white/5 p-6 sm:p-10">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
              <Scale className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-violet-400 font-semibold">Legal</p>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
                Términos de Servicio
              </h1>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            Estos términos describen el uso correcto de PlanAI. Al crear una cuenta aceptas jugar limpio con la
            comunidad: la plataforma es gratuita y está pensada para ayudarte a organizar tu trabajo con IA.
          </p>

          {/* Naturaleza gratuita */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" aria-hidden="true" />
              Una plataforma gratuita
            </h2>
            <p className="text-slate-400 leading-relaxed">
              PlanAI es una plataforma gratuita. No cobramos por crear una cuenta ni por acceder a tus tareas,
              workspaces, equipo o al generador de contenido con IA. Si algún día cambia alguna condición, te lo
              comunicaremos de forma clara y anticipada, sin modificar retroactivamente los derechos de tus datos.
            </p>
          </section>

          {/* Uso correcto */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <HandHeart className="w-5 h-5 text-violet-400" aria-hidden="true" />
              Uso correcto
            </h2>
            <ul className="space-y-2">
              {acceptableUse.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Uso indebido */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-violet-400" aria-hidden="true" />
              Uso indebido
            </h2>
            <ul className="space-y-2">
              {unacceptableUse.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-slate-300 text-sm leading-relaxed">
                  <Check className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-slate-500 text-sm mt-3">
              El uso que contravenga estas normas puede suponer la suspensión de la cuenta.
            </p>
          </section>

          {/* Uso responsable de la IA */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Uso responsable de la IA</h2>
            <p className="text-slate-400 leading-relaxed">
              El contenido que genera el asistente es un punto de partida, no un veredicto. Tú eres responsable de
              revisar, corregir y aprobar lo que la IA propone (tareas extraídas, planificaciones o textos) antes de
              compartirlo o convertirlo en tareas oficiales de tu equipo.
            </p>
          </section>

          {/* Disponibilidad y cambios */}
          <section>
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Disponibilidad y cambios</h2>
            <p className="text-slate-400 leading-relaxed">
              Trabajamos para mantener PlanAI siempre disponible, aunque como todo servicio en línea puede haber
              interrupciones puntuales de mantenimiento. Podemos actualizar estas condiciones; cuando lo hagamos,
              avisaremos en el propio producto antes de que apliquen. El uso continuado tras la notificación implica
              la aceptación de las condiciones actualizadas.
            </p>
          </section>
        </div>

        {/* Footer legal */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} PlanAI. Todos los derechos reservados.</p>
          <nav className="flex items-center gap-6" aria-label="Enlaces legales">
            <Link href="/privacidad" className="hover:text-violet-300 transition-colors">Privacidad</Link>
            <Link href="/contacto" className="hover:text-violet-300 transition-colors">Contacto</Link>
            <Link href="/" className="hover:text-violet-300 transition-colors">Inicio</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
