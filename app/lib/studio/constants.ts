// app/lib/studio/constants.ts
// Studio constants and shared types.
import type { DesignMode } from '@/app/types';

export const MODE_IDS: DesignMode[] = ['interiors', 'exteriors', 'gardens'];
export const PROJECT_NAME_MAX = 80;

// Fotografia încărcată: formate acceptate, dimensiune maximă a fișierului și latura minimă
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15 MB (înainte de redimensionare)
export const MIN_PHOTO_SIDE = 256; // px; sub această valoare modelul AI nu are detalii
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
