// app/lib/skin.tsx
// SUCVAR design skin — single source of truth for the "Dark Architecture" look.
// Used by Navbar.tsx, app/page.tsx and app/generate/page.tsx.
// Dark is the primary skin; light is a faithful inversion so the theme toggle keeps working.

import React from 'react';

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

/** Pulsing telemetry dot + label, e.g. "ENGINE ONLINE". */
export function LiveDot({
  label,
  active = true,
  className = '',
}: {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${EYEBROW} ${className}`}>
      <span className="relative flex h-1.5 w-1.5">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-amber-400'}`}
        />
      </span>
      {label}
    </span>
  );
}

/** Four corner registration marks, placed inside a `relative` parent. */
export function Corners({ isDark }: { isDark: boolean }) {
  const c = isDark ? 'border-white/40' : 'border-black/40';
  const base = `pointer-events-none absolute h-2.5 w-2.5 ${c}`;
  return (
    <>
      <span className={`${base} -left-px -top-px border-l border-t`} />
      <span className={`${base} -right-px -top-px border-r border-t`} />
      <span className={`${base} -bottom-px -left-px border-b border-l`} />
      <span className={`${base} -bottom-px -right-px border-b border-r`} />
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// v4.1 additions — ported from the Lovable prototype (Frame, SectionHeading,
// container + rule helpers). Pure presentational, SSR-safe, no hooks.
// ─────────────────────────────────────────────────────────────────────────────

/** Editorial container (Lovable `container-editorial`): 1240px, 24px → 40px gutters. */
export const CONTAINER = 'w-full max-w-[1240px] mx-auto px-6 lg:px-10';

/** 1px horizontal rule used next to eyebrows (Lovable `h-px w-8 bg-border-strong`). */
export function ruleClass(isDark: boolean): string {
  return isDark ? 'bg-white/[0.18]' : 'bg-black/[0.2]';
}

/** Architectural frame: corner registration marks + mid-axis crosshair ticks + FIG caption. */
export function Frame({
  isDark,
  label,
  meta,
  className = '',
  children,
}: {
  isDark: boolean;
  label?: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const sk = getSkin(isDark);
  const mark = `pointer-events-none absolute h-3.5 w-3.5 ${isDark ? 'border-white/50' : 'border-black/50'}`;
  const tick = `pointer-events-none absolute ${ruleClass(isDark)}`;
  return (
    <figure className={`relative ${className}`}>
      {(label || meta) && (
        <figcaption className={`mb-3 flex items-center justify-between ${EYEBROW} ${sk.dim}`}>
          <span>{label}</span>
          <span className="tabular-nums">{meta}</span>
        </figcaption>
      )}
      <div className={`relative border p-2 sm:p-3 ${sk.line}`}>
        <span className={`${mark} -left-px -top-px border-l border-t`} />
        <span className={`${mark} -right-px -top-px border-r border-t`} />
        <span className={`${mark} -bottom-px -left-px border-b border-l`} />
        <span className={`${mark} -bottom-px -right-px border-b border-r`} />
        <span className={`${tick} -top-2 left-1/2 h-2 w-px`} />
        <span className={`${tick} -bottom-2 left-1/2 h-2 w-px`} />
        <span className={`${tick} -left-2 top-1/2 h-px w-2`} />
        <span className={`${tick} -right-2 top-1/2 h-px w-2`} />
        {children}
      </div>
    </figure>
  );
}

/** "§01 ── EYEBROW" + two-tone title. */
export function SectionHeading({
  isDark,
  index,
  eyebrow,
  title,
  titleMuted,
}: {
  isDark: boolean;
  index: string;
  eyebrow: string;
  title: string;
  titleMuted?: string;
}) {
  const sk = getSkin(isDark);
  return (
    <div>
      <p className={`flex items-center gap-3 ${EYEBROW} ${sk.dim}`}>
        <span className={sk.strong}>§{index}</span>
        <span className={`h-px w-8 ${ruleClass(isDark)}`} />
        {eyebrow}
      </p>
      <h2
        className={`mt-6 max-w-2xl text-3xl sm:text-[2.6rem] font-medium leading-[1.1] tracking-[-0.03em] ${sk.strong}`}
      >
        {title}
        {titleMuted ? <> <span className={sk.muted}>{titleMuted}</span></> : null}
      </h2>
    </div>
  );
}