'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { AiUsageSection } from '@/components/settings/AiUsageSection';
import { AccountSection } from '@/components/settings/AccountSection';
import { AvatarSection } from '@/components/settings/AvatarSection';
import { useTranslation } from '@/context/LanguageContext';

type Tab = 'profile' | 'security' | 'preferences' | 'avatar' | 'ai-usage' | 'account';

function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function SlidersIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  );
}

function CpuIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function UserCogIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function AvatarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 11h.01M14.5 11h.01M9.5 14.5c.8.7 1.6 1 2.5 1s1.7-.3 2.5-1" />
    </svg>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();

  // Keep the first render deterministic so it matches the SSR output; the
  // ?tab= query param is applied after mount (see effect below).
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const tabs = useMemo(() => [
    { id: 'profile' as Tab, label: t('settings.tabs.profile'), icon: <UserIcon />, href: '/dashboard/settings?tab=profile' },
    { id: 'security' as Tab, label: t('settings.tabs.security'), icon: <ShieldIcon />, href: '/dashboard/settings?tab=security' },
    { id: 'preferences' as Tab, label: t('settings.tabs.preferences'), icon: <SlidersIcon />, href: '/dashboard/settings?tab=preferences' },
    { id: 'avatar' as Tab, label: 'Avatar 3D', icon: <AvatarIcon />, href: '/dashboard/settings?tab=avatar' },
    { id: 'ai-usage' as Tab, label: t('settings.tabs.aiUsage'), icon: <CpuIcon />, href: '/dashboard/settings?tab=ai-usage' },
    { id: 'account' as Tab, label: t('settings.tabs.account'), icon: <UserCogIcon />, href: '/dashboard/settings?tab=account' },
  ], [t]);

  // Sync with URL changes (browser back/forward, direct navigation)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab') as Tab;
    if (tab && tabs.some(t => t.id === tab) && tab !== activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab);
    }
  }, [tabs, activeTab]);

  const renderTabContent = (tab: Tab) => {
    switch (tab) {
      case 'profile':
        return <ProfileSection />;
      case 'security':
        return <SecuritySection />;
      case 'preferences':
        return <PreferencesSection />;
      case 'avatar':
        return <AvatarSection />;
      case 'ai-usage':
        return <AiUsageSection />;
      case 'account':
        return <AccountSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
              <SlidersIcon className="w-6 h-6" />
            </span>
            {t('settings.title')}
          </h1>
          <p className="text-muted mt-2">{t('settings.subtitle')}</p>
        </header>

        {/* Tab Navigation + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <aside className="lg:col-span-1">
            <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={(tab: string) => setActiveTab(tab as Tab)} />
          </aside>

          {/* Tab Content */}
          <div className="lg:col-span-3">
            <Suspense fallback={
              <div className="card rounded-2xl p-8 animate-pulse border border-border bg-card">
                <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
              </div>
            }>
              {renderTabContent(activeTab)}
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}