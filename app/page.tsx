'use client';

import Link from 'next/link';
import {
  Zap,
  Users,
  BarChart3,
  ArrowRight,
  Lock,
  Sparkles,
  ChevronRight,
  Calendar,
  Target,
  TrendingUp,
  CheckCircle2,
  Shield,
  Globe,
  Check,
  Circle,
  Clock,
  Flag,
  Brain,
  Activity,
  Layers,
} from 'lucide-react';

import AIHeroInteractive3D from '@/components/AIHeroInteractive3D';

const navLinks = [
  { href: '#features', label: 'Características' },
];

const features = [
  {
    icon: Brain,
    title: 'Planificación Automática por IA',
    description: 'Algoritmos inteligentes que organizan, priorizan y programan tus tareas automáticamente según urgencia, importancia y tu ritmo de trabajo.',
  },
  {
    icon: Users,
    title: 'Workspaces Colaborativos',
    description: 'Tableros dinámicos tipo Kanban, asignación de tareas en tiempo real, comentarios y seguimiento de progreso para equipos distribuidos.',
  },
  {
    icon: BarChart3,
    title: 'Métricas de Productividad',
    description: 'Análisis detallado de rendimiento, cumplimiento de objetivos, tiempo invertido y patrones de trabajo para optimización continua.',
  },
];

const benefits = [
  { icon: Calendar, title: 'Agenda Inteligente', desc: 'La IA reorganiza tu día automáticamente ante imprevistos' },
  { icon: Target, title: 'Priorización Automática', desc: 'Framework Eisenhower + ML para enfocarte en lo importante' },
  { icon: TrendingUp, title: 'Insights Semanales', desc: 'Reportes de productividad y sugerencias de mejora' },
  { icon: CheckCircle2, title: 'Cero Olvidos', desc: 'Recordatorios contextuales y seguimiento de dependencias' },
];

const mockTasks = [
  { id: 1, title: 'Diseñar nueva landing page', status: 'completed', progress: 100, assignee: 'María G.' },
  { id: 2, title: 'Implementar autenticación OAuth', status: 'in-progress', progress: 65, assignee: 'Carlos R.' },
  { id: 3, title: 'Configurar pipeline CI/CD', status: 'in-progress', progress: 30, assignee: 'Ana L.' },
  { id: 4, title: 'Revisar seguridad API', status: 'pending', progress: 0, assignee: 'Pedro M.' },
  { id: 5, title: 'Escribir tests unitarios', status: 'pending', progress: 0, assignee: 'Lucía P.' },
  { id: 6, title: 'Documentar endpoints REST', status: 'completed', progress: 100, assignee: 'Jorge K.' },
];

