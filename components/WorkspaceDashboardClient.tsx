'use client';

import { useState, useTransition, FormEvent, useCallback } from 'react';
import { getTareas, crearTarea } from '@/app/actions';
import TaskList from '@/components/TaskList';
import { Zap } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

interface Task {
  id: number;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  completado: boolean;
  fecha_entrega?: string | null;
  creado_en: string;
  workspace_id: number | null;
  assigned_to_user_id: number | null;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
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

const mapTareas = (data: Array<{
  id: number;
  titulo: string;
  descripcion?: string | null;
  prioridad: string;
  completado: boolean;
  fecha_entrega?: string | null;
  creado_en: string | Date;
  workspace_id?: number | null;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string | null;
  assigned_to_email?: string | null;
}>) =>
  data.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    descripcion: t.descripcion,
    prioridad: t.prioridad || 'media',
    completado: t.completado,
    fecha_entrega: t.fecha_entrega,
    creado_en: t.creado_en instanceof Date ? t.creado_en.toISOString() : t.creado_en,
    workspace_id: t.workspace_id ?? null,
    assigned_to_user_id: t.assigned_to_user_id ?? null,
    assigned_to_name: t.assigned_to_name ?? null,
    assigned_to_email: t.assigned_to_email ?? null,
  }));

export function WorkspaceDashboardClient({ workspaceId, initialTasks, initialMembers }: WorkspaceDashboardClientProps) {
  const { t, isReady } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [members, setMembers] = useState<WorkspaceMember[]>(initialMembers);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);
  const [newTaskPriority, setNewTaskPriority] = useState('media');
  const [addingTask, setAddingTask] = useState(false);
  const [, startTransition] = useTransition();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const loadData = useCallback(async (page = 1) => {
    try {
      const tasksData = await getTareas(page, pageSize, workspaceId);
      const mapped = mapTareas(tasksData.tareas as unknown as Array<{
        id: number;
        titulo: string;
        descripcion?: string | null;
        prioridad: string;
        completado: boolean;
        fecha_entrega?: string | null;
        creado_en: string | Date;
        workspace_id?: number | null;
        assigned_to_user_id?: number | null;
      }>);
      setTasks(mapped);
      setTotalPages(tasksData.totalPages);
      setTotalItems(tasksData.total);
    } catch (error) {
      console.error('Error reloading data:', error);
    }
  }, [pageSize, workspaceId]);

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
      startTransition(() => loadData(currentPage));
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleTasksChange = useCallback((newTasks: Task[], newTotal: number) => {
    setTasks(newTasks);
    setTotalItems(newTotal);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  }, []);

  if (!isReady) {
    return (
      <div className="space-y-6 animate-fade-in animate-pulse">
        <div className="h-48 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
        <div className="h-96 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Manual Task Creation - Executive Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-slide-up">
        <h2 className="text-xs font-semibold tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          {t('dashboard.quickTask')}
        </h2>
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <label htmlFor="tour-quick-task" className="sr-only">{t('dashboard.quickTask')}</label>
            <input
              id="tour-quick-task"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t('dashboard.placeholder')}
              required
              disabled={addingTask}
              className="bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl px-4 py-3 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 w-full transition-colors"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 w-full sm:w-auto min-w-[140px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            >
              <option value="alta" className="bg-white dark:bg-slate-800">{t('dashboard.priority.high')}</option>
              <option value="media" className="bg-white dark:bg-slate-800">{t('dashboard.priority.medium')}</option>
              <option value="baja" className="bg-white dark:bg-slate-800">{t('dashboard.priority.low')}</option>
            </select>
            {members.length > 0 && (
              <select
                value={newTaskAssignee || ''}
                onChange={(e) => setNewTaskAssignee(e.target.value ? Number(e.target.value) : null)}
                className="bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 w-full sm:w-auto min-w-[180px] focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
              >
                <option value="" className="bg-white dark:bg-slate-800">{t('dashboard.unassigned')}</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id} className="bg-white dark:bg-slate-800">
                    {m.name || m.email.split('@')[0]} ({m.role})
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={addingTask || !newTaskTitle.trim()}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl px-5 py-2.5 shadow-md shadow-violet-600/20 whitespace-nowrap sm:w-auto transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-label={addingTask ? t('dashboard.adding') : t('dashboard.addTask')}
          >
            {addingTask ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" aria-hidden="true"></span>
                {t('dashboard.adding')}
              </>
            ) : t('dashboard.addTask')}
          </button>
        </form>
      </section>

      {/* Task List - Clean and spacious */}
      <section className="animate-slide-up">
        <TaskList
          tasks={tasks}
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onTasksChange={handleTasksChange}
          workspaceId={workspaceId}
          members={members}
        />
      </section>
    </div>
  );
}