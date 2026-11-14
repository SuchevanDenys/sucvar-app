// app/components/home/CaseCard.tsx
// Lovable CaseCard: framed image crossfade + hairline meta + tags.
import React, { useState } from 'react';
import Image from 'next/image';
import { Frame } from '@/app/components/ui/Editorial';
import type { CaseStudy } from '@/app/data/home';
import { EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

export default function CaseCard({ c, lang, isDark }: { c: CaseStudy; lang: Language; isDark: boolean }) {
  const sk = getSkin(isDark);
  const t = (ro: string, en: string) => (lang === 'ro' ? ro : en);
  const [showAfter, setShowAfter] = useState(true);
  const beforeLabel = t('Înainte', 'Before');
  const afterLabel = t('După', 'After');
  const title = t(c.titleRo, c.titleEn);

  return (
    <article className="group flex flex-col">
      <Frame isDark={isDark} label={c.code} meta={showAfter ? afterLabel : beforeLabel}>
        <div className={`relative aspect-[16/10] overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
          {[c.before, c.after].map((src, i) => (
            <Image
              key={src}
              src={src}
              alt={`${title} — ${i === 0 ? beforeLabel : afterLabel}`}
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className={`object-cover transition-[opacity,transform] duration-[1200ms] ease-out group-hover:scale-[1.02] ${
                (i === 1) === showAfter ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <div
            role="group"
            aria-label={t('Înainte / După', 'Before / After')}
            className={`absolute right-3 top-3 z-10 flex rounded-sm border p-0.5 backdrop-blur-md ${EYEBROW} ${
              isDark ? 'bg-zinc-950/60 border-white/[0.1]' : 'bg-white/70 border-black/[0.1]'
            }`}
          >
            {[false, true].map((after) => (
              <button
                key={String(after)}
                type="button"
                aria-pressed={showAfter === after}
                onClick={() => setShowAfter(after)}
                className={`rounded-[1px] px-2.5 py-1 cursor-pointer touch-manipulation transition-colors duration-300 ${
                  showAfter === after
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-950 text-white'
                    : isDark
                      ? 'text-zinc-300 hover:text-white'
                      : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {after ? afterLabel : beforeLabel}
              </button>
            ))}
          </div>
        </div>
      </Frame>

      <div className="mt-8">
        <h3 className={`text-xl sm:text-2xl font-medium tracking-tight ${sk.strong}`}>{title}</h3>
        <p className={`mt-3 max-w-lg text-sm leading-relaxed ${sk.muted}`}>{t(c.summaryRo, c.summaryEn)}</p>
      </div>

      <dl className={`mt-8 grid grid-cols-3 gap-px border ${sk.line} ${sk.gap}`}>
        {[...c.meta, { label: t('Rezultat', 'Output'), value: c.output }].slice(0, 3).map((m) => (
          <div key={m.label} className={`px-4 py-3.5 ${sk.cell}`}>
            <dt className={`${EYEBROW} ${sk.dim}`}>{m.label}</dt>
            <dd className={`mt-1.5 font-mono text-[13px] tabular-nums ${sk.strong}`}>{m.value}</dd>
          </div>
        ))}
      </dl>

      {/* Calculated materials (kept from v4.0) */}
      <div className={`mt-4 border ${sk.line} ${sk.card}`}>
        <div className={`px-4 h-9 flex items-center justify-between border-b ${sk.line} ${EYEBROW} ${sk.dim}`}>
          <span>{t(c.listTitleRo, c.listTitleEn)}</span>
          <span className="tabular-nums">{c.output}</span>
        </div>
        <ul className={`divide-y ${sk.divide}`}>
          {c.materials.map((m) => (
            <li key={m.nameEn} className="px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm ${sk.strong}`}>{t(m.nameRo, m.nameEn)}</p>
                <p className={`mt-0.5 font-mono text-[10px] ${sk.dim}`}>{m.std}</p>
              </div>
              <span className={`font-mono text-xs tabular-nums whitespace-nowrap ${sk.accent}`}>{m.qty}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {c.materials.map((m) => (
          <li key={m.std} className={`rounded-sm border px-2 py-1 font-mono text-[10.5px] ${sk.line} ${sk.muted}`}>
            {m.std}
          </li>
        ))}
      </ul>
    </article>
  );
}
