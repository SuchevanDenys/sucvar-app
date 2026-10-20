// app/lib/ai/providers/demo.ts
// Furnizor de test: întoarce o imagine fixă, fără niciun apel către un model AI.
// Se folosește când nu este configurat nici Stable Diffusion, nici Replicate.
import { DesignMode } from '@/app/types/studio';
import { GenerationRequest, GenerationResult, ImageProvider } from './types';

const DEMO_IMAGES: Record<DesignMode, string> = {
  interiors:
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
  exteriors:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
  gardens:
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=85',
};

// Furnizorul demo are nevoie să știe modul (interioare / exterioare / grădini)
export function createDemoProvider(mode: DesignMode): ImageProvider {
  return {
    id: 'demo',
    isConfigured: () => true,
    async generate(_request: GenerationRequest): Promise<GenerationResult> {
      // Simulăm timpul de generare, ca interfața să arate starea „Se generează...”
      await new Promise((resolve) => setTimeout(resolve, 1800));
      return { imageUrl: DEMO_IMAGES[mode], isDemo: true };
    },
  };
}
