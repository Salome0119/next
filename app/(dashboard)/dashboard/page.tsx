'use client';

import { useState, FormEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { crearTarea, getTareas } from '@/app/actions';
import TaskList from '@/components/TaskList';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { useTranslation } from '@/context/LanguageContext';

const REFRESH_EVENT = 'tasks:refresh';

interface Tarea {
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

export default function DashboardPage() {
  const { t, isReady, language } = useTranslation();
  const router = useRouter();
  const isEn = language === 'en';
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'alta' | 'media' | 'baja'>('media');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const result = await getTareas(page, pageSize);
      const mapped = mapTareas(result.tareas as unknown as Array<{
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
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    loadTasks(currentPage);
  }, [loadTasks, currentPage]);

  useEffect(() => {
    const handleRefresh = () => loadTasks(currentPage);
    window.addEventListener(REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, handleRefresh);
  }, [loadTasks, currentPage]);

  const handleTasksChange = useCallback((newTasks: Tarea[], newTotal: number) => {
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

  const handleAddTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;

    setAddingTask(true);
    const formData = new FormData();
    formData.append('titulo', newTaskTitle.trim());
    formData.append('descripcion', newTaskDescription.trim());
    formData.append('prioridad', newTaskPriority);
    if (newTaskDueDate) {
      formData.append('fechaEntrega', newTaskDueDate);
    }

    try {
      await crearTarea(formData);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('media');
      setNewTaskDueDate('');
      router.refresh();
      window.dispatchEvent(new Event('tasks:refresh'));
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const priorityStyles = {
    alta: 'text-red-400 bg-red-950/40 border-red-800/60 focus:ring-red-500/30',
    media: 'text-amber-400 bg-amber-950/40 border-amber-800/60 focus:ring-amber-500/30',
    baja: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 focus:ring-emerald-500/30',
  };

  if (!isReady) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
          <div className="h-24 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <div className="h-64 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
            </div>
            <div className="lg:col-span-4">
              <div className="h-64 bg-slate-200 dark:bg-slate-800/50 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 flex items-center gap-2 mb-4">
                <span className="w-4 h-4 text-violet-400">✏️</span>
                {t('dashboard.quickTask')}
              </h2>
              
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label htmlFor="tour-quick-task" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    {isEn ? 'Task Title' : 'Título de la tarea'}
                  </label>
                  <input
                    id="tour-quick-task"
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder={isEn ? 'Task title...' : 'Título de la tarea...'}
                    required
                    disabled={addingTask}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="quick-task-description" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    {isEn ? 'Description' : 'Descripción'}
                  </label>
                  <textarea
                    id="quick-task-description"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder={isEn ? 'Add description or details...' : 'Agregar descripción o detalles...'}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none transition-all duration-200"
                    disabled={addingTask}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      {isEn ? 'Priority' : 'Prioridad'}
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as 'alta' | 'media' | 'baja')}
                      className={`w-full text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 cursor-pointer appearance-none bg-no-repeat bg-right pr-8 transition-all ${priorityStyles[newTaskPriority]}`}
                      style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                        backgroundPosition: 'right 0.5rem center',
                        backgroundSize: '1rem'
                      }}
                      disabled={addingTask}
                    >
                      <option value="baja">{isEn ? 'Low' : 'Baja'}</option>
                      <option value="media">{isEn ? 'Medium' : 'Media'}</option>
                      <option value="alta">{isEn ? 'High' : 'Alta'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                      {isEn ? 'Due Date' : 'Fecha de entrega'}
                    </label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-xl outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      disabled={addingTask}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addingTask || !newTaskTitle.trim()}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-xl px-5 py-3 shadow-md shadow-violet-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                  aria-label={addingTask ? (isEn ? 'Adding...' : 'Agregando...') : (isEn ? 'Add Task' : 'Agregar Tarea')}
                >
                  {addingTask ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                      {isEn ? 'Adding...' : 'Agregando...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isEn ? 'Add Task' : 'Agregar Tarea'}
                    </>
                  )}
                </button>
              </form>
            </section>

            <TaskList
              tasks={tasks}
              totalItems={totalItems}
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onTasksChange={handleTasksChange}
            />
          </div>

          <aside className="lg:col-span-4">
            <DashboardSidebar tasks={tasks} />
          </aside>
        </div>
      </div>
    </main>
  );
}