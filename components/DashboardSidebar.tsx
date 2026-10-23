'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Zap, Users, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface Tarea {
  id: number;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  completado: boolean;
  fecha_entrega?: string | null;
  creado_en: string;
  workspace_id?: number | null;
  assigned_to_user_id?: number | null;
}

interface DashboardSidebarProps {
  tasks: Tarea[];
}

export function DashboardSidebar({ tasks }: DashboardSidebarProps) {
  const { t, isReady, language } = useTranslation();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completado).length;
    const pending = tasks.filter((t) => !t.completado).length;
    const todayTasks = tasks.filter((t) => {
      const createdToday = t.creado_en && new Date(t.creado_en).toISOString().slice(0, 10) === todayStr;
      const dueToday = t.fecha_entrega && new Date(t.fecha_entrega).toISOString().slice(0, 10) === todayStr;
      return createdToday || dueToday;
    }).length;
    const todayCompleted = tasks.filter((t) => 
      t.completado && t.creado_en && new Date(t.creado_en).toISOString().slice(0, 10) === todayStr
    ).length;

    return { total, completed, pending, todayTasks, todayCompleted };
  }, [tasks]);

  const statItems = [
    { labelKey: 'dashboard.total', value: stats.total, icon: TrendingUp, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { labelKey: 'dashboard.pending', value: stats.pending, icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { labelKey: 'dashboard.completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { label: isEn ? "Today's tasks" : "Tareas de hoy", value: stats.todayTasks, icon: Zap, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  ];

  if (loading || !isReady) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-800/50 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" aria-hidden="true" />
          {t('dashboard.summary')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((stat, index) => (
            <div
              key={index}
              className={`p-3 rounded-xl border ${stat.color} hover:border-opacity-50 transition-colors`}
            >
              <div className="flex items-center justify-between mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color.replace('bg-', '').replace('border-', 'text-')}`} aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.labelKey ? t(stat.labelKey) : stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-400" aria-hidden="true" />
          {t('dashboard.quickAccess')}
        </h3>
        <Link
          href="/generador"
          className="block p-4 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 hover:border-violet-500/50 hover:bg-violet-600/30 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 dark:text-slate-100 font-medium truncate">{t('nav.aiGenerator')}</p>
              <p className="text-xs text-slate-500">{t('dashboard.aiGeneratorDesc')}</p>
            </div>
            <svg className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </section>

      <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" aria-hidden="true" />
          {t('workspace.team')}
        </h3>
        <div className="space-y-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
            {t('workspace.noMembersDesc')}
          </p>
        </div>
      </section>
    </div>
  );
}