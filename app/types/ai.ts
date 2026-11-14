// app/types/ai.ts
// AI generation types.

// Furnizorul de imagini AI folosit de /api/generate
export type AiProviderId = 'stable-diffusion' | 'replicate' | 'demo';

// Parametri avansați de generare, editabili din Studio
export interface AiSettings {
  extraPrompt: string; // text adăugat la promptul construit automat
  negativePrompt: string; // ce NU vrem în imagine
  inferenceSteps: number; // pași de inferență (calitate vs. timp)
  guidanceScale: number; // cât de strict urmează modelul promptul (CFG)
  seed: number | null; // null = aleatoriu; același seed = rezultat reproductibil
}
