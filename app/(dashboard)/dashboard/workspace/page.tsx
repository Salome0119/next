'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserWorkspaces } from '@/app/actions/workspace-actions';
import { InviteMemberModal } from '@/components/InviteMemberModal';

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  user_role: string;
}

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

  useEffect(() => {
    const loadWorkspaces = async () => {
      setLoading(true);
      try {
        const data = await getUserWorkspaces();
        setWorkspaces(data);
      } catch (err) {
        setError('Error cargando workspaces');
        console.error('Error loading workspaces:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaces();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'member': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'admin': return 'Admin';
      case 'member': return 'Miembro';
      default: return role;
    }
  };

  const handleCreateWorkspace = () => {
    router.push('/dashboard/workspace/new');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <main className="flex-1 pt-14 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <main className="flex-1 pt-14">
        <div className="max-w-4xl mx-auto w-full p-4 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-400 font-orbitron tracking-wider">Workspaces</h1>
              <p className="text-slate-500 text-sm mt-1">Gestiona y accede a tus espacios de trabajo</p>
            </div>
            <button
              onClick={handleCreateWorkspace}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo workspace
            </button>
          </header>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
              {error}
            </div>
          )}

          {workspaces.length === 0 ? (
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-10 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-slate-300 mb-2">No tienes workspaces aún</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                Crea tu primer workspace para empezar a organizar tus tareas y colaborar con tu equipo
              </p>
              <button
                onClick={handleCreateWorkspace}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear workspace
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
{workspaces.map(workspace => (
                <div key={workspace.id} className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 hover:border-blue-500/50 hover:bg-slate-800/70 transition-all duration-200 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/dashboard/workspace/${workspace.id}`} className="block">
                        <h3 className="text-lg font-semibold text-slate-100 truncate">{workspace.name}</h3>
                        {workspace.description && (
                          <p className="text-slate-500 text-sm mt-1 truncate">{workspace.description}</p>
                        )}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getRoleColor(workspace.user_role)} flex-shrink-0`}>
                        {getRoleLabel(workspace.user_role)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedWorkspaceId(workspace.id);
                          setShowInviteModal(true);
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                        aria-label={`Invitar a ${workspace.name}`}
                        title="Invitar miembros"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-auto text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {workspace.user_role === 'owner' ? 'Tu workspace' : 'Invitado'}
                    </span>
                    <Link href={`/dashboard/workspace/${workspace.id}`} className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 002-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Tareas
                    </Link>
                  </div>
                </div>
              ))}
            </div>
)}
        </div>
</main>
    {selectedWorkspaceId && (
      <InviteMemberModal
        workspaceId={selectedWorkspaceId}
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setSelectedWorkspaceId(null);
        }}
        onSuccess={() => {
          // Reload workspaces to show updated invitation status
          getUserWorkspaces().then(setWorkspaces);
        }}
      />
    )}
  </div>
  );
}