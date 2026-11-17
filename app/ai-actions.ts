'use server';

import { generateObject } from 'ai';
import { groq } from '@ai-sdk/groq';
import { SmartPasteSchema, DailyPlannerSchema, type SmartPasteResult, type DailyPlannerResult } from '@/lib/schemas';
import { auth } from '@/auth';
import { getUserSettings } from '@/lib/user-settings-db';
import { incrementAiUsage, addAiGenerationHistory } from '@/lib/user-settings-db';

const MODEL = 'openai/gpt-oss-120b';

// Mapeo de nivel de creatividad a temperature de Groq
function mapCreativityToTemperature(level: string | null | undefined): number {
  if (!level) return 0.7;
  
  const normalized = level.toLowerCase().trim();
  
  switch (normalized) {
    case 'preciso':
    case 'precise': return 0.0;
    case 'creativo':
    case 'creative': return 1.4;
    case 'balanceado':
    case 'balanced':
    default: return 0.7;
  }
}

// Obtener instrucción de estilo según nivel de creatividad
function getCreativityStyleInstruction(level: string | null | undefined): string {
  if (!level) return '';
  
  const normalized = level.toLowerCase().trim();
  
  switch (normalized) {
    case 'preciso':
    case 'precise': return '\n\nResponde de forma directa, literal, estructurada y sin adornos innecesarios.';
    case 'creativo':
    case 'creative': return '\n\nUsa un estilo altamente original, imaginativo, expresivo y con metáforas o enfoques fuera de lo común.';
    case 'balanceado':
    case 'balanced':
    default: return '\n\nResponde con un tono claro, profesional y equilibrado.';
  }
}

async function getUserTemperatureAndStyle(): Promise<{ temperature: number; styleInstruction: string; level: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { temperature: 0.7, styleInstruction: getCreativityStyleInstruction('balanced'), level: 'balanced' };
    
    const settings = await getUserSettings(Number(session.user.id));
    const level = settings?.aiCreativityLevel || 'balanced';
    const temperature = mapCreativityToTemperature(level);
    const styleInstruction = getCreativityStyleInstruction(level);
    
    console.log('[GROQ CREATIVITY]', { nivelGuardado: level, temperature, styleInstruction });
    
    return { temperature, styleInstruction, level };
  } catch {
    return { temperature: 0.7, styleInstruction: getCreativityStyleInstruction('balanced'), level: 'balanced' };
  }
}

const SMART_PASTE_PROMPT_ES = `Eres un asistente que extrae tareas accionables de textos sin formato (correos, actas de reuniones, chats, notas).

Instrucciones:
- Identifica compromisos, pendientes y tareas explícitas o implícitas.
- Cada tarea DEBE tener: titulo (máx 100 chars), descripcion (string, "" si no hay contexto), prioridad ("alta" | "media" | "baja").
- Usa "media" como prioridad por defecto si no está clara.
- Usa "" (string vacío) para descripcion si no hay contexto relevante en el texto.
- Ignora saludos, firmas, texto irrelevante.
- Devuelve SOLO el JSON estructurado según el esquema.`;

const SMART_PASTE_PROMPT_EN = `You are an assistant that extracts actionable tasks from unstructured text (emails, meeting minutes, chats, notes).

Instructions:
- Identify commitments, pending items, and explicit or implicit tasks.
- Each task MUST have: title (max 100 chars), description (string, "" if no context), priority ("high" | "medium" | "low").
- Use "medium" as default priority if unclear.
- Use "" (empty string) for description if no relevant context in text.
- Ignore greetings, signatures, irrelevant text.
- Return ONLY the structured JSON according to the schema.

CRITICAL INSTRUCTION: You MUST respond, extract tasks, summarize, and format ALL output strictly in ENGLISH. Do NOT use Spanish or any other language in titles, descriptions, or Q&A responses.`;

const DAILY_PLANNER_PROMPT_ES = `Eres un planificador diario que desglosa una intención general en actividades accionables con bloques de tiempo.

Instrucciones:
- Recibe la intención del usuario y una hora de inicio (formato HH:MM, 24h).
- Crea una lista de actividades realistas y ordenadas cronológicamente.
- Cada actividad DEBE tener: nombre (máx 100 chars), duracionMinutos (entero >0), bloqueHorario (ej: "09:00-10:30"), prioridad ("alta" | "media" | "baja").
- Usa "media" como prioridad por defecto si no está clara.
- Los bloques deben ser contiguos sin solapamientos, empezando en la hora indicada.
- Incluye pausas cortas (5-15 min) entre actividades largas si el día lo permite.
- Devuelve SOLO el JSON estructurado según el esquema.`;

