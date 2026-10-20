// app/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  UserCheck,
  LogOut,
  Plus,
  Database,
  MailCheck,
  X,
  ExternalLink,
  Copy,
  Check,
  Layers,
} from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import SucvarLogo from '@/app/components/SucvarLogo';
import BeforeAfterSlider from '@/app/components/BeforeAfterSlider';
import {
  SPACE_MODES,
  VISUAL_STYLES,
  calculateEngineering,
  generateSpecItems,
} from '@/app/data/catalog';
import {
  supabase,
  ACTIVE_PROJECT_KEY,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  resendConfirmationEmail,
  sendPasswordReset,
  updatePassword,
  subscribeToAuthEvents,
  getSessionInfo,
  signOutUser,
  fetchProjectsFromDb,
  deleteProjectFromDb,
} from '@/app/lib/supabase';
import { getUi } from '@/app/lib/theme';
import { formatProjectDate } from '@/app/lib/format';
import { Language, SavedProject, ThemeMode } from '@/app/types/studio';

const USER_KEY = 'sucvar_user_email';
const USER_ROLE_KEY = 'sucvar_user_role';
const DEMO_KEY = 'sucvar_demo_mode';

// Iconița vectorială oficială Google pentru butonul OAuth
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.31c-.24-.72-.38-1.49-.38-2.31s.14-1.59.38-2.31V6.6H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.4l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09c.95-2.85 3.6-4.94 6.73-4.94z"
      />
    </svg>
  );
}

// Profiluri DEMO pentru prezentarea la comisie
const QUICK_PROFILES = [
  {
    id: 'architect',
    email: 'denys@sucvar.ro',
    roleRo: 'Arhitect Sistem (Fondator)',
    roleEn: 'Lead Systems Architect',
    badge: 'PRO',
    icon: ShieldCheck,
  },
  {
    id: 'committee',
    email: 'comisie@usv.ro',
    roleRo: 'Comisie Evaluare Licență',
    roleEn: 'Thesis Evaluation Board',
    badge: 'USV',
    icon: GraduationCap,
  },
  {
    id: 'client',
    email: 'client@sucvar.ro',
    roleRo: 'Client / Beneficiar Proiect',
    roleEn: 'Project Homeowner / Client',
    badge: 'STUDIO',
    icon: Briefcase,
  },
];

type AuthTab = 'signin' | 'signup' | 'forgot';

export default function LoginAndAccountPage() {
  const router = useRouter();

  // ---------- Setări pagină ----------
  const [lang, setLang] = useState<Language>('ro');
  const [theme, setTheme] = useState<ThemeMode>('light');

  // ---------- Stare formular ----------
  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // ---------- Stare cont conectat ----------
  const [loggedUser, setLoggedUser] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('Studio Member');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [activeProject, setActiveProject] = useState<SavedProject | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCloudSession, setIsCloudSession] = useState<boolean>(false);
  const [needsConfirm, setNeedsConfirm] = useState<boolean>(false);
  const [isRecovery, setIsRecovery] = useState<boolean>(false);

  // ---------- Funcții ajutătoare ----------
  const isDark = theme === 'dark';
  const ui = getUi(isDark);
  const t = (textRo: string, textEn: string) => (lang === 'ro' ? textRo : textEn);

  const isSupabaseConfigured = supabase !== null;
  const eyebrowClass = `text-[11px] uppercase tracking-[0.28em] ${ui.muted}`;
  const fieldClass = `w-full h-11 px-3 rounded-md border bg-transparent text-base outline-none transition-colors ${ui.input}`;

  const getTabClass = (tabName: AuthTab): string => {
    const baseClass =
      'px-3 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider cursor-pointer touch-manipulation';
    if (authTab === tabName) {
      return `${baseClass} ${ui.btn}`;
    }
    return `${baseClass} ${ui.muted}`;
  };

  const resetMessages = () => {
    setAuthError(null);
    setAuthStatus(null);
    setNeedsConfirm(false);
  };

  const switchTab = (tab: AuthTab) => {
    setAuthTab(tab);
    setPassword('');
    setConfirmPassword('');
    resetMessages();
  };

  const openAccount = async (
    accountEmail: string,
    role: string,
    isCloud: boolean,
    avatar: string | null = null,
  ) => {
    window.localStorage.setItem(USER_KEY, accountEmail);
    window.localStorage.setItem(USER_ROLE_KEY, role);
    if (isCloud) {
      window.localStorage.removeItem(DEMO_KEY);
    }
    setUserRole(role);
    setAvatarUrl(avatar);
    setIsCloudSession(isCloud);
    setLoggedUser(accountEmail);
    const loadedProjects = await fetchProjectsFromDb(accountEmail);
    setProjects(loadedProjects);
  };

  // ---------- Restaurarea sesiunii & Callback-ul Google OAuth ----------
  useEffect(() => {
    let isPageActive = true;

    const restoreSession = async () => {
      // 1. Verificăm sesiunea reală Supabase (Email sau Google OAuth)
      const session = await getSessionInfo();
      if (session) {
        const role =
          session.fullName || window.localStorage.getItem(USER_ROLE_KEY) || 'Studio Member';
        const list = await fetchProjectsFromDb(session.email);
        if (!isPageActive) return;
        window.localStorage.setItem(USER_KEY, session.email);
        window.localStorage.setItem(USER_ROLE_KEY, role);
        window.localStorage.removeItem(DEMO_KEY);
        setUserRole(role);
        setAvatarUrl(session.avatarUrl);
        setIsCloudSession(true);
        setLoggedUser(session.email);
        setProjects(list);
        return;
      }

      // 2. Fără sesiune Cloud: verificăm dacă a fost selectat un profil Demo
      const demoEmail = window.localStorage.getItem(USER_KEY);
      if (window.localStorage.getItem(DEMO_KEY) === '1' && demoEmail) {
        const list = await fetchProjectsFromDb(demoEmail);
        if (!isPageActive) return;
        setUserRole(window.localStorage.getItem(USER_ROLE_KEY) || 'Studio Member');
        setIsCloudSession(false);
        setLoggedUser(demoEmail);
        setProjects(list);
      }
    };

    restoreSession();

    // Ascultă atât PASSWORD_RECOVERY, cât și SIGNED_IN (când utilizatorul revine din Google OAuth)
    const unsubscribe = subscribeToAuthEvents((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        restoreSession();
      }
    });

    return () => {
      isPageActive = false;
      unsubscribe();
    };
  }, []);

  // ---------- Handlere de autentificare ----------

  // 1. Autentificare prin Google OAuth
  const handleGoogleLogin = async () => {
    if (isSubmitting) return;
    resetMessages();
    setIsSubmitting(true);
    const result = await signInWithGoogle();
    if (result.status === 'error') {
      setAuthError(
        result.message ??
          t('Autentificarea cu Google nu a putut fi pornită.', 'Could not start Google sign-in.'),
      );
      setIsSubmitting(false);
    }
    // Dacă nu e eroare, browserul este redirecționat automat spre Google
  };

  // 2. Profil DEMO cu 1 click
  const handleQuickAccess = async (profileEmail: string, roleLabel: string) => {
    setIsSubmitting(true);
    resetMessages();
    try {
      await signOutUser();
      window.localStorage.setItem(DEMO_KEY, '1');
      await openAccount(profileEmail, roleLabel, false, null);
      setAuthStatus(
        t(
          'Profil demonstrativ activat. Proiectele salvate aici pot fi deschise și inspectate cu un click.',
          'Demo profile active. Saved projects can be clicked and inspected.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Autentificare / Înregistrare cu Email și Parolă
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    resetMessages();

    if (authTab === 'signup') {
      if (password.length < 6) {
        setAuthError(
          t('Parola trebuie să aibă minim 6 caractere.', 'Password must be at least 6 characters.'),
        );
        return;
      }
      if (password !== confirmPassword) {
        setAuthError(t('Parolele nu coincid.', 'Passwords do not match.'));
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (authTab === 'forgot') {
        const result = await sendPasswordReset(cleanEmail);
        if (result.status === 'error') {
          setAuthError(result.message ?? t('Eroare la trimitere.', 'Could not send the email.'));
        } else {
          setAuthStatus(
            t(
              'Dacă adresa are cont, vei primi în câteva momente un email cu linkul de resetare.',
              'If the address has an account, a reset link is on its way.',
            ),
          );
        }
        return;
      }

      if (authTab === 'signup') {
        const result = await signUpWithEmail(cleanEmail, password, fullName);
        if (result.status === 'error') {
          setAuthError(
            result.message ?? t('Eroare la crearea contului.', 'Could not create the account.'),
          );
          return;
        }
        if (result.status === 'confirm-email') {
          setAuthTab('signin');
          setPassword('');
          setConfirmPassword('');
          setNeedsConfirm(true);
          setAuthStatus(
            t(
              `Cont creat. Am trimis un email de confirmare la ${cleanEmail}. Confirmă adresa, apoi autentifică-te.`,
              `Account created. We sent a confirmation email to ${cleanEmail}. Confirm it, then sign in.`,
            ),
          );
          return;
        }
        await openAccount(
          result.email ?? cleanEmail,
          result.fullName || fullName.trim() || t('Arhitect / Beneficiar', 'Studio Member'),
          true,
        );
        setAuthStatus(t('Cont creat și autentificat.', 'Account created and signed in.'));
        return;
      }

      const result = await signInWithEmail(cleanEmail, password);
      if (result.status !== 'ok') {
        setAuthError(result.message ?? t('Eroare la autentificare.', 'Authentication error.'));
        setNeedsConfirm(result.needsConfirmation === true);
        return;
      }
      await openAccount(
        result.email ?? cleanEmail,
        result.fullName || t('Arhitect / Beneficiar', 'Studio Member'),
        true,
      );
      setAuthStatus(t('Autentificat cu succes.', 'Signed in successfully.'));
      setPassword('');
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : t('Eroare la autentificare.', 'Authentication error.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || isSubmitting) {
      setAuthError(t('Introdu adresa de email.', 'Enter your email address.'));
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    const result = await resendConfirmationEmail(cleanEmail);
    if (result.status === 'error') {
      setAuthError(result.message ?? t('Eroare la trimitere.', 'Could not send the email.'));
    } else {
      setAuthStatus(t('Email de confirmare retrimis.', 'Confirmation email sent again.'));
    }
    setIsSubmitting(false);
  };

  const handleSetNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    resetMessages();
    if (password.length < 6) {
      setAuthError(
        t('Parola trebuie să aibă minim 6 caractere.', 'Password must be at least 6 characters.'),
      );
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(t('Parolele nu coincid.', 'Passwords do not match.'));
      return;
    }
    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);
    if (result.status === 'error') {
      setAuthError(
        result.message ?? t('Parola nu a putut fi schimbată.', 'Could not change the password.'),
      );
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setIsRecovery(false);
    const session = await getSessionInfo();
    if (session) {
      await openAccount(session.email, session.fullName || 'Studio Member', true, session.avatarUrl);
    }
    setAuthStatus(t('Parola a fost schimbată.', 'Password updated.'));
  };

  const handleLogout = async () => {
    await signOutUser();
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(USER_ROLE_KEY);
    window.localStorage.removeItem(DEMO_KEY);
    setIsCloudSession(false);
    setAvatarUrl(null);
    setLoggedUser(null);
    setProjects([]);
    setActiveProject(null);
    setPassword('');
    setConfirmPassword('');
    resetMessages();
  };

  const handleDeleteProject = async (projectId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    await deleteProjectFromDb(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  };

  // Deschide proiectul selectat direct în Studio (/generate) cu toate cotele și imaginile lui
  const handleOpenInStudio = (project: SavedProject) => {
    try {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
    } catch {
      // ignore quota errors
    }
    router.push('/generate');
  };

  const handleCopyKeywords = async (id: string, keywords: string) => {
    try {
      await navigator.clipboard.writeText(keywords);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 1800);
    } catch {
      // ignore
    }
  };

  // ---------- Calcul statistici portofoliu ----------
  let totalAreaDesigned = 0;
  let totalWallsCalculated = 0;
  for (const project of projects) {
    const w = Number(project.dimensions?.width) || 4;
    const l = Number(project.dimensions?.length) || 5;
    totalAreaDesigned += w * l;
    const eng = calculateEngineering(project.dimensions, project.mode, project.spaceType);
    totalWallsCalculated += eng.netWallArea;
  }

  let submitLabel = t('Intră în cont', 'Sign in to account');
  if (authTab === 'signup') submitLabel = t('Creează contul', 'Create account');
  if (authTab === 'forgot') submitLabel = t('Trimite linkul de resetare', 'Send reset link');

  const messages = (
    <>
      {authError && (
        <p role="alert" className="text-xs text-red-500 font-medium leading-relaxed">
          {authError}
        </p>
      )}
      {authStatus && (
        <p className={`text-xs font-medium leading-relaxed ${ui.accent}`}>{authStatus}</p>
      )}
    </>
  );

  // Calcule pentru proiectul deschis în modalul de inspecție
  const activeEng = activeProject
    ? calculateEngineering(activeProject.dimensions, activeProject.mode, activeProject.spaceType)
    : null;
  const activeSpecs =
    activeProject && activeEng
      ? generateSpecItems(
          activeProject.mode,
          activeProject.spaceType,
          activeProject.dimensions,
          activeEng,
        )
      : [];

  return (
    <div className={`min-h-screen font-sans pb-24 transition-colors ${ui.page}`}>
      <Navbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12">
        {isRecovery ? (
          /* ================= PAROLĂ NOUĂ ================= */
          <div className={`max-w-md mx-auto p-8 rounded-md border space-y-6 ${ui.card}`}>
            <div className="space-y-2">
              <p className={eyebrowClass}>{t('Resetare parolă', 'Password reset')}</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t('Alege o parolă nouă', 'Choose a new password')}
              </h1>
            </div>
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-xs font-medium mb-1">
                  {t('Parolă nouă (minim 6 caractere)', 'New password (min 6 characters)')}
                </label>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="newPasswordConfirm" className="block text-xs font-medium mb-1">
                  {t('Confirmă parola', 'Confirm password')}
                </label>
                <input
                  id="newPasswordConfirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldClass}
                />
              </div>
              {messages}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-12 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer touch-manipulation ${ui.btn}`}
              >
                {isSubmitting
                  ? t('Se procesează...', 'Processing...')
                  : t('Salvează parola', 'Save password')}
              </button>
            </form>
          </div>
        ) : !loggedUser ? (
          /* ================= ECRAN DE AUTENTIFICARE ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLOANA STÂNGĂ: Google OAuth + Email/Parolă */}
            <div className={`lg:col-span-7 p-8 rounded-md border space-y-6 ${ui.card}`}>
              <div className="flex items-center justify-between border-b pb-4 border-stone-300/40">
                <SucvarLogo size={28} withWordmark isDark={isDark} />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className={getTabClass('signin')}
                  >
                    {t('Autentificare', 'Sign In')}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    className={getTabClass('signup')}
                  >
                    {t('Cont Nou', 'Register')}
                  </button>
                </div>
              </div>

              {/* Butonul Oficial Google OAuth */}
              {authTab !== 'forgot' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting || !isSupabaseConfigured}
                    className={`w-full h-12 px-4 rounded-md border flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                  >
                    <GoogleIcon />
                    <span>
                      {authTab === 'signup'
                        ? t('Înregistrează-te cu Google', 'Sign up with Google')
                        : t('Continuă cu Google', 'Continue with Google')}
                    </span>
                  </button>

                  <div className="relative flex items-center py-1">
                    <div className={`flex-grow border-t ${ui.line}`} />
                    <span className={`shrink-0 px-3 text-[10px] uppercase tracking-widest ${ui.muted}`}>
                      {t('sau cu email', 'or with email')}
                    </span>
                    <div className={`flex-grow border-t ${ui.line}`} />
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {authTab === 'signup' && (
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-medium mb-1">
                      {t('Nume complet / Birou', 'Full name / Studio')}
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder={t('Ex: Suchevan Denys', 'e.g. Suchevan Denys')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs font-medium mb-1">
                    {t('Adresă de email', 'Email address')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="denys@student.usv.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                </div>

                {authTab !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-xs font-medium">
                        {authTab === 'signup'
                          ? t('Parolă (minim 6 caractere)', 'Password (min 6 characters)')
                          : t('Parolă', 'Password')}
                      </label>
                      {authTab === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchTab('forgot')}
                          className={`text-[11px] underline underline-offset-4 cursor-pointer touch-manipulation ${ui.muted}`}
                        >
                          {t('Ai uitat parola?', 'Forgot password?')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={authTab === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${fieldClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        aria-label="Toggle password visibility"
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer touch-manipulation"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {authTab === 'signup' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-medium mb-1">
                      {t('Confirmă parola', 'Confirm password')}
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                )}

                {messages}

                {needsConfirm && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isSubmitting}
                    className={`inline-flex items-center gap-2 h-10 px-4 rounded-md border text-xs font-semibold uppercase tracking-widest disabled:opacity-50 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                  >
                    <MailCheck className="w-4 h-4" />
                    {t('Retrimite emailul de confirmare', 'Resend confirmation email')}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isSupabaseConfigured}
                  className={`w-full h-12 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer touch-manipulation ${ui.btn}`}
                >
                  {isSubmitting ? t('Se procesează...', 'Processing...') : submitLabel}
                </button>

                {authTab === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className={`w-full text-xs underline underline-offset-4 cursor-pointer touch-manipulation ${ui.muted}`}
                  >
                    {t('Înapoi la autentificare', 'Back to sign in')}
                  </button>
                )}
              </form>
            </div>

            {/* COLOANA DREAPTĂ: Profiluri rapide pentru prezentare */}
            <div className={`lg:col-span-5 p-8 rounded-md border space-y-6 ${ui.card}`}>
              <div className="space-y-2">
                <p className={eyebrowClass}>{t('Mod prezentare (1-Click)', 'Presentation mode (1-Click)')}</p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {t('Profiluri pentru comisie', 'Evaluation profiles')}
                </h2>
                <p className={`text-xs leading-relaxed ${ui.muted}`}>
                  {t(
                    'Acces instantaneu, fără parolă, pentru testarea rapidă a proiectelor și a devizelor tehnice.',
                    'Instant passwordless access for testing saved projects and technical specifications.',
                  )}
                </p>
              </div>

              <div className="space-y-3">
                {QUICK_PROFILES.map((profile) => {
                  const ProfileIcon = profile.icon;
                  const roleLabel = lang === 'ro' ? profile.roleRo : profile.roleEn;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleQuickAccess(profile.email, roleLabel)}
                      className={`w-full p-4 rounded-md border text-left flex items-center justify-between gap-4 transition-all cursor-pointer touch-manipulation ${ui.btnGhost}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${ui.soft}`}
                        >
                          <ProfileIcon className={`w-5 h-5 ${ui.accent}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{roleLabel}</p>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#3B4D43] text-white">
                              {profile.badge}
                            </span>
                          </div>
                          <p className={`text-xs font-mono truncate mt-0.5 ${ui.muted}`}>
                            {profile.email}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 shrink-0 opacity-60" />
                    </button>
                  );
                })}
              </div>

              <div
                className={`pt-4 border-t text-[11px] flex items-center justify-between ${ui.line} ${ui.muted}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  {isSupabaseConfigured
                    ? t('Bază de date: Supabase Cloud', 'Database: Supabase Cloud')
                    : t('Bază de date: Memorie Locală', 'Database: LocalStorage')}
                </span>
                <span className="font-mono">{isSupabaseConfigured ? 'PostgreSQL + OAuth' : 'Local'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* ================= DASHBOARD & ARHIVĂ INTERACTIVĂ ================= */
          <div className="space-y-8">
            {/* Header Utilizator */}
            <div
              className={`p-6 rounded-md border flex flex-wrap items-center justify-between gap-4 ${ui.card}`}
            >
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={loggedUser}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-md object-cover border border-stone-300/40"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-md flex items-center justify-center text-base font-bold uppercase ${ui.btn}`}
                  >
                    {loggedUser[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-sm bg-[#3B4D43] text-white">
                      {userRole}
                    </span>
                    <span className={`text-xs flex items-center gap-1 ${ui.accent}`}>
                      <UserCheck className="w-3.5 h-3.5" />
                      {isCloudSession
                        ? t('Sincronizat Supabase Cloud', 'Supabase Cloud Synced')
                        : t('Sesiune locală', 'Local session')}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold break-all mt-1">{loggedUser}</h2>
                  {authStatus && <p className={`text-xs mt-0.5 ${ui.muted}`}>{authStatus}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/generate"
                  className={`inline-flex items-center gap-2 h-10 px-5 rounded-md text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btn}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('Proiect nou', 'New project')}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('Ieșire', 'Sign out')}</span>
                </button>
              </div>
            </div>

            {/* Statistici Portofoliu */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`p-5 rounded-md border ${ui.card}`}>
                <p className={eyebrowClass}>{t('Proiecte în arhivă', 'Archived projects')}</p>
                <p className="text-2xl font-semibold font-mono mt-2">{projects.length}</p>
              </div>
              <div className={`p-5 rounded-md border ${ui.card}`}>
                <p className={eyebrowClass}>
                  {t('Suprafață pardoseală proiectată', 'Total floor area designed')}
                </p>
                <p className="text-2xl font-semibold font-mono mt-2">
                  {totalAreaDesigned.toFixed(1)} m²
                </p>
              </div>
              <div className={`p-5 rounded-md border ${ui.card}`}>
                <p className={eyebrowClass}>
                  {t('Arie netă pereți calculată', 'Total net wall area')}
                </p>
                <p className={`text-2xl font-semibold font-mono mt-2 ${ui.accent}`}>
                  {totalWallsCalculated.toFixed(1)} m²
                </p>
              </div>
            </div>

            {/* Arhiva de Proiecte & Devize */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">
                  {t('Arhivă proiecte & devize tehnice', 'Project & technical spec archive')}
                </h3>
                {projects.length > 0 && (
                  <span className={`text-xs ${ui.muted}`}>
                    {t('Apasă pe un proiect pentru a vedea devizul complet', 'Click a project to inspect specs')}
                  </span>
                )}
              </div>

              {projects.length === 0 ? (
                <div className={`p-12 rounded-md border text-center space-y-4 ${ui.card}`}>
                  <p className={`text-sm ${ui.muted}`}>
                    {t(
                      'Nu ai niciun proiect salvat în acest cont. Deschide Studio, generează o amenajare și apasă „Salvează în cont”.',
                      'No saved projects yet. Open Studio, generate a design and click "Save to account".',
                    )}
                  </p>
                  <Link
                    href="/generate"
                    className={`inline-flex items-center gap-2 h-10 px-6 rounded-md text-xs font-semibold uppercase tracking-widest touch-manipulation ${ui.btn}`}
                  >
                    <span>{t('Deschide Studio', 'Open Studio')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => {
                    const width = Number(project.dimensions?.width) || 4;
                    const length = Number(project.dimensions?.length) || 5;
                    const height = Number(project.dimensions?.height) || 2.6;
                    const projectArea = width * length;
                    const previewImage = project.generatedImage || project.originalImage;
                    const styleObj = VISUAL_STYLES.find((s) => s.id === project.styleId);
                    const styleLabel = styleObj
                      ? lang === 'ro'
                        ? styleObj.nameRo
                        : styleObj.nameEn
                      : project.styleId;

                    return (
                      <div
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveProject(project)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setActiveProject(project);
                          }
                        }}
                        className={`group rounded-md border overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer touch-manipulation ${ui.card}`}
                      >
                        {/* Imaginea generată (cu fallback la originalImage sau placeholder arhitectural) */}
                        <div className={`relative w-full h-56 overflow-hidden ${ui.soft}`}>
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt={project.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-4 text-center">
                              <Layers className={`w-6 h-6 opacity-50 ${ui.accent}`} />
                              <span className={`text-xs font-mono ${ui.muted}`}>
                                {width} × {length} × {height} m ({projectArea.toFixed(1)} m²)
                              </span>
                            </div>
                          )}

                          <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-sm">
                            {styleLabel}
                          </span>
                          <span className="absolute bottom-3 right-3 bg-[#3B4D43] text-white text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-sm">
                            {t('Vezi devizul →', 'View specs →')}
                          </span>
                        </div>

                        {/* Detalii Card */}
                        <div className="p-5 flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-base truncate">{project.title}</h4>
                            <p className={`text-xs font-mono mt-1 ${ui.muted}`}>
                              {width} × {length} × {height} m · {projectArea.toFixed(1)} m² ·{' '}
                              {formatProjectDate(project.createdAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInStudio(project);
                              }}
                              title={t('Deschide în Studio', 'Open in Studio')}
                              className={`h-9 px-3 rounded-sm border text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Studio</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteProject(project.id, e)}
                              aria-label="Delete project"
                              className={`h-9 w-9 rounded-sm border flex items-center justify-center cursor-pointer touch-manipulation ${ui.btnGhost}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL DETALII PROIECT & DEVIZ TEHNIC ================= */}
      {activeProject && activeEng && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setActiveProject(null)}
        >
          <div
            className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-md border p-6 sm:p-8 space-y-6 ${ui.card}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className={`flex items-start justify-between gap-4 border-b pb-4 ${ui.line}`}>
              <div>
                <p className={eyebrowClass}>
                  {SPACE_MODES[activeProject.mode]?.labelRo ?? activeProject.mode} ·{' '}
                  {formatProjectDate(activeProject.createdAt)}
                </p>
                <h3 className="text-xl font-semibold mt-1">{activeProject.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveProject(null)}
                aria-label="Close modal"
                className={`p-2 rounded-md border cursor-pointer touch-manipulation ${ui.btnGhost}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Vizualizare Before / After sau Imaginea Generată */}
            {activeProject.originalImage && activeProject.generatedImage ? (
              <BeforeAfterSlider
                beforeImg={activeProject.originalImage}
                afterImg={activeProject.generatedImage}
                beforeLabel={t('Înainte', 'Before')}
                afterLabel={t('Proiect SUCVAR', 'SUCVAR design')}
              />
            ) : activeProject.generatedImage || activeProject.originalImage ? (
              <img
                src={(activeProject.generatedImage || activeProject.originalImage) ?? ''}
                alt={activeProject.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[420px] object-cover rounded-md border border-stone-300/40"
              />
            ) : null}

            {/* Specificații Inginerești */}
            <div className="space-y-2">
              <p className={eyebrowClass}>
                {t('Specificații inginerești calculate', 'Calculated engineering specifications')}
              </p>
              <div
                className={`grid grid-cols-2 sm:grid-cols-4 gap-px border rounded-md overflow-hidden ${ui.line} ${ui.soft}`}
              >
                <div className={`p-3.5 ${ui.card}`}>
                  <p className={`text-[11px] ${ui.muted}`}>{t('Suprafață', 'Floor area')}</p>
                  <p className="text-base font-semibold font-mono mt-0.5">{activeEng.floorArea} m²</p>
                </div>
                <div className={`p-3.5 ${ui.card}`}>
                  <p className={`text-[11px] ${ui.muted}`}>{t('Arie netă pereți', 'Net wall area')}</p>
                  <p className="text-base font-semibold font-mono mt-0.5">{activeEng.netWallArea} m²</p>
                </div>
                <div className={`p-3.5 ${ui.card}`}>
                  <p className={`text-[11px] ${ui.muted}`}>{t('Pardoseală +10%', 'Flooring +10%')}</p>
                  <p className="text-base font-semibold font-mono mt-0.5">
                    {activeEng.flooringWithWaste} m²
                  </p>
                </div>
                <div className={`p-3.5 ${ui.card}`}>
                  <p className={`text-[11px] ${ui.muted}`}>{t('Vopsea (2 straturi)', 'Paint (2 coats)')}</p>
                  <p className="text-base font-semibold font-mono mt-0.5">{activeEng.paintLiters} L</p>
                </div>
              </div>
            </div>

            {/* Devizul Tehnic de Producător */}
            <div className="space-y-2">
              <p className={eyebrowClass}>
                {t('Specificații tehnice de producător', 'Manufacturer technical specifications')}
              </p>
              <div className={`border rounded-md divide-y ${ui.line}`}>
                {activeSpecs.map((item) => {
                  const keywords = lang === 'ro' ? item.searchKeywordsRo : item.searchKeywordsEn;
                  return (
                    <div key={item.id} className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] uppercase tracking-widest ${ui.accent}`}>
                          {lang === 'ro' ? item.categoryRo : item.categoryEn}
                        </span>
                        <span className="text-xs font-mono font-semibold">{item.quantity}</span>
                      </div>
                      <p className="text-sm font-semibold">
                        {lang === 'ro' ? item.nameRo : item.nameEn}
                      </p>
                      <p className={`text-xs leading-relaxed ${ui.muted}`}>
                        {lang === 'ro' ? item.technicalSpecRo : item.technicalSpecEn}
                      </p>
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <code className={`text-[11px] font-mono ${ui.accent}`}>{keywords}</code>
                        <button
                          type="button"
                          onClick={() => handleCopyKeywords(item.id, keywords)}
                          className={`h-7 px-2.5 rounded border text-[11px] inline-flex items-center gap-1 cursor-pointer touch-manipulation ${ui.btnGhost}`}
                        >
                          {copiedKeyId === item.id ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{t('Copiat', 'Copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t('Copiază', 'Copy')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Acțiuni Modal */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenInStudio(activeProject)}
                className={`inline-flex items-center gap-2 h-11 px-6 rounded-md text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btn}`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t('Redeschide în Studio & Export PDF', 'Reopen in Studio & Export PDF')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveProject(null)}
                className={`h-11 px-5 rounded-md border text-xs font-semibold uppercase tracking-widest cursor-pointer touch-manipulation ${ui.btnGhost}`}
              >
                {t('Închide', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
