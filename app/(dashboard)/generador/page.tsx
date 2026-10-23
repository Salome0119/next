'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import { generarTextoAuto, consultarDocumento } from '@/app/ai-actions';
import { createTaskFromAIAction } from '@/app/actions/task-actions';
import { getUserWorkspaces } from '@/app/actions/workspace-actions';
import { parseDocument } from '@/app/actions/document-actions';
import { GeneradorTour } from '@/components/GeneradorTour';
import AITaskTools from '@/components/AITaskTools';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { useTranslation } from '@/context/LanguageContext';
import { useAvatar } from '@/context/AvatarContext';
import Avatar3D from '@/components/avatar/Avatar3D';

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  user_role: string;
}

const STANDALONE_BOLD_TITLE = /^\*{1,2}[^*\n]+\*{1,2}[::]?\s*$/;

// Keeps AI sections (e.g. "**Objetivo Principal**") from merging into the
// previous paragraph/list when the model omits blank lines between them.
function normalizeMarkdownBlocks(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  for (const line of lines) {
    const previous = output[output.length - 1];
    const previousIsBlank = previous === undefined || previous.trim() === '';
    if (!previousIsBlank && STANDALONE_BOLD_TITLE.test(line.trim())) {
      output.push('');
    }
    output.push(line);
  }
  return output.join('\n');
}

type ResultFormat = 'list' | 'text';

interface EditableTask {
  id: number;
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
}

interface MutableTask {
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
}

const PRIORITY_ALIASES: Record<string, string> = {
  alta: 'alta', high: 'alta',
  media: 'media', medium: 'media',
  baja: 'baja', low: 'baja',
};

const PRIORITY_EMOJIS: Record<string, string> = { alta: '🔴', media: '🟡', baja: '🟢' };
const PRIORITY_PATTERN = /\b(alta|media|baja|high|medium|low)\b/i;
const LIST_ITEM_PATTERN = /^(?:\d+[.)]|[-*•])\s+(.*)$/;
const ISO_DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2})\b/;

const EDIT_FIELD_CLASS =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 rounded-lg text-sm text-slate-900 dark:text-slate-100 p-2.5 outline-none';

function toEditableDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function normalizePriority(value: string | null | undefined): string {
  const match = (value || '').toLowerCase().match(/\b(alta|media|baja|high|medium|low)\b/);
  return match ? PRIORITY_ALIASES[match[1]] : 'media';
}

