import Tesseract from 'tesseract.js';
import type { WorkoutDay } from '../types/workout';
import { parsePlainTextPlan } from './importUtils';
import { api } from '../services/api';

export interface OcrResult {
  text: string;
  days: WorkoutDay[];
  confidence: number;
}

async function convertToBase64(source: File | string): Promise<string> {
  if (typeof source === 'string') {
    if (source.startsWith('data:image/')) return source;
    try {
      const res = await fetch(source);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return source;
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(source);
  });
}

/**
 * Processa a imagem da ficha de treino utilizando OCR em português/inglês
 * com otimização gráfica de contraste/resolução e extrai automaticamente
 * as divisões semanais (Segunda a Sábado/Domingo) e exercícios.
 */
export async function processWorkoutImage(
  imageSource: File | string,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrResult> {
  onProgress?.(15, 'Otimizando resolução e contraste da ficha...');

  // 1. Tenta OCR otimizado no Backend (com Sharp upscale 2400px + Tesseract no Node)
  try {
    const base64 = await convertToBase64(imageSource);
    onProgress?.(35, 'Identificando dias da semana e exercícios via visão computacional...');
    const backendResult = await api.analyzeWorkoutImage(base64);

    if (backendResult && backendResult.days && backendResult.days.length > 0) {
      onProgress?.(100, `Leitura concluída com sucesso! ${backendResult.days.length} rotinas identificadas.`);
      return {
        text: backendResult.text,
        days: backendResult.days,
        confidence: backendResult.confidence
      };
    }
  } catch (err) {
    console.warn('[OCR Frontend] Backend OCR indisponível, usando fallback local no navegador:', err);
  }

  // 2. Fallback no navegador com Tesseract.js local
  onProgress?.(40, 'Executando reconhecimento óptico no dispositivo...');
  try {
    const result = await Tesseract.recognize(imageSource, 'por+eng', {
      logger: m => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const pct = Math.min(95, Math.round(m.progress * 55) + 40);
          onProgress?.(pct, `Reconhecendo texto da ficha (${Math.round(m.progress * 100)}%)...`);
        } else if (m.status === 'loading tesseract core') {
          onProgress?.(20, 'Carregando núcleo de inteligência de visão...');
        } else if (m.status === 'loading language traineddata') {
          onProgress?.(30, 'Carregando dicionários português e inglês...');
        }
      }
    });

    const rawText = result.data.text || '';
    const confidence = result.data.confidence || 0;
    onProgress?.(96, 'Estruturando rotinas, dias da semana e repetições...');

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
