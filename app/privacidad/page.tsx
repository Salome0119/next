import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { ShieldCheck, Check, ArrowLeft, Lock, User, Building2, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Cómo recopilamos, almacenamos y protegemos los datos esenciales de cuenta y workspaces de PlanAI.',
};

const collectedData = [
  { icon: User, text: 'Datos de cuenta: nombre, correo electrónico y contraseña (almacenada únicamente como hash cifrado).' },
  { icon: Building2, text: 'Datos de workspaces: nombre del espacio, miembros invitados, roles y tareas creadas.' },
  { icon: Sparkles, text: 'Preferencias de uso: idioma, tema, nivel de creatividad de la IA e historial de uso de IA para mostrar tus métricas.' },
];

const notCollected = [
  'Datos bancarios o información de tarjetas de pago.',
  'Ubicación en tiempo real ni hábitos de navegación fuera de PlanAI.',
  'Datos biométricos ni información personal sensible ajena a tu cuenta.',
];

export default function PrivacidadPage() {
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
              <ShieldCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-violet-400 font-semibold">Legal</p>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
                Política de Privacidad
              </h1>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8">
            En PlanAI tu privacidad es lo primero. Recopilamos únicamente los datos esenciales para que el producto
            funcione: los necesarios para tu cuenta, tus workspaces y el contenido que creas. Nunca comercializamos
            ni vendemos tus datos a terceros.
          </p>

          {/* Datos recopilados */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-violet-400" aria-hidden="true" />
              Qué datos recopilamos
            </h2>
            <ul className="space-y-3">
              {collectedData.map((item, index) => {
                const Icon = item.icon;
                return (
                  <li key={index} className="flex items-start gap-3 bg-slate-800/40 border border-slate-800 rounded-xl px-4 py-3">
                    <Icon className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-slate-300 text-sm leading-relaxed">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Almacenamiento */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Cómo almacenamos tus datos</h2>
            <p className="text-slate-400 leading-relaxed">
              Tus datos se almacenan de forma segura en nuestra infraestructura de base de datos. Las contraseñas se
              guardan únicamente como hash irreversible, y las comunicaciones viajan cifradas. Aplicamos acceso con
              permisos mínimos y nunca almacenamos tus datos en texto plano.
            </p>
          </section>

          {/* Lo que NO recopilamos */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Lo que no recopilamos</h2>
            <ul className="space-y-2">
              {notCollected.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-slate-400 text-sm leading-relaxed">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Terceros y tus derechos */}
          <section className="mb-8">
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Sin comercialización a terceros</h2>
            <p className="text-slate-400 leading-relaxed">
              PlanAI no vende, alquila ni comparte tus datos personales con empresas externas con fines comerciales.
              Los proveedores técnicos que nos ayudan a operar el servicio (por ejemplo, el alojamiento de la base de
              datos) actúan bajo obligación contractual de confidencialidad y únicamente procesan datos bajo nuestras
              instrucciones.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-slate-100 mb-4">Tus derechos</h2>
            <p className="text-slate-400 leading-relaxed">
              Puedes exportar una copia de tus datos y eliminar tu cuenta en cualquier momento desde
              Ajustes → Cuenta. Al eliminar tu cuenta, tus datos se borran de forma permanente. Si tienes dudas,
              escríbenos desde <Link href="/contacto" className="text-violet-300 hover:text-violet-200 transition-colors font-medium">Contacto</Link>.
            </p>
          </section>
        </div>

        {/* Footer legal */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} PlanAI. Todos los derechos reservados.</p>
          <nav className="flex items-center gap-6" aria-label="Enlaces legales">
            <Link href="/terminos" className="hover:text-violet-300 transition-colors">Términos</Link>
            <Link href="/contacto" className="hover:text-violet-300 transition-colors">Contacto</Link>
            <Link href="/" className="hover:text-violet-300 transition-colors">Inicio</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}
