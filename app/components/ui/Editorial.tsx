// app/components/ui/Editorial.tsx
// Editorial / architectural presentational pieces built on the SUCVAR skin.
// Pure presentational, SSR-safe, no hooks.
import React from 'react';
import { EYEBROW, getSkin, ruleClass } from '@/app/lib/theme/skin';

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