// app/components/Navbar.tsx
// v2.0 — fix activare instantanee „Planuri" pe desktop și mobil;
//         adăugat link B2B în navigare.
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, CreditCard, User, Sun, Moon, HardHat } from 'lucide-react';
import SucvarLogo from '@/app/components/SucvarLogo';
import {
  getUi,
  getSavedTheme,
  getSavedLang,
  THEME_STORAGE_KEY,
  LANG_STORAGE_KEY,
} from '@/app/lib/theme';
import { Language, ThemeMode } from '@/app/types/studio';

interface NavbarProps {
  lang: Language;
  setLang: (l: Language) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
}

// ── Clase stiluri ────────────────────────────────────────────────────────────

function desktopLinkClass(active: boolean) {
  return [
    'relative py-2 text-xs uppercase tracking-widest transition-opacity hover:opacity-100',
    active ? 'opacity-100 font-semibold' : 'opacity-55',
  ].join(' ');
}

function mobileTabClass(active: boolean) {
  return [
    'flex flex-col items-center justify-center gap-1 text-[10px] uppercase tracking-wider touch-manipulation transition-opacity',
    active ? 'opacity-100 font-semibold' : 'opacity-55',
  ].join(' ');
}

// ── Componenta ───────────────────────────────────────────────────────────────

export default function Navbar({ lang, setLang, theme, setTheme }: NavbarProps) {
  const pathname = usePathname();
  const isDark = theme === 'dark';
  const isRo = lang === 'ro';
  const ui = getUi(isDark);

  // ── Stare: secțiunea #pricing este vizibilă pe ecran? ───────────────────
  // Se setează pe `true` IMEDIAT la click pe „Planuri" (chiar înainte ca
  // pagina să deruleze), și se recalculează continuu pe scroll.
  const [pricingVisible, setPricingVisible] = useState(false);

  // Restaurează tema și limba salvate la prima montare
  useEffect(() => {
    const t = getSavedTheme();
    const l = getSavedLang();
    if (t !== theme) setTheme(t);
    if (l !== lang) setLang(l);
    document.documentElement.classList.toggle('dark', t === 'dark');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observer pe secțiunea #pricing — mai fiabil decât getBoundingClientRect + scroll
  useEffect(() => {
    if (pathname !== '/') {
      setPricingVisible(false);
      return;
    }

    const section = document.getElementById('pricing');
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPricingVisible(entry.isIntersecting),
      // Declanșează când cel puțin 20% din secțiune este vizibilă
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  // ── Flags de activare ────────────────────────────────────────────────────
  const isHome = pathname === '/' && !pricingVisible;
  // Planuri = activ când secțiunea e pe ecran SAU când suntem pe /checkout
  const isPricing = (pathname === '/' && pricingVisible) || pathname === '/checkout';
  const isStudio = pathname === '/generate';
  const isAccount = pathname === '/login';
  const isB2B = pathname === '/b2b';

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePricingClick = () => {
    // Marcăm imediat ca activ; IntersectionObserver va confirma peste ~100 ms
    if (pathname === '/') setPricingVisible(true);
  };

  const handleHomeClick = () => setPricingVisible(false);

  const handleLang = () => {
    const next: Language = isRo ? 'en' : 'ro';
    setLang(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const handleTheme = () => {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // ── Bara activă sub link desktop ─────────────────────────────────────────
  const activeBar = (active: boolean) =>
    [
      'absolute left-0 right-0 -bottom-0.5 h-[2px] transition-all duration-200',
      active
        ? `opacity-100 ${isDark ? 'bg-[#F4F3EF]' : 'bg-[#141413]'}`
        : 'opacity-0',
    ].join(' ');

  const smallBtn = `h-9 px-3 border rounded-md text-xs font-medium cursor-pointer touch-manipulation ${ui.btnGhost}`;

  return (
    <>
      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md pt-[env(safe-area-inset-top)] print:hidden ${ui.header}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleHomeClick}
            className="touch-manipulation"
            aria-label="SUCVAR"
          >
            <SucvarLogo size={32} withWordmark isDark={isDark} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" onClick={handleHomeClick} className={desktopLinkClass(isHome)}>
              {isRo ? 'Acasă' : 'Home'}
              <span className={activeBar(isHome)} />
            </Link>

            <Link href="/generate" className={desktopLinkClass(isStudio)}>
              Studio
              <span className={activeBar(isStudio)} />
            </Link>

            <Link
              href="/#pricing"
              onClick={handlePricingClick}
              aria-current={isPricing ? 'page' : undefined}
              className={desktopLinkClass(isPricing)}
            >
              {isRo ? 'Planuri' : 'Plans'}
              <span className={activeBar(isPricing)} />
            </Link>

            <Link
              href="/b2b"
              aria-current={isB2B ? 'page' : undefined}
              className={desktopLinkClass(isB2B)}
            >
              B2B
              <span className={activeBar(isB2B)} />
            </Link>

            <Link href="/login" className={desktopLinkClass(isAccount)}>
              {isRo ? 'Cont' : 'Account'}
              <span className={activeBar(isAccount)} />
            </Link>
          </nav>

          {/* Controale dreapta */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleLang} aria-label="Switch language" className={smallBtn}>
              {isRo ? 'RO' : 'EN'}
            </button>
            <button type="button" onClick={handleTheme} aria-label="Toggle theme" className={smallBtn}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/generate"
              className={`hidden sm:inline-flex items-center h-9 px-4 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors touch-manipulation ${ui.btn}`}
            >
              {isRo ? 'Începe proiectul' : 'Start a project'}
            </Link>
          </div>
        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────────────────────── */}
      {/* pb-[env(safe-area-inset-bottom)] = bara de home iPhone nu acoperă tab-urile */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-lg pb-[env(safe-area-inset-bottom)] print:hidden ${ui.header}`}
      >
        <div className="grid grid-cols-5 h-16">
          <Link href="/" onClick={handleHomeClick} className={mobileTabClass(isHome)}>
            <Home className="w-5 h-5" />
            <span>{isRo ? 'Acasă' : 'Home'}</span>
          </Link>

          <Link href="/generate" className={mobileTabClass(isStudio)}>
            <Layers className="w-5 h-5" />
            <span>Studio</span>
          </Link>

          <Link
            href="/#pricing"
            onClick={handlePricingClick}
            aria-current={isPricing ? 'page' : undefined}
            className={mobileTabClass(isPricing)}
          >
            <CreditCard className="w-5 h-5" />
            <span>{isRo ? 'Planuri' : 'Plans'}</span>
          </Link>

          <Link href="/b2b" className={mobileTabClass(isB2B)}>
            <HardHat className="w-5 h-5" />
            <span>B2B</span>
          </Link>

          <Link href="/login" className={mobileTabClass(isAccount)}>
            <User className="w-5 h-5" />
            <span>{isRo ? 'Cont' : 'Account'}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
