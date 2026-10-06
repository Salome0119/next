'use client';

import { useState, useEffect } from 'react';
import { getUserWorkspaces } from '@/app/actions/workspace-actions';
import { createTaskAction, createMultipleTasksAction } from '@/app/actions/task-ai-actions';

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  user_role: string;
}

interface GeneratedTask {
  titulo: string;
  prioridad: string;
  descripcion?: string;
  bloqueHorario?: string;
  duracionMinutos?: number;
}

interface AISaveSelectorProps {
  tasks: GeneratedTask[];
  mode: 'smart-paste' | 'daily-planner' | 'generador-texto';
  onSaveComplete: () => void;
  onCancel: () => void;
}

export function AISaveSelector({ tasks, mode, onSaveComplete, onCancel }: AISaveSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'single' | 'all'>('all');

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await getUserWorkspaces();
        setWorkspaces(data);
      } catch (err) {
        console.error('Error loading workspaces:', err);
      } finally {
        setLoading(false);
      }
    };
    loadWorkspaces();
  }, []);

  const workspaceOptions = [
    { id: 'personal', name: 'Dashboard Principal (Personal)' },
    ...workspaces.map(ws => ({ id: String(ws.id), name: ws.name })),
  ];

  const getWorkspaceName = (id: string | null) => {
    if (!id || id === 'personal') return 'Dashboard Principal (Personal)';
    const ws = workspaces.find(w => String(w.id) === id);
    return ws ? ws.name : 'Desconocido';
  };

  const handleSave = async (tasksToSave: GeneratedTask[]) => {
    if (tasksToSave.length === 0) return;
    
    setSaving(true);
    setError(null);

    try {
      if (tasksToSave.length === 1) {
        const task = tasksToSave[0];
        await createTaskAction({
          title: task.titulo,
          content: task.descripcion || '',
          workspaceId: selectedWorkspaceId,
          priority: task.prioridad as 'alta' | 'media' | 'baja',
        });
      } else {
        await createMultipleTasksAction(
          tasksToSave.map(t => ({
            title: t.titulo,
            content: t.descripcion || '',
            priority: t.prioridad as 'alta' | 'media' | 'baja',
            workspaceId: selectedWorkspaceId,
          }))
        );
      }
      
      const workspaceName = getWorkspaceName(selectedWorkspaceId);
      alert(`✅ ${tasksToSave.length} tarea(s) guardada(s) en ${workspaceName}`);
      onSaveComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la(s) tarea(s)';
      setError(message);
      alert(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          <span>Cargando workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-600/20 rounded-lg">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-slate-100">¿Dónde guardar las tareas generadas?</h4>
          <p className="text-xs text-slate-500">{tasks.length} tarea(s) lista(s) para guardar</p>
        </div>
      </div>

      <div className="space-y-3">
        <label htmlFor="workspace-select" className="block text-sm font-medium text-slate-300">
          Destino
        </label>
        <select
          id="workspace-select"
          value={selectedWorkspaceId || 'personal'}
          onChange={e => setSelectedWorkspaceId(e.target.value === 'personal' ? null : e.target.value)}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          disabled={saving}
        >
          {workspaceOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>

      {tasks.length > 1 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300">Modo de guardado</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSaveMode('all')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saveMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
              disabled={saving}
            >
              Guardar todas ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setSaveMode('single')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                saveMode === 'single'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
              disabled={saving}
            >
              Elegir una por una
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleSave(saveMode === 'all' ? tasks : [tasks[0]])}
          disabled={saving || tasks.length === 0}
          className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Guardando...
            </>
          ) : saveMode === 'all' ? (
            `Guardar ${tasks.length} tarea(s)`
          ) : (
            `Guardar: ${tasks[0]?.titulo || 'tarea'}`
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-medium rounded-xl transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}