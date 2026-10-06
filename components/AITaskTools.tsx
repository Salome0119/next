'use client';

/* eslint-disable react-hooks/refs */

import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { extraerTareasSmartPaste, generarPlanDiario } from '@/app/ai-actions';
import { crearTarea } from '@/app/actions';
import { AISaveSelector } from './AISaveSelector';
import type { SmartPasteTask, DailyPlannerTask } from '@/lib/schemas';

type Mode = 'smart-paste' | 'daily-planner';

const REFRESH_EVENT = 'tasks:refresh';

interface GeneratedTask {
  titulo: string;
  prioridad: string;
  descripcion?: string;
  bloqueHorario?: string;
  duracionMinutos?: number;
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

export default function AITaskTools() {
  const contentRef = useRef<HTMLDivElement>(null);
  const idCounterRef = useRef(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [mode, setMode] = useState<Mode>('smart-paste');
  const [inputText, setInputText] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smartPasteResults, setSmartPasteResults] = useState<SmartPasteTask[]>([]);
  const [dailyPlannerResults, setDailyPlannerResults] = useState<DailyPlannerTask[]>([]);
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  // New state for AI save selector
  const [showSaveSelector, setShowSaveSelector] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<GeneratedTask[]>([]);

  useEffect(() => {
    if (contentRef.current) {
      const baseHeight = contentRef.current.scrollHeight;
      // Add extra space for save selector when visible (approx 280px)
      const extraHeight = showSaveSelector ? 320 : 0;
      setContentHeight(baseHeight + extraHeight);
    }
  }, [smartPasteResults, dailyPlannerResults, mode, isProcessing, error, showSaveSelector]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.target.name === 'horaInicio') {
      setHoraInicio(e.target.value);
    } else {
      setInputText(e.target.value);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setShowSaveSelector(false);
    setCompletedTasks([]);

    try {
      if (mode === 'smart-paste') {
        const result = await extraerTareasSmartPaste(inputText);
        const tasks: GeneratedTask[] = result.tareas.map(t => ({
          titulo: t.titulo,
          prioridad: t.prioridad,
          descripcion: t.descripcion,
        }));
        setSmartPasteResults(result.tareas);
        setDailyPlannerResults([]);
        setCompletedTasks(tasks);
      } else {
        const result = await generarPlanDiario(inputText, horaInicio);
        const tasks: GeneratedTask[] = result.actividades.map(t => ({
          titulo: t.nombre,
          prioridad: t.prioridad,
          bloqueHorario: t.bloqueHorario,
          duracionMinutos: t.duracionMinutos,
        }));
        setDailyPlannerResults(result.actividades);
        setSmartPasteResults([]);
        setCompletedTasks(tasks);
      }
      setIsCollapsed(false);
      // Show save selector after AI completes
      setShowSaveSelector(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setShowSaveSelector(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveComplete = () => {
    setShowSaveSelector(false);
    setSmartPasteResults([]);
    setDailyPlannerResults([]);
    setCompletedTasks([]);
    setInputText('');
    setError(null);
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  };

  const handleCancelSave = () => {
    setShowSaveSelector(false);
    setCompletedTasks([]);
  };

  const getNextId = () => {
    idCounterRef.current += 1;
    return idCounterRef.current;
  };

  const handleSaveTask = async (task: GeneratedTask) => {
    const tempId = getNextId();
    setSavingIds(prev => new Set(prev).add(tempId));
    try {
      const formData = new FormData();
      formData.append('titulo', task.titulo);
      formData.append('prioridad', task.prioridad);
      await crearTarea(formData);
      window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
    } catch (err) {
      console.error('Error guardando tarea:', err);
      alert('Error al guardar la tarea');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
    if (mode === 'smart-paste') {
      for (const task of smartPasteResults) {
        const formData = new FormData();
        formData.append('titulo', task.titulo);
        formData.append('prioridad', task.prioridad);
        await crearTarea(formData);
      }
      setSmartPasteResults([]);
    } else {
      for (const task of dailyPlannerResults) {
        const formData = new FormData();
        formData.append('titulo', task.nombre);
        formData.append('prioridad', task.prioridad);
        await crearTarea(formData);
      }
      setDailyPlannerResults([]);
    }
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  };

  const handleClearResults = () => {
    setSmartPasteResults([]);
    setDailyPlannerResults([]);
    setCompletedTasks([]);
    setInputText('');
    setError(null);
    setShowSaveSelector(false);
  };

  const getModeIcon = (m: Mode) => m === 'smart-paste' ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const getModeLabel = (m: Mode) => m === 'smart-paste' ? 'Smart Paste' : 'Planificador Diario';

  const renderSmartPasteResults = () => (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {smartPasteResults.map((task, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-100 truncate">{task.titulo}</p>
            {task.descripcion && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.descripcion}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityClass(task.prioridad)}`}>
                {task.prioridad}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              handleSaveTask({ titulo: task.titulo, prioridad: task.prioridad, descripcion: task.descripcion });
            }}
            disabled={savingIds.has(idx)}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-slate-100 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
          >
            {savingIds.has(idx) ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ))}
      {smartPasteResults.length === 0 && !isProcessing && (
        <p className="text-slate-500 text-sm text-center py-8">No se encontraron tareas en el texto.</p>
      )}
    </div>
  );

  const renderDailyPlannerResults = () => (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {dailyPlannerResults.map((task, idx) => (
        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-100">{task.nombre}</p>
              <span className="text-xs text-slate-500 font-mono">{task.bloqueHorario}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityClass(task.prioridad)}`}>
                {task.prioridad}
              </span>
              <span className="text-xs text-slate-500">{task.duracionMinutos} min</span>
            </div>
          </div>
          <button
            onClick={() => {
              handleSaveTask({ titulo: task.nombre, prioridad: task.prioridad });
            }}
            disabled={savingIds.has(idx)}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-slate-100 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
          >
            {savingIds.has(idx) ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ))}
      {dailyPlannerResults.length === 0 && !isProcessing && (
        <p className="text-slate-500 text-sm text-center py-8">No se generaron actividades.</p>
      )}
    </div>
  );

  const hasResults = smartPasteResults.length > 0 || dailyPlannerResults.length > 0;
  const resultsCount = smartPasteResults.length + dailyPlannerResults.length;

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-inset"
        aria-expanded={!isCollapsed}
        aria-controls="ai-tools-content"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Automatización con IA</h3>
            <p className="text-xs text-slate-500">Extrae tareas o planifica tu día con IA</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        id="ai-tools-content"
        ref={contentRef}
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: isCollapsed ? 0 : contentHeight,
          opacity: isCollapsed ? 0 : 1,
          paddingBottom: isCollapsed ? 0 : '1rem',
        }}
      >
        <div className="px-4 pt-2 pb-4 space-y-4 border-t border-slate-700/50">
          <div className="flex gap-2" role="tablist">
            {(['smart-paste', 'daily-planner'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setError(null); setIsCollapsed(false); setShowSaveSelector(false); setCompletedTasks([]); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {getModeIcon(m)}
                {getModeLabel(m)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'smart-paste' && (
              <div className="space-y-2">
                <label htmlFor="smart-paste-input" className="sr-only">Texto para extraer tareas</label>
                <textarea
                  id="smart-paste-input"
                  name="inputText"
                  value={inputText}
                  onChange={handleInputChange}
                  placeholder="Pega un correo, acta de reunión, chat o notas...&#10;&#10;Ej: Juan, revisa el informe antes del viernes. María, agenda reunión con cliente martes 10:00."
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-none"
                  disabled={isProcessing}
                  aria-describedby="smart-paste-hint"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p id="smart-paste-hint">La IA extraerá tareas con título, descripción y prioridad</p>
                  <span>{inputText.length} caracteres</span>
                </div>
              </div>
            )}

            {mode === 'daily-planner' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="daily-planner-input" className="sr-only">Intención del día</label>
                  <textarea
                    id="daily-planner-input"
                    name="inputText"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Describe tu intención para el día...&#10;&#10;Ej: Quiero dedicar la mañana a trabajo profundo, luego reuniones por la tarde, y tiempo para ejercicio."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 resize-none"
                    disabled={isProcessing}
                    aria-describedby="daily-planner-hint"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="hora-inicio" className="text-sm text-slate-300 whitespace-nowrap">Hora inicio:</label>
                  <input
                    id="hora-inicio"
                    name="horaInicio"
                    type="time"
                    value={horaInicio}
                    onChange={handleInputChange}
                    className="w-32 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                    disabled={isProcessing}
                  />
                  <p id="daily-planner-hint" className="text-xs text-slate-500 flex-1 text-center">La IA creará actividades con bloques horarios contiguos</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isProcessing || !inputText.trim()}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Procesando...
                  </>
                ) : mode === 'smart-paste' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Extraer tareas
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Generar plan
                  </>
                )}
              </button>

              {hasResults && !showSaveSelector && (
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Guardar todo ({resultsCount})
                </button>
              )}
            </div>

            {hasResults && !showSaveSelector && (
              <button
                type="button"
                onClick={handleClearResults}
                className="w-full px-4 py-2 text-slate-400 hover:text-slate-200 text-sm font-medium rounded-lg transition-colors"
              >
                Limpiar resultados
              </button>
            )}

            {hasResults && (
              <div className="border-t border-slate-700/50 pt-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Tareas generadas ({resultsCount})
                </h4>
                {mode === 'smart-paste' ? renderSmartPasteResults() : renderDailyPlannerResults()}
              </div>
            )}

            {/* AI Save Selector - appears after AI generation completes */}
            {showSaveSelector && completedTasks.length > 0 && (
              <div className="border-t border-emerald-500/30 pt-4 space-y-3 animate-slide-in">
                <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  IA completada - Guardar tareas
                </h4>
                <AISaveSelector
                  tasks={completedTasks}
                  mode={mode}
                  onSaveComplete={handleSaveComplete}
                  onCancel={handleCancelSave}
                />
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}