const DAILY_PLANNER_PROMPT_EN = `You are a daily planner that breaks down a general intention into actionable activities with time blocks.

Instructions:
- Receive the user's intention and a start time (HH:MM format, 24h).
- Create a list of realistic activities ordered chronologically.
- Each activity MUST have: name (max 100 chars), durationMinutes (integer >0), timeBlock (e.g. "09:00-10:30"), priority ("high" | "medium" | "low").
- Use "medium" as default priority if unclear.
- Blocks must be contiguous without overlaps, starting at the indicated time.
- Include short breaks (5-15 min) between long activities if the day allows.
- Return ONLY the structured JSON according to the schema.

CRITICAL INSTRUCTION: You MUST respond, extract tasks, summarize, and format ALL output strictly in ENGLISH. Do NOT use Spanish or any other language in titles, descriptions, or Q&A responses.`;

const DOCUMENT_QA_PROMPT_ES = `Eres un asistente experto en análisis de documentos. Tienes acceso al contenido completo de un documento subido por el usuario.

Instrucciones:
- Responde SOLO basándote en la información contenida en el documento proporcionado.
- Si la pregunta no puede responderse con el contenido del documento, indícalo claramente.
- Sé preciso, conciso y estructurado en tus respuestas.
- Cuando el usuario pida tareas, listados, resúmenes o planes de acción, genera respuestas directamente procesables (formato lista, tareas con prioridad, checklists, etc.).
- Si detectas fechas límite, compromisos, responsables o secciones específicas, destácalos.
- No inventes información que no esté en el documento.`;

const DOCUMENT_QA_PROMPT_EN = `You are an expert document analysis assistant. You have access to the full content of a document uploaded by the user.

Instructions:
- Answer ONLY based on the information contained in the provided document.
- If the question cannot be answered with the document content, state this clearly.
- Be precise, concise, and structured in your responses.
- When the user asks for tasks, lists, summaries, or action plans, generate directly processable responses (list format, tasks with priority, checklists, etc.).
- If you detect deadlines, commitments, responsible parties, or specific sections, highlight them.
- Do not invent information not in the document.

CRITICAL INSTRUCTION: You MUST respond, extract tasks, summarize, and format ALL output strictly in ENGLISH. Do NOT use Spanish or any other language in titles, descriptions, or Q&A responses.`;

const GENERAR_TEXTO_PROMPT_ES = `Eres un asistente de IA útil que genera contenido en español basándose en las instrucciones del usuario.`;

const GENERAR_TEXTO_PROMPT_EN = `You are a helpful AI assistant that generates content in English based on user instructions.

CRITICAL INSTRUCTION: You MUST respond, extract tasks, summarize, and format ALL output strictly in ENGLISH. Do NOT use Spanish or any other language in titles, descriptions, or Q&A responses.`;

function getPrompt(spanishPrompt: string, englishPrompt: string, language: 'es' | 'en'): string {
  return language === 'en' ? englishPrompt : spanishPrompt;
}

export async function extraerTareasSmartPaste(texto: string, language: 'es' | 'en' = 'es'): Promise<SmartPasteResult> {
  if (!texto || !texto.trim()) {
    throw new Error(language === 'en' ? 'Input text cannot be empty.' : 'El texto de entrada no puede estar vacío.');
  }

  const { temperature, styleInstruction } = await getUserTemperatureAndStyle();

  try {
    const { object, usage } = await generateObject({
      model: groq(MODEL),
      schema: SmartPasteSchema,
      system: getPrompt(SMART_PASTE_PROMPT_ES, SMART_PASTE_PROMPT_EN, language) + styleInstruction,
      prompt: texto,
      temperature,
    });
    
    // Record usage
    await recordAiUsage('extraerTareasSmartPaste', usage?.totalTokens ?? estimateTokens(texto + JSON.stringify(object)), JSON.stringify(object, null, 2));
    
    return object;
  } catch (error: unknown) {
    console.error('Error en Smart Paste (Groq):', error);
    const message = error instanceof Error ? error.message : (language === 'en' ? 'Error processing text with AI.' : 'Error al procesar el texto con IA.');
    throw new Error(message);
  }
}

