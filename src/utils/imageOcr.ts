import Tesseract from 'tesseract.js';
import type { WorkoutDay } from '../types/workout';
import { parsePlainTextPlan } from './importUtils';

export interface OcrResult {
  text: string;
  days: WorkoutDay[];
  confidence: number;
}

/**
 * Processa a imagem da ficha de treino utilizando OCR em português/inglês
 * e extrai automaticamente os treinos, séries e repetições reais.
 */
export async function processWorkoutImage(
  imageSource: File | string,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(10, 'Iniciando mecanismo de visão OCR...');

  try {
    const result = await Tesseract.recognize(imageSource, 'por+eng', {
      logger: m => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const pct = Math.min(95, Math.round(m.progress * 85) + 10);
          onProgress?.(pct, `Reconhecendo texto da ficha (${Math.round(m.progress * 100)}%)...`);
        } else if (m.status === 'loading tesseract core') {
          onProgress?.(15, 'Carregando núcleo de inteligência de visão...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(25, 'Carregando dicionários português e inglês...');
        }
      }
    });

    const rawText = result.data.text || '';
    const confidence = result.data.confidence || 0;
    onProgress?.(96, 'Estruturando rotinas, exercícios e repetições...');

    const parsedDays = parsePlainTextPlan(rawText);
    onProgress?.(100, 'Processamento concluído com sucesso!');

    return {
      text: rawText,
      days: parsedDays,
      confidence
    };
  } catch (err) {
    console.error('[OCR Error] Falha ao processar imagem:', err);
    throw new Error('Não foi possível ler a imagem da ficha. Certifique-se de que a imagem esteja nítida e bem iluminada.');
  }
}
