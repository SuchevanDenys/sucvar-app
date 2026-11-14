// app/login/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Database,
  MailCheck,
} from 'lucide-react';
import Navbar from '@/app/components/layout/Navbar';
import SucvarLogo from '@/app/components/layout/SucvarLogo';
import { notifyAccountChange } from '@/app/components/layout/AccountWidget';
import {
  calculateEngineering,
  generateSpecItems,
} from '@/app/data/catalog';
import { supabase } from '@/app/lib/supabase/client';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/app/lib/storage';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resendConfirmationEmail, sendPasswordReset, updatePassword, subscribeToAuthEvents, getSessionInfo, signOutUser } from '@/app/lib/supabase/auth';
import { fetchProjectsFromDb, deleteProjectFromDb } from '@/app/lib/supabase/projects';
import { getUi } from '@/app/lib/theme/tokens';
import { usePrefs } from '@/app/lib/theme/usePrefs';
import GoogleIcon from '@/app/components/login/GoogleIcon';
import AccountDashboard from '@/app/components/login/AccountDashboard';
import ProjectModal from '@/app/components/login/ProjectModal';
import { QUICK_PROFILES } from '@/app/components/login/quickProfiles';
import { notifyPlanChange } from '@/app/lib/plan/client';
import { usePlan } from '@/app/lib/plan/usePlan';
import type { PlanTier, SavedProject } from '@/app/types';

type AuthTab = 'signin' | 'signup' | 'forgot';

export default function LoginAndAccountPage() {
  const router = useRouter();
  const plan = usePlan();

  // ---------- Setări pagină ----------
  const { lang, isDark } = usePrefs();

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
  // Arhiva: proiectul în curs de ștergere (blochează dublu-click) + mesaj de eroare/stare
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);

  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCloudSession, setIsCloudSession] = useState<boolean>(false);
  const [needsConfirm, setNeedsConfirm] = useState<boolean>(false);
  const [isRecovery, setIsRecovery] = useState<boolean>(false);

  // ---------- Funcții ajutătoare ----------
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
    writeStorage(STORAGE_KEYS.userEmail, accountEmail);
    writeStorage(STORAGE_KEYS.userRole, role);
    if (isCloud) {
      removeStorage(STORAGE_KEYS.demoMode);
      removeStorage(STORAGE_KEYS.demoTier);
    }
    notifyAccountChange(); // actualizează widgetul din Navbar
    notifyPlanChange(); // actualizează badge-ul de plan (STUDIO / PRO)
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
          session.fullName || readStorage(STORAGE_KEYS.userRole) || 'Studio Member';
        const list = await fetchProjectsFromDb(session.email);
        if (!isPageActive) return;
        writeStorage(STORAGE_KEYS.userEmail, session.email);
        writeStorage(STORAGE_KEYS.userRole, role);
        removeStorage(STORAGE_KEYS.demoMode);
        removeStorage(STORAGE_KEYS.demoTier);
        setUserRole(role);
        setAvatarUrl(session.avatarUrl);
        setIsCloudSession(true);
        setLoggedUser(session.email);
        setProjects(list);
        return;
      }

      // 2. Fără sesiune Cloud: verificăm dacă a fost selectat un profil Demo
      const demoEmail = readStorage(STORAGE_KEYS.userEmail);
      if (readStorage(STORAGE_KEYS.demoMode) === '1' && demoEmail) {
        const list = await fetchProjectsFromDb(demoEmail);
        if (!isPageActive) return;
        setUserRole(readStorage(STORAGE_KEYS.userRole) || 'Studio Member');
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
  const handleQuickAccess = async (
    profileEmail: string,
    roleLabel: string,
    tier: PlanTier,
  ) => {
    setIsSubmitting(true);
    resetMessages();
    try {
      await signOutUser();
      writeStorage(STORAGE_KEYS.demoMode, '1');
      writeStorage(STORAGE_KEYS.demoTier, tier); // planul profilului demo
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
    removeStorage(STORAGE_KEYS.userEmail);
    removeStorage(STORAGE_KEYS.userRole);
    removeStorage(STORAGE_KEYS.demoMode);
    removeStorage(STORAGE_KEYS.demoTier);
    notifyAccountChange(); // actualizează widgetul din Navbar
    notifyPlanChange();
    setIsCloudSession(false);
    setAvatarUrl(null);
    setLoggedUser(null);
    setProjects([]);
    setActiveProject(null);
    setPassword('');
    setConfirmPassword('');
    resetMessages();
  };

  // Ștergerea unui proiect din arhivă: cere confirmare (acțiunea nu se poate anula),
  // iar proiectul dispare din listă doar dacă ștergerea a reușit și în Cloud.
  const handleDeleteProject = async (projectId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (deletingId) return;
    const project = projects.find((p) => p.id === projectId);
    const confirmed = window.confirm(
      t(
        `Ștergi proiectul „${project?.title ?? ''}"? Acțiunea nu poate fi anulată.`,
        `Delete the project "${project?.title ?? ''}"? This cannot be undone.`,
      ),
    );
    if (!confirmed) return;

    setDeletingId(projectId);
    setArchiveMessage(null);
    const result = await deleteProjectFromDb(projectId);
    setDeletingId(null);
    if (!result.ok) {
      setArchiveMessage(
        t(
          `Proiectul nu a putut fi șters${result.errorMessage ? `: ${result.errorMessage}` : ''}.`,
          `The project could not be deleted${result.errorMessage ? `: ${result.errorMessage}` : ''}.`,
        ),
      );
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  };

  // Deschide proiectul selectat în Studio (/generate). Transmitem doar id-ul: Studio
  // îl încarcă din arhivă, fără să punem imagini Base64 de MB în localStorage.
  const handleOpenInStudio = (project: SavedProject) => {
    if (!writeStorage(STORAGE_KEYS.activeProject, project.id)) {
      setArchiveMessage(t('Nu s-a putut deschide proiectul în Studio.', 'Could not open the project in Studio.'));
      return;
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
      <Navbar />

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
                      onClick={() => handleQuickAccess(profile.email, roleLabel, profile.tier)}
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
          <AccountDashboard
            lang={lang}
            isDark={isDark}
            loggedUser={loggedUser}
            avatarUrl={avatarUrl}
            userRole={userRole}
            isCloudSession={isCloudSession}
            authStatus={authStatus}
            plan={plan}
            projects={projects}
            onLogout={handleLogout}
            deletingId={deletingId}
            archiveMessage={archiveMessage}
            onDeleteProject={handleDeleteProject}
            onOpenInStudio={handleOpenInStudio}
            onSelectProject={setActiveProject}
          />
        )}
      </div>

      {activeProject && activeEng && (
        <ProjectModal
          project={activeProject}
          eng={activeEng}
          specs={activeSpecs}
          lang={lang}
          isDark={isDark}
          copiedKeyId={copiedKeyId}
          onClose={() => setActiveProject(null)}
          onCopyKeywords={handleCopyKeywords}
          onOpenInStudio={handleOpenInStudio}
        />
      )}
    </div>
  );
}
