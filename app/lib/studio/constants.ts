// app/lib/studio/constants.ts
// Studio constants and shared types.
import type { DesignMode } from '@/app/types';

export const MODE_IDS: DesignMode[] = ['interiors', 'exteriors', 'gardens'];
export const PROJECT_NAME_MAX = 80;
export type NumberField = 'width' | 'length' | 'height' | 'doorsCount' | 'windowsCount' | 'aiStrength';

export const LOADING_STEPS_RO = [
  'Se analizează fotografia…',
  'Se aplică stilul arhitectural…',
  'Se calculează lumina și textura…',
  'Se finalizează randarea…',
];
export const LOADING_STEPS_EN = [
  'Analysing photo…',
  'Applying architectural style…',
  'Calculating light and texture…',
  'Finalising render…',
];
