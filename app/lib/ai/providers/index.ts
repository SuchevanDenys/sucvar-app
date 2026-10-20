// app/lib/ai/providers/index.ts
// Alege furnizorul de imagini AI. Ruta API apelează doar `selectProvider()`.
//
// Ordinea de decizie:
//   1. AI_PROVIDER=stable-diffusion | replicate | demo   (alegere explicită)
//   2. altfel, automat: dacă există SD_API_URL -> Stable Diffusion,
//      dacă există REPLICATE_API_TOKEN -> Replicate, altfel demo.
// Dacă furnizorul ales explicit nu este configurat, se folosește demo și se întoarce un avertisment.
import { AiProviderId, DesignMode } from '@/app/types/studio';
import { createDemoProvider } from './demo';
import { replicateProvider } from './replicate';
import { stableDiffusionProvider } from './stable-diffusion';
import { ImageProvider } from './types';

export interface ProviderSelection {
  provider: ImageProvider;
  warning: string | null;
}

function readRequestedProvider(): AiProviderId | null {
  const value = (process.env.AI_PROVIDER ?? '').trim().toLowerCase();
  if (value === 'stable-diffusion' || value === 'replicate' || value === 'demo') {
    return value;
  }
  return null;
}

export function selectProvider(mode: DesignMode): ProviderSelection {
  const demoProvider = createDemoProvider(mode);
  const requested = readRequestedProvider();

  if (requested === 'demo') {
    return { provider: demoProvider, warning: null };
  }

  if (requested === 'stable-diffusion' || requested === 'replicate') {
    const chosen = requested === 'stable-diffusion' ? stableDiffusionProvider : replicateProvider;
    if (chosen.isConfigured()) {
      return { provider: chosen, warning: null };
    }
    return {
      provider: demoProvider,
      warning: `AI_PROVIDER=${requested}, dar variabilele de mediu lipsesc. Se folosește modul demo.`,
    };
  }

  // Alegere automată
  if (stableDiffusionProvider.isConfigured()) {
    return { provider: stableDiffusionProvider, warning: null };
  }
  if (replicateProvider.isConfigured()) {
    return { provider: replicateProvider, warning: null };
  }
  return { provider: demoProvider, warning: null };
}
