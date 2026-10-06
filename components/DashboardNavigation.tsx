import Link from 'next/link';
import { WorkspaceSelector } from './WorkspaceSelector';
import { logoutAction } from '@/app/actions/auth-actions';

interface UserSession {
  id?: string;
  name?: string | null;
  email?: string | null;
  workspaceId?: number | null;
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

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📋' },
    { href: '/generador', label: 'Generador IA', icon: '✨' },
  ];

  const workspaceNavItems = currentWorkspaceId
    ? [
        { href: `/dashboard/workspace/${currentWorkspaceId}`, label: 'Tareas', icon: '📋' },
        { href: `/dashboard/workspace/${currentWorkspaceId}/team`, label: 'Equipo', icon: '👥' },
        { href: `/dashboard/workspace/${currentWorkspaceId}/settings`, label: 'Ajustes', icon: '⚙️' },
      ]
    : [];

  const activeNavItems = isWorkspaceRoute ? workspaceNavItems : navItems;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link
            href={isWorkspaceRoute && currentWorkspaceId ? `/dashboard/workspace/${currentWorkspaceId}` : '/dashboard'}
            className="flex items-center gap-2 text-xl font-bold text-blue-400"
          >
            <span>📝</span> TaskFlow
          </Link>

          {isWorkspaceRoute && currentWorkspaceId && (
            <Link
              href={`/dashboard/workspace/${currentWorkspaceId}`}
              className="ml-4 px-3 py-1 text-sm font-medium text-blue-300 bg-blue-600/20 rounded-lg border border-blue-500/30 hidden sm:block"
            >
              Workspace
            </Link>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 hidden md:flex">
              {activeNavItems.map((item) => (
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

            <div className="flex items-center gap-3">
              <WorkspaceSelector />
              {user && (
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm hidden sm:block">
                    {user.name || user.email}
                  </span>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 border border-slate-700 rounded-lg transition-colors"
                    >
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}