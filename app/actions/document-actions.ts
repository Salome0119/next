'use server';

import { z } from 'zod';
import { PDFParse } from 'pdf-parse-fixed';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];

const fileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  arrayBuffer: z.instanceof(Function).or(z.unknown()),
});

function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo no permitido. Solo se aceptan PDF (.pdf), Word (.doc, .docx).',
    };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: 'Extensión de archivo no permitida. Use .pdf, .doc o .docx.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido de 10 MB. Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'El archivo está vacío.',
    };
  }

  return { valid: true };
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

export async function parseDocument(formData: FormData): Promise<{
  success: boolean;
  text?: string;
  error?: string;
  fileName?: string;
}> {
  const file = formData.get('file') as File | null;

  if (!file) {
    return { success: false, error: 'No se proporcionó ningún archivo.' };
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (file.type === 'application/pdf') {
      try {
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        extractedText = pdfData.text;
      } catch (pdfError) {
        console.error('PDF parse error:', pdfError);
        if (pdfError instanceof Error && pdfError.message.includes('Password')) {
          return { success: false, error: 'El PDF está protegido con contraseña. Por favor, desbloquéelo antes de subirlo.' };
        }
        return { success: false, error: 'No se pudo leer el PDF. El archivo podría estar dañado o ser un formato no compatible.' };
      }
    } else if (
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        if (result.messages.length > 0) {
          console.warn('Mammoth warnings:', result.messages);
        }
      } catch (docError) {
        console.error('DOCX parse error:', docError);
        if (docError instanceof Error && docError.message.includes('encrypted')) {
          return { success: false, error: 'El documento Word está protegido con contraseña. Por favor, desbloquéelo antes de subirlo.' };
        }
        return { success: false, error: 'No se pudo leer el documento Word. El archivo podría estar dañado o ser un formato no compatible.' };
      }
    }

    const cleanedText = cleanText(extractedText);

    if (!cleanedText || cleanedText.trim().length < 10) {
      return { success: false, error: 'No se pudo extraer texto significativo del documento. Verifique que el archivo contenga texto seleccionable.' };
    }

    return {
      success: true,
      text: cleanedText,
      fileName: file.name,
    };
  } catch (error) {
    console.error('Document parsing error:', error);
    return { success: false, error: 'Ocurrió un error inesperado al procesar el documento.' };
  }
}

export async function getAllowedFileTypes(): Promise<string> {
  return ALLOWED_MIME_TYPES.join(',');
}

export async function getMaxFileSizeMB(): Promise<number> {
  return MAX_FILE_SIZE / (1024 * 1024);
}