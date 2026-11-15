// app/components/AccountWidget.tsx
// v1.1 — afișează „Nume.P” (prenume + inițiala numelui) în loc de email.
// v1.0 — widget de cont în colțul dreapta-sus (stil Google / SaaS).
//   • neautentificat  → buton „Autentificare”
//   • autentificat    → avatar (poza Google sau inițială) + email trunchiat
//   • click           → /login (panou de control + arhivă)
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { getSessionInfo, subscribeToAuthEvents } from '@/app/lib/supabase/auth';
import { getUi } from '@/app/lib/theme/tokens';

// Aceleași chei ca în app/login/page.tsx
const USER_KEY = 'sucvar_user_email';
const USER_ROLE_KEY = 'sucvar_user_role';
const DEMO_KEY = 'sucvar_demo_mode';

// Evenimentul pe care îl emite /login la schimbarea profilului Demo
// (evenimentul nativ „storage” nu se declanșează în același tab).
export const ACCOUNT_CHANGE_EVENT = 'sucvar:account-change';

export function notifyAccountChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ACCOUNT_CHANGE_EVENT));
}

interface AccountUser {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isDemo: boolean;
  roleLabel: string | null;
}

async function resolveAccountUser(): Promise<AccountUser | null> {
  // 1. Sesiune reală Supabase (email/parolă sau Google OAuth)
  const session = await getSessionInfo();
  if (session) {
    return {
      email: session.email,
      fullName: session.fullName,
      avatarUrl: session.avatarUrl,
      isDemo: false,
      roleLabel: null,
    };
  }

  // 2. Profil Demo (aceeași logică ca restoreSession din /login)
  try {
    const demoEmail = window.localStorage.getItem(USER_KEY);
    if (window.localStorage.getItem(DEMO_KEY) === '1' && demoEmail) {
      return {
        email: demoEmail,
        fullName: null,
        avatarUrl: null,
        isDemo: true,
        roleLabel: window.localStorage.getItem(USER_ROLE_KEY),
      };
    }
  } catch {
    // localStorage indisponibil (mod privat strict etc.)
  }
  return null;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// „Ion Popescu” → „Ion.P” · „Ion” → „Ion”
// Fără nume complet (email/parolă, Demo): se deduce din email,
// ex. „denys@sucvar.ro” → „Denys”, „ion.popescu@x.ro” → „Ion.P”.
function formatDisplayName(user: AccountUser): string {
  const fullName = (user.fullName ?? '').trim();
  const parts = fullName
    ? fullName.split(/\s+/).map(capitalize)
    : user.email
        .split('@')[0]
        .split(/[._\-+\d]+/)
        .filter(Boolean)
        .map((w) => capitalize(w.toLowerCase()));

  if (parts.length === 0) return user.email;
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[parts.length - 1].charAt(0).toUpperCase()}`;
}

function sameUser(a: AccountUser | null, b: AccountUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.email === b.email &&
    a.avatarUrl === b.avatarUrl &&
    a.fullName === b.fullName &&
    a.isDemo === b.isDemo
  );
}

function useAccountUser() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      const next = await resolveAccountUser();
      if (!active) return;
      setUser((prev) => (sameUser(prev, next) ? prev : next));
      setReady(true);
    };

    refresh();

    const unsubscribe = subscribeToAuthEvents(() => {
      refresh();
    });
    window.addEventListener(ACCOUNT_CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener(ACCOUNT_CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return { user, ready };
}

function Avatar({ user, isDark }: { user: AccountUser; isDark: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (user.fullName || user.email).trim().charAt(0).toUpperCase() || '?';

  if (user.avatarUrl && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        width={28}
        height={28}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        isDark ? 'bg-white text-[#111111]' : 'bg-[#111111] text-white'
      }`}
    >
      {initial}
    </span>
  );
}

interface AccountWidgetProps {
  isDark: boolean;
  isRo: boolean;
  /** true când ruta curentă este /login */
  active?: boolean;
}

export default function AccountWidget({ isDark, isRo, active = false }: AccountWidgetProps) {
  const ui = getUi(isDark);
  const { user, ready } = useAccountUser();

  const ring = active ? (isDark ? 'ring-1 ring-white' : 'ring-1 ring-[#111111]') : '';
  const focus = isDark
    ? 'focus-visible:outline-white'
    : 'focus-visible:outline-[#111111]';
  const base = `inline-flex h-9 items-center rounded-full border text-xs font-medium touch-manipulation transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${focus} ${ui.btnGhost} ${ring}`;

  // Înainte de verificarea sesiunii: placeholder de aceeași mărime
  // (fără salt de layout, fără diferențe server/client la hidratare).
  if (!ready) {
    return (
      <div
        aria-hidden="true"
        className={`h-9 w-9 animate-pulse rounded-full lg:w-40 ${ui.soft}`}
      />
    );
  }

  if (!user) {
    const label = isRo ? 'Autentificare' : 'Sign in';
    return (
      <Link href="/login" aria-label={label} title={label} className={`${base} gap-2 px-2.5 sm:px-4`}>
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </Link>
    );
  }

  const title = user.roleLabel ? `${user.email} · ${user.roleLabel}` : user.email;
  return (
    <Link
      href="/login"
      title={title}
      aria-label={`${isRo ? 'Contul meu' : 'My account'}: ${user.email}`}
      aria-current={active ? 'page' : undefined}
      className={`${base} max-w-full gap-2 p-[3px] lg:pr-3.5`}
    >
      <Avatar user={user} isDark={isDark} />
      <span className="hidden min-w-0 max-w-[9rem] truncate lg:inline xl:max-w-[12rem]">
        {formatDisplayName(user)}
      </span>
      {user.isDemo && (
        <span
          className={`hidden rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider xl:inline ${ui.soft} ${ui.accent}`}
        >
          Demo
        </span>
      )}
    </Link>
  );
}
