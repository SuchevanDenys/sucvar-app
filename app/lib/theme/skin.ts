// app/lib/theme/skin.ts
// SUCVAR design skin — single source of truth for the monochrome gallery look.
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
  strong: string;   // primary ink titles
  muted: string;    // neutral grey subtitles
  dim: string;      // tertiary text
  accent: string;   // emphasis text (monochrome)
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
  'bg-[linear-gradient(to_right,rgba(17,17,17,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.04)_1px,transparent_1px)] bg-[size:56px_56px]';

// Monochrome Scandinavian gallery: #FFFFFF / #F5F5F5 / #E5E5E5 / #111111 · dark #0B0B0C / #141416 / #262629.
export function getSkin(isDark: boolean): Skin {
  if (isDark) {
    return {
      page: 'bg-[#0B0B0C] text-[#F5F5F5] selection:bg-white/20',
      header: 'bg-[#0B0B0C]/90 backdrop-blur-md border-[#262629]',
      card: 'bg-[#141416] border-[#262629]',
      cell: 'bg-[#141416]',
      gap: 'bg-[#262629]',
      popover: 'bg-[#141416] border-[#262629] text-[#F5F5F5] shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]',
      line: 'border-[#262629]',
      divide: 'divide-[#262629]',
      strong: 'text-[#F5F5F5]',
      muted: 'text-[#A1A1AA]',
      dim: 'text-[#A1A1AA]/80',
      accent: 'text-white',
      input:
        'bg-[#0B0B0C] border-[#262629] text-[#F5F5F5] placeholder:text-[#71717A] hover:border-[#3F3F46] focus:border-[#F5F5F5] focus:outline-none focus:ring-0',
      btn: 'bg-white text-[#111111] hover:bg-[#E5E5E5] active:scale-[0.98] active:bg-[#D4D4D4] border border-transparent transition-[background-color,transform]',
      btnGhost:
        'border border-[#262629] text-[#F5F5F5] hover:bg-[#1C1C1F] hover:border-[#F5F5F5]/50 active:scale-[0.98] transition-[background-color,border-color,color,transform]',
      segOn: 'bg-white text-[#111111]',
      segOff: 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F]',
      option: 'bg-[#141416] text-[#F5F5F5]',
      grid: GRID_DARK,
      rowHover: 'hover:bg-[#1C1C1F]',
    };
  }
  return {
    page: 'bg-white text-[#111111] selection:bg-[#111111]/15',
    header: 'bg-white/90 backdrop-blur-md border-[#E5E5E5]',
    card: 'bg-white border-[#E5E5E5]',
    cell: 'bg-white',
    gap: 'bg-[#E5E5E5]',
    popover: 'bg-white border-[#E5E5E5] text-[#111111] shadow-[0_16px_40px_-20px_rgba(0,0,0,0.25)]',
    line: 'border-[#E5E5E5]',
    divide: 'divide-[#E5E5E5]',
    strong: 'text-[#111111]',
    muted: 'text-[#666666]',
    dim: 'text-[#666666]/85',
    accent: 'text-[#111111]',
    input:
      'bg-white border-[#E5E5E5] text-[#111111] placeholder:text-[#A3A3A3] hover:border-[#BDBDBD] focus:border-[#111111] focus:outline-none focus:ring-0',
    btn: 'bg-[#111111] text-white hover:bg-[#2A2A2A] active:scale-[0.98] active:bg-black border border-transparent transition-[background-color,transform]',
    btnGhost:
      'border border-[#E5E5E5] text-[#111111] hover:bg-[#F5F5F5] hover:border-[#111111] active:scale-[0.98] transition-[background-color,border-color,color,transform]',
    segOn: 'bg-[#111111] text-white',
    segOff: 'text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5]',
    option: 'bg-white text-[#111111]',
    grid: GRID_LIGHT,
    rowHover: 'hover:bg-[#F5F5F5]',
  };
}

/** Micro uppercase mono label: use for eyebrows, field labels, codes. */
export const EYEBROW = 'text-[10px] tracking-[0.22em] uppercase font-mono';

/** Editorial container (Lovable `container-editorial`): 1240px, 24px → 40px gutters. */
export const CONTAINER = 'w-full max-w-[1240px] mx-auto px-6 lg:px-10';

/** 1px horizontal rule used next to eyebrows (Lovable `h-px w-8 bg-border-strong`). */
export function ruleClass(isDark: boolean): string {
  return isDark ? 'bg-[#F5F5F5]/25' : 'bg-[#111111]/25';
}


/** Eșantion de culoare tactil: margine fină + inel interior pentru contrast pe orice fundal. */
export function swatchClass(isDark: boolean, size: 'sm' | 'md' = 'md'): string {
  const dim = size === 'sm' ? 'w-2.5 h-2.5' : 'w-4 h-4';
  const ring = isDark
    ? 'border-white/20 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]'
    : 'border-black/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]';
  return `${dim} rounded-sm border ${ring} transition-transform duration-200 group-hover:scale-110`;
}
