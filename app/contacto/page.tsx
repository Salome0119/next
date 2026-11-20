'use client';

import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { Logo } from '@/components/Logo';
import { Mail, ArrowLeft, LifeBuoy, MessageSquarePlus, Send, Check, Inbox, Clock } from 'lucide-react';

const supportEmail = 'soporte@planai.app';

const supportTopics = [
  'Soporte técnico: tu correo de cuenta y el workspace afectado',
  'Los pasos para reproducir el problema o la mejora que propones',
  'Una captura de pantalla si el error es visual (opcional pero ayuda mucho)',
];

export default function ContactoPage() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [tipo, setTipo] = useState<'Sugerencia' | 'Error' | 'Pregunta'>('Sugerencia');
  const [mensaje, setMensaje] = useState('');
  const [status, setStatus] = useState<'idle' | 'opened'>('idle');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!correo.trim() || !mensaje.trim()) return;

    const subject = `[PlanAI] ${tipo}: ${nombre.trim() ? nombre.trim() : 'Sugerencia de la comunidad'}`;
    const body = [
      `Nombre: ${nombre.trim() || 'No indicado'}`,
      `Correo: ${correo.trim()}`,
      `Tipo: ${tipo}`,
      '',
      mensaje.trim(),
    ].join('\n');

    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus('opened');
  };

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

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        {/* Header */}
        <div className="max-w-2xl mb-12">
          <p className="text-[11px] uppercase tracking-widest text-violet-400 font-semibold mb-2">Soporte</p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent mb-4">
            Hablemos
          </h1>
          <p className="text-slate-400 leading-relaxed">
            ¿Tienes una duda, un problema técnico o una idea para mejorar PlanAI? PlanAI se construye escuchando a la
            comunidad. Escríbenos: cada mensaje llega directo al equipo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Soporte */}
          <aside className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-white/5 p-6 sm:p-8 flex flex-col">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 mb-5">
              <LifeBuoy className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-heading font-semibold text-slate-100 mb-2">Canal de soporte</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Nuestro equipo responde tus dudas y revisa cada reporte con atención.
            </p>

            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all px-4 py-3 mb-6 group"
            >
              <Mail className="w-5 h-5 text-violet-400 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Correo de soporte</span>
                <span className="block text-violet-300 font-medium truncate group-hover:text-violet-200 transition-colors">{supportEmail}</span>
              </span>
            </a>

            <div className="flex items-center gap-3 text-slate-400 text-sm mb-6">
              <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" aria-hidden="true" />
              <span>Tiempo de respuesta habitual: 1–3 días laborables</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Para ayudarte más rápido, incluye:</p>
              <ul className="space-y-2">
                {supportTopics.map((topic, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-6 flex items-center gap-2 text-[11px] text-slate-500">
              <Inbox className="w-4 h-4 text-violet-400" aria-hidden="true" />
              Revisamos cada mensaje de la comunidad.
            </div>
          </aside>

          {/* Buzón de sugerencias */}
          <section className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-white/5 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400">
                <MessageSquarePlus className="w-7 h-7" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-semibold text-slate-100">Buzón de sugerencias</h2>
                <p className="text-slate-400 text-sm">Ideas de la comunidad para hacer PlanAI mejor</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contacto-nombre" className="block text-sm font-medium text-slate-300 mb-1.5">Nombre</label>
                  <input
                    id="contacto-nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre (opcional)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="contacto-correo" className="block text-sm font-medium text-slate-300 mb-1.5">Correo *</label>
                  <input
                    id="contacto-correo"
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contacto-tipo" className="block text-sm font-medium text-slate-300 mb-1.5">¿Qué tienes para nosotros?</label>
                <select
                  id="contacto-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'Sugerencia' | 'Error' | 'Pregunta')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all appearance-none"
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <option value="Sugerencia">Sugerencia de mejora</option>
                  <option value="Error">Reportar un error</option>
                  <option value="Pregunta">Pregunta sobre el producto</option>
                </select>
              </div>

              <div>
                <label htmlFor="contacto-mensaje" className="block text-sm font-medium text-slate-300 mb-1.5">Tu mensaje *</label>
                <textarea
                  id="contacto-mensaje"
                  required
                  rows={5}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Describe tu idea, el error que encontraste o la duda que tienes…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 transition-all resize-y"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40 transition-all duration-200"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                Enviar sugerencia
              </button>

              <p className="text-xs text-slate-500">
                Al pulsar enviar se abrirá tu cliente de correo con el mensaje listo para enviar; no guardamos nada en
                PlanAI hasta que decidas enviarlo. Si prefieres escribir tú directamente: {supportEmail}.
              </p>
              {status === 'opened' && (
                <p className="text-xs text-emerald-400 flex items-center gap-1.5" role="status">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Se abrió tu cliente de correo con el mensaje listo. Si no se abrió, escríbenos a {supportEmail}.
                </p>
              )}
            </form>
          </section>
        </div>

        {/* Footer legal */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} PlanAI. Todos los derechos reservados.</p>
          <nav className="flex items-center gap-6" aria-label="Enlaces legales">
            <Link href="/privacidad" className="hover:text-violet-300 transition-colors">Privacidad</Link>
            <Link href="/terminos" className="hover:text-violet-300 transition-colors">Términos</Link>
            <Link href="/" className="hover:text-violet-300 transition-colors">Inicio</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