function cleanTaskTitle(value: string): string {
  return value
    .replace(/^[#>\s•\-*–—]+/, '')
    .replace(/\*\*|__/g, '')
    .replace(/^[“”‘’"']+|[“”‘’"']+$/g, '')
    .trim();
}

// `1. **Title** 🔴 Alta · 2025-12-31` → title / priority / due date
function parseTaskHeader(header: string): MutableTask {
  let rest = header;
  let dueDate: Date | null = null;
  const dateMatch = rest.match(ISO_DATE_PATTERN);
  if (dateMatch) {
    dueDate = toEditableDate(dateMatch[1]);
    rest = rest.replace(dateMatch[0], ' ');
  }

  let title = '';
  let tail = '';
  const boldTitle = rest.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (boldTitle) {
    title = boldTitle[1];
    tail = boldTitle[2];
  } else {
    const trailingPriority = rest.match(/^(.*?)(?:\s*[🔴🟡🟢])?\s+(alta|media|baja|high|medium|low)\s*$/i);
    if (trailingPriority && trailingPriority[1].trim()) {
      title = trailingPriority[1];
      tail = trailingPriority[2];
    } else {
      title = rest;
      tail = '';
    }
  }

  const priorityMatch = tail.match(PRIORITY_PATTERN);
  const description = tail
    .replace(PRIORITY_PATTERN, ' ')
    .replace(/\b(prioridad|priority)\b\s*[::]?/gi, ' ')
    .replace(/[🔴🟡🟢]/g, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    title: cleanTaskTitle(title),
    description,
    priority: priorityMatch ? PRIORITY_ALIASES[priorityMatch[1].toLowerCase()] : 'media',
    dueDate,
  };
}

// Parses the raw AI result (`1. **Title** priority \n Description`) into editable tasks.
function parseResultIntoTasks(text: string): EditableTask[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const tasks: EditableTask[] = [];
  const prelude: string[] = [];
  let currentTask: MutableTask | null = null;

  const flush = () => {
    if (!currentTask) return;
    tasks.push({ id: tasks.length, ...currentTask });
    currentTask = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Indented lines are continuations of the current task, not new tasks.
    const listMatch = /^\s{2,}/.test(rawLine) ? null : trimmed.match(LIST_ITEM_PATTERN);
    if (listMatch) {
      flush();
      currentTask = parseTaskHeader(listMatch[1]);
      continue;
    }

    if (!currentTask) {
      prelude.push(trimmed);
      continue;
    }

    const active = currentTask;
    const priorityLine = trimmed.replace(/\*\*/g, '').match(/^(?:prioridad|priority)\s*:?\s*(.+)$/i);
    if (priorityLine) {
      active.priority = normalizePriority(priorityLine[1]);
      continue;
    }

    active.description = active.description ? `${active.description} ${trimmed}` : trimmed;
  }
  flush();

  if (tasks.length > 0) {
    if (prelude.length > 0) {
      const head = tasks[0];
      tasks[0] = {
        ...head,
        description: [prelude.join(' '), head.description].filter(Boolean).join(' '),
      };
    }
    return tasks;
  }

  // Free-form result (summary, schedule...): expose it as a single editable task.
  const fallbackLines = lines.map((line) => line.trim()).filter(Boolean);
  const title = cleanTaskTitle(fallbackLines.shift() || '');
  return [{ id: 0, title, description: fallbackLines.join('\n'), priority: 'media', dueDate: null }];
}

function detectResultFormat(text: string): ResultFormat {
  return /^\s*(?:\d+[.)]|[-*•])\s+\S/m.test(text) ? 'list' : 'text';
}

function serializeEditableTasks(
  tasks: EditableTask[],
  format: ResultFormat,
  language: string
): string {
  if (tasks.length === 0) return '';

  if (format === 'text') {
    return tasks
      .map((task) => {
        const title = task.title.replace(/\*\*/g, '').trim();
        const description = task.description.trim();
        return description ? `${title}\n\n${description}` : title;
      })
      .join('\n\n');
  }

  return tasks
    .map((task, index) => {
      const priority = PRIORITY_ALIASES[task.priority] || 'media';
      const label =
        language === 'en'
          ? (priority === 'alta' ? 'High' : priority === 'media' ? 'Medium' : 'Low')
          : (priority === 'alta' ? 'Alta' : priority === 'media' ? 'Media' : 'Baja');
      const title = task.title.replace(/\*\*/g, '').trim();
      const dueDate = task.dueDate ? ` · ${toDateInputValue(task.dueDate)}` : '';
      const header = `${index + 1}. **${title}** ${PRIORITY_EMOJIS[priority]} ${label}${dueDate}`;
      const description = task.description.trim();
      return description ? `${header}\n   ${description}` : header;
    })
    .join('\n\n');
}

export default function GeneradorPage() {
  const [prompt, setPrompt] = useState('');
  const [resultado, setResultado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [generacionExitosa, setGeneracionExitosa] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | number | null>(null);
  const [selectedPrioridad, setSelectedPrioridad] = useState<'alta' | 'media' | 'baja'>('media');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyIdCounter = useRef(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const editableRef = useRef<HTMLTextAreaElement>(null);
  const [editingTasks, setEditingTasks] = useState<EditableTask[]>([]);
  const [editFormat, setEditFormat] = useState<ResultFormat>('list');
  const [history, setHistory] = useState<Array<{id: number, prompt: string, resultado: string, timestamp: Date}>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [isSmartPasteResult, setIsSmartPasteResult] = useState(false);
  const [aiMode, setAiMode] = useState<'text' | 'tasks'>('text');
  const [generatedTasks, setGeneratedTasks] = useState<Array<{
    title?: string;
    titulo?: string;
    name?: string;
    text?: string;
    priority?: string;
    prioridad?: string;
    description?: string;
    descripcion?: string;
    desc?: string;
    detalles?: string;
    timeBlock?: string;
    durationMinutes?: number;
    dueDate?: string;
  }>>([]);
  const bottomPanelRef = useRef<HTMLDivElement>(null);

  const scrollToBottomPanel = useCallback(() => {
    bottomPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const router = useRouter();
  const { language, t } = useTranslation();
  const isEn = language === 'en';
  const {
    settings: avatarSettings,
    mood: avatarMood,
    setMood: setAvatarMood,
    celebrate: celebrateAvatar,
    updateSettings: updateAvatarSettings,
  } = useAvatar();

  // Toast message helpers
  const toastSaved = (title: string) => isEn ? `Task "${title}" saved successfully!` : `¡Tarea "${title}" guardada exitosamente!`;
  const toastSavedAll = (count: number) => isEn ? `Successfully saved ${count} tasks!` : `¡${count} tareas guardadas exitosamente!`;
  const toastError = (title: string) => isEn ? `Error saving task "${title}"` : `Error al guardar la tarea "${title}"`;
  const toastErrorAll = isEn ? "Failed to save tasks to database." : "No se pudieron guardar las tareas en la base de datos.";
  const toastChangesSaved = isEn ? "Changes saved successfully" : "Cambios guardados correctamente";
  const errorGeneric = isEn ? "An error occurred while generating text. Check your API Key." : "Ocurrió un error al generar el texto. Verifica tu API Key.";
  const errorFileUpload = isEn ? "An unexpected error occurred while processing the file" : "Ocurrió un error inesperado al procesar el archivo";
  const presetExtractTasks = isEn ? "📋 Extract Tasks" : "📋 Extraer Tareas";
  const presetExecSummary = isEn ? "📝 Executive Summary" : "📝 Resumen Ejecutivo";
  const presetCreateSchedule = isEn ? "📅 Create Schedule" : "📅 Crear Cronograma";
  const presetFormatSmartPaste = isEn ? "⚡ Format with SmartPaste" : "⚡ Formatear con SmartPaste";
  const promptLabel = isEn ? "What do you want AI to generate?" : "¿Qué quieres que genere la IA?";
  const promptPlaceholder = isEn ? "Type what you want AI to generate (e.g., Write a task summary for the team)..." : "Escribe lo que quieres que genere la IA (ej. Escribe un resumen de tareas para el equipo)...";
  const charCount = (count: number) => isEn ? `${count} characters remaining` : `${count} caracteres restantes`;
  const dropzoneHint = isEn ? "Drag and drop a PDF or Word file here" : "Arrastra un archivo PDF o Word aquí";
  const dropzoneClickHint = isEn ? "or click to select (max. 10 MB)" : "o haz clic para seleccionar (máx. 10 MB)";
  const fileUploadProcessing = isEn ? "Processing document..." : "Procesando documento...";
  const fileUploadReady = isEn ? "Ready" : "Listo para procesar";
  const fileUploadViewText = isEn ? "View text" : "Ver texto";
  const fileUploadRemove = isEn ? "Remove" : "Quitar";
  const fileUploadErrorUnexpected = isEn ? "An unexpected error occurred while processing the file" : "Ocurrió un error inesperado al procesar el archivo";
  const generateButton = isEn ? "Generate with AI" : "Generar con IA";
  const generatingButton = isEn ? "Generating response..." : "Generando respuesta...";
  const resultHeader = isEn ? "AI Response" : "Respuesta de la IA";
  const resultSubtitle = isEn ? "Content successfully generated and structured" : "Contenido generado y estructurado con éxito";
  const editButton = isEn ? "Edit" : "Editar";
  const copyButton = isEn ? "Copy" : "Copiar";
  const copiedButton = isEn ? "Copied!" : "¡Copiado!";
  const pdfButton = isEn ? "PDF" : "PDF";
  const wordButton = isEn ? "Word" : "Word";
  const placeholder = isEn ? "Waiting for your prompt. Type above or use Smart Paste to see the magic." : "Esperando tu prompt. Escribe algo arriba o usa Smart Paste para ver la magia.";
  const historyTitle = isEn ? "Generation History" : "Historial de generaciones";
  const historyCount = (count: number) => isEn ? `(${count})` : `(${count})`;
  const historyEmpty = isEn ? "No previous generations" : "No hay generaciones previas";
  const historyEmptyDesc = isEn ? "Your last 5 generations will appear here" : "Tus últimas 5 generaciones aparecerán aquí";
  const historyLoad = isEn ? "Load" : "Cargar";
  const historyLoadAriaLabel = isEn ? "Load this generation" : "Cargar esta generación";
  const historyClearAll = isEn ? "Clear all" : "Limpiar todo";
  const historyViewAll = (count: number) => isEn ? `View all history (${count})` : `Ver todo el historial (${count})`;
  const workspaceSelect = isEn ? "Destination Workspace" : "Workspace destino";
  const workspaceLoading = isEn ? "Loading..." : "Cargando...";
  const workspaceNone = isEn ? "No workspaces" : "Sin workspaces";
  const workspacePersonal = isEn ? "Personal Dashboard" : "Dashboard Principal (Personal)";
  const workspaceLoadingAria = isEn ? "Loading..." : "Cargando...";
  const priorityLabel = isEn ? "Priority" : "Prioridad";
  const priorityHigh = isEn ? "High" : "Alta";
  const priorityMedium = isEn ? "Medium" : "Media";
  const priorityLow = isEn ? "Low" : "Baja";
  const saveAllButton = (count: number) => isEn ? `Save All Tasks (${count})` : `Guardar Todas las Tareas (${count})`;
  const createTaskButton = isEn ? "Create Task in Workspace" : "Crear Tarea en Workspace";
  const editPlaceholder = isEn ? "Write your response here..." : "Escribe tu respuesta aquí...";
  const editAriaLabel = isEn ? "Edit AI response" : "Editar respuesta de la IA";
  const saveEditAriaLabel = isEn ? "Save" : "Guardar";
  const cancelButton = isEn ? "Cancel" : "Cancelar";
  const saveChangesButton = isEn ? "Save Changes" : "Guardar Cambios";
  const pdfInstruction = isEn ? "Instruction:" : "Instrucción:";
  const pdfResultHeader = isEn ? "AI Response" : "Respuesta de la IA";
  const actionsGenerate = isEn ? "Generate with AI" : "Generar con IA";
  const actionsGenerating = isEn ? "Generating response..." : "Generando respuesta...";
  const actionsEdit = isEn ? "Edit" : "Editar";
  const actionsCopy = isEn ? "Copy" : "Copiar";
  const actionsCopied = isEn ? "Copied!" : "¡Copiado!";
  const actionsPdf = isEn ? "PDF" : "PDF";
  const actionsWord = isEn ? "Word" : "Word";
  const smartPasteInputLabel = isEn ? "Text to extract tasks from" : "Texto para extraer tareas";
  const smartPasteFileUploadAria = isEn ? "Upload PDF or Word document for Smart Paste" : "Subir documento PDF o Word para Smart Paste";
  const smartPasteHint = isEn ? "AI will extract tasks with title, description and priority. You can also upload PDF or Word." : "La IA extraerá tareas con título, descripción y prioridad. También puedes subir PDF o Word.";
  const smartPasteCharacters = isEn ? "characters" : "caracteres";
  const extractButton = isEn ? "Extract Tasks" : "Extraer Tareas";
  const generatePlanButton = isEn ? "Generate Smart Plan" : "Generar plan inteligente";
  const dailyPlannerInputPlaceholder = isEn ? "Describe your intention for the day...\n\nE.g.: I want to dedicate the morning to deep work, then meetings in the afternoon, and time for exercise." : "Describe tu intención para el día...\n\nEj: Quiero dedicar la mañana a trabajo profundo, luego reuniones por la tarde, y tiempo para ejercicio.";
  const dailyPlannerStartTimeLabel = isEn ? "Start time:" : "Hora inicio:";
  const dailyPlannerHint = isEn ? "AI will create activities with contiguous time blocks" : "La IA creará actividades con bloques horarios contiguos";
  const fileUploadRemoveAria = isEn ? "Remove" : "Quitar";
  const fileUploadViewTextAria = isEn ? "View extracted document text" : "Ver texto extraído del documento";
  const fileUploadProcessingAria = isEn ? "Processing document..." : "Procesando documento...";
  const smartPasteInputAria = isEn ? "Text to extract tasks from" : "Texto para extraer tareas";
  const historyAriaLabel = isEn ? "Predefined quick prompts" : "Prompts rápidos predefinidos";
  const historyViewTextAria = isEn ? "View extracted document text" : "Ver texto extraído del documento";
  const historyEditPlaceholder = isEn ? "Write your response here..." : "Escribe tu respuesta aquí...";
  const historyLoadAria = isEn ? "Load this generation" : "Cargar esta generación";
  const errorGenericMsg = isEn ? "An error occurred while generating text. Check your API Key." : "Ocurrió un error al generar el texto. Verifica tu API Key.";
  const errorFileUploadMsg = isEn ? "An unexpected error occurred while processing the file" : "Ocurrió un error inesperado al procesar el archivo";

  const PRESET_PROMPTS = [
    {
      label: isEn ? "📋 Extract Tasks" : "📋 Extraer Tareas",
      prompt: isEn
        ? 'Extract all actionable tasks from the following text. For each task indicate: clear title, brief description, priority (high/medium/low) and responsible person if mentioned. Format: numbered list.'
        : 'Extrae todas las tareas accionables del siguiente texto. Para cada tarea indica: título claro, descripción breve, prioridad (alta/media/baja) y responsable si se menciona. Formato: lista numerada.',
    },
    {
      label: isEn ? "📝 Executive Summary" : "📝 Resumen Ejecutivo",
      prompt: isEn
        ? 'Generate a professional executive summary of the following content. Include: main objective, key findings, decisions made, next steps and owners. Maximum 300 words, executive tone.'
        : 'Genera un resumen ejecutivo profesional del siguiente contenido. Incluye: objetivo principal, hallazgos clave, decisiones tomadas, próximos pasos y responsables. Máximo 300 palabras, tono ejecutivo.',
    },
    {
      label: isEn ? "📅 Create Schedule" : "📅 Crear Cronograma",
      prompt: isEn
        ? 'Create a detailed schedule based on the provided information. Include: phases, milestones, estimated dates, duration, dependencies and owners. Markdown table format.'
        : 'Crea un cronograma detallado basado en la información proporcionada. Incluye: fases, hitos, fechas estimadas, duración, dependencias y responsables. Formato tabla Markdown.',
    },
    {
      label: isEn ? "⚡ Format with SmartPaste" : "⚡ Formatear con SmartPaste",
      prompt: isEn
        ? 'Convert the following text into structured tasks for SmartPaste. Extract: task title, description, priority (high/medium/low), suggested time block and duration in minutes. JSON array format.'
        : 'Convierte el siguiente texto en tareas estructuradas para SmartPaste. Extrae: título de tarea, descripción, prioridad (alta/media/baja), bloque horario sugerido y duración en minutos. Formato JSON array.',
    },
  ];

  const MAX_PROMPT_LENGTH = 2000;

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
        setFileError(result.error || (isEn ? "Error processing document" : "Error al procesar el documento"));
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
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        setDragActive(false);
      }
    }
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    e.target.value = '';
  }, []);

  const clearFile = useCallback(() => {
    setUploadedFileName('');
    setDocumentContent('');
    setFileError('');
  }, []);

  useEffect(() => {
    const loadWorkspaces = async () => {
      setLoadingWorkspaces(true);
      try {
        const data = await getUserWorkspaces();
        setWorkspaces(data);
        if (data.length > 0) {
          setSelectedWorkspaceId(data[0].id);
        }
      } catch (err) {
        console.error('Error loading workspaces:', err);
      } finally {
        setLoadingWorkspaces(false);
      }
    };
    loadWorkspaces();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || cargando) return;

    setCargando(true);
    setAvatarMood('thinking');
    setError('');
    setMensajeExito('');
    setResultado('');
    setGeneracionExitosa(false);

    try {
      let respuesta: string;
      
      if (documentContent && uploadedFileName) {
        // Si hay documento adjunto, usar consultarDocumento con el prompt como instrucción
        respuesta = await consultarDocumento(documentContent, prompt, uploadedFileName, language);
      } else {
        // Sin documento, usar la generación de texto normal
        respuesta = await generarTextoAuto(prompt, language);
      }
      
      const resultadoFinal = respuesta || (isEn ? "No response was obtained." : "No se obtuvo ninguna respuesta.");
      setResultado(resultadoFinal);
      setGeneracionExitosa(true);
      
      // Add to history
      historyIdCounter.current += 1;
      setHistory(prev => [
        {
          id: historyIdCounter.current,
          prompt: prompt,
          resultado: resultadoFinal,
          timestamp: new Date(),
        },
        ...prev.slice(0, 4),
      ]);
      celebrateAvatar();
    } catch (err) {
      console.error(err);
      setError(errorGenericMsg);
      setAvatarMood('idle');
      setGeneracionExitosa(false);
    } finally {
      setCargando(false);
    }
  };

  const handleSmartPasteComplete = useCallback((result: string, tasks: Array<{
    title?: string;
    titulo?: string;
    name?: string;
    text?: string;
    priority?: string;
    prioridad?: string;
    description?: string;
    descripcion?: string;
    desc?: string;
    detalles?: string;
    timeBlock?: string;
    durationMinutes?: number;
  }>) => {
    setResultado(result);
    setIsSmartPasteResult(true);
    setAiMode('tasks');
    setGeneratedTasks(tasks);
    
    // Add to history
    historyIdCounter.current += 1;
    setHistory(prev => [
      {
        id: historyIdCounter.current,
        prompt: 'Smart Paste - ' + presetExtractTasks,
        resultado: result,
        timestamp: new Date(),
      },
      ...prev.slice(0, 4),
    ]);
    celebrateAvatar();
  }, [t, celebrateAvatar]);

  const handleGuardarEnWorkspace = async () => {
    if (!resultado.trim() || guardando) return;
    if (selectedWorkspaceId === undefined) {
      setError(isEn ? "Select a workspace to save the task" : "Selecciona un workspace para guardar la tarea");
      return;
    }

    console.log('[GENERADOR] handleGuardarEnWorkspace START');
    console.log('[GENERADOR] resultado length:', resultado.length);
    console.log('[GENERADOR] selectedWorkspaceId:', selectedWorkspaceId);
    console.log('[GENERADOR] selectedPrioridad:', selectedPrioridad);

    setGuardando(true);
    setError('');
    setMensajeExito('');

    try {
      const workspaceId = selectedWorkspaceId === "personal" ? null : selectedWorkspaceId;
      const taskTitle = resultado.slice(0, 200);
      const taskDescription = resultado;

      console.log('[GENERADOR] Calling createTaskFromAIAction with:', {
        titulo: taskTitle,
        descripcion: taskDescription,
        workspaceId,
        prioridad: selectedPrioridad
      });

      const result = await createTaskFromAIAction({
        titulo: taskTitle,
        descripcion: taskDescription,
        workspaceId,
        prioridad: selectedPrioridad,
      });
      
      console.log('[GENERADOR] Server action result:', result);
      
      if (!result.success) {
        console.error('[GENERADOR] Server action returned error:', result.error);
        setError(result.error || toastErrorAll);
        return;
      }
      
      console.log('[GENERADOR] Task created successfully, refreshing...');
      setMensajeExito(toastSavedAll(1));
      router.refresh();
    } catch (err) {
      console.error('[GENERADOR] handleGuardarEnWorkspace ERROR:', err);
      setError(err instanceof Error ? err.message : toastErrorAll);
    } finally {
      setGuardando(false);
    }
  };

  interface GeneratedTask {
    title?: string;
    titulo?: string;
    name?: string;
    text?: string;
    description?: string;
    descripcion?: string;
    desc?: string;
    detalles?: string;
    priority?: string;
    prioridad?: string;
    timeBlock?: string;
    durationMinutes?: number;
    dueDate?: string; // ISO date string for due date
  }

  // Helper to strip markdown bold/italic symbols and list markers from text
  const cleanTitle = (rawTitle: string): string => {
    return rawTitle
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/^\s*[\*\-\d\.]+\s*/, '') // Remove leading bullets/numbers
      .trim();
  };

  const handleTaskPriorityChange = (index: number, newPriority: string) => {
    setGeneratedTasks(prev => 
      prev.map((task, i) => i === index ? { ...task, priority: newPriority } : task)
    );
  };

  const handleTaskDueDateChange = (index: number, dueDate: string) => {
    setGeneratedTasks(prev => 
      prev.map((task, i) => i === index ? { ...task, dueDate } : task)
    );
  };

  const handleSaveSingleTask = async (task: GeneratedTask) => {
    if (guardando || selectedWorkspaceId === undefined) return;

    const taskTitle = task.title || task.titulo || task.name || task.text || (isEn ? "New Task" : "Nueva Tarea");
    const taskDescription = task.description || task.descripcion || task.desc || task.detalles || "";
    const taskPriority = (task.priority || task.prioridad || "media").toLowerCase();
    const workspaceId = selectedWorkspaceId === "personal" ? null : selectedWorkspaceId;

    console.log('[GENERADOR] handleSaveSingleTask START');
    console.log('[GENERADOR] Task data:', { taskTitle, taskDescription, taskPriority, workspaceId, rawTask: task });
    console.log('[GENERADOR] selectedWorkspaceId:', selectedWorkspaceId);

    setGuardando(true);
    setError('');
    setMensajeExito('');

    try {
      const taskDueDate = task.dueDate || undefined;
      const result = await createTaskFromAIAction({
        titulo: taskTitle,
        descripcion: taskDescription,
        workspaceId,
        prioridad: taskPriority as 'alta' | 'media' | 'baja',
        fechaEntrega: taskDueDate,
      });
      
      console.log('[GENERADOR] Server action result:', result);
      
      if (!result.success) {
        console.error('[GENERADOR] Server action returned error:', result.error);
        setError(result.error || toastError(taskTitle));
        return;
      }
      
      console.log('[GENERADOR] Task created successfully, refreshing...');
      setMensajeExito(toastSaved(taskTitle));
      router.refresh();
    } catch (err) {
      console.error('[GENERADOR] handleSaveSingleTask ERROR:', err);
      setError(err instanceof Error ? err.message : toastError(taskTitle));
    } finally {
      setGuardando(false);
    }
  };

  const handleSaveAllTasks = async () => {
    if (guardando || selectedWorkspaceId === undefined || generatedTasks.length === 0) return;

    console.log('[GENERADOR] handleSaveAllTasks START');
    console.log('[GENERADOR] Total tasks to save:', generatedTasks.length);
    console.log('[GENERADOR] selectedWorkspaceId:', selectedWorkspaceId);
    console.log('[GENERADOR] Tasks array:', generatedTasks);

    setGuardando(true);
    setError('');
    setMensajeExito('');

    try {
      const workspaceId = selectedWorkspaceId === "personal" ? null : selectedWorkspaceId;
      
      for (let i = 0; i < generatedTasks.length; i++) {
        const task = generatedTasks[i];
        const taskTitle = task.title || task.titulo || task.name || task.text || (isEn ? "New Task" : "Nueva Tarea");
        const taskDescription = task.description || task.descripcion || task.desc || task.detalles || "";
        const taskPriority = (task.priority || task.prioridad || "media").toLowerCase();
        const taskDueDate = task.dueDate || undefined;

        console.log(`[GENERADOR] Saving task ${i + 1}/${generatedTasks.length}:`, { taskTitle, taskDescription, taskPriority, taskDueDate, workspaceId });

        const result = await createTaskFromAIAction({
          titulo: taskTitle,
          descripcion: taskDescription,
          workspaceId,
          prioridad: taskPriority as 'alta' | 'media' | 'baja',
          fechaEntrega: taskDueDate,
        });
        
        console.log(`[GENERADOR] Task ${i + 1} result:`, result);
        
        if (!result.success) {
          console.error(`[GENERADOR] Task ${i + 1} failed:`, result.error);
          throw new Error(result.error || (isEn ? `Error saving task ${i + 1}` : `Error guardando tarea ${i + 1}`));
        }
      }
      
      console.log('[GENERADOR] All tasks saved successfully, refreshing...');
      setMensajeExito(toastSavedAll(generatedTasks.length));
      router.refresh();
    } catch (err) {
      console.error('[GENERADOR] handleSaveAllTasks ERROR:', err);
      setError(err instanceof Error ? err.message : toastErrorAll);
    } finally {
      setGuardando(false);
    }
  };

  const handleCopiar = useCallback(async () => {
    if (!resultado.trim()) return;
    try {
      await navigator.clipboard.writeText(resultado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }, [resultado]);

  const handlePresetClick = (presetPrompt: string) => {
    setPrompt(presetPrompt);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(e.target.value);
    }
  };

  const markdownToHtml = (markdown: string): string => {
    return marked.parse(markdown, { async: false }) as string;
  };

  const exportToPDF = useCallback(async () => {
    if (!resultado.trim()) return;
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let currentY = 40;
      
      const addText = (text: string, fontSize: number = 11, isBold: boolean = false, color: [number, number, number] = [30, 30, 30]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, contentWidth);
        if (Array.isArray(lines)) {
          lines.forEach((line: string) => {
            pdf.text(line, margin, currentY);
            currentY += (fontSize * 0.5);
          });
        } else {
          pdf.text(lines, margin, currentY);
          currentY += (fontSize * 0.5);
        }
      };

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.text(isEn ? "Text Generator - PlanAI" : "Generador de Texto - PlanAI", margin, 25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${isEn ? "Generated" : "Generado"}: ${new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, 32);
      
      pdf.setDrawColor(79, 70, 229);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 35, pageWidth - margin, 35);
      
      addText(pdfInstruction, 12, true, [55, 55, 55]);
      addText(prompt, 11, false, [60, 60, 60]);
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY + 3, pageWidth - margin, currentY + 3);
      
      addText(pdfResultHeader, 12, true, [55, 55, 55]);
      
      const lines = resultado.split('\n');
      let inCodeBlock = false;
      
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        
        if (inCodeBlock) {
          pdf.setFontSize(9);
          pdf.setFont('courier', 'normal');
          pdf.setTextColor(80, 80, 80);
          pdf.setFillColor(240, 240, 240);
          const textWidth = pdf.getStringUnitWidth(line) * 9 / pdf.internal.scaleFactor;
          pdf.rect(margin, currentY + 2, Math.min(textWidth + 4, contentWidth), 6, 'F');
          pdf.text(line, margin + 2, currentY + 6);
          currentY += 10;
        } else if (line.startsWith('# ')) {
          addText(line.substring(2), 16, true, [30, 30, 30]);
        } else if (line.startsWith('## ')) {
          addText(line.substring(3), 14, true, [50, 50, 50]);
        } else if (line.startsWith('### ')) {
          addText(line.substring(4), 12, true, [70, 70, 70]);
        } else if (line.match(/^[-*]\s/)) {
          const bulletText = line.replace(/^[-*]\s/, '• ');
          addText(bulletText, 11, false, [60, 60, 60]);
        } else if (line.match(/^\d+\.\s/)) {
          addText(line, 11, false, [60, 60, 60]);
        } else if (line.trim() === '') {
          pdf.setFontSize(6);
          currentY += 6;
        } else {
          addText(line, 11, false, [60, 60, 60]);
        }
        
        if (currentY > 270) {
          pdf.addPage();
          currentY = 20;
        }
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = isEn ? `Generation_PlanAI_${timestamp}.pdf` : `Generacion_PlanAI_${timestamp}.pdf`;
      
      pdf.save(filename);
    } catch (err) {
      console.error('Error exporting to PDF:', err);
      setError(isEn ? "Error exporting to PDF" : "Error al exportar a PDF");
    }
  }, [resultado, prompt, isEn, pdfInstruction, pdfResultHeader]);

  const exportToWord = useCallback(async () => {
    if (!resultado.trim()) return;
    
    try {
      const children: Paragraph[] = [];
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: isEn ? "Text Generator - PlanAI" : "Generador de Texto - PlanAI",
              bold: true,
              size: 36,
              color: '4F46E5',
            }),
          ],
          spacing: { after: 200 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${isEn ? "Generated" : "Generado"}: ${new Date().toLocaleDateString(isEn ? 'en-US' : 'es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
              size: 20,
              color: '64748B',
            }),
          ],
          spacing: { after: 300 },
        })
      );
      
      children.push(
        new Paragraph({
          border: { bottom: { color: '4F46E5', space: 1, style: 'single', size: 6 } },
          spacing: { after: 200 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: pdfInstruction,
              bold: true,
              size: 24,
              color: '374151',
            }),
          ],
          spacing: { after: 100 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: prompt,
              size: 22,
              color: '4B5563',
            }),
          ],
          spacing: { after: 300 },
        })
      );
      
      children.push(
        new Paragraph({
          border: { bottom: { color: 'E5E7EB', space: 1, style: 'single', size: 4 } },
          spacing: { after: 300 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: pdfResultHeader,
              bold: true,
              size: 24,
              color: '374151',
            }),
          ],
          spacing: { after: 200 },
        })
      );
      
      const lines = resultado.split('\n');
      let inCodeBlock = false;
      let codeContent: string[] = [];
      
      for (const line of lines) {
        if (line.trim().startsWith('```')) {
          if (inCodeBlock && codeContent.length > 0) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: codeContent.join('\n'),
                    font: 'Courier New',
                    size: 18,
                    color: '4B5563',
                  }),
                ],
                shading: { fill: 'F3F4F6' },
                spacing: { after: 200 },
              })
            );
            codeContent = [];
          }
          inCodeBlock = !inCodeBlock;
          continue;
        }
        
        if (inCodeBlock) {
          codeContent.push(line);
          continue;
        }
        
        if (line.startsWith('# ')) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(2),
                  bold: true,
                  size: 32,
                  color: '1F2937',
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 200 },
            })
          );
        } else if (line.startsWith('## ')) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(3),
                  bold: true,
                  size: 28,
                  color: '374151',
                }),
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 250, after: 150 },
            })
          );
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.substring(4),
                  bold: true,
                  size: 24,
                  color: '4B5563',
                }),
              ],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (line.match(/^[-*]\s/)) {
          const bulletText = line.replace(/^[-*]\s/, '');
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: bulletText,
                  size: 22,
                  color: '4B5563',
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 100 },
            })
          );
        } else if (line.match(/^\d+\.\s/)) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                  color: '4B5563',
                }),
              ],
              numbering: { reference: 'ordered', level: 0 },
              spacing: { after: 100 },
            })
          );
        } else if (line.trim() === '') {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '', size: 12 })],
              spacing: { after: 100 },
            })
          );
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                  color: '374151',
                }),
              ],
              spacing: { after: 150 },
            })
          );
        }
      }
      
      if (inCodeBlock && codeContent.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeContent.join('\n'),
                font: 'Courier New',
                size: 18,
                color: '4B5563',
              }),
            ],
            shading: { fill: 'F3F4F6' },
            spacing: { after: 200 },
          })
        );
      }
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: children,
        }],
        numbering: {
          config: [
            {
              reference: 'ordered',
              levels: [
                { level: 0, format: 'decimal', text: '%1.', alignment: 'left' },
              ],
            },
          ],
        },
      });
      
      const blob = await Packer.toBlob(doc);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = isEn ? `Generation_PlanAI_${timestamp}.docx` : `Generacion_PlanAI_${timestamp}.docx`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting to Word:', err);
      setError(isEn ? "Error exporting to Word" : "Error al exportar a Word");
    }
  }, [resultado, prompt, isEn, pdfInstruction, pdfResultHeader]);

  const handleStartEdit = useCallback(() => {
    // Result is stored as markdown, so edit the raw source directly
    setEditedContent(resultado);
    setIsEditing(true);
    setTimeout(() => {
      editableRef.current?.focus({ preventScroll: true });
    }, 0);
  }, [resultado]);

  const handleCancelEdit = useCallback(() => {
    // Discard unsaved edits: `resultado` still holds the original result
    setIsEditing(false);
    setEditedContent('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!isEditing) return;
    
    // Update the main result with edited content
    setResultado(editedContent);
    
// If in tasks mode, re-parse the edited text into generatedTasks
    if (aiMode === 'tasks' && editedContent.trim()) {
      interface ParsedTask {
          title: string;
          description: string;
          priority: string;
        }

      const parseTasksFromText = (text: string): ParsedTask[] => {
        const tasks: ParsedTask[] = [];
        const lines = text.split('\n').filter(line => line.trim());
        let currentTask: ParsedTask | null = null;
       
        for (const line of lines) {
          const trimmed = line.trim();
          // Match numbered list items (1., 2., etc.) or bullet points
          const taskMatch = trimmed.match(/^(\d+\.|[-*])\s*(.+)$/);
          if (taskMatch) {
            if (currentTask) tasks.push(currentTask);
            const title = cleanTitle(taskMatch[2]);
            currentTask = {
              title: title,
              description: '',
              priority: 'media'
            };
          } else if (currentTask && trimmed.startsWith('**') && trimmed.includes('**')) {
            // Handle priority markers like **alta**, **media**, **baja**
            const priorityMatch = trimmed.match(/\*\*(alta|media|baja|high|medium|low)\*\*/i);
            if (priorityMatch) {
              currentTask.priority = priorityMatch[1].toLowerCase();
            }
          } else if (currentTask && trimmed && !trimmed.match(/^(\d+\.|[-*])/)) {
            // Description line
            if (currentTask.description) {
              currentTask.description += ' ' + trimmed;
            } else {
              currentTask.description = trimmed;
            }
          }
        }
        if (currentTask) tasks.push(currentTask);
        
        return tasks.length > 0 ? tasks : [{
          title: cleanTitle(textContent.slice(0, 100)),
          description: textContent,
          priority: 'media'
        }];
      };
      
      const textContent = editedContent;
      const parsedTasks = parseTasksFromText(textContent);
      setGeneratedTasks(parsedTasks);
    }
    
    // Exit edit mode
    setIsEditing(false);
    setEditedContent('');
    
    // Show confirmation toast
    setMensajeExito(toastChangesSaved);
    setTimeout(() => setMensajeExito(''), 3000);
  }, [isEditing, editedContent, aiMode]);

  const handleSaveToHistory = (item: {prompt: string, resultado: string, timestamp: Date}) => {
    setPrompt(item.prompt);
    setResultado(item.resultado);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const caracteresRestantes = MAX_PROMPT_LENGTH - prompt.length;
  const isNearLimit = caracteresRestantes < 200;

  return (
    <main className="pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto bg-slate-50 dark:bg-[#0b0f19] min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <span aria-hidden="true">🤖</span> {isEn ? "AI Automation" : "Automatización con IA"}
            </h1>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-1.5"
              aria-expanded={showHistory}
              aria-controls="history-panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isEn ? `Generation history (${history.length})` : `Historial de generaciones (${history.length})`}
            </button>
          </div>
          <p className="text-muted-foreground text-sm">{isEn ? "Generate content with AI and save it as tasks in your workspace" : "Genera contenido con IA y guárdalo como tarea en tu workspace"}</p>
        </header>

        {/* Main Input Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
          {/* Column 1: Prompt Generator Form */}
          <div className="card rounded-2xl p-6 bg-card border border-border space-y-4 min-w-0">
            <form onSubmit={handleSubmit} className="space-y-5 pointer-events-auto">
            <label htmlFor="prompt" className="block text-sm font-medium text-muted-foreground">
              {isEn ? "What do you want AI to generate?" : "💡 ¿Qué quieres que genere la IA?"}
            </label>
 
            {/* Botones de Prompts Rápidos (Presets) */}
            <div id="tour-preset-prompts" className="flex flex-wrap gap-2" role="group" aria-label={historyAriaLabel}>
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset.prompt)}
                  disabled={cargando}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {preset.label}
                </button>
              ))}
            </div>
 
            <div className="relative pointer-events-auto">
              <textarea
                id="tour-prompt-input"
                value={prompt}
                onChange={handlePromptChange}
                placeholder={isEn ? "Type what you want AI to generate (e.g., Write a task summary for the team)..." : "Escribe lo que quieres que genere la IA (ej. Escribe un resumen de tareas para el equipo)..."}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-sm min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={cargando}
                  maxLength={MAX_PROMPT_LENGTH}
                  aria-describedby="prompt-hint"
                />
                <div
                  id="prompt-hint"
                  className={`absolute bottom-2 right-3 text-xs transition-colors duration-200 ${
                    isNearLimit ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                  }`}
                  aria-live="polite"
                >
                  {isEn ? `${caracteresRestantes} characters remaining` : `${caracteresRestantes} caracteres restantes`}
                </div>
              </div>

              {/* Carga de documentos */}
              <div className="space-y-3">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
                    dragActive
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-slate-300 dark:border-slate-800 hover:border-purple-500/50 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="document-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="sr-only absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={fileLoading || cargando}
                    aria-label={isEn ? "Upload PDF or Word document" : "Subir documento PDF o Word"}
                  />
                  <label
                    htmlFor="document-upload"
                    className="flex flex-col items-center justify-center p-6 text-center cursor-pointer"
                  >
                    {fileLoading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-500 border-t-transparent" />
                        <span className="text-purple-600 dark:text-purple-400 font-medium">{fileUploadProcessing}</span>
                        <div className="w-full max-w-xs h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
                        </div>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex flex-col items-center gap-3 p-4 w-full">
                        <div className="flex items-center gap-3 w-full p-3 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl animate-slide-in">
                          <div className="p-2 bg-violet-500/15 border border-violet-500/25 rounded-lg flex-shrink-0">
                            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{uploadedFileName}</p>
                            <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8" aria-hidden="true">
                                <circle cx="4" cy="4" r="4" />
                              </svg>
                              {fileUploadReady}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {documentContent && (
                              <button
                                type="button"
                                onClick={() => setShowFilePreview(true)}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                                aria-label={historyViewTextAria}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {fileUploadViewText}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={clearFile}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium cursor-pointer flex-shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              {fileUploadRemove}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V12" />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{isEn ? "Drag and drop a PDF or Word file here" : "Arrastra un archivo PDF o Word aquí"}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-500">{isEn ? "or click to select (max. 10 MB)" : "o haz clic para seleccionar (máx. 10 MB)"}</span>
                      </div>
                    )}
                  </label>
                </div>
                {fileError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {fileError}
                  </div>
                )}
              </div>

              <button
                id="tour-generate-btn"
                type="submit"
                disabled={cargando || !prompt.trim()}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl py-3 shadow-lg shadow-violet-600/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label={cargando ? (isEn ? "Generating response..." : "Generando respuesta...") : (isEn ? "Generate with AI" : "Generar con IA")}
              >
                {cargando ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    {isEn ? "Generating response..." : "Generando respuesta..."}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">✨</span> {isEn ? "Generate with AI" : "Generar con IA"}
                  </>
                )}
              </button>
            </form>

            {/* Mensajes de estado */}
            <div className="space-y-3" role="status" aria-live="polite">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {mensajeExito && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2 animate-slide-in" role="status">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {mensajeExito}
                </div>
              )}

            </div>
          </div>

          {/* Column 2: AI Tools Panel (SmartPaste & Planificador Diario) */}
          <div className="card rounded-2xl p-6 bg-card border border-border space-y-4 min-w-0">
            <AITaskTools
              onSmartPasteComplete={handleSmartPasteComplete}
              onScrollToResults={scrollToBottomPanel}
            />
          </div>
        </div>

        {/* Unified Output Panel */}
        <div ref={bottomPanelRef} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl space-y-6 mt-6">
          {/* Header: AI Response Title + Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                ✨
              </div>
              <div>
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-base">{resultHeader}</h3>
                <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  {resultSubtitle}
                </span>
              </div>
            </div>
            {/* Actions: Editar, Copiar, PDF, Word (Editar hidden while editing) */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  aria-label={isEn ? "Edit" : "Editar"}
                >
                  <span aria-hidden="true">✏️</span>
                  {editButton}
                </button>
              )}
              <button
                onClick={handleCopiar}
                disabled={copiado}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={copiado ? (isEn ? "Copied!" : "¡Copiado!") : (isEn ? "Copy" : "Copiar")}
              >
                <span aria-hidden="true">📋</span>
                {copiado ? copiedButton : copyButton}
              </button>
              <button
                onClick={exportToPDF}
                disabled={cargando}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isEn ? "Download as PDF" : "Descargar como PDF"}
              >
                <span aria-hidden="true">📥</span>
                {actionsPdf}
              </button>
              <button
                onClick={exportToWord}
                disabled={cargando}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isEn ? "Download as Word" : "Descargar como Word"}
              >
                <span aria-hidden="true">📄</span>
                {actionsWord}
              </button>
            </div>
          </div>

          {/* Body: Generated Text Content */}
          <div className="bg-slate-100/80 dark:bg-slate-950/90 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  ref={editableRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full min-h-[260px] bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/50 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 leading-relaxed outline-none resize-y scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
                  aria-label={editAriaLabel}
                  placeholder={historyEditPlaceholder}
                />
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-violet-600/25 transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <span aria-hidden="true">💾</span>
                    {saveChangesButton}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-medium px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer"
                  >
                    <span aria-hidden="true">×</span>
                    {cancelButton}
                  </button>
                </div>
              </div>
            ) : aiMode === 'tasks' && generatedTasks.length > 0 ? (
              <div className="space-y-3">
                {generatedTasks.map((task, index) => {
                  const rawTitle = task.title || task.name || task.text || task.titulo || (isEn ? `Task ${index + 1}` : `Tarea ${index + 1}`);
                  const title = cleanTitle(rawTitle);
                  const description = task.description || task.desc || task.detalles || task.descripcion || (language === 'en' ? "No description provided." : "Sin descripción proporcionada.");
                  const priority = task.priority || task.prioridad || 'media';

return (
                      <div key={index} className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm hover:border-purple-500/40 dark:hover:border-slate-700 transition-all">
                        <div className="space-y-3">
                          {/* Task title and description */}
                          <div className="space-y-1 min-w-0">
                            <h4 className="text-slate-900 dark:text-slate-100 text-sm font-semibold truncate">{title}</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed line-clamp-2">{description}</p>
                          </div>

                          {/* Interactive controls: Priority selector + Due date + Save button */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                            {/* Priority Selector - Color coded */}
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">
                                {language === 'en' ? 'Priority:' : 'Prioridad:'}
                              </label>
                              <select
                                value={priority}
                                onChange={(e) => handleTaskPriorityChange(index, e.target.value)}
                                className={`text-xs rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer appearance-none bg-no-repeat bg-right pr-8 transition-all ${
                                  priority === 'alta'
                                    ? 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800/60 focus:ring-red-500/30'
                                    : priority === 'media'
                                    ? 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800/60 focus:ring-amber-500/30'
                                    : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/60 focus:ring-emerald-500/30'
                                }`}
                                style={{
                                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                                  backgroundPosition: 'right 0.5rem center',
                                  backgroundSize: '1rem'
                                }}
                              >
                                <option value="baja" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{language === 'en' ? 'Low' : 'Baja'}</option>
                                <option value="media" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{language === 'en' ? 'Medium' : 'Media'}</option>
                                <option value="alta" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{language === 'en' ? 'High' : 'Alta'}</option>
                              </select>
                            </div>

                            {/* Due Date Picker */}
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium whitespace-nowrap">
                                {language === 'en' ? 'Due Date:' : 'Fecha límite:'}
                              </label>
                              <input
                                type="date"
                                value={task.dueDate || ''}
                                onChange={(e) => handleTaskDueDateChange(index, e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 w-36"
                              />
                            </div>

                            {/* Individual Save Button */}
                            <button
                              onClick={() => handleSaveSingleTask({
                                ...task,
                                title: cleanTitle(rawTitle),
                                priority,
                                dueDate: task.dueDate
                              })}
                              disabled={guardando}
                              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs px-4 py-1.5 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              <span className="hidden sm:inline">{language === 'en' ? 'Save' : 'Guardar'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            ) : resultado ? (
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-4 prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:border-b prose-headings:border-slate-200 dark:prose-headings:border-slate-800/80 prose-headings:pb-2 prose-strong:text-purple-700 dark:prose-strong:text-purple-300 prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:my-1 animate-fade-in">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizeMarkdownBlocks(resultado)}</ReactMarkdown>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {historyTitle} {historyCount(history.length)}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                  {language === 'en' ? 'Click on a generation to load it again' : 'Haz clic en una generación para cargarla de nuevo'}
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {history.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { handleSaveToHistory(item); setShowHistory(false); }}
                      className="w-full text-left p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-violet-500/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">#{history.indexOf(item) + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate" title={item.prompt}>{item.prompt}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={item.resultado}>{item.resultado}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{item.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {history.length > 5 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full px-4 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-lg transition-colors"
                  >
                    {isEn ? `View all history (${history.length})` : `Ver todo el historial (${history.length})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-500 space-y-2">
                <span className="text-2xl">✨</span>
                <p className="text-xs">{isEn ? "Waiting for your prompt. Type above or use Smart Paste to see the magic." : "Esperando tu prompt. Escribe algo arriba o usa Smart Paste para ver la magia."}</p>
              </div>
            )}
          </div>

          {/* Footer: Workspace Selector + Actions - Smart Paste Tasks Mode */}
          {aiMode === 'tasks' && generatedTasks.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{workspaceSelect}</label>
                {loadingWorkspaces ? (
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 animate-pulse text-xs rounded-lg">
                    {workspaceLoading}
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs rounded-lg text-center">
                    {workspaceNone}
                  </div>
                ) : (
                  <select
                    value={selectedWorkspaceId || ''}
                    onChange={e => setSelectedWorkspaceId(e.target.value || null)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                    disabled={guardando}
                  >
                    <option value="personal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{workspacePersonal}</option>
                    {Array.from(new Set(workspaces.map(w => w.id)))
                      .map(id => workspaces.find(w => w.id === id))
                      .filter((ws): ws is Workspace => !!ws)
                      .map((ws, idx) => (
                        <option key={idx} value={ws.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {ws.name} ({ws.user_role})
                        </option>
                      ))}
                  </select>
                )}
              </div>
              <button
                onClick={handleSaveAllTasks}
                disabled={guardando || !selectedWorkspaceId}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-6 py-2.5 shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label={guardando ? (isEn ? 'Saving tasks...' : 'Guardando tareas...') : (isEn ? 'Save all tasks to workspace' : 'Guardar todas las tareas en workspace')}
              >
                {guardando ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    {isEn ? 'Saving...' : 'Guardando...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17v5" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
                    </svg>
                    {isEn ? `Save All Tasks (${generatedTasks.length})` : `Guardar Todas las Tareas (${generatedTasks.length})`}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer: Workspace Selector + Priority + Create Task Button - Standard Text Mode */}
          {aiMode === 'text' && isSmartPasteResult && resultado && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{isEn ? "Destination Workspace" : "Workspace destino"}</label>
                  {loadingWorkspaces ? (
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 animate-pulse text-xs rounded-lg">
                      {isEn ? "Loading..." : "Cargando..."}
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs rounded-lg text-center">
                      {isEn ? "No workspaces" : "Sin workspaces"}
                    </div>
                  ) : (
                    <select
                      value={selectedWorkspaceId || ''}
                      onChange={e => setSelectedWorkspaceId(e.target.value || null)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
                      disabled={guardando}
                    >
                      <option value="personal" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{isEn ? "Personal Dashboard" : "Dashboard Principal (Personal)"}</option>
                      {Array.from(new Set(workspaces.map(w => w.id)))
                        .map(id => workspaces.find(w => w.id === id))
                        .filter((ws): ws is Workspace => !!ws)
                        .map((ws, idx) => (
                          <option key={idx} value={ws.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                            {ws.name} ({ws.user_role})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{isEn ? "Priority" : "Prioridad"}</label>
                  <select
                    value={selectedPrioridad}
                    onChange={e => setSelectedPrioridad(e.target.value as 'alta' | 'media' | 'baja')}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-lg px-3 py-2 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 outline-none"
                    disabled={guardando}
                  >
                    <option value="alta" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{isEn ? "High" : "Alta"}</option>
                    <option value="media" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{isEn ? "Medium" : "Media"}</option>
                    <option value="baja" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{isEn ? "Low" : "Baja"}</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGuardarEnWorkspace}
                disabled={guardando || !selectedWorkspaceId}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-6 py-2.5 shadow-lg shadow-violet-600/20 transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                aria-label={guardando ? (isEn ? 'Saving task...' : 'Guardando tarea...') : (isEn ? 'Save response to workspace' : 'Guardar respuesta en workspace')}
              >
                {guardando ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    {isEn ? 'Saving...' : 'Guardando...'}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">📌</span> {isEn ? 'Create Task in Workspace' : 'Crear Tarea en Workspace'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

{/* Modal: Vista Previa del Archivo Cargado */}
      {showFilePreview && documentContent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowFilePreview(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="file-preview-title"
        >
          <div
            className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
              <h3 id="file-preview-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {isEn ? "Extracted text: " : "Texto extraído: "}{uploadedFileName}
              </h3>
              <button
                onClick={() => setShowFilePreview(false)}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label={isEn ? "Close preview" : "Cerrar vista previa"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 font-mono text-sm text-slate-900 dark:text-slate-200 whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                {documentContent}
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(documentContent);
                    setShowFilePreview(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {isEn ? "Copy full text" : "Copiar texto completo"}
                </button>
                <button
                  onClick={() => setShowFilePreview(false)}
                  className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                >
                  {isEn ? "Close" : "Cerrar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

{/* Panel: Historial de Generaciones */}
      {showHistory ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/30 animate-fade-in"
          onClick={() => setShowHistory(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="history-title"
        >
          <div
            id="history-panel"
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[70vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50">
              <h3 id="history-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isEn ? "Generation History" : "Historial de generaciones"}
              </h3>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    {isEn ? "Clear all" : "Limpiar todo"}
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                  aria-label={isEn ? "Close history" : "Cerrar historial"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">{isEn ? "No previous generations" : "No hay generaciones previas"}</p>
                  <p className="text-xs mt-1">{isEn ? "Your last 5 generations will appear here" : "Tus últimas 5 generaciones aparecerán aquí"}</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200/50 dark:divide-slate-700/50" role="list">
                  {history.map((item) => (
                    <li key={item.id} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => { handleSaveToHistory(item); setShowHistory(false); }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">#{history.indexOf(item) + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate" title={item.prompt}>{item.prompt}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={item.resultado}>{item.resultado}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.timestamp.toLocaleTimeString()}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveToHistory(item); setShowHistory(false); }}
                          className="flex-shrink-0 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                          aria-label={isEn ? "Load this generation" : "Cargar esta generación"}
                        >
                          {isEn ? "Load" : "Cargar"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div className="fixed bottom-6 right-6 z-50 w-48 h-56 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-white/10 overflow-hidden flex items-center justify-center">
        <Avatar3D
          interactive
          compact
          className="h-full w-full"
          reactionState={cargando ? 'thinking' : generacionExitosa ? 'success' : 'idle'}
          autoRotate={false}
          cameraPosition={[0, 0.8, 5.2]}
          cameraFov={40}
          modelScale={0.85}
        />
      </div>
      <GeneradorTour autoStart={true} hasCompletedGeneradorTour={false} />
      </div>
    </main>
  );
}