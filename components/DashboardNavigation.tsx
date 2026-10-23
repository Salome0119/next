'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { WorkspaceSelector } from './WorkspaceSelector';
import { InviteMemberModal } from './InviteMemberModal';
import { logoutAction } from '@/app/actions/auth-actions';
import { updateOnboardingStatus } from '@/app/actions/auth-actions';
import { Users, LayoutDashboard, Zap, Settings } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface UserSession {
  id?: string;
  name?: string | null;
  email?: string | null;
  workspaceId?: number | null;
  hasCompletedOnboarding?: boolean;
  avatarUrl?: string | null;
}

interface DashboardNavigationProps {
  session: { user?: UserSession | null } | null;
  pathname?: string;
}

export function DashboardNavigation({ session, pathname = '' }: DashboardNavigationProps) {
  const user = session?.user;
  const isWorkspaceRoute = pathname.startsWith('/dashboard/workspace/');
  const workspaceIdMatch = pathname.match(/^\/dashboard\/workspace\/(\d+)/);
  const currentWorkspaceId = workspaceIdMatch ? Number(workspaceIdMatch[1]) : null;
  const [isRestartingTour, setIsRestartingTour] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, isReady } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const button = document.getElementById('user-menu-button');
        const dropdown = document.getElementById('user-dropdown');
        if (button && dropdown) {
          button.setAttribute('aria-expanded', 'false');
          dropdown.classList.add('opacity-0', 'invisible', 'translate-y-2', 'pointer-events-none');
          dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRestartTour = async () => {
    setIsRestartingTour(true);
    await updateOnboardingStatus(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('planai_onboarding_completed');
    }
    window.location.reload();
  };

  const mainNavItems = [
    { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/generador', labelKey: 'nav.aiGenerator', icon: Zap },
  ];

  const workspaceNavItems = currentWorkspaceId
    ? [
        { href: `/dashboard/workspace/${currentWorkspaceId}`, labelKey: 'nav.tasks', icon: LayoutDashboard },
        { href: `/dashboard/workspace/${currentWorkspaceId}/team`, labelKey: 'nav.team', icon: Users },
        { href: `/dashboard/workspace/${currentWorkspaceId}/settings`, labelKey: 'nav.settings', icon: Settings },
      ]
    : [];

  const centerNavItems = isWorkspaceRoute ? workspaceNavItems : mainNavItems;

  if (!isReady) {
    return (
      <>
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-xl font-heading font-bold text-gradient-primary tracking-tight" aria-label="PlanAI - Inicio">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-lg">P</span>
              <span>PlanAI</span>
            </Link>
            <div className="flex items-center gap-1 hidden md:flex bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-1 rounded-xl shadow-inner">
              {centerNavItems.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors text-slate-500 dark:text-slate-400">
                  <span className="animate-pulse">{item.labelKey}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          {/* Left: Logo PlanAI with link to Dashboard */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-heading font-bold text-gradient-primary tracking-tight"
            aria-label="PlanAI - Inicio"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-heading font-bold text-lg">P</span>
            <span>PlanAI</span>
          </Link>

          {/* Center: Main view selector */}
          <div className="flex items-center gap-1 hidden md:flex bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-1 rounded-xl shadow-inner">
            {centerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  id={item.href === '/generador' ? 'tour-ai-generator' : undefined}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>

{/* Right: Workspace Selector + Invite Button + Profile Menu */}
          <div className="flex items-center gap-3">
            <WorkspaceSelector />
            {isWorkspaceRoute && currentWorkspaceId && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl px-4 py-2 shadow-sm transition-colors hidden sm:flex items-center gap-2"
              >
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>{t('nav.inviteMember')}</span>
              </button>
            )}
            {user && (
              <div className="relative">
                <button
                  id="user-menu-button"
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
                  aria-expanded="false"
                  aria-haspopup="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    const button = e.currentTarget;
                    const isExpanded = button.getAttribute('aria-expanded') === 'true';
                    button.setAttribute('aria-expanded', (!isExpanded).toString());
                    const dropdown = document.getElementById('user-dropdown');
                    if (dropdown) {
                      if (isExpanded) {
                        dropdown.classList.add('opacity-0', 'invisible', 'translate-y-2', 'pointer-events-none');
                        dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
                      } else {
                        dropdown.classList.add('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
                        dropdown.classList.remove('opacity-0', 'invisible', 'translate-y-2', 'pointer-events-none');
                      }
                    }
                  }}
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                  <span className="text-slate-900 dark:text-slate-100 text-sm hidden sm:block max-w-[150px] truncate">
                    {user.name || user.email}
                  </span>
                  <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  id="user-dropdown"
                  ref={dropdownRef}
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 py-1 shadow-lg opacity-0 invisible translate-y-2 transition-all duration-200 pointer-events-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    role="menuitem"
                    onClick={() => {
                      document.getElementById('user-menu-button')?.setAttribute('aria-expanded', 'false');
                      const dropdown = document.getElementById('user-dropdown');
                      if (dropdown) {
                        dropdown.classList.add('opacity-0', 'invisible', 'translate-y-2', 'pointer-events-none');
                        dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
                      }
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.065-2.573c-.94-1.543.826 3.31-2.37 2.37a1.724 1.724 0 001.065-2.573c-.94-1.543.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {t('nav.accountSettings')}
                  </Link>
<hr className="my-1 border-slate-200 dark:border-slate-700" />
                  {user.hasCompletedOnboarding !== false && (
                    <button
                      onClick={handleRestartTour}
                      disabled={isRestartingTour}
                      className="w-full text-left px-4 py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                      role="menuitem"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isRestartingTour ? t('common.loading') : t('nav.restartTour')}
                      </button>
                    )}
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        role="menuitem"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('nav.logout')}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile Navigation - Executive Style */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 pb-safe">
          <div className="flex justify-around py-2 bg-slate-100/80 dark:bg-slate-900/80 border-y border-slate-200 dark:border-slate-800/80 mx-4 rounded-t-xl shadow-xl">
            {centerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </nav>

      {/* Invite Modal - only on workspace routes */}
      {isWorkspaceRoute && currentWorkspaceId && (
        <InviteMemberModal
          workspaceId={currentWorkspaceId}
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}