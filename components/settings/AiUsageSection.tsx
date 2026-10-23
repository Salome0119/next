'use client';

import { useState, useEffect, Suspense } from 'react';
import { getSettingsAction } from '@/app/actions/settings-actions';
import { formatNumber, getMonthLabel } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';

interface AiUsageMetrics {
  id: number;
  userId: number;
  month: string;
  tokensUsed: number;
  tokensLimit: number;
  generationsCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface AiGenerationHistory {
  id: number;
  userId: number;
  prompt: string;
  tokensUsed: number;
  model: string;
  createdAt: Date | string;
}

interface SettingsData {
  settings: any;
  aiUsage: AiUsageMetrics | null;
  aiHistory: AiGenerationHistory[];
  user: any;
}

async function fetchSettingsData(): Promise<SettingsData> {
  const result = await getSettingsAction();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Error al cargar datos');
  }
  return result.data;
}

// Force table initialization
async function ensureTablesExist() {
  try {
    await fetch('/api/init-ai-tables', { method: 'POST' });
  } catch (e) {
    console.warn('[AI TABLES] Could not initialize via API:', e);
  }
}

function ProgressBar({ progress, label, color = 'purple' }: { 
  progress: number; 
  label: string; 
  color?: 'purple' | 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const colorClasses = {
    purple: 'bg-gradient-to-r from-purple-500 to-indigo-500',
    blue: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    emerald: 'bg-gradient-to-r from-emerald-500 to-green-500',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    red: 'bg-gradient-to-r from-red-500 to-rose-500',
  };

  const progressColor = colorClasses[color] || colorClasses.purple;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="font-medium text-slate-100">{clampedProgress.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`${progressColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function AiUsageMetricsCard({ metrics, t }: { metrics: AiUsageMetrics; t: (key: string) => string }) {
  const progress = metrics.tokensLimit > 0 ? (metrics.tokensUsed / metrics.tokensLimit) * 100 : 0;
  const progressColor = progress >= 90 ? 'red' : progress >= 70 ? 'amber' : 'purple';

  return (
    <div className="card-glass rounded-2xl p-6 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span role="img" aria-label="métricas">📊</span>
          {t('settings.aiUsage.monthlyUsage')} - {getMonthLabel(metrics.month)}
        </h3>
        <span className="px-2 py-1 text-xs font-medium text-slate-400 bg-slate-800/50 rounded-full">
          {t('settings.aiUsage.resetDate')}: {formatNumber(metrics.tokensLimit)} tokens
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/50">
          <p className="text-sm text-slate-500">{t('settings.aiUsage.creditsUsed')}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{formatNumber(metrics.tokensUsed)}</p>
        </div>
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/50">
          <p className="text-sm text-slate-500">{t('settings.aiUsage.generationsCount') || 'Generaciones'}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{metrics.generationsCount}</p>
        </div>
        <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/50">
          <p className="text-sm text-slate-500">{t('settings.aiUsage.creditsRemaining')}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{formatNumber(Math.max(0, metrics.tokensLimit - metrics.tokensUsed))}</p>
        </div>
      </div>

      <ProgressBar progress={progress} label={t('settings.aiUsage.monthlyUsage')} color={progressColor as any} />
    </div>
  );
}

function AiGenerationHistoryList({ history, t }: { history: AiGenerationHistory[]; t: (key: string) => string }) {
  if (history.length === 0) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center border border-slate-700/50">
        <svg className="w-12 h-12 mx-auto mb-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500">{t('settings.aiUsage.noUsage')}</p>
      </div>
    );
  }

  return (
    <div className="card-glass rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <span role="img" aria-label="historial">📜</span>
          {t('settings.aiUsage.usageHistory')}
        </h3>
      </div>
      <div className="divide-y divide-slate-700/50">
        {history.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100 truncate" title={item.prompt}>
                  {item.prompt.length > 100 ? item.prompt.substring(0, 100) + '...' : item.prompt}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(item.createdAt).toLocaleString('es-ES', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {formatNumber(item.tokensUsed)} tokens
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-slate-800 rounded text-slate-400">{item.model}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiUsageSection() {
  const { t } = useTranslation();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        await ensureTablesExist();
        const result = await fetchSettingsData();
        setData(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de uso de IA';
        console.error('[AI USAGE ERROR]', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="card-glass rounded-2xl p-8 animate-pulse" role="tabpanel" id="panel-ai-usage" aria-labelledby="tab-ai-usage">
        <div className="space-y-6">
          <div className="h-8 bg-slate-700/50 rounded w-1/4"></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-32 bg-slate-700/50 rounded-xl"></div>
            <div className="h-32 bg-slate-700/50 rounded-xl"></div>
            <div className="h-32 bg-slate-700/50 rounded-xl"></div>
          </div>
          <div className="h-64 bg-slate-700/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center border border-red-500/30" role="tabpanel" id="panel-ai-usage" aria-labelledby="tab-ai-usage">
        <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-red-400">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          {t('common.next')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="tabpanel" id="panel-ai-usage" aria-labelledby="tab-ai-usage">
      <header className="border-b border-slate-700/50 pb-6">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span role="img" aria-label="uso IA">🤖</span>
          {t('settings.aiUsage.title')}
        </h2>
        <p className="text-slate-500 mt-1">{t('settings.aiUsage.subtitle')}</p>
      </header>

      {data?.aiUsage && (
        <AiUsageMetricsCard metrics={data.aiUsage} t={t} />
      )}

      {data?.aiHistory && (
        <AiGenerationHistoryList history={data.aiHistory} t={t} />
      )}
    </div>
  );
}