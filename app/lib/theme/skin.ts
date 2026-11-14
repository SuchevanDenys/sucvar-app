// app/lib/theme/skin.ts
// SUCVAR design skin — single source of truth for the "Dark Architecture" look.
// Presentational components that use it live in components/ui/Editorial.tsx.
// Dark is the primary skin; light is a faithful inversion so the theme toggle keeps working.

export interface Skin {
  page: string;      // page background + base text
  header: string;   // sticky bars
  card: string;     // translucent elevated surface (use with `border`)
  cell: string;     // opaque cell for hairline grids
  gap: string;      // background of a grid whose gap-px forms hairlines
  popover: string;  // dropdowns / menus
  line: string;     // border colour for 1px dividers
  divide: string;   // divide-y colour
  strong: string;   // pure-white titles
  muted: string;    // silver subtitles
  dim: string;      // tertiary text
  accent: string;   // emerald accent text
  input: string;    // input / select borders + states (use with `border`)
  btn: string;      // primary button
  btnGhost: string; // secondary button
  segOn: string;    // active segment
  segOff: string;   // idle segment
  option: string;   // <option> colours
  grid: string;     // blueprint grid background
  rowHover: string;
}

const GRID_DARK =
  'bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]';
const GRID_LIGHT =
  'bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:56px_56px]';

export function getSkin(isDark: boolean): Skin {
  if (isDark) {
    return {
      page: 'bg-[#09090B] text-zinc-100 selection:bg-emerald-400/25',
      header: 'bg-[#09090B]/80 border-white/[0.06]',
      card: 'bg-zinc-900/40 backdrop-blur-sm border-white/[0.08]',
      cell: 'bg-[#0B0B0E]',
      gap: 'bg-white/[0.06]',
      popover: 'bg-[#0E0E11] border-white/[0.1] text-zinc-100 ring-1 ring-black',
      line: 'border-white/[0.06]',
      divide: 'divide-white/[0.06]',
      strong: 'text-white',
      muted: 'text-zinc-400',
      dim: 'text-zinc-500',
      accent: 'text-emerald-400',
      input:
        'bg-zinc-950/60 border-white/[0.08] text-zinc-100 placeholder:text-zinc-600 hover:border-white/[0.16] focus:border-emerald-400/60 focus:outline-none focus:ring-0',
      btn: 'bg-zinc-100 text-zinc-950 hover:bg-white border border-transparent',
      btnGhost:
        'border border-white/[0.1] text-zinc-300 hover:bg-white/[0.04] hover:text-white hover:border-white/[0.18]',
      segOn: 'bg-white/[0.09] text-white',
      segOff: 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.03]',
      option: 'bg-zinc-900 text-zinc-100',
      grid: GRID_DARK,
      rowHover: 'hover:bg-white/[0.03]',
    };
  }
  return {
    page: 'bg-[#FAFAF9] text-zinc-900 selection:bg-emerald-500/20',
    header: 'bg-[#FAFAF9]/80 border-black/[0.07]',
    card: 'bg-white/70 backdrop-blur-sm border-black/[0.08]',
    cell: 'bg-white',
    gap: 'bg-black/[0.07]',
    popover: 'bg-white border-black/[0.1] text-zinc-900 ring-1 ring-black/5',
    line: 'border-black/[0.07]',
    divide: 'divide-black/[0.07]',
    strong: 'text-zinc-950',
    muted: 'text-zinc-600',
    dim: 'text-zinc-500',
    accent: 'text-emerald-700',
    input:
      'bg-white border-black/[0.1] text-zinc-900 placeholder:text-zinc-400 hover:border-black/[0.22] focus:border-emerald-600/70 focus:outline-none focus:ring-0',
    btn: 'bg-zinc-950 text-white hover:bg-zinc-800 border border-transparent',
    btnGhost:
      'border border-black/[0.12] text-zinc-700 hover:bg-black/[0.04] hover:text-zinc-950 hover:border-black/[0.22]',
    segOn: 'bg-black/[0.07] text-zinc-950',
    segOff: 'text-zinc-500 hover:text-zinc-900 hover:bg-black/[0.03]',
    option: 'bg-white text-zinc-900',
    grid: GRID_LIGHT,
    rowHover: 'hover:bg-black/[0.03]',
  };
}

/** Micro uppercase mono label: use for eyebrows, field labels, codes. */
export const EYEBROW = 'text-[10px] tracking-[0.22em] uppercase font-mono';

/** Editorial container (Lovable `container-editorial`): 1240px, 24px → 40px gutters. */
export const CONTAINER = 'w-full max-w-[1240px] mx-auto px-6 lg:px-10';

/** 1px horizontal rule used next to eyebrows (Lovable `h-px w-8 bg-border-strong`). */
export function ruleClass(isDark: boolean): string {
  return isDark ? 'bg-white/[0.18]' : 'bg-black/[0.2]';
}

