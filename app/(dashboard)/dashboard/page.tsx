'use client';

import { useState, useTransition, FormEvent } from 'react';
import { crearTarea } from '@/app/actions';
import AITaskTools from '@/components/AITaskTools';
import TaskList from '@/components/TaskList';

export default function DashboardPage() {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [, startTransition] = useTransition();

  const handleAddTask = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;

    setAddingTask(true);
    const formData = new FormData();
    formData.append('titulo', newTaskTitle.trim());
    formData.append('prioridad', 'media');

    try {
      await crearTarea(formData);
      setNewTaskTitle('');
      startTransition(() => {
        // TaskList se actualiza solo via router.refresh en sus componentes internos
      });
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 pb-20 sm:p-6">
      <div className="w-full max-w-3xl space-y-6">
        {/* Formulario manual compacto */}
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">✏️ Nueva tarea rápida</h2>
          <form onSubmit={handleAddTask} className="flex gap-2">
            <label htmlFor="new-task" className="sr-only">Nueva tarea</label>
            <input
              id="new-task"
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Escribe una tarea y presiona Enter..."
              required
              disabled={addingTask}
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
              aria-label={addingTask ? 'Agregando...' : 'Agregar'}
            >
              {addingTask ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" aria-hidden="true"></span>
                  Agregando...
                </>
              ) : 'Agregar'}
            </button>
          </form>
        </section>

        {/* Herramientas IA - Sección colapsable */}
        <AITaskTools />

        {/* Lista de tareas con paginación */}
        <TaskList />
      </div>
    </main>
  );
}