// app/components/layout/Navbar.tsx
// v5.0 — monochrome gallery bar: solid white/charcoal, 1px hairline, centered uppercase nav, no blue.
// v4.3 — plan-aware account menu (STARTER / PRO / AGENCY row + B2B lock state).
// v4.2 — "Engine 4.0 online" badge removed.
// v4.1 — Lovable "Dark Architecture" visual pass (logic unchanged from v3.0).
// v3.0 — "Dark Architecture" redesign.
//   • Flush RO|EN segmented control, theme toggle.
//   • Avatar circle with dropdown: Arhivă, Modul B2B, Sign Out (replaces AccountWidget).
//   • PlanBadge, pricing IntersectionObserver and active-link logic are unchanged.
"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Layers, CreditCard, User, Sun, Moon, HardHat, Archive, LogOut, Lock } from 'lucide-react';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import PlanBadge from '@/app/components/ui/PlanBadge';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import { STORAGE_KEYS, readStorage, removeStorage } from '@/app/lib/storage';
import { getSessionEmail, signOutUser } from '@/app/lib/supabase/auth';
import { PLAN_EVENT, resolvePlan } from '@/app/lib/plan/client';
import { getSkin, EYEBROW, CONTAINER } from '@/app/lib/theme/skin';
import type { Language, PlanTier, ThemeMode } from '@/app/types';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, isDark, isRo, setLang, setTheme } = usePrefs();
  const sk = getSkin(isDark);

  const [pricingVisible, setPricingVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<PlanTier | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Session email (Supabase first, Demo profile fallback) — refreshed on navigation
  useEffect(() => {
    let alive = true;
    (async () => {
      const sessionEmail = await getSessionEmail();
      const fallback = readStorage(STORAGE_KEYS.userEmail);
      if (alive) setEmail(sessionEmail ?? fallback ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Plan tier (starter | pro | agency) — refreshed on navigation and on plan change events
  useEffect(() => {
    let alive = true;
    const load = () => {
      resolvePlan()
        .then((p) => alive && setTier(p.isSignedIn ? p.tier : null))
        .catch(() => undefined);
    };
    load();
    window.addEventListener(PLAN_EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(PLAN_EVENT, load);
    };
  }, [pathname]);

  // Close the account menu on navigation (adjust state during render, not in an effect)
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  // Close the account menu on outside click / Escape

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Observer on #pricing
  useEffect(() => {
    if (pathname !== '/') return; // isHome / isPricing already require pathname === '/'
    const section = document.getElementById('pricing');
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPricingVisible(entry.isIntersecting),
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  // Bara are mereu aceeași suprafață ca pagina (alb de galerie / cărbune mat)
  const chromeDark = isDark;
  const hk = sk;

  const isHome = pathname === '/' && !pricingVisible;
  const isPricing = (pathname === '/' && pricingVisible) || pathname === '/checkout';
  const isStudio = pathname === '/generate';
  const isAccount = pathname === '/login';
  const isB2B = pathname === '/b2b';

  const handlePricingClick = () => {
    if (pathname === '/') setPricingVisible(true);
  };
  const handleHomeClick = () => setPricingVisible(false);

  const handleLang = (next: Language) => {
    setLang(next);
  };

  const handleTheme = () => {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setTheme(next);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOutUser();
    removeStorage(STORAGE_KEYS.userEmail);
    setEmail(null);
    setTier(null);
    router.push('/login');
  };

  // ── Styles ──────────────────────────────────────────────────────────────
  const navHover = isDark ? 'hover:text-white' : 'hover:text-[#111111]';
  const navLink = (active: boolean) =>
    `relative h-16 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-300 ${
      active ? hk.strong : `${hk.muted} ${navHover}`
    }`;
  const activeBar = (active: boolean) =>
    `absolute inset-x-0 -bottom-px h-[2px] transition-opacity duration-200 ${
      active ? 'opacity-100' : 'opacity-0'
    } ${isDark ? 'bg-white' : 'bg-[#111111]'}`;
  const mobileTab = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 text-[9px] tracking-[0.18em] uppercase font-mono touch-manipulation transition-colors ${
      active ? `${sk.strong}` : sk.dim
    }`;

  const initials = (email ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
  const isAgency = tier === 'agency';
  const tierLabel = tier === 'agency' ? 'AGENCY' : tier === 'pro' ? 'PRO' : 'STARTER';
  const tierColor = tier === 'agency' || tier === 'pro' ? sk.strong : sk.dim;

  const menuItem = `w-full h-10 px-3 flex items-center gap-2.5 text-xs text-left transition-colors cursor-pointer touch-manipulation ${sk.rowHover}`;

  return (
    <>
      {/* ── TOP HEADER ───────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-colors duration-500 print:hidden ${
          isDark ? 'bg-[#0B0B0C]/95 border-[#262629] text-[#F5F5F5]' : 'bg-white/95 border-[#E5E5E5] text-[#111111]'
        } backdrop-blur-md`}
      >
        <div className={`${CONTAINER} h-16 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-6`}>
          <div className="flex items-center gap-5">
            <Link href="/" onClick={handleHomeClick} className="touch-manipulation" aria-label="SUCVAR">
              <SucvarLogo size={28} withWordmark isDark={chromeDark} />
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center justify-center gap-8 lg:gap-10">
            <Link href="/" onClick={handleHomeClick} className={navLink(isHome)}>
              {isRo ? 'Acasă' : 'Home'}
              <span className={activeBar(isHome)} />
            </Link>
            <Link href="/generate" className={navLink(isStudio)}>
              Studio
              <span className={activeBar(isStudio)} />
            </Link>
            <Link
              href="/#pricing"
              onClick={handlePricingClick}
              aria-current={isPricing ? 'page' : undefined}
              className={navLink(isPricing)}
            >
              {isRo ? 'Planuri' : 'Plans'}
              <span className={activeBar(isPricing)} />
            </Link>
            <Link href="/b2b" aria-current={isB2B ? 'page' : undefined} className={navLink(isB2B)}>
              B2B
              <span className={activeBar(isB2B)} />
            </Link>
          </nav>

          {/* Right controls */}
          <div className="flex items-center justify-end gap-2">
            {/* RO | EN flush segmented */}
            <div
              role="group"
              aria-label="Language"
              className={`flex h-8 items-center border p-0.5 ${hk.line}`}
            >
              {(['ro', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleLang(l)}
                  aria-pressed={lang === l}
                  className={`h-full px-2.5 ${EYEBROW} cursor-pointer touch-manipulation transition-colors duration-300 ${
                    lang === l ? hk.segOn : hk.segOff
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleTheme}
              aria-label="Toggle theme"
              className={`h-8 w-8 inline-flex items-center justify-center border cursor-pointer touch-manipulation transition-colors ${hk.btnGhost}`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <PlanBadge isDark={chromeDark} isRo={isRo} />

            {/* Avatar + dropdown */}
            {email ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((p) => !p)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={isRo ? 'Meniu cont' : 'Account menu'}
                  className={`h-8 w-8 inline-flex items-center justify-center rounded-full border cursor-pointer touch-manipulation transition-opacity hover:opacity-80 ${
                    isAgency ? (isDark ? 'border-white' : 'border-[#111111]') : sk.line
                  } ${isDark ? 'bg-[#141416] text-[#F5F5F5]' : 'bg-[#F5F5F5] text-[#111111]'}`}
                >
                  <span className="font-mono text-[10.5px] tracking-wider">{initials || '··'}</span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className={`absolute right-0 mt-2 w-60 border overflow-hidden z-50 ${sk.popover}`}
                  >
                    <div className={`px-3 py-3 border-b ${sk.line}`}>
                      <p className={`${EYEBROW} ${sk.dim}`}>{isRo ? 'Autentificat ca' : 'Signed in as'}</p>
                      <p className="mt-1 text-xs font-mono truncate">{email}</p>
                      {tier && (
                        <p className={`mt-2 flex items-center justify-between ${EYEBROW} ${sk.dim}`}>
                          <span>{isRo ? 'Plan' : 'Plan'}</span>
                          <span className={`font-mono font-semibold ${tierColor}`}>{tierLabel}</span>
                        </p>
                      )}
                    </div>
                    <Link href="/login" role="menuitem" className={menuItem}>
                      <Archive className={`w-3.5 h-3.5 ${sk.dim}`} />
                      {isRo ? 'Arhivă' : 'Archive'}
                    </Link>
                    <Link href="/b2b" role="menuitem" className={menuItem}>
                      {tier !== null && !isAgency ? (
                        <Lock className={`w-3.5 h-3.5 ${sk.dim}`} />
                      ) : (
                        <HardHat className={`w-3.5 h-3.5 ${isAgency ? tierColor : sk.dim}`} />
                      )}
                      {isRo ? 'Modul B2B' : 'B2B module'}
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className={`${menuItem} border-t ${sk.line} ${isDark ? 'text-red-400' : 'text-red-600'}`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`inline-flex items-center h-8 px-3 ${EYEBROW} transition-colors touch-manipulation ${hk.btn}`}
              >
                {isRo ? 'Autentificare' : 'Sign in'}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ───────────────────────────────────────── */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)] print:hidden ${sk.header}`}
      >
        <div className="grid grid-cols-5 h-14">
          <Link href="/" onClick={handleHomeClick} className={mobileTab(isHome)}>
            <Home className="w-4 h-4" />
            <span>{isRo ? 'Acasă' : 'Home'}</span>
          </Link>
          <Link href="/generate" className={mobileTab(isStudio)}>
            <Layers className="w-4 h-4" />
            <span>Studio</span>
          </Link>
          <Link
            href="/#pricing"
            onClick={handlePricingClick}
            aria-current={isPricing ? 'page' : undefined}
            className={mobileTab(isPricing)}
          >
            <CreditCard className="w-4 h-4" />
            <span>{isRo ? 'Planuri' : 'Plans'}</span>
          </Link>
          <Link href="/b2b" className={mobileTab(isB2B)}>
            <HardHat className="w-4 h-4" />
            <span>B2B</span>
          </Link>
          <Link href="/login" className={mobileTab(isAccount)}>
            <User className="w-4 h-4" />
            <span>{isRo ? 'Cont' : 'Account'}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}