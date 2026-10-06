'use client';

import { useState, useTransition, FormEvent } from 'react';
import { getTareas, crearTarea, eliminarTarea, toggleTarea, actualizarTarea, assignTask } from '@/app/actions';
import { WorkspaceLayout } from '@/components/WorkspaceLayout';

interface Task {
  id: number;
  titulo: string;
  prioridad: string;
  completado: boolean;
  creado_en: string;
  workspace_id: number | null;
  assigned_to_user_id: number | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
}

interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  email: string;
  name: string | null;
}

interface WorkspaceDashboardClientProps {
  workspaceId: number;
  initialTasks: Task[];
  initialMembers: WorkspaceMember[];
}

export function WorkspaceDashboardClient({ workspaceId, initialTasks, initialMembers }: WorkspaceDashboardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState('media');
  const [addingTask, setAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState('media');
  const [, startTransition] = useTransition();

  const loadData = async () => {
    try {
      const [tasksData, membersData] = await Promise.all([
        getTareas(1, 50, workspaceId),
        Promise.resolve(initialMembers), // Members don't change often, keep initial
      ]);
      setTasks(tasksData.tareas);
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  };

  const handleAddTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;

    setAddingTask(true);
    const formData = new FormData();
    formData.append('titulo', newTaskTitle.trim());
    formData.append('prioridad', newTaskPriority);
    formData.append('workspaceId', String(workspaceId));
    if (newTaskAssignee) formData.append('assignedToUserId', String(newTaskAssignee));

    try {
      await crearTarea(formData);
      setNewTaskTitle('');
      setNewTaskAssignee(null);
      startTransition(() => loadData());
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await eliminarTarea(id);
      startTransition(() => loadData());
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleTask = async (id: number) => {
    try {
      await toggleTarea(id);
      startTransition(() => loadData());
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.titulo);
    setEditPriority(task.prioridad);
  };

  const handleSaveEdit = async (id: number) => {
    const formData = new FormData();
    formData.append('id', String(id));
    formData.append('titulo', editTitle);
    formData.append('prioridad', editPriority);

    try {
      await actualizarTarea(formData);
      setEditingTaskId(null);
      startTransition(() => loadData());
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleAssignTask = async (taskId: number, assignedToUserId: number | null) => {
    try {
      await assignTask(taskId, assignedToUserId);
      startTransition(() => loadData());
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'media': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'baja': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta': return '🔴';
      case 'media': return '🟡';
      case 'baja': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <WorkspaceLayout workspaceId={workspaceId} workspaceName="Workspace">
      <div className="space-y-6">
        {/* Header con stats */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-400 font-orbitron tracking-wider">Tareas del Workspace</h1>
            <p className="text-slate-500 text-sm mt-1">Colabora con tu equipo en tiempo real</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{tasks.filter(t => !t.completado).length} pendientes</span>
            <span>{tasks.filter(t => t.completado).length} completadas</span>
          </div>
        </header>

        {/* Formulario nueva tarea */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">✏️ Nueva tarea</h2>
          <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="new-task" className="sr-only">Nueva tarea</label>
              <input
                id="new-task"
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Escribe una tarea y presiona Enter..."
                required
                disabled={addingTask}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value)}
                className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="alta">🔴 Alta</option>
                <option value="media">🟡 Media</option>
                <option value="baja">🟢 Baja</option>
              </select>
              {members.length > 0 && (
                <select
                  value={newTaskAssignee || ''}
                  onChange={(e) => setNewTaskAssignee(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 text-sm min-w-[150px]"
                >
                  <option value="">Sin asignar</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name || m.email.split('@')[0]} ({m.role})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              aria-label={addingTask ? 'Agregando...' : 'Agregar'}
            >
              {addingTask ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                  Agregando...
                </>
              ) : 'Agregar'}
            </button>
          </form>
        </section>

        {/* Lista de tareas */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center">
                <span className="text-4xl">📋</span>
              </div>
              <h2 className="text-lg font-medium text-slate-300 mb-2">No hay tareas aún</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Crea tu primera tarea arriba o invita a tu equipo para empezar a colaborar
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/50" role="list">
              {tasks.map(task => (
                <li key={task.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                  {editingTaskId === task.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                        className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
                      >
                        <option value="alta">🔴 Alta</option>
                        <option value="media">🟡 Media</option>
                        <option value="baja">🟢 Baja</option>
                      </select>
                      <button onClick={() => handleSaveEdit(task.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors">Guardar</button>
                      <button onClick={handleCancelEdit} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`w-5 h-5 rounded border-2 flex-shrink-0 transition-all ${
                          task.completado
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-600 hover:border-blue-500'
                        }`}
                        aria-label={task.completado ? 'Marcar como pendiente' : 'Marcar como completada'}
                      >
                        {task.completado && (
                          <svg className="w-4 h-4 text-white mx-auto my-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`${task.completado ? 'line-through text-slate-500' : 'text-slate-100'} truncate`}>
                          {task.titulo}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(task.prioridad)}`}>
                            {getPriorityIcon(task.prioridad)} {task.prioridad}
                          </span>
                          {task.assigned_to_user_id && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/50 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {task.assigned_to_name || task.assigned_to_email?.split('@')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {members.length > 0 && (
                          <select
                            value={task.assigned_to_user_id || ''}
                            onChange={(e) => handleAssignTask(task.id, e.target.value ? Number(e.target.value) : null)}
                            className="px-2 py-1 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                            aria-label="Asignar tarea"
                          >
                            <option value="">Sin asignar</option>
                            {members.map(m => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.name || m.email.split('@')[0]}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                          aria-label="Editar tarea"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          aria-label="Eliminar tarea"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}