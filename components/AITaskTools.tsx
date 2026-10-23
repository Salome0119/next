'use client';

/* eslint-disable react-hooks/refs */

import { useState, FormEvent, ChangeEvent, useRef, useEffect, useCallback } from 'react';
import { extraerTareasSmartPaste, generarPlanDiario } from '@/app/ai-actions';
import { parseDocument } from '@/app/actions/document-actions';
import type { SmartPasteTask, DailyPlannerTask } from '@/lib/schemas';
import { useTranslation } from '@/context/LanguageContext';

type Mode = 'smart-paste' | 'daily-planner';

interface GeneratedTask {
  titulo: string;
  prioridad: string;
  descripcion?: string;
  bloqueHorario?: string;
  duracionMinutos?: number;
}

interface AITaskToolsProps {
  onSmartPasteComplete?: (result: string, tasks: GeneratedTask[]) => void;
  onDocQAComplete?: (result: string) => void;
  onScrollToResults?: () => void;
}

export default function AITaskTools({ onSmartPasteComplete, onDocQAComplete, onScrollToResults }: AITaskToolsProps) {
  const { t, language } = useTranslation();
  const isEn = language === 'en';
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [mode, setMode] = useState<Mode>('smart-paste');
  const [inputText, setInputText] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [documentContent, setDocumentContent] = useState('');

  const smartPasteInputPlaceholder = isEn
    ? 'Paste an email, meeting minutes, chat or notes...'
    : 'Pega un correo, acta de reunión, chat o notas...';
  const smartPasteHint = isEn
    ? 'AI will extract tasks with title, description and priority. You can also upload PDF or Word.'
    : 'La IA extraerá tareas con título, descripción y prioridad. También puedes subir PDF o Word.';
  const fileReadyBadge = isEn ? 'File ready for extraction' : 'Archivo listo para extraer tareas';
  const removeFileLabel = isEn ? 'Remove' : 'Quitar';
  const charactersLabel = isEn ? 'characters' : 'caracteres';
  const extractButtonLabel = isEn ? 'Extract Tasks with AI' : 'Extraer Tareas con IA';
  const extractFromFileButtonLabel = isEn ? 'Extract Tasks from File with AI' : 'Extraer Tareas del Archivo con IA';
  const processingLabel = isEn ? 'Processing document...' : 'Procesando documento...';
  const dropzoneHint = isEn ? 'Drag and drop a PDF or Word file here' : 'Arrastra un archivo PDF o Word aquí';
  const dropzoneClickHint = isEn ? 'or click to select (max. 10 MB)' : 'o haz clic para seleccionar (máx. 10 MB)';
  const fileUploadError = isEn ? 'Error processing document' : 'Error al procesar el documento';
  const fileUploadErrorUnexpected = isEn
    ? 'An unexpected error occurred while processing the file'
    : 'Ocurrió un error inesperado al procesar el archivo';
  const unknownError = isEn ? 'Unknown error' : 'Error desconocido';
  const inputLabel = isEn ? 'Text to extract tasks from' : 'Texto para extraer tareas';
  const fileUploadAriaLabel = isEn ? 'Upload PDF or Word document' : 'Subir documento PDF o Word';

  const dailyPlannerTabLabel = isEn ? 'Daily Planner' : 'Planificador Diario';
  const dailyPlannerMainLabel = isEn
    ? 'Describe your goals and focus for today...'
    : 'Describe tu intención y enfoques para el día...';
  const dailyPlannerPlaceholder = isEn
    ? 'Eg: Deep work on backend API in the morning, team sync at 2 PM, and code reviews before end of day.'
    : 'Ej: Trabajo profundo en la API por la mañana, reunión de equipo a las 2 PM y revisión de código antes de finalizar el día.';
  const dailyPlannerButtonLabel = isEn
    ? '⚡ Generate Smart Day Schedule'
    : '⚡ Generar Cronograma Inteligente';
  const startTimeLabel = isEn ? 'Start time' : 'Hora inicio';
  const timeHelperBadge = isEn
    ? 'AI will schedule sequential time-block tasks starting from this hour'
    : 'La IA creará tareas en bloques horarios secuenciales a partir de esta hora';
  const quickSuggestionsLabel = isEn ? 'Quick suggestions' : 'Plantillas rápidas';

  const dailyPlannerChips = [
    {
      id: 'deep-focus',
      label: isEn ? '🎯 Deep Focus & Dev' : '🎯 Trabajo Enfocado y Dev',
      text: isEn
        ? 'Morning deep-work blocks on the backend API (two uninterrupted 90-minute sessions), afternoon for code reviews, and 30 minutes to learn something new before wrapping up.'
        : 'Bloques de trabajo profundo en la API por la mañana (dos sesiones de 90 minutos sin interrupciones), tarde para revisión de código y 30 minutos para aprender algo nuevo antes de terminar.',
    },
    {
      id: 'meetings-support',
      label: isEn ? '🤝 Meetings & Support' : '🤝 Reuniones y Soporte',
      text: isEn
        ? 'Team sync in the morning, one-on-ones after lunch, customer support in the afternoon, and two 30-minute blocks to clear pending emails.'
        : 'Reunión de equipo por la mañana, encuentros individuales después de comer, soporte al cliente por la tarde y dos bloques de 30 minutos para responder correos pendientes.',
    },
    {
      id: 'balanced-day',
      label: isEn ? '⚡ Balanced Day' : '⚡ Día Balanceado',
      text: isEn
        ? 'A balanced day: deep focus in the morning, meetings in the afternoon, exercise after work, and 15 minutes to plan tomorrow.'
        : 'Un día equilibrado: enfoque profundo por la mañana, reuniones por la tarde, ejercicio al terminar y 15 minutos para planificar el día siguiente.',
    },
  ];

  useEffect(() => {
    if (contentRef.current) {
      const baseHeight = contentRef.current.scrollHeight;
      setContentHeight(baseHeight);
    }
  }, [mode, isProcessing, error, uploadedFileName, fileLoading, inputText, fileError]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.target.name === 'horaInicio') {
      setHoraInicio(e.target.value);
    } else {
      setInputText(e.target.value);
      setError(null);
    }
  };

  const handleChipClick = (text: string) => {
    setError(null);
    setInputText((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
  };

  const processFile = async (file: File) => {
    setFileLoading(true);
    setFileError('');
    setUploadedFileName('');
    setDocumentContent('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await parseDocument(formData);
      if (result.success && result.text) {
        setDocumentContent(result.text);
        setUploadedFileName(result.fileName || file.name);
      } else {
        setFileError(result.error || fileUploadError);
      }
    } catch (err) {
      console.error('File processing error:', err);
      setFileError(fileUploadErrorUnexpected);
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setDragActive(false);
      }
    }
  }, []);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = '';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setUploadedFileName('');
    setDocumentContent('');
    setFileError('');
  }, []);

  const priorityLabel = (priority: string): string => {
    if (!isEn) return priority;
    if (priority === 'alta') return 'High';
    if (priority === 'media') return 'Medium';
    if (priority === 'baja') return 'Low';
    return priority;
  };

  const formatSmartPasteResult = (tasks: SmartPasteTask[]): string => {
    if (tasks.length === 0) return t('generator.smartPaste.noTasksFound');
    return tasks.map((task, i) => {
      const priorityEmoji = task.prioridad === 'alta' ? '🔴' : task.prioridad === 'media' ? '🟡' : '🟢';
      return `${i + 1}. **${task.titulo}** ${priorityEmoji} ${priorityLabel(task.prioridad)}\n   ${task.descripcion || ''}`;
    }).join('\n\n');
  };

  const formatDailyPlannerResult = (tasks: DailyPlannerTask[]): string => {
    if (tasks.length === 0) return t('generator.smartPaste.noActivitiesGenerated');
    return tasks.map((task, i) => {
      const priorityEmoji = task.prioridad === 'alta' ? '🔴' : task.prioridad === 'media' ? '🟡' : '🟢';
      return `${i + 1}. **${task.nombre}** ${priorityEmoji} ${priorityLabel(task.prioridad)}\n   ⏰ ${task.bloqueHorario} · ⏱️ ${task.duracionMinutos} min`;
    }).join('\n\n');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const sourceText = uploadedFileName && documentContent ? documentContent : inputText;
    if (!sourceText.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      let formattedResult = '';
      let generatedTasks: GeneratedTask[] = [];

      if (mode === 'smart-paste') {
        const result = await extraerTareasSmartPaste(sourceText, language);
        formattedResult = formatSmartPasteResult(result.tareas);
        generatedTasks = result.tareas.map((task) => ({
          titulo: task.titulo,
          prioridad: task.prioridad,
          descripcion: task.descripcion,
        }));
        if (onSmartPasteComplete) {
          onSmartPasteComplete(formattedResult, generatedTasks);
        }
      } else {
        const result = await generarPlanDiario(sourceText, horaInicio, language);
        formattedResult = formatDailyPlannerResult(result.actividades);
        generatedTasks = result.actividades.map((task) => ({
          titulo: task.nombre,
          prioridad: task.prioridad,
          bloqueHorario: task.bloqueHorario,
          duracionMinutos: task.duracionMinutos,
        }));
        if (onSmartPasteComplete) {
          onSmartPasteComplete(formattedResult, generatedTasks);
        }
      }
      setIsCollapsed(false);
      if (onScrollToResults) {
        onScrollToResults();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : unknownError);
    } finally {
      setIsProcessing(false);
    }
  };

  const getModeIcon = (m: Mode) => {
    if (m === 'smart-paste') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getModeLabel = (m: Mode) => (m === 'smart-paste' ? t('generator.smartPasteTab') : dailyPlannerTabLabel);

  const modes: Mode[] = ['smart-paste', 'daily-planner'];

  const canSubmit = uploadedFileName
    ? !!documentContent.trim()
    : !!inputText.trim();

  return (
    <div className="text-slate-900 dark:text-slate-100 space-y-5 animate-slide-up overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-inset rounded-t-2xl"
        aria-expanded={!isCollapsed}
        aria-controls="ai-tools-content"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-500/20 rounded-lg border border-purple-500/30">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-heading font-semibold text-slate-900 dark:text-slate-100">{t('aiTools.title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('aiTools.subtitle')}</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        <div className="px-4 pt-2 pb-4 space-y-4 border-t border-slate-200 dark:border-slate-800/50">
          <div className="flex gap-2" role="tablist">
            {modes.map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setIsCollapsed(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {getModeIcon(m)}
                {getModeLabel(m)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'smart-paste' && (
              <div className="space-y-3">
                <label htmlFor="smart-paste-input" className="sr-only">
                  {inputLabel}
                </label>

                {!uploadedFileName && !fileLoading ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl transition-all duration-200 group ${
                      dragActive
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-300 dark:border-slate-800 hover:border-purple-500/50 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="smart-paste-file-upload"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="sr-only absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={fileLoading || isProcessing}
                      aria-label={fileUploadAriaLabel}
                    />
                    <label
                      htmlFor="smart-paste-file-upload"
                      className="flex flex-col items-center justify-center p-6 text-center cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V12" />
                        </svg>
                        <span className="text-slate-900 dark:text-slate-100 font-medium">{dropzoneHint}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{dropzoneClickHint}</span>
                      </div>
                    </label>
                  </div>
                ) : null}

                {fileLoading && (
                  <div className="relative border-2 border-dashed rounded-xl transition-all duration-200 group border-purple-500 bg-slate-50/50 dark:bg-slate-950/50">
                    <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-500 border-t-transparent" />
                        <span className="text-purple-600 dark:text-purple-400 font-medium">{processingLabel}</span>
                        <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {uploadedFileName && !fileLoading && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm animate-slide-in">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2.5 bg-primary/15 border border-primary/25 rounded-lg flex-shrink-0">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{uploadedFileName}</p>
                        <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="4" />
                          </svg>
                          {fileReadyBadge}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium cursor-pointer flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      {removeFileLabel}
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {fileError}
                  </div>
                )}

                {!uploadedFileName && !fileLoading && (
                  <>
                    <textarea
                      id="smart-paste-input"
                      name="inputText"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={smartPasteInputPlaceholder}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 w-full min-h-[260px] outline-none resize-y leading-relaxed font-normal scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                      disabled={isProcessing}
                      aria-describedby="smart-paste-hint"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <p id="smart-paste-hint">{smartPasteHint}</p>
                      <span>{inputText.length} {charactersLabel}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {mode === 'daily-planner' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label htmlFor="daily-planner-input" className="block text-sm font-medium text-slate-500 dark:text-slate-400">
                    {dailyPlannerMainLabel}
                  </label>

                  <div className="flex flex-wrap gap-2" role="group" aria-label={quickSuggestionsLabel}>
                    {dailyPlannerChips.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleChipClick(chip.text)}
                        disabled={isProcessing}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-500/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <textarea
                      id="daily-planner-input"
                      name="inputText"
                      value={inputText}
                      onChange={handleInputChange}
                      placeholder={dailyPlannerPlaceholder}
                      rows={4}
                      className="min-h-[140px] p-4 pb-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 rounded-xl text-sm text-slate-900 dark:text-slate-100 leading-relaxed outline-none resize-y w-full placeholder:text-slate-400 font-normal scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 disabled:opacity-50"
                      disabled={isProcessing}
                      aria-describedby="daily-planner-hint"
                    />
                    <span className="pointer-events-none absolute bottom-2.5 right-4 text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                      {inputText.length} {charactersLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label htmlFor="hora-inicio" className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {startTimeLabel}
                  </label>
                  <input
                    id="hora-inicio"
                    name="horaInicio"
                    type="time"
                    value={horaInicio}
                    onChange={handleInputChange}
                    className="min-w-[140px] px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none disabled:opacity-50 transition-colors"
                    disabled={isProcessing}
                  />
                  <span
                    id="daily-planner-hint"
                    className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 leading-relaxed sm:flex-1"
                  >
                    {timeHelperBadge}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isProcessing || !canSubmit}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    {processingLabel}
                  </>
                ) : mode === 'smart-paste' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {uploadedFileName ? extractFromFileButtonLabel : extractButtonLabel}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {dailyPlannerButtonLabel}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
