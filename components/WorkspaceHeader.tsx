'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings } from 'lucide-react';

interface WorkspaceHeaderProps {
  workspaceId: number;
  workspaceName: string;
}

export function WorkspaceHeader({ workspaceId, workspaceName }: WorkspaceHeaderProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/dashboard/workspace/${workspaceId}`, label: 'Tareas', icon: LayoutDashboard },
    { href: `/dashboard/workspace/${workspaceId}/team`, label: 'Equipo', icon: Users },
    { href: `/dashboard/workspace/${workspaceId}/settings`, label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con título del workspace */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-white">{workspaceName}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Workspace ID: {workspaceId}</p>
        </div>
      </header>

      {/* Sub-navegación de pestañas del Workspace - PERSISTENTE */}
      <nav className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-4" aria-label="Navegación del workspace">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                isActive
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}