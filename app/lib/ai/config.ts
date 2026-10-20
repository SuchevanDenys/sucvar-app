// app/lib/ai/config.ts
// Valori implicite, limite și validare pentru parametrii de generare AI.
// Fișierul NU folosește nimic specific serverului, deci poate fi importat
// și în pagina Studio (browser), și în ruta API (server).
import { AiSettings } from '@/app/types/studio';

// Ce NU vrem să apară în imagine (scoate defectele tipice ale modelelor de difuzie)
export const DEFAULT_NEGATIVE_PROMPT =
  'lowres, watermark, text, blurry, deformed walls, broken perspective, distorted furniture, extra windows, ugly, oversaturated';

// Limitele acceptate pentru fiecare parametru (interfața și serverul le folosesc la fel)
export const AI_LIMITS = {
  inferenceSteps: { min: 10, max: 60, step: 1 },
  guidanceScale: { min: 1, max: 20, step: 0.5 },
  extraPromptMaxLength: 400,
  negativePromptMaxLength: 600,
  seedMax: 2_147_483_647,
};

// Setările cu care pornește Studio
export const DEFAULT_AI_SETTINGS: AiSettings = {
  extraPrompt: '',
  negativePrompt: DEFAULT_NEGATIVE_PROMPT,
  inferenceSteps: 30,
  guidanceScale: 7.5,
  seed: null,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function cleanText(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim().slice(0, maxLength);
}

// Validează și corectează setările primite de la client (nu ne bazăm niciodată pe browser).
export function sanitizeAiSettings(raw: unknown): AiSettings {
  const input = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  let seed: number | null = null;
  if (input.seed !== null && input.seed !== undefined && input.seed !== '') {
    const parsedSeed = Math.floor(Number(input.seed));
    if (Number.isFinite(parsedSeed) && parsedSeed >= 0) {
      seed = Math.min(AI_LIMITS.seedMax, parsedSeed);
    }
  }

  return {
    extraPrompt: cleanText(input.extraPrompt, AI_LIMITS.extraPromptMaxLength, ''),
    negativePrompt: cleanText(
      input.negativePrompt,
      AI_LIMITS.negativePromptMaxLength,
      DEFAULT_NEGATIVE_PROMPT
    ),
    inferenceSteps: Math.round(
      clampNumber(
        input.inferenceSteps,
        AI_LIMITS.inferenceSteps.min,
        AI_LIMITS.inferenceSteps.max,
        DEFAULT_AI_SETTINGS.inferenceSteps
      )
    ),
    guidanceScale: clampNumber(
      input.guidanceScale,
      AI_LIMITS.guidanceScale.min,
      AI_LIMITS.guidanceScale.max,
      DEFAULT_AI_SETTINGS.guidanceScale
    ),
    seed,
  };
}
