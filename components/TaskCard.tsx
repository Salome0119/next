'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { actualizarTarea } from '@/app/actions';
import { useTranslation } from '@/context/LanguageContext';

interface TaskCardProps {
  tarea: {
    id: number;
    titulo: string;
    descripcion?: string | null;
    prioridad: string;
    completado: boolean;
    fecha_entrega?: string | null;
    creado_en: string;
    assigned_to_user_id?: number | null;
    workspace_id?: number | null;
  };
  isExpanded: boolean;
  onToggleExpand: (id: number) => void;
  onToggleComplete: (id: number) => void;
  onDelete: (id: number) => void;
  onUpdate?: (updatedTask: {
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
  }) => void | Promise<void>;
  togglingId: number | null;
  deletingId: number | null;
  members: Array<{
    id: number;
    user_id: number;
    name: string | null;
    email: string;
    role: string;
  }>;
  onAssign: (taskId: number, assignedToUserId: number | null) => void;
}

function getPriorityClass(prioridad: string): string {
  switch (prioridad) {
    case 'alta':
      return 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold px-2 py-0.5 rounded-full text-[11px] flex-shrink-0';
    case 'media':
      return 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold px-2 py-0.5 rounded-full text-[11px] flex-shrink-0';
    default:
      return 'bg-green-500/15 text-green-400 border border-green-500/30 font-semibold px-2 py-0.5 rounded-full text-[11px] flex-shrink-0';
  }
}

function getPriorityDot(prioridad: string): string {
  switch (prioridad) {
    case 'alta':
      return 'bg-red-500';
    case 'media':
      return 'bg-orange-500';
    default:
      return 'bg-green-500';
  }
}

function getPriorityText(prioridad: string, language: string): string {
  if (prioridad === 'alta') return language === 'en' ? 'High' : 'Alta';
  if (prioridad === 'media') return language === 'en' ? 'Medium' : 'Media';
  return language === 'en' ? 'Low' : 'Baja';
}

function formatRelativeTime(dateString: string, t: (key: string) => string, language: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const ago = (value: string) => (language === 'en' ? `${value} ago` : `hace ${value}`);

  if (diffMins < 1) return t('common.now');
  if (diffMins < 60) return ago(`${diffMins}${t('common.min')}`);
  if (diffHours < 24) return ago(`${diffHours}${t('common.h')}`);
  if (diffDays < 7) return ago(`${diffDays}${t('common.d')}`);
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
}

