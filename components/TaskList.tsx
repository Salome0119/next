'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTareas, eliminarTarea, toggleTarea, actualizarTarea } from '@/app/actions';
import TaskCard from './TaskCard';
import Pagination from './Pagination';
import { ClipboardList } from 'lucide-react';
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

interface TaskListProps {
  tasks: Tarea[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onTasksChange: (tasks: Tarea[], totalItems: number) => void;
  workspaceId?: number;
  members?: Array<{
    id: number;
    user_id: number;
    name: string | null;
    email: string;
    role: string;
  }>;
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

export default function TaskList({
  tasks: initialTasks = [],
  totalItems: initialTotalItems = 0,
  currentPage: initialCurrentPage = 1,
  pageSize: initialPageSize = 10,
  totalPages: initialTotalPages = 1,
  onPageChange,
  onPageSizeChange,
  onTasksChange,
  workspaceId,
  members = [],
}: TaskListProps) {
  const { t, isReady } = useTranslation();
  const [tareas, setTareas] = useState<Tarea[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalItems, setTotalItems] = useState(initialTotalItems);

  useEffect(() => {
    setTareas(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setTotalItems(initialTotalItems);
  }, [initialTotalItems]);

  useEffect(() => {
    setCurrentPage(initialCurrentPage);
  }, [initialCurrentPage]);

  useEffect(() => {
    setPageSize(initialPageSize);
  }, [initialPageSize]);

  useEffect(() => {
    setTotalPages(initialTotalPages);
  }, [initialTotalPages]);

  const loadTareas = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const result = await getTareas(page, pageSize, workspaceId);
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
      setTareas(mapped);
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
      onTasksChange(mapped, result.total);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, workspaceId, onTasksChange]);

  useEffect(() => {
    loadTareas(currentPage);
  }, [loadTareas, currentPage]);

  useEffect(() => {
    const handleRefresh = () => loadTareas(currentPage);
    window.addEventListener(REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, handleRefresh);
  }, [loadTareas, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    onPageChange(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    onPageSizeChange(newPageSize);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const handleDeleteTask = async (id: number) => {
    setDeletingId(id);
    try {
      await eliminarTarea(id);
      const newTasks = tareas.filter(t => t.id !== id);
      setTareas(newTasks);
      setTotalItems(prev => prev - 1);
      onTasksChange(newTasks, totalItems - 1);
      loadTareas(currentPage);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleTask = async (id: number) => {
    setTogglingId(id);
    try {
      await toggleTarea(id);
      const newTasks = tareas.map(t => 
        t.id === id ? { ...t, completado: !t.completado } : t
      );
      setTareas(newTasks);
      onTasksChange(newTasks, totalItems);
      loadTareas(currentPage);
    } catch (error) {
      console.error('Error toggling task:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateTask = async (updatedTask: Tarea) => {
    try {
      await actualizarTarea({
        id: updatedTask.id,
        titulo: updatedTask.titulo,
        descripcion: updatedTask.descripcion || '',
        prioridad: updatedTask.prioridad,
        fecha_entrega: updatedTask.fecha_entrega || '',
      });
      const newTasks = tareas.map(t => t.id === updatedTask.id ? updatedTask : t);
      setTareas(newTasks);
      onTasksChange(newTasks, totalItems);
      loadTareas(currentPage);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const pendingCount = tareas.filter((t) => !t.completado).length;
  const completedCount = tareas.filter((t) => t.completado).length;

  if (isLoading || !isReady) {
    return (
      <div className="space-y-3">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-violet-500 border-t-transparent" aria-hidden="true"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400 mb-6 bg-slate-100/60 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 w-fit">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
          {pendingCount} {t('dashboard.pending')}
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden="true"></span>
          {completedCount} {t('dashboard.completed')}
        </span>
        <span className="flex items-center gap-1.5 text-violet-400">
          <span className="w-2 h-2 rounded-full bg-violet-400" aria-hidden="true"></span>
          {totalItems} {t('dashboard.total')}
        </span>
      </div>

      {tareas.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center bg-slate-100 dark:bg-slate-950/40 space-y-3">
          <div className="w-14 h-14 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center text-violet-400 mx-auto mb-2">
            <ClipboardList className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-lg">{t('dashboard.noTasks')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            {t('dashboard.noTasksDesc')}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3" role="list" aria-label={t('dashboard.taskList')}>
            {tareas.map((tarea) => (
              <TaskCard
                key={tarea.id}
                tarea={tarea}
                isExpanded={expandedTaskId === tarea.id}
                onToggleExpand={handleToggleExpand}
                onToggleComplete={handleToggleTask}
                onDelete={handleDeleteTask}
                onUpdate={handleUpdateTask}
                togglingId={togglingId}
                deletingId={deletingId}
                members={members}
                onAssign={async (taskId: number, assignedToUserId: number | null) => {
                  const { assignTask } = await import('@/app/actions');
                  await assignTask(taskId, assignedToUserId);
                  loadTareas(currentPage);
                }}
              />
            ))}
          </ul>

          <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/40">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </>
      )}
    </div>
  );
}