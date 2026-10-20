// app/api/generate/route.ts
// Receives the room photo + all options selected in Studio, builds a short and precise
// architectural prompt and calls Stable Diffusion (ControlNet) through Replicate.
import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import {
  SPACE_MODES,
  VISUAL_STYLES,
  getLayout,
  getSpace,
} from '@/app/data/catalog';
import { AI_LIMITS, DEFAULT_AI_SETTINGS } from '@/app/lib/ai/config';
import { BudgetTier, DesignMode } from '@/app/types/studio';

export const maxDuration = 60;

// Maximum size of the uploaded photo (~6 MB as base64 text)
const MAX_IMAGE_LENGTH = 6_000_000;

// The CLIP text encoder of Stable Diffusion reads only ~77 tokens; everything after that
// is silently ignored. We keep the prompt under this budget so the furniture list
// (written first) and the style are never cut off.
const MAX_PROMPT_TOKENS = 72;

// Fallback images for demo mode (when there is no token in .env.local)
const DEMO_IMAGES: Record<string, string> = {
  interiors:
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
  exteriors:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85',
  gardens:
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=85',
};

const BUDGET_TIERS: BudgetTier[] = ['economy', 'standard', 'luxury'];

// =====================================================================
// Small helpers (validation of everything that comes from the browser)
// =====================================================================

function isDesignMode(value: unknown): value is DesignMode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SPACE_MODES, value);
}

function isBudgetTier(value: unknown): value is BudgetTier {
  return typeof value === 'string' && BUDGET_TIERS.includes(value as BudgetTier);
}

// Reads a number from untrusted input. Returns `fallback` when it is missing or invalid.
// (A plain `Number(x) ?? fallback` does NOT work: Number('abc') is NaN, and `??` only
// reacts to null / undefined.)
function readNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// =====================================================================
// Prompt building
// =====================================================================

// Rough token estimate for CLIP: ~1.25 tokens per word, plus one token per comma.
// It is a heuristic (good enough to stay safely under 77), not an exact tokenizer.
function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const commas = (text.match(/,/g) ?? []).length;
  return Math.ceil(words * 1.25 + commas);
}

// Shortens one segment by removing its last comma-separated terms until it fits.
// (Better than dropping the whole segment: the style keeps its first, strongest words.)
function fitSegment(segment: string, remainingTokens: number): string {
  const terms = segment
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean);
  while (terms.length > 0 && estimateTokens(terms.join(', ')) + 1 > remainingTokens) {
    terms.pop();
  }
  return terms.join(', ');
}

// Joins prompt segments in priority order, within the token budget.
// - The first segment (the furnished scene) is always kept whole.
// - Every later segment is trimmed to the space that is left; if nothing fits, it is skipped.
function buildPrompt(segments: string[], maxTokens: number): string {
  const kept: string[] = [];
  let usedTokens = 0;

  segments.forEach((rawSegment, index) => {
    const segment = rawSegment.trim();
    if (!segment) {
      return;
    }
    const fitted = index === 0 ? segment : fitSegment(segment, maxTokens - usedTokens);
    if (fitted) {
      kept.push(fitted);
      usedTokens += estimateTokens(fitted) + 1; // +1 for the comma that joins segments
    }
  });

  return kept.join(', ');
}

// Merges comma-separated lists without duplicates (case-insensitive)
function mergeTerms(...lists: string[]): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const rawTerm of list.split(',')) {
      const term = rawTerm.trim();
      const key = term.toLowerCase();
      if (term && !seen.has(key)) {
        seen.add(key);
        result.push(term);
      }
    }
  }
  return result.join(', ');
}

// Material quality by budget. Interiors talk about flooring and cabinetry,
// exteriors and gardens talk about facade / landscaping materials.
function getBudgetPromptDetails(budget: BudgetTier, mode: DesignMode): string {
  if (mode !== 'interiors') {
    if (budget === 'economy') {
      return 'practical durable materials, simple clean finishes';
    }
    if (budget === 'luxury') {
      return 'premium natural stone, solid hardwood, designer lighting';
    }
    return 'quality natural materials, refined finishes';
  }
  if (budget === 'economy') {
    return 'practical modular furniture, clean laminate finishes, functional lighting';
  }
  if (budget === 'luxury') {
    return 'bespoke millwork, premium natural stone, solid hardwood, designer statement lighting';
  }
  return 'engineered oak flooring, matte cabinetry, architectural track lighting';
}

// Lighting sentence, based on the number of windows (interiors) or daylight (outdoors)
function getLightingPrompt(mode: DesignMode, windowsCount: number): string {
  if (mode !== 'interiors') {
    return 'soft natural daylight';
  }
  return windowsCount > 0 ? 'bright natural daylight from windows' : 'warm architectural lighting';
}

// The style prompts in the catalog already end with "8k photorealistic" and mention
// "interior" design. We remove the quality tail (quality tags are added once, at the end)
// and, for facades and gardens, the word "interior", which would confuse the model.
function cleanStylePrompt(stylePrompt: string, mode: DesignMode): string {
  const withoutTail = stylePrompt.replace(/,?\s*8k photorealistic\s*$/i, '');
  if (mode === 'interiors') {
    return withoutTail;
  }
  return withoutTail.replace(/\binterior\s+/gi, '');
}

// Always-on negative terms. For interiors we add "empty room" terms to force furniture.
function getMandatoryNegatives(mode: DesignMode): string {
  const common =
    'lowres, blurry, watermark, text, logo, deformed walls, broken perspective, distorted proportions, cartoon';
  if (mode === 'interiors') {
    return `${common}, empty room, unfurnished, bare walls, floating furniture, duplicated objects`;
  }
  return common;
}

// =====================================================================
// Replicate output normalisation
// =====================================================================

// Normalises the answer of Replicate to a plain URL string
function getImageUrl(output: unknown): string | null {
  if (typeof output === 'string') {
    return output;
  }
  if (Array.isArray(output)) {
    return getImageUrl(output[0]);
  }
  if (output && typeof output === 'object' && 'url' in output) {
    const urlValue = (output as { url: unknown }).url;
    if (typeof urlValue === 'function') {
      return String(urlValue.call(output));
    }
    if (typeof urlValue === 'string') {
      return urlValue;
    }
  }
  return null;
}

// =====================================================================
// POST /api/generate
// =====================================================================
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const payload = isRecord(body) ? body : {};

    // 1. Validate the photo
    const image = payload.image;
    if (typeof image !== 'string' || !image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Lipsește fotografia spațiului.' }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_LENGTH) {
      return NextResponse.json({ error: 'Fotografia este prea mare.' }, { status: 413 });
    }

    // 2. Resolve mode → space → layout. Each step falls back INSIDE the previous one,
    //    so a layout from another space (stale data) can never reach the prompt.
    const mode: DesignMode = isDesignMode(payload.mode) ? payload.mode : 'interiors';
    const dimensions = isRecord(payload.dimensions) ? payload.dimensions : {};
    const aiInput = isRecord(payload.ai) ? payload.ai : {};

    const space = getSpace(mode, typeof payload.spaceType === 'string' ? payload.spaceType : null);
    const layout = getLayout(
      space,
      typeof dimensions.layoutPreset === 'string' ? dimensions.layoutPreset : null
    );
    const style =
      VISUAL_STYLES.find((candidate) => candidate.id === payload.styleId) ?? VISUAL_STYLES[0];

    const budget: BudgetTier = isBudgetTier(dimensions.budget) ? dimensions.budget : 'standard';
    const windowsCount = readNumber(dimensions.windowsCount, 0, 50, 2);

    // 3. Advanced AI settings (validated again here: never trust the browser)
    const extraPrompt =
      typeof aiInput.extraPrompt === 'string'
        ? aiInput.extraPrompt.trim().slice(0, AI_LIMITS.extraPromptMaxLength)
        : '';
    const userNegative =
      typeof aiInput.negativePrompt === 'string'
        ? aiInput.negativePrompt.trim().slice(0, AI_LIMITS.negativePromptMaxLength)
        : DEFAULT_AI_SETTINGS.negativePrompt;
    const inferenceSteps = Math.round(
      readNumber(
        aiInput.inferenceSteps,
        AI_LIMITS.inferenceSteps.min,
        AI_LIMITS.inferenceSteps.max,
        DEFAULT_AI_SETTINGS.inferenceSteps
      )
    );
    const guidanceScale = readNumber(
      aiInput.guidanceScale,
      AI_LIMITS.guidanceScale.min,
      AI_LIMITS.guidanceScale.max,
      DEFAULT_AI_SETTINGS.guidanceScale
    );
    // Seed: a whole number, or undefined (= random)
    const seed =
      aiInput.seed === null || aiInput.seed === undefined || aiInput.seed === ''
        ? undefined
        : Math.floor(readNumber(aiInput.seed, 0, AI_LIMITS.seedMax, 0));

    // 4. Build the prompt. Order = priority (the model reads the beginning best):
    //    furnished scene → style → user's extra text → layout → materials → light → quality
    const finalPrompt = buildPrompt(
      [
        space.scenePrompt,
        cleanStylePrompt(style.prompt, mode),
        extraPrompt,
        layout.prompt,
        getBudgetPromptDetails(budget, mode),
        getLightingPrompt(mode, windowsCount),
        'architectural magazine photo, straight vertical lines, photorealistic, sharp focus',
      ],
      MAX_PROMPT_TOKENS
    );
    const negativePrompt = mergeTerms(userNegative, getMandatoryNegatives(mode));

    // 5. Demo mode: no Replicate token configured
    const rawToken = process.env.REPLICATE_API_TOKEN || '';
    const token = rawToken.trim().replace(/^["']|["']$/g, '');

    if (!token || token === 'demo') {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return NextResponse.json({
        result: DEMO_IMAGES[mode] ?? DEMO_IMAGES.interiors,
        isDemo: true,
        promptUsed: finalPrompt,
      });
    }

    // 6. Real call: ControlNet (MLSD + segmentation) keeps the walls and the perspective.
    //    "Transformation strength" (45-100%) becomes prompt_strength (0.45-0.9).
    const strength = readNumber(dimensions.aiStrength, 40, 100, 75);
    const promptStrength = Math.min(0.9, Math.max(0.45, Number((strength / 100).toFixed(2))));

    const replicate = new Replicate({ auth: token });
    const output = await replicate.run(
      'adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38',
      {
        input: {
          image,
          prompt: finalPrompt,
          negative_prompt: negativePrompt,
          num_inference_steps: inferenceSteps,
          guidance_scale: guidanceScale,
          prompt_strength: promptStrength,
          ...(seed !== undefined ? { seed } : {}),
        },
      }
    );

    const resultUrl = getImageUrl(output);
    if (!resultUrl) {
      return NextResponse.json({ error: 'Modelul AI nu a returnat nicio imagine.' }, { status: 502 });
    }

    return NextResponse.json({
      result: resultUrl,
      isDemo: false,
      promptUsed: finalPrompt,
    });
  } catch (error) {
    let message = 'AI Server Error';
    if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}