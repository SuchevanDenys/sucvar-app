// app/components/layout/Footer.tsx
import React from 'react';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import { LiveDot } from '@/app/components/ui/Editorial';
import { CONTAINER, EYEBROW, getSkin } from '@/app/lib/theme/skin';
import type { Language } from '@/app/types';

// Fixed year (no new Date() during render, it breaks Next.js 16 prerendering)
const COPYRIGHT_YEAR = 2026;

// Static footer telemetry from the prototype. Placeholder values: wire to real monitoring or delete.
const FOOTER_LATENCY_MS = 38;
const FOOTER_UPTIME = '99.98%';

export default function Footer({ lang, isDark }: { lang: Language; isDark: boolean }) {
  const sk = getSkin(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);

  return (
    <footer className={`border-t pb-10 pt-16 ${sk.line}`}>
      <div className={`${CONTAINER} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}>
        <div className="flex items-center gap-4">
          <SucvarLogo size={24} withWordmark isDark={isDark} />
          <span className={`text-xs ${sk.dim}`}>{t('Sisteme Spațiale & Inginerești', 'Spatial & Engineering Systems')}</span>
        </div>
        <div className={`flex flex-wrap items-center gap-x-6 gap-y-2 ${EYEBROW} ${sk.muted}`}>
          <LiveDot label={t('Toate sistemele funcționale', 'All systems operational')} className={sk.strong} />
          <span className="tabular-nums">
            {t('Latență API', 'API latency')} {FOOTER_LATENCY_MS} ms
          </span>
          <span className="tabular-nums">
            {t('Disponibilitate 90z', 'Uptime 90d')} {FOOTER_UPTIME}
          </span>
          <span className={`tabular-nums ${sk.dim}`}>© {COPYRIGHT_YEAR} SUCVAR · Suchevan Denys</span>
        </div>
      </div>
    </footer>
  );
}