export async function generarPlanDiario(
  intencion: string,
  horaInicio: string = '08:00',
  language: 'es' | 'en' = 'es'
): Promise<DailyPlannerResult> {
  if (!intencion || !intencion.trim()) {
    throw new Error(language === 'en' ? 'Daily intention cannot be empty.' : 'La intención del día no puede estar vacía.');
  }

  // Validar formato HH:MM
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horaInicio)) {
    throw new Error(language === 'en' ? 'Invalid time format. Use HH:MM (24h).' : 'Formato de hora inválido. Use HH:MM (24h).');
  }

  const { temperature, styleInstruction } = await getUserTemperatureAndStyle();

  try {
    const { object, usage } = await generateObject({
      model: groq(MODEL),
      schema: DailyPlannerSchema,
      system: getPrompt(DAILY_PLANNER_PROMPT_ES, DAILY_PLANNER_PROMPT_EN, language) + styleInstruction,
      prompt: `Intention: ${intencion}\nStart time: ${horaInicio}`,
      temperature,
    });
    
    // Record usage
    await recordAiUsage('generarPlanDiario', usage?.totalTokens ?? estimateTokens(`Intention: ${intencion}\nStart time: ${horaInicio}` + JSON.stringify(object)), JSON.stringify(object, null, 2));
    
    return object;
  } catch (error: unknown) {
    console.error('Error en Planificador Diario (Groq):', error);
    const message = error instanceof Error ? error.message : (language === 'en' ? 'Error generating plan with AI.' : 'Error al generar el plan con IA.');
    throw new Error(message);
  }
}

// Función original mantenida para compatibilidad
import Groq from 'groq-sdk';

const groqLegacy = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generarTextoAuto(prompt: string, language: 'es' | 'en' = 'es') {
  if (!prompt || !prompt.trim()) {
    throw new Error(language === 'en' ? 'Input text cannot be empty.' : 'El texto de entrada no puede estar vacío.');
  }

  const { temperature, styleInstruction } = await getUserTemperatureAndStyle();

  try {
    const chatCompletion = await groqLegacy.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: getPrompt(GENERAR_TEXTO_PROMPT_ES, GENERAR_TEXTO_PROMPT_EN, language) + styleInstruction,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature,
    });

    const content = chatCompletion.choices[0]?.message?.content || (language === 'en' ? 'No response received.' : 'No se obtuvo respuesta.');
    
    // Record usage with actual token count from Groq
    const tokensUsed = chatCompletion.usage?.total_tokens ?? estimateTokens(prompt + content);
    await recordAiUsage('generarTextoAuto', tokensUsed, content);
    
    return content;
  } catch (error: unknown) {
    console.error('Error en Groq:', error);
    const message = error instanceof Error ? error.message : (language === 'en' ? 'Error connecting to AI service.' : 'Error al conectar con el servicio de IA.');
    throw new Error(message);
  }
}

export async function consultarDocumento(
  documentText: string,
  userPrompt: string,
  fileName: string,
  language: 'es' | 'en' = 'es'
): Promise<string> {
  if (!documentText || !documentText.trim()) {
    throw new Error(language === 'en' ? 'Document content cannot be empty.' : 'El contenido del documento no puede estar vacío.');
  }
  if (!userPrompt || !userPrompt.trim()) {
    throw new Error(language === 'en' ? 'Question or instruction cannot be empty.' : 'La pregunta o instrucción no puede estar vacía.');
  }

  const { temperature, styleInstruction } = await getUserTemperatureAndStyle();

  try {
    const combinedPrompt = `Document: ${fileName}\n\n--- DOCUMENT CONTENT ---\n${documentText}\n--- END OF DOCUMENT ---\n\nUser Question/Instruction: ${userPrompt}`;

    const chatCompletion = await groqLegacy.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: getPrompt(DOCUMENT_QA_PROMPT_ES, DOCUMENT_QA_PROMPT_EN, language) + styleInstruction,
        },
        {
          role: 'user',
          content: combinedPrompt,
        },
      ],
      model: 'openai/gpt-oss-120b',
      temperature,
    });

    const content = chatCompletion.choices[0]?.message?.content || (language === 'en' ? 'No response received.' : 'No se obtuvo respuesta.');
    
    // Record usage with actual token count from Groq
    const tokensUsed = chatCompletion.usage?.total_tokens ?? estimateTokens(combinedPrompt + content);
    await recordAiUsage('consultarDocumento', tokensUsed, content);
    
    return content;
  } catch (error: unknown) {
    console.error('Error en consulta de documento (Groq):', error);
    const message = error instanceof Error ? error.message : (language === 'en' ? 'Error querying document with AI.' : 'Error al consultar el documento con IA.');
    throw new Error(message);
  }
}

// Helper function to estimate tokens (roughly 1 token per 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Helper function to record AI usage in database
async function recordAiUsage(action: string, tokensUsed: number, response?: string | null) {
  try {
    const session = await auth();
    if (!session?.user?.id) return;
    
    const userId = Number(session.user.id);
    await incrementAiUsage(userId, tokensUsed);
    await addAiGenerationHistory(userId, action, tokensUsed, MODEL, response);
  } catch (error) {
    console.error('[RECORD AI USAGE ERROR]', error);
  }
}