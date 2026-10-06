'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useEffect } from 'react';
import { actualizarTarea } from '@/app/actions';

interface TaskCardProps {
  tarea: {
    id: number;
    titulo: string;
    prioridad: string;
    completado: boolean;
    creado_en: string;
  };
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  togglingId: number | null;
  deletingId: number | null;
}

function getPriorityClass(prioridad: string): string {
  switch (prioridad) {
    case 'alta':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'media':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  }
}

function getPriorityDot(prioridad: string): string {
  switch (prioridad) {
    case 'alta':
      return 'bg-red-500';
    case 'media':
      return 'bg-amber-500';
    default:
      return 'bg-emerald-500';
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora mismo';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const REFRESH_EVENT = 'tasks:refresh';

export default function TaskCard({
  tarea,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  togglingId,
  deletingId,
}: TaskCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitulo, setEditTitulo] = useState(tarea.titulo);
  const [editPrioridad, setEditPrioridad] = useState(tarea.prioridad);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [isEditing]);

  useEffect(() => {
    setEditTitulo(tarea.titulo);
    setEditPrioridad(tarea.prioridad);
    setEditError(null);
  }, [tarea.titulo, tarea.prioridad, isEditing]);

  const handleHeaderClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button[aria-label*="completada"], button[aria-label*="pendiente"]')) {
      return;
    }
    onToggleExpand(tarea.id);
  };

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand(tarea.id);
    }
  };

  const handleSave = async () => {
    const trimmedTitulo = editTitulo.trim();
    if (!trimmedTitulo) {
      setEditError('El título es requerido');
      return;
    }
    if (trimmedTitulo.length > 100) {
      setEditError('Máximo 100 caracteres');
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const formData = new FormData();
      formData.append('id', String(tarea.id));
      formData.append('titulo', trimmedTitulo);
      formData.append('prioridad', editPrioridad);
      await actualizarTarea(formData);
      window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditTitulo(tarea.titulo);
    setEditPrioridad(tarea.prioridad);
    setEditError(null);
    setIsEditing(false);
  };

  return (
    <article
      className={`group bg-slate-800/50 rounded-xl border overflow-hidden transition-all duration-300 ease-out ${
        tarea.completado ? 'opacity-70 border-emerald-500/20' : 'border-slate-700/50'
      }`}
      role="listitem"
    >
      <div
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-inset hover:bg-slate-700/30 transition-colors cursor-pointer"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`task-details-${tarea.id}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete(tarea.id);
          }}
          disabled={togglingId === tarea.id}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            tarea.completado
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-500 hover:border-blue-500 bg-slate-700/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={tarea.completado ? 'Marcar como pendiente' : 'Marcar como completada'}
          aria-pressed={tarea.completado}
        >
          {tarea.completado && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {togglingId === tarea.id && (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
          )}
        </button>

        <span className="flex-1 text-slate-100 truncate font-medium pr-2">
          {tarea.titulo}
        </span>

        <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full border ${getPriorityClass(tarea.prioridad)}`}>
          {tarea.prioridad}
        </span>

        <span className="flex-shrink-0 text-xs text-slate-500 font-mono w-10 text-right">
          #{tarea.id}
        </span>

        <svg
          className={`flex-shrink-0 w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      <div
        id={`task-details-${tarea.id}`}
        ref={contentRef}
        role="region"
        aria-label={`Detalles de ${tarea.titulo}`}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/30 pt-3 animate-fade-in">
          {!isEditing ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span className={`w-2 h-2 rounded-full ${getPriorityDot(tarea.prioridad)}`} aria-hidden="true"></span>
                  <span>Prioridad: {tarea.prioridad}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Creada: {formatRelativeTime(tarea.creado_en)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium text-slate-100 truncate">{tarea.titulo}</span>
                <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full border ${getPriorityClass(tarea.prioridad)}`}>
                  {tarea.prioridad}
                </span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                  aria-label="Editar tarea"
                >
                  Editar
                </button>
              </div>

              <button
                onClick={() => onDelete(tarea.id)}
                disabled={deletingId === tarea.id}
                className="w-full py-2 px-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Eliminar tarea"
              >
                {deletingId === tarea.id ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-transparent" />
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Eliminar tarea
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {editError && (
                <p className="text-red-400 text-sm" role="alert">{editError}</p>
              )}

              <input
                type="text"
                value={editTitulo}
                onChange={(e) => setEditTitulo(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                placeholder="Título de la tarea"
                autoFocus
                aria-label="Título de la tarea"
              />

              <select
                value={editPrioridad}
                onChange={(e) => setEditPrioridad(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                aria-label="Prioridad"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editTitulo.trim()}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}