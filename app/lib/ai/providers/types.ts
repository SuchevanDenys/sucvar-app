// app/lib/ai/providers/types.ts
// Contractul pe care îl respectă orice furnizor de imagini AI.
// Pentru a adăuga un furnizor nou: creezi un fișier care implementează `ImageProvider`
// și îl înregistrezi în providers/index.ts. Restul aplicației nu se schimbă.
import { AiProviderId, AiSettings } from '@/app/types/studio';

// Tot ce are nevoie un furnizor ca să genereze o imagine
export interface GenerationRequest {
  imageDataUrl: string; // fotografia originală, ca data URL (data:image/jpeg;base64,...)
  prompt: string;
  negativePrompt: string;
  settings: AiSettings; // pași, guidance, seed
  transformationStrength: number; // 0-100: cât de mult se schimbă fotografia originală
}

export interface GenerationResult {
  imageUrl: string; // URL public sau data URL
  isDemo: boolean;
}

export interface ImageProvider {
  id: AiProviderId;
  // true dacă variabilele de mediu necesare există
  isConfigured(): boolean;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