const statusConfig = {
  completed: { color: 'emerald', label: 'Completado', icon: Check },
  'in-progress': { color: 'violet', label: 'En progreso', icon: Clock },
  pending: { color: 'amber', label: 'Pendiente', icon: Circle },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-body antialiased">
      <AIHeroInteractive3D />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-xl font-heading font-bold tracking-tight" aria-label="PlanAI - Inicio">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-lg">P</span>
              <span className="bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">PlanAI</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-slate-300 hover:text-violet-300 transition-colors text-sm font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-slate-300 hover:text-white font-medium transition-colors text-sm px-4 py-2"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center px-4 md:px-8 max-w-7xl mx-auto overflow-hidden pb-16">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-violet-600/15 via-transparent to-transparent blur-3xl" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full py-12 lg:py-20">
            {/* Left Column: Text */}
            <div className="relative z-30 lg:col-span-7 text-left space-y-6">
              <div className="relative mx-auto lg:mx-0 max-w-3xl px-4 py-12 text-left sm:px-6">
                {/* Badge "Nuevo" with glassmorphism */}
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 rounded-full px-4 py-1.5 text-xs backdrop-blur-md mb-8 animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" aria-hidden="true"></span>
                  <span>Nuevo: Asistente IA para planificación de proyectos</span>
                </div>

                {/* Title with gradient text */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-heading font-bold tracking-tight mb-6 animate-slide-up bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(2,6,23,0.85)]">
                  Gestión Inteligente de Tareas y Proyectos con <span className="text-violet-400">IA</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 animate-slide-up delay-100 [text-shadow:0_1px_12px_rgba(2,6,23,0.85),0_0_24px_rgba(2,6,23,0.6)]">
                  PlanAI optimiza tus flujos de trabajo, prioriza tus tareas automáticamente y maximiza tu productividad diaria mediante inteligencia artificial.
                </p>

                {/* CTA Button */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-8 py-3.5 shadow-lg shadow-violet-600/30 hover:shadow-violet-500/50 transition-all duration-300 min-w-[220px] text-base"
                  >
                    Comenzar gratis
                    <ArrowRight className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-slate-400 text-sm animate-fade-in delay-300">
                  <span className="flex items-center gap-1">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    Cifrado AES-256
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" aria-hidden="true" />
                    SOC 2 Type II
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    GDPR Compliant
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4" aria-hidden="true" />
                    99.9% SLA
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Dashboard preview */}
        <section className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 mb-32">
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                {/* Mockup header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Dashboard PlanAI</p>
                      <p className="font-medium text-slate-100">Tareas completadas esta semana: 247</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
                      IA activa
                    </span>
                  </div>
                </div>

                {/* Mockup content grid with visual elements */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left column: Task list with progress */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-300">Tareas recientes</h4>
                      <span className="text-xs text-slate-500">6 tareas · 4 completadas</span>
                    </div>
                    <div className="space-y-3">
                      {mockTasks.map((task) => {
                        const config = statusConfig[task.status];
                        const Icon = config.icon;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 group hover:border-violet-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                task.status === 'completed' 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : task.status === 'in-progress' 
                                  ? 'border-violet-500 text-violet-400' 
                                  : 'border-slate-600 text-transparent'
                              }`}>
                                {task.status === 'completed' && <Check className="w-3.5 h-3.5" />}
                                {task.status === 'in-progress' && <Clock className="w-3.5 h-3.5" />}
                                {task.status === 'pending' && <Circle className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-100 truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        task.status === 'completed' ? 'bg-emerald-500' :
                                        task.status === 'in-progress' ? 'bg-violet-500' :
                                        'bg-slate-600'
                                      }`}
                                      style={{ width: `${task.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-slate-500 w-16 text-right">{task.progress}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                task.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                task.status === 'in-progress' ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' :
                                'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              }`}>
                                {config.label}
                              </span>
                              <span className="text-xs text-slate-500 hidden sm:block">{task.assignee}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right column: Stats cards */}
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500">Productividad semanal</span>
                        <span className="text-2xl font-bold text-emerald-400">+42%</span>
                      </div>
                      <div className="h-20 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-teal-500/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500">Tareas a tiempo</span>
                        <span className="text-2xl font-bold text-cyan-400">95%</span>
                      </div>
                      <div className="h-20 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-transparent to-indigo-500/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500">Tiempo ahorrado</span>
                        <span className="text-2xl font-bold text-violet-400">12 hrs/sem</span>
                      </div>
                      <div className="h-20 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-purple-500/20 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

        {/* Features Section */}
        <section id="features" className="relative py-20 lg:py-32 bg-slate-900/50 border-y border-slate-800/50">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Capacidades principales
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight mb-4">
                Todo lo que necesitas para{' '}
                <span className="bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">gestionar proyectos con IA</span>
              </h2>
              <p className="text-lg text-slate-400">
                Plataforma unificada que combina planificación automática, colaboración en tiempo real y analítica de productividad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
              {features.map((feature, index) => (
                <article
                  key={feature.title}
                  className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-violet-500/40 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-violet-500/10 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform duration-300 mb-4">
                    <feature.icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-2 text-slate-100">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </article>
              ))}
            </div>

            {/* Additional benefits */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
              {benefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="group bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-violet-500/40 rounded-2xl p-6 transition-all duration-300 shadow-sm hover:shadow-violet-500/10 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <benefit.icon className="w-5 h-5 text-violet-400" aria-hidden="true" />
                  </div>
                  <h4 className="font-heading font-semibold mb-1 text-slate-100">{benefit.title}</h4>
                  <p className="text-sm text-slate-400">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative py-12 border-t border-slate-800/80 bg-[#020617]">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-lg">P</span>
                <span className="font-heading font-bold text-xl bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">PlanAI</span>
              </div>
              <p className="text-slate-500 text-sm">
                © {new Date().getFullYear()} PlanAI. Todos los derechos reservados.
              </p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">Privacidad</a>
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">Términos</a>
                <a href="#" className="text-slate-400 hover:text-violet-400 transition-colors text-sm">Contacto</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}