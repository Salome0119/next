'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { WorkspaceSelector } from '@/components/WorkspaceSelector';
import { InviteMemberModal } from '@/components/InviteMemberModal';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  workspaceId: number;
  workspaceName: string;
}

export function WorkspaceLayout({ children, workspaceId, workspaceName }: WorkspaceLayoutProps) {
  const pathname = usePathname();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const navItems = [
    { href: `/dashboard/workspace/${workspaceId}`, label: 'Tareas', icon: '📋' },
    { href: `/dashboard/workspace/${workspaceId}/team`, label: 'Equipo', icon: '👥' },
    { href: `/dashboard/workspace/${workspaceId}/settings`, label: 'Ajustes', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo and workspace navigation */}
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/workspace/${workspaceId}`} className="flex items-center gap-2 text-xl font-bold text-blue-400">
                <span>📝</span> TaskFlow
              </Link>
              <span className="px-3 py-1 text-sm font-medium text-blue-300 bg-blue-600/20 rounded-lg border border-blue-500/30">
                {workspaceName}
              </span>
            </div>

            {/* Center: Nav tabs (hidden on mobile) */}
            <div className="flex items-center gap-1 hidden md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Right: Workspace Selector + Invite Button */}
            <div className="flex items-center gap-3">
              <WorkspaceSelector />
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="hidden sm:inline">Invitar miembros</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 pb-safe">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                pathname === item.href
                  ? 'text-blue-300'
                  : 'text-slate-500 hover:text-white'
              }`}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              <span aria-hidden="true" className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Invite Modal */}
      <InviteMemberModal
        workspaceId={workspaceId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {}}
      />

      <main className="flex-1 pt-14 pb-safe md:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}