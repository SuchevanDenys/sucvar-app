// app/lib/studio/images.ts
// Browser-side image helpers for the Studio (resize upload, convert result to a permanent data URL).
import { AI_LIMITS } from '@/app/lib/ai/config';
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES, MIN_PHOTO_SIDE } from './constants';

// Motivul pentru care o fotografie a fost respinsă (interfața îl traduce în mesaj)
export type PhotoErrorCode = 'type' | 'size' | 'decode' | 'small' | 'huge';

export class PhotoError extends Error {
  code: PhotoErrorCode;
  constructor(code: PhotoErrorCode) {
    super(code);
    this.name = 'PhotoError';
    this.code = code;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((res, rej) => {
    const el = new Image();
    el.onload = () => res(el);
    el.onerror = () => rej(new PhotoError('decode'));
    el.src = url;
  });
}

// ── Validare + redimensionare foto (max 1280 px) ─────────────────────────────
// Respinge fișierele care nu sunt JPEG/PNG/WebP, cele prea mari sau prea mici și
// comprimă progresiv până când Data URL-ul încape în limita acceptată de server.
export async function resizePhoto(file: File, maxSide = 1280): Promise<string> {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) throw new PhotoError('type');
  if (file.size > MAX_PHOTO_BYTES) throw new PhotoError('size');

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (Math.min(img.width, img.height) < MIN_PHOTO_SIDE) throw new PhotoError('small');

    // Încercăm calități tot mai mici până încape sub limita serverului
    for (const quality of [0.85, 0.72, 0.6]) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new PhotoError('decode');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= AI_LIMITS.maxImageLength) return dataUrl;
    }
    throw new PhotoError('huge');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Convertește URL-ul temporar de la Replicate într-un Data URL JPEG comprimat (permanent în Supabase!)
export async function toPermanentDataUrl(imageSrc: string, maxSide = 1024): Promise<string> {
  if (imageSrc.startsWith('data:image/')) {
    return imageSrc;
  }
  try {
    const response = await fetch(imageSrc);
    if (!response.ok) return imageSrc;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await loadImage(objectUrl);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return imageSrc;
  }
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
