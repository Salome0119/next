'use client';

import { useState, useCallback, useEffect } from 'react';
import { generarTextoAuto } from '@/app/ai-actions';
import { createTaskFromAIAction } from '@/app/actions/task-actions';
import { getUserWorkspaces } from '@/app/actions/workspace-actions';

interface Workspace {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  user_role: string;
}

export default function GeneradorPage() {
  const [prompt, setPrompt] = useState('');
  const [resultado, setResultado] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [selectedPrioridad, setSelectedPrioridad] = useState<'alta' | 'media' | 'baja'>('media');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);

  const MAX_PROMPT_LENGTH = 2000;

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
    setError('');
    setMensajeExito('');
    setResultado('');

    try {
      const respuesta = await generarTextoAuto(prompt);
      setResultado(respuesta || 'No se obtuvo ninguna respuesta.');
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al generar el texto. Verifica tu API Key.');
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarEnWorkspace = async () => {
    if (!resultado.trim() || guardando) return;
    if (!selectedWorkspaceId) {
      setError('Selecciona un workspace para guardar la tarea');
      return;
    }

    setGuardando(true);
    setError('');
    setMensajeExito('');

    try {
      await createTaskFromAIAction({
        titulo: resultado,
        workspaceId: selectedWorkspaceId,
        prioridad: selectedPrioridad,
      });
      setMensajeExito('¡Tarea guardada exitosamente en el Workspace!');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tarea en la base de datos.');
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

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(e.target.value);
    }
  };

  const caracteresRestantes = MAX_PROMPT_LENGTH - prompt.length;
  const isNearLimit = caracteresRestantes < 200;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 pb-20">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-400 flex items-center justify-center gap-2">
            <span aria-hidden="true">✨</span> Generador de Texto con IA
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Genera contenido con IA y guárdalo como tarea en tu workspace</p>
        </div>

        {/* Formulario de prompt */}
        <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-slate-300">
            ¿Qué quieres que genere la IA?
          </label>
          <div className="relative">
            <textarea
              id="prompt"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Escribe lo que quieres que genere la IA (ej. Escribe un resumen de tareas para el equipo)..."
              className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              disabled={cargando}
              maxLength={MAX_PROMPT_LENGTH}
              aria-describedby="prompt-hint"
            />
            <div
              id="prompt-hint"
              className={`absolute bottom-2 right-3 text-xs transition-colors duration-200 ${
                isNearLimit ? 'text-amber-400' : 'text-slate-500'
              }`}
              aria-live="polite"
            >
              {caracteresRestantes} caracteres restantes
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando || !prompt.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            aria-label={cargando ? 'Generando respuesta...' : 'Generar con IA'}
          >
            {cargando ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                Generando respuesta...
              </>
            ) : (
              <>
                <span aria-hidden="true">✨</span> Generar con IA
              </>
            )}
          </button>
        </form>

        {/* Mensajes de estado */}
        <div className="space-y-3" role="status" aria-live="polite">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-slide-in" role="alert">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {mensajeExito && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-slide-in" role="status">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {mensajeExito}
            </div>
          )}
        </div>

        {/* Selector de Workspace y Prioridad */}
        {resultado && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4 space-y-3 animate-fade-in">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Workspace destino</label>
                {loadingWorkspaces ? (
                  <div className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-500 animate-pulse">
                    Cargando workspaces...
                  </div>
                ) : workspaces.length === 0 ? (
                  <div className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-slate-500 text-center">
                    No tienes workspaces. <a href="/dashboard/workspace/new" className="text-blue-400 hover:underline">Crea uno</a>
                  </div>
                ) : (
                  <select
                    value={selectedWorkspaceId || ''}
                    onChange={e => setSelectedWorkspaceId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    disabled={guardando}
                  >
                    <option value="">Selecciona un workspace</option>
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} ({ws.user_role})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Prioridad</label>
                <select
                  value={selectedPrioridad}
                  onChange={e => setSelectedPrioridad(e.target.value as 'alta' | 'media' | 'baja')}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  disabled={guardando}
                >
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟡 Media</option>
                  <option value="baja">🟢 Baja</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Resultado generado */}
        {resultado && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <span aria-hidden="true">🤖</span> Respuesta de la IA
              </h2>
              <button
                onClick={handleCopiar}
                disabled={copiado}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 flex items-center gap-1.5 text-sm"
                aria-label={copiado ? 'Copiado al portapapeles' : 'Copiar al portapapeles'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copiado ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="whitespace-pre-wrap text-slate-200 leading-relaxed prose prose-invert max-w-none">
              {resultado}
            </div>

            {resultado && (
              <button
                onClick={handleGuardarEnWorkspace}
                disabled={guardando || !selectedWorkspaceId}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                aria-label={guardando ? 'Guardando tarea...' : 'Guardar respuesta en workspace'}
              >
                {guardando ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">📌</span> Guardar en workspace seleccionado
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {!resultado && !cargando && !error && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-10 text-center animate-fade-in">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center">
              <span className="text-4xl">🤖</span>
            </div>
            <h2 className="text-lg font-medium text-slate-300 mb-2">Esperando tu prompt</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Escribe algo arriba y presiona "Generar con IA" para ver la magia
            </p>
          </div>
        )}
      </div>
    </main>
  );
}