'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getUserWorkspaces } from '@/app/actions/workspace-actions';
import { switchWorkspaceAction } from '@/app/actions/workspace-session';

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  user_role: string;
}

export function WorkspaceSelector() {
  const { data: session, update } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<number | null>(null);
  const currentWorkspaceId = (session?.user as { workspaceId?: number } | undefined)?.workspaceId;

  const loadWorkspaces = async () => {
    try {
      const data = await getUserWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleSwitchWorkspace = async (workspaceId: number) => {
    if (workspaceId === currentWorkspaceId) {
      setIsOpen(false);
      return;
    }
    setSwitching(workspaceId);
    setIsOpen(false);
    try {
      await switchWorkspaceAction(workspaceId);
      // redirect() throws, so this won't be reached
    } catch (error) {
      console.error('Error switching workspace:', error);
      setSwitching(null);
    }
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  
  // Don't show during loading
  if (loading) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
        aria-haspopup="true"
        aria-expanded={isOpen}
        disabled={switching !== null}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
        <span className="text-slate-300 truncate max-w-[150px]">
          {currentWorkspace?.name || 'Seleccionar workspace'}
        </span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 rounded-xl border border-slate-700 shadow-xl z-50 overflow-hidden animate-slide-in">
            <div className="p-2">
              {loading ? (
                <div className="py-4 text-center text-slate-500 text-sm">Cargando...</div>
              ) : (
                <>
                  {workspaces.map(workspace => (
                    <button
                      key={workspace.id}
                      onClick={() => handleSwitchWorkspace(workspace.id)}
                      disabled={switching === workspace.id}
                      className={`w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                        workspace.id === currentWorkspaceId
                          ? 'bg-blue-600/20 text-blue-300'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      } ${switching === workspace.id ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{workspace.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{workspace.user_role}</p>
                      </div>
                      {workspace.id === currentWorkspaceId && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {switching === workspace.id && (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                      )}
                    </button>
                  ))}
                  <hr className="my-2 border-slate-700" />
                  <button
                    onClick={() => window.location.href = '/dashboard/workspace/new'}
                    className="w-full px-3 py-2 rounded-lg text-sm flex items-center gap-3 text-blue-400 hover:bg-slate-700/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Nuevo workspace</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}