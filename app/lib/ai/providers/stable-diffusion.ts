// app/lib/ai/providers/stable-diffusion.ts
// Furnizor Stable Diffusion local sau în cloud, prin API-ul AUTOMATIC1111 (img2img).
//
// Variabile de mediu (.env.local):
//   SD_API_URL            adresa serverului, ex. http://127.0.0.1:7860  (obligatoriu)
//   SD_API_KEY            opțional: "utilizator:parolă" dacă serverul rulează cu --api-auth
//   SD_MAX_SIDE           latura maximă a imaginii generate, implicit 768
//   SD_SAMPLER            sampler-ul folosit, implicit "DPM++ 2M Karras"
//   SD_TIMEOUT_MS         timp maxim de așteptare, implicit 55000
//   SD_CONTROLNET_MODEL   opțional: numele modelului ControlNet, ex. control_v11p_sd15_mlsd
//   SD_CONTROLNET_MODULE  opțional: preprocesorul ControlNet, implicit "mlsd" (linii drepte)
//
// ATENȚIE: serverul trebuie pornit cu opțiunea --api (AUTOMATIC1111).
// ControlNet păstrează geometria camerei (pereți, ferestre) și necesită extensia ControlNet instalată.
import { GenerationRequest, GenerationResult, ImageProvider } from './types';

const DEFAULT_MAX_SIDE = 768;
const DEFAULT_SAMPLER = 'DPM++ 2M Karras';
const DEFAULT_TIMEOUT_MS = 55_000;

function readBaseUrl(): string {
  return (process.env.SD_API_URL ?? '').trim().replace(/\/+$/, '');
}

function readNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Scoate prefixul "data:image/jpeg;base64," și lasă doar textul base64
function stripDataUrlPrefix(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  return dataUrl.startsWith('data:') && commaIndex !== -1 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

// Citește dimensiunile unui JPEG direct din antet (fără biblioteci externe).
// Clientul trimite mereu JPEG (vezi resizePhoto din Studio).
function readJpegSize(base64: string): { width: number; height: number } | null {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    // Markerii SOF0..SOF15 (în afară de DHT, JPG și DAC) conțin dimensiunile
    const isFrameMarker =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrameMarker) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + bytes.readUInt16BE(offset + 2);
  }
  return null;
}

// Modelele SD lucrează cu multipli de 8. Păstrăm raportul de aspect al fotografiei.
function computeOutputSize(base64: string): { width: number; height: number } {
  const maxSide = readNumber('SD_MAX_SIDE', DEFAULT_MAX_SIDE);
  const original = readJpegSize(base64) ?? { width: 4, height: 3 };
  const scale = maxSide / Math.max(original.width, original.height);
  const toMultipleOfEight = (value: number) => Math.max(64, Math.round((value * scale) / 8) * 8);
  return { width: toMultipleOfEight(original.width), height: toMultipleOfEight(original.height) };
}

export const stableDiffusionProvider: ImageProvider = {
  id: 'stable-diffusion',

  isConfigured() {
    return readBaseUrl() !== '';
  },

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const base64Image = stripDataUrlPrefix(request.imageDataUrl);
    const { width, height } = computeOutputSize(base64Image);

    const payload: Record<string, unknown> = {
      init_images: [base64Image],
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      steps: request.settings.inferenceSteps,
      cfg_scale: request.settings.guidanceScale,
      // În img2img, "denoising_strength" = cât de mult se modifică imaginea (0 = deloc, 1 = complet)
      denoising_strength: request.transformationStrength / 100,
      seed: request.settings.seed ?? -1, // -1 = aleatoriu
      sampler_name: process.env.SD_SAMPLER?.trim() || DEFAULT_SAMPLER,
      width,
      height,
      batch_size: 1,
    };

    // ControlNet (opțional): păstrează liniile camerei originale
    const controlNetModel = process.env.SD_CONTROLNET_MODEL?.trim();
    if (controlNetModel) {
      payload.alwayson_scripts = {
        controlnet: {
          args: [
            {
              image: base64Image,
              module: process.env.SD_CONTROLNET_MODULE?.trim() || 'mlsd',
              model: controlNetModel,
              weight: 1,
            },
          ],
        },
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.SD_API_KEY?.trim();
    if (apiKey) {
      headers.Authorization = `Basic ${Buffer.from(apiKey).toString('base64')}`;
    }

    // Nu așteptăm la nesfârșit: după timeout întrerupem cererea
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      readNumber('SD_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)
    );

    try {
      const response = await fetch(`${readBaseUrl()}/sdapi/v1/img2img`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = (await response.text()).slice(0, 200);
        throw new Error(`Serverul Stable Diffusion a răspuns ${response.status}. ${details}`);
      }

      const data = (await response.json()) as { images?: string[] };
      const firstImage = data.images?.[0];
      if (!firstImage) {
        throw new Error('Stable Diffusion a răspuns fără imagine.');
      }
      return { imageUrl: `data:image/png;base64,${firstImage}`, isDemo: false };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Stable Diffusion nu a răspuns la timp. Încearcă mai puțini pași.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};
