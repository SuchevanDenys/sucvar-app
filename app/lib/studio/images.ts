// app/lib/studio/images.ts
// Browser-side image helpers for the Studio (resize upload, convert result to a permanent data URL).

// ── Helper: redimensionare foto (max 1280 px) ────────────────────────────────
export async function resizePhoto(file: File, maxSide = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
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
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image();
        el.onload = () => res(el);
        el.onerror = rej;
        el.src = objectUrl;
      });
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
