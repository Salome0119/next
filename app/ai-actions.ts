'use server';

import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { SmartPasteSchema, DailyPlannerSchema, type SmartPasteResult, type DailyPlannerResult } from '@/lib/schemas';

const MODEL = 'openai/gpt-oss-120b';

const SMART_PASTE_PROMPT = `Eres un asistente que extrae tareas accionables de textos sin formato (correos, actas de reuniones, chats, notas).

Instrucciones:
- Identifica compromisos, pendientes y tareas explícitas o implícitas.
- Cada tarea DEBE tener: titulo (máx 100 chars), descripcion (string, "" si no hay contexto), prioridad ("alta" | "media" | "baja").
- Usa "media" como prioridad por defecto si no está clara.
- Usa "" (string vacío) para descripcion si no hay contexto relevante en el texto.
- Ignora saludos, firmas, texto irrelevante.
- Devuelve SOLO el JSON estructurado según el esquema.`;

const DAILY_PLANNER_PROMPT = `Eres un planificador diario que desglosa una intención general en actividades accionables con bloques de tiempo.

Instrucciones:
- Recibe la intención del usuario y una hora de inicio (formato HH:MM, 24h).
- Crea una lista de actividades realistas y ordenadas cronológicamente.
- Cada actividad DEBE tener: nombre (máx 100 chars), duracionMinutos (entero >0), bloqueHorario (ej: "09:00-10:30"), prioridad ("alta" | "media" | "baja").
- Usa "media" como prioridad por defecto si no está clara.
- Los bloques deben ser contiguos sin solapamientos, empezando en la hora indicada.
- Incluye pausas cortas (5-15 min) entre actividades largas si el día lo permite.
- Devuelve SOLO el JSON estructurado según el esquema.`;

export async function extraerTareasSmartPaste(texto: string): Promise<SmartPasteResult> {
  if (!texto || !texto.trim()) {
    throw new Error('El texto de entrada no puede estar vacío.');
  }

  try {
    const { object } = await generateObject({
      model: groq(MODEL),
      schema: SmartPasteSchema,
      system: SMART_PASTE_PROMPT,
      prompt: texto,
      temperature: 0.1,
    });
    return object;
  } catch (error: unknown) {
    console.error('Error en Smart Paste (Groq):', error);
    const message = error instanceof Error ? error.message : 'Error al procesar el texto con IA.';
    throw new Error(message);
  }
}

export async function generarPlanDiario(
  intencion: string,
  horaInicio: string = '08:00'
): Promise<DailyPlannerResult> {
  if (!intencion || !intencion.trim()) {
    throw new Error('La intención del día no puede estar vacía.');
  }

  // Validar formato HH:MM
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horaInicio)) {
    throw new Error('Formato de hora inválido. Use HH:MM (24h).');
  }

  try {
    const { object } = await generateObject({
      model: groq(MODEL),
      schema: DailyPlannerSchema,
      system: DAILY_PLANNER_PROMPT,
      prompt: `Intención: ${intencion}\nHora de inicio: ${horaInicio}`,
      temperature: 0.2,
    });
    return object;
  } catch (error: unknown) {
    console.error('Error en Planificador Diario (Groq):', error);
    const message = error instanceof Error ? error.message : 'Error al generar el plan con IA.';
    throw new Error(message);
  }
}

// Función original mantenida para compatibilidad
import Groq from 'groq-sdk';

const groqLegacy = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generarTextoAuto(prompt: string) {
  if (!prompt || !prompt.trim()) {
    throw new Error('El texto de entrada no puede estar vacío.');
  }

  try {
    const chatCompletion = await groqLegacy.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
    });

    return chatCompletion.choices[0]?.message?.content || 'No se obtuvo respuesta.';
  } catch (error: unknown) {
    console.error('Error en Groq:', error);
    const message = error instanceof Error ? error.message : 'Error al conectar con el servicio de IA.';
    throw new Error(message);
  }
}