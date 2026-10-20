// app/lib/ai/prompt.ts
// Construiește textul (promptul) trimis modelului, din alegerile făcute în Studio.
// Este independent de furnizor: același prompt merge cu Stable Diffusion sau Replicate.
import { SPACE_MODES, VISUAL_STYLES } from '@/app/data/catalog';
import { AiSettings, DesignMode } from '@/app/types/studio';

export interface PromptInput {
  mode: DesignMode;
  spaceType: string;
  styleId: string;
  layoutPreset: string;
  width: number;
  length: number;
  settings: AiSettings;
}

export interface BuiltPrompt {
  prompt: string;
  negativePrompt: string;
}

export function buildPrompt(input: PromptInput): BuiltPrompt {
  const currentMode = SPACE_MODES[input.mode];

  // Dacă id-ul stilului sau al configurației nu există, folosim prima variantă
  const style = VISUAL_STYLES.find((item) => item.id === input.styleId) ?? VISUAL_STYLES[0];
  const layout =
    currentMode.layouts.find((item) => item.id === input.layoutPreset) ?? currentMode.layouts[0];
  const space = input.spaceType || currentMode.spaces[0].id;

  const areaText = (input.width * input.length).toFixed(1);

  const parts = [
    `Professional architectural photography of a ${space} (${areaText} sqm)`,
    layout.prompt,
    style.prompt,
    'ultra-detailed, 8k resolution',
  ];

  // Textul liber al utilizatorului se adaugă la final
  if (input.settings.extraPrompt !== '') {
    parts.push(input.settings.extraPrompt);
  }

  return {
    prompt: parts.join(', '),
    negativePrompt: input.settings.negativePrompt,
  };
}
