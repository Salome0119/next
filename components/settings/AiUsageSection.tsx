'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getSettingsAction } from '@/app/actions/settings-actions';
import { formatNumber, getMonthLabel } from '@/lib/utils';
import { useTranslation } from '@/context/LanguageContext';
import { Zap, Sparkles, Cpu, History, Clock, BadgePercent, X, Copy, ChevronRight } from 'lucide-react';

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
  response?: string | null;
  tokensUsed: number;
  model: string;
  createdAt: Date | string;
}

interface UserSettings {
  theme: string;
  language: string;
  emailNotifications: boolean;
  weeklyDigest: boolean;
  taskLimitAlerts: boolean;
  aiCreativityLevel: string;
  // other settings fields
}

interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
  avatarUrl?: string | null;
  // other user fields
}

interface SettingsData {
  settings: UserSettings | null;
  aiUsage: AiUsageMetrics | null;
  aiHistory: AiGenerationHistory[];
  user: UserProfile | null;
}

const STANDALONE_BOLD_TITLE = /^\*{1,2}[^*\n]+\*{1,2}[::]?\s*$/;

function normalizeMarkdownBlocks(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  for (const line of lines) {
    const previous = output[output.length - 1];
    const previousIsBlank = previous === undefined || previous.trim() === '';
    if (!previousIsBlank && STANDALONE_BOLD_TITLE.test(line.trim())) {
      output.push('');
    }
    output.push(line);
  }
  return output.join('\n');
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  h1: ({ children }) => <h1 className="!mt-5 text-base font-semibold text-white first:!mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="!mt-5 text-base font-semibold text-white first:!mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="!mt-4 text-sm font-semibold text-white first:!mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="!mt-4 text-sm font-semibold text-white first:!mt-0">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
};

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

  const metricCards = [
    {
      label: t('settings.aiUsage.creditsUsed'),
      value: formatNumber(metrics.tokensUsed),
      icon: Zap,
      color: 'from-purple-500 to-indigo-500',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: t('settings.aiUsage.generationsRealized'),
      value: formatNumber(metrics.generationsCount),
      icon: Sparkles,
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-500/10 border-pink-500/20',
      iconColor: 'text-pink-400',
    },
  ];

  return (
    <div className="card-glass rounded-2xl p-6 border border-slate-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" aria-hidden="true" />
          {t('settings.aiUsage.monthlyUsage')} - {getMonthLabel(metrics.month)}
        </h3>
        <span className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-800/50 rounded-full flex items-center gap-1">
          <BadgePercent className="w-3 h-3" aria-hidden="true" />
          {t('settings.aiUsage.resetDate')}: {formatNumber(metrics.tokensLimit)} tokens
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {metricCards.map((card, index) => (
          <div
            key={index}
            className={`group relative rounded-2xl p-5 border transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1 ${card.bgColor}`}
          >
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${card.color}`}/>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-xl ${card.iconColor} bg-white/5`}>
                  <card.icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <p className="text-sm text-slate-400 font-medium">{card.label}</p>
              </div>
              <p className="text-2xl font-bold text-slate-100 tracking-tight">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <ProgressBar progress={progress} label={t('settings.aiUsage.monthlyUsage')} color={progressColor} />
    </div>
  );
}

function AiGenerationHistoryList({ history, t }: { history: AiGenerationHistory[]; t: (key: string) => string }) {
  const [selectedItem, setSelectedItem] = useState<AiGenerationHistory | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeModal = () => {
    setSelectedItem(null);
  };

  useEffect(() => {
    if (!selectedItem) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedItem(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimeout = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimeout);
    };
  }, [selectedItem]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.warn('[CLIPBOARD ERROR]', error);
    }
  };

  const formatHistoryDate = (value: Date | string, withSeconds = false) =>
    new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' as const } : {}),
    });

  if (history.length === 0) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center border border-slate-700/50">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
          <History className="w-8 h-8 text-slate-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">{t('settings.aiUsage.noUsage')}</h3>
        <p className="text-slate-500">{t('settings.aiUsage.noUsageDesc')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-glass rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" aria-hidden="true" />
            {t('settings.aiUsage.usageHistory')}
          </h3>
        </div>
        <div className="divide-y divide-slate-700/50">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group w-full p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 border-l-4 border-transparent hover:border-purple-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500/60"
              aria-label={`${t('settings.aiUsage.viewDetails')}: ${item.prompt}`}
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5 text-purple-400" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-100 truncate" title={item.prompt}>
                    {item.prompt.length > 80 ? item.prompt.substring(0, 80) + '...' : item.prompt}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{item.model}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  <span className="whitespace-nowrap">
                    {formatHistoryDate(item.createdAt)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 font-medium">
                  <Zap className="w-3 h-3 text-amber-400" aria-hidden="true" />
                  {formatNumber(item.tokensUsed)}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors flex-shrink-0 self-center" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-history-modal-title"
        >
          <div
            className="relative w-[calc(100%-2rem)] max-w-lg mx-auto h-fit max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-purple-400/40 bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-purple-600/20 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-purple-400/25" aria-hidden="true" />

            <div className="relative flex items-center justify-between gap-4 border-b border-purple-400/20 bg-purple-500/5 px-4 py-4 sm:px-6">
              <h3 id="ai-history-modal-title" className="text-base sm:text-lg font-semibold text-slate-100 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 border border-purple-400/30">
                  <Cpu className="w-4 h-4 text-purple-300" aria-hidden="true" />
                </span>
                {t('settings.aiUsage.detailTitle')}
              </h3>
              <button
                ref={closeButtonRef}
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-purple-500/15 border border-transparent hover:border-purple-400/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                aria-label={t('settings.aiUsage.close')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto scrollbar-thin px-4 py-4 sm:px-6 space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300/80 mb-1.5">
                  {t('settings.aiUsage.promptLabel')}
                </p>
                <div className="flex items-start justify-between gap-3 rounded-xl border border-purple-400/25 bg-purple-500/5 px-4 py-3">
                  <p className="font-mono text-sm sm:text-base font-semibold text-purple-200 break-all leading-snug" title={selectedItem.prompt}>
                    {selectedItem.prompt}
                  </p>
                  <button
                    onClick={() => copyToClipboard(selectedItem.prompt)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    title={t('settings.aiUsage.copyPrompt')}
                    aria-label={t('settings.aiUsage.copyPrompt')}
                  >
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{t('settings.aiUsage.dateTime')}</p>
                  <p className="text-slate-100 font-mono text-xs sm:text-sm leading-snug">
                    {formatHistoryDate(selectedItem.createdAt, true)}
                  </p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{t('settings.aiUsage.modelLabel')}</p>
                  <p className="text-slate-100 font-mono text-xs sm:text-sm break-all leading-snug">{selectedItem.model}</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-400/20 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-amber-200/70 uppercase tracking-widest mb-1">{t('settings.aiUsage.tokensConsumed')}</p>
                  <p className="text-slate-100 font-bold text-base sm:text-lg flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    {formatNumber(selectedItem.tokensUsed)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-300/80">
                  {t('settings.aiUsage.aiResponse')}
                </p>
                <div className="rounded-xl border border-purple-400/20 bg-slate-950/70 max-h-[38vh] overflow-x-auto overflow-y-auto scrollbar-thin p-4 shadow-inner">
                  {selectedItem.response ? (
                    <div className="font-sans text-sm text-slate-200 leading-relaxed space-y-3 break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {normalizeMarkdownBlocks(selectedItem.response)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">{t('settings.aiUsage.noResponse')}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="relative border-t border-purple-400/20 bg-slate-900/60 px-5 py-4 sm:px-6">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold tracking-wide transition-all duration-200 shadow-lg shadow-purple-600/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                {t('settings.aiUsage.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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