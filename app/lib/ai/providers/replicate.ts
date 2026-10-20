// app/lib/ai/providers/replicate.ts
// Furnizor extern: Replicate (model de design interior, imagine -> imagine).
// Necesită REPLICATE_API_TOKEN în .env.local.
import Replicate from 'replicate';
import { GenerationRequest, GenerationResult, ImageProvider } from './types';

const REPLICATE_MODEL =
  'adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38' as const;

// Replicate poate întoarce un text, o listă sau un obiect-fișier.
// Funcția aceasta dă mereu înapoi un URL simplu (sau null).
function getImageUrl(output: unknown): string | null {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output)) {
    return getImageUrl(output[0]);
  }
  if (output && typeof output === 'object' && 'url' in output) {
    const urlValue = (output as { url: unknown }).url;
    if (typeof urlValue === 'function') {
      return String(urlValue.call(output));
    }
    if (typeof urlValue === 'string') {
      return urlValue;
    }
  }
  return null;
}

function readToken(): string {
  return (process.env.REPLICATE_API_TOKEN ?? '').trim();
}

export const replicateProvider: ImageProvider = {
  id: 'replicate',

  isConfigured() {
    const token = readToken();
    return token !== '' && token !== 'demo';
  },

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const replicate = new Replicate({ auth: readToken() });

    // Parametrii modelului. `prompt_strength` = cât de mult se îndepărtează de poza originală.
    const input: Record<string, unknown> = {
      image: request.imageDataUrl,
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      num_inference_steps: request.settings.inferenceSteps,
      guidance_scale: request.settings.guidanceScale,
      prompt_strength: request.transformationStrength / 100,
    };
    if (request.settings.seed !== null) {
      input.seed = request.settings.seed;
    }

    const output = await replicate.run(REPLICATE_MODEL, { input });
    const imageUrl = getImageUrl(output);
    if (!imageUrl) {
      throw new Error('Replicate a răspuns fără imagine.');
    }
    return { imageUrl, isDemo: false };
  },
};