function formatDueDateLabel(dateIso: string, language: string): string {
  const [year, month, day] = dateIso.slice(0, 10).split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(dateIso);
  return date.toLocaleDateString(language === 'en' ? 'en-US' : 'es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const REFRESH_EVENT = 'tasks:refresh';

export default function TaskCard({
  tarea,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onUpdate,
  togglingId,
  deletingId,
  members,
  onAssign,
}: TaskCardProps) {
  const { t, language, isReady } = useTranslation();
  const isEn = language === 'en';
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(tarea.titulo);
  const [editedDescription, setEditedDescription] = useState(tarea.descripcion || '');
  const [editedPriority, setEditedPriority] = useState(tarea.prioridad);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatDueDate = (dateVal: any) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.slice(0, 10);
    if (dateVal instanceof Date) return dateVal.toISOString().slice(0, 10);
    return new Date(dateVal).toISOString().slice(0, 10);
  };

  const [editedDueDate, setEditedDueDate] = useState(formatDueDate(tarea.fecha_entrega));
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
    setEditedTitle(tarea.titulo);
    setEditedDescription(tarea.descripcion || '');
    setEditedPriority(tarea.prioridad);
    setEditedDueDate(formatDueDate(tarea.fecha_entrega));
    setEditError(null);
  }, [tarea.titulo, tarea.descripcion, tarea.prioridad, tarea.fecha_entrega, isEditing]);

  const handleHeaderClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, label')) {
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
    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle) {
      setEditError(t('common.required'));
      return;
    }
    if (trimmedTitle.length > 100) {
      setEditError(t('common.maxChars'));
      return;
    }

    setIsSaving(true);
    setEditError(null);
    try {
      const updatedTask = {
        id: tarea.id,
        titulo: trimmedTitle,
        descripcion: editedDescription.trim(),
        prioridad: editedPriority,
        fecha_entrega: editedDueDate,
        completado: tarea.completado,
        creado_en: tarea.creado_en,
        workspace_id: tarea.workspace_id ?? null,
        assigned_to_user_id: tarea.assigned_to_user_id ?? null,
      };
      if (onUpdate) {
        await onUpdate(updatedTask);
      } else {
        await actualizarTarea({
          id: tarea.id,
          titulo: trimmedTitle,
          descripcion: editedDescription.trim(),
          prioridad: editedPriority,
          fecha_entrega: editedDueDate,
        });
        window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
        router.refresh();
      }
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('common.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(tarea.titulo);
    setEditedDescription(tarea.descripcion || '');
    setEditedPriority(tarea.prioridad);
    setEditedDueDate(formatDueDate(tarea.fecha_entrega));
    setEditError(null);
    setIsEditing(false);
  };

  if (!isReady) {
    return (
      <article className="animate-pulse">
        <div className="h-16 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl"></div>
      </article>
    );
  }

  const dueDateLabel = isEn ? 'Due Date' : 'Fecha límite';
  const dueDateIso = formatDueDate(tarea.fecha_entrega);
  const dueDateText = dueDateIso ? formatDueDateLabel(dueDateIso, language) : '';

  return (
    <article
      className={`group bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300/80 dark:hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all transition-colors duration-200 ${
        tarea.completado ? 'opacity-60' : ''
      }`}
      role="listitem"
    >
      {/* Header row: checkbox + bold title | priority badge + actions */}
      <div
        onClick={handleHeaderClick}
        onKeyDown={handleHeaderKeyDown}
        className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:ring-inset rounded-lg cursor-pointer"
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
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
            tarea.completado
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-400 dark:border-slate-500 hover:border-violet-500 bg-white dark:bg-slate-950/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={tarea.completado ? t('dashboard.markPending') : t('dashboard.markCompleted')}
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

        {isEditing ? (
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              maxLength={100}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-purple-500 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 text-sm font-semibold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder={t('dashboard.taskTitle')}
              autoFocus
              aria-label={t('dashboard.taskTitle')}
            />
          </div>
        ) : (
          <span
            className={`flex-1 truncate font-semibold text-slate-900 dark:text-slate-100 text-base leading-snug transition-colors ${
              tarea.completado ? 'text-slate-500 dark:text-slate-400 line-through' : ''
            }`}
          >
            {tarea.titulo}
          </span>
        )}

        <span className={getPriorityClass(tarea.prioridad)}>
          {getPriorityText(tarea.prioridad, language)}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
            aria-label={t('dashboard.edit')}
            title={t('dashboard.edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tarea.id);
            }}
            disabled={deletingId === tarea.id}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('dashboard.delete')}
            title={t('common.delete')}
          >
            {deletingId === tarea.id ? (
              <span className="block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {members.length > 0 && (
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 text-slate-600 group-hover:text-slate-400 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Description area: own line with breathing room */}
      {!isEditing && tarea.descripcion && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed font-normal">{tarea.descripcion}</p>
      )}

      {/* Inline edit form */}
      {isEditing && (
        <div className="mt-2.5 space-y-2">
          {editError && (
            <p className="text-red-400 text-xs" role="alert">{editError}</p>
          )}

          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder={isEn ? 'Task description...' : 'Descripción de la tarea...'}
            rows={2}
            maxLength={5000}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-purple-500 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 text-xs outline-none resize-y placeholder:text-slate-400 dark:placeholder:text-slate-500"
            aria-label={isEn ? 'Description' : 'Descripción'}
          />

          {/* Controls row: priority (color badge + selector) + due date */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={getPriorityClass(editedPriority)}>
              {getPriorityText(editedPriority, language)}
            </span>
            <select
              value={editedPriority}
              onChange={(e) => setEditedPriority(e.target.value)}
              className="flex-1 min-w-[120px] bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-sm text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              aria-label={t('dashboard.priorityLabel')}
            >
              <option value="alta">{t('dashboard.priority.high')}</option>
              <option value="media">{t('dashboard.priority.medium')}</option>
              <option value="baja">{t('dashboard.priority.low')}</option>
            </select>
            <input
              type="date"
              value={editedDueDate}
              onChange={(e) => setEditedDueDate(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-sm text-slate-900 dark:text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
              aria-label={dueDateLabel}
            />
          </div>

          {/* Save & Cancel actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !editedTitle.trim()}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-all duration-200"
            >
              {isSaving ? t('common.saving') : t('dashboard.save')}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex-1 py-2.5 px-3 bg-slate-800/50 hover:bg-slate-700/50 disabled:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors border border-slate-700/60"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Expandable assignment row (priority badge already shown in header) */}
      <div
        id={`task-details-${tarea.id}`}
        ref={contentRef}
        role="region"
        aria-label={`${t('dashboard.details')} ${tarea.titulo}`}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
          visibility: isExpanded ? 'visible' : 'hidden',
        }}
      >
        {members.length > 0 && (
          <div className="mt-2.5 flex items-center gap-3 flex-wrap text-xs text-slate-400 animate-fade-in">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityDot(tarea.prioridad)}`} aria-hidden="true"></span>
            <label htmlFor={`assign-${tarea.id}`} className="text-slate-400">{t('dashboard.assign')}</label>
            <select
              id={`assign-${tarea.id}`}
              value={tarea.assigned_to_user_id || ''}
              onChange={(e) => onAssign(tarea.id, e.target.value ? Number(e.target.value) : null)}
              className="min-w-[130px] px-2 py-1 bg-white/80 dark:bg-slate-950/60 border border-slate-300/60 dark:border-slate-700/60 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
              aria-label={t('dashboard.assign')}
            >
              <option value="">{t('dashboard.unassigned')}</option>
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name || m.email.split('@')[0]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Footer: due date badge + creation time */}
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
        {tarea.fecha_entrega && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/50 px-2.5 py-0.5"
            title={`${dueDateLabel}: ${dueDateText}`}
          >
            <span aria-hidden="true">📅</span>
            <span className="sr-only">{dueDateLabel}: </span>
            {dueDateText}
          </span>
        )}
        <span title={t('dashboard.created')}>
          <span className="sr-only">{t('dashboard.created')}: </span>
          {formatRelativeTime(tarea.creado_en, t, language)}
        </span>
      </div>
    </article>
  );
}
