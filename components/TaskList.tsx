'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useTransition, useEffect, useCallback } from 'react';
import { getTareas, eliminarTarea, toggleTarea } from '@/app/actions';
import TaskCard from './TaskCard';
import Pagination from './Pagination';

const REFRESH_EVENT = 'tasks:refresh';

export default function TaskList() {
  const [tareas, setTareas] = useState<Array<{
    id: number;
    titulo: string;
    prioridad: string;
    completado: boolean;
    creado_en: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const mapTareas = (data: Array<{
    id: number;
    titulo: string;
    prioridad: string;
    completado: boolean;
    creado_en: string | Date;
  }>) =>
    data.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad || 'media',
      completado: t.completado,
      creado_en: t.creado_en instanceof Date ? t.creado_en.toISOString() : t.creado_en,
    }));

  const loadTareas = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const result = await getTareas(page, pageSize);
      setTareas(mapTareas(result.tareas as unknown as Array<{
        id: number;
        titulo: string;
        prioridad: string;
        completado: boolean;
        creado_en: string | Date;
      }>));
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // Carga inicial
  useEffect(() => {
    loadTareas(currentPage);
  }, [loadTareas, currentPage]);

  // Escuchar eventos de refresh externos
  useEffect(() => {
    const handleRefresh = () => loadTareas(currentPage);
    window.addEventListener(REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(REFRESH_EVENT, handleRefresh);
  }, [loadTareas, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedTaskId(prev => prev === id ? null : id);
  };

  const handleDeleteTask = async (id: number) => {
    setDeletingId(id);
    try {
      await eliminarTarea(id);
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
      loadTareas(currentPage);
    } catch (error) {
      console.error('Error toggling task:', error);
    } finally {
      setTogglingId(null);
    }
  };

  const pendingCount = tareas.filter((t) => !t.completado).length;
  const completedCount = tareas.filter((t) => t.completado).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent" aria-hidden="true"></div>
          <p className="mt-4 text-slate-400">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>
            {pendingCount} pendientes
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500" aria-hidden="true"></span>
            {completedCount} completadas
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-400" aria-hidden="true"></span>
            {totalItems} total
          </span>
        </div>
      </div>

      {tareas.length === 0 ? (
        <div className="p-10 text-center bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-lg font-medium text-slate-300 mb-2">No hay tareas aún</h2>
          <p className="text-slate-500 text-sm mb-4">Agrega tu primera tarea usando el formulario o la IA arriba</p>
        </div>
      ) : (
        <>
          <div className="space-y-3" role="list" aria-label="Lista de tareas">
            {tareas.map((tarea) => (
              <TaskCard
                key={tarea.id}
                tarea={tarea}
                isExpanded={expandedTaskId === tarea.id}
                onToggleExpand={handleToggleExpand}
                onToggleComplete={handleToggleTask}
                onDelete={handleDeleteTask}
                togglingId={togglingId}
                deletingId={deletingId}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </div>
  );
}