
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Page, UserProfile } from './types';
import { useSeo } from './lib/useSeo';
import { loadTranslationsFromSupabase } from './lib/useI18n';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import UnderConstruction from './components/UnderConstruction';
import AboutPage from './components/AboutPage';
import FAQPage from './components/FAQPage';
import AuthPage from './components/AuthPage';
import DashboardPage from './components/DashboardPage';
import { supabase } from './lib/supabase';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AssessmentForm from './components/AssessmentForm';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import ContactPage from './components/ContactPage';
import TranslationManager from './components/TranslationManager';
import Footer from './components/Footer';

// ── URL ↔ Page mappings ───────────────────────────────────────────────────────
const PAGE_TO_PATH: Partial<Record<Page, string>> = {
  [Page.HOME]:                 '/',
  [Page.ABOUT]:                '/about',
  [Page.FAQ]:                  '/faq',
  [Page.SIGN_IN]:              '/login',
  [Page.SIGN_UP]:              '/signup',
  [Page.FORGOT_PASSWORD]:      '/forgot-password',
  [Page.DASHBOARD]:            '/dashboard',
  [Page.ASSESSMENT]:           '/assessment',
  [Page.EARLY_ACCESS]:         '/early-access',
  [Page.PRIVACY]:              '/privacy',
  [Page.TERMS]:                '/terms',
  [Page.CONTACT]:              '/contact',
  [Page.TRANSLATION_MANAGER]:  '/translations',
};

const PATH_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page as Page])
);

const pathToPage = (pathname: string): Page => {
  // Invite links: /access/OUTL01?token=abc → treat as sign-up
  if (pathname.startsWith('/access/')) return Page.SIGN_UP;
  // Dashboard sub-routes: /dashboard/company, /dashboard/team, etc. → all map to DASHBOARD
  if (pathname.startsWith('/dashboard')) return Page.DASHBOARD;
  return PATH_TO_PAGE[pathname] ?? Page.HOME;
};

// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();

  const [currentPage, setCurrentPageState] = useState<Page>(() =>
    pathToPage(location.pathname)
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Ref to track currentUser inside the onAuthStateChange closure
  // (which has [] deps and would otherwise capture a stale null value)
  const currentUserRef = useRef<UserProfile | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Per-page SEO meta tags
  useSeo(currentPage);

  // Load translation overrides from Supabase on first render
  useEffect(() => {
    loadTranslationsFromSupabase();
  }, []);

  // Sync state when browser back/forward is used
  useEffect(() => {
    const page = pathToPage(location.pathname);
    setCurrentPageState(page);
  }, [location.pathname]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // ── Handle session restore & email confirmation redirect ──
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Clear user on sign-out
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          // Ensure we leave the dashboard URL so the navbar shows
          if (window.location.pathname.startsWith('/dashboard')) {
            navigate('/');
            setCurrentPageState(Page.HOME);
          }
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};
          const fullName = meta.full_name || authUser.email?.split('@')[0] || 'Admin User';

          // ── Super Admin check: via personnel table or auth metadata ──
          const metaRole = (meta.role || '').toLowerCase();
          let isSuperAdmin = metaRole === 'super_admin';

          // If not already super_admin in metadata, check personnel table
          if (!isSuperAdmin && (metaRole === 'admin' || metaRole === 'supervisor' || metaRole === '')) {
            const { data: personnelRow } = await supabase
              .from('personnel')
              .select('role')
              .ilike('email', authUser.email?.toLowerCase() || '')
              .maybeSingle();
            isSuperAdmin = personnelRow?.role?.toLowerCase().includes('super_admin') ?? false;
          }

          const role = isSuperAdmin ? 'super_admin' : (meta.role || 'admin');
          const rl = role.toLowerCase();
          const position = rl === 'super_admin' ? 'Super Admin' : rl === 'admin' ? (meta.position || 'Admin') : rl === 'basic' ? (meta.position || 'Chef Prep') : rl === 'supervisor' ? (meta.position || 'Exec Chef') : (meta.position || 'GM');

          const hasAuthHash = window.location.hash.includes('access_token');
          const isSignupConfirmation = window.location.hash.includes('type=signup');

          // ── Unconfirmed user guard ──────────────────────────────────────────
          // Supabase JS v2 fires SIGNED_IN during signUp() even when email
          // confirmation is required and no real session exists yet.
          // Never treat an unconfirmed user as logged in.
          if (!authUser.email_confirmed_at) {
            await supabase.auth.signOut();
            return;
          }

          // ── Email signup confirmation link ──────────────────────────────────
          // Supabase auto-signs the user in after they click the confirm link.
          // We don't want that — sign them out and redirect to login with a
          // success banner so they explicitly sign in themselves.
          if (event === 'SIGNED_IN' && hasAuthHash && isSignupConfirmation) {
            await supabase.auth.signOut();
            navigate('/login?confirmed=true');
            setCurrentPageState(Page.SIGN_IN);
            window.history.replaceState(null, '', '/login?confirmed=true');
            return;
          }

          const profile: UserProfile = {
            id: authUser.id,
            fullName,
            email: authUser.email || '',
            role: role as any,
            position: position as any,
            outletCode: meta.outlet_code || 'ROY02',
            legal_consent: true,
          };

          // Always restore the user profile into state (so protected pages
          // like /translations and /dashboard work on reload)
          setCurrentUser(profile);

          // Only auto-redirect for other auth hash types (e.g. password reset).
          // Normal session restore (SIGNED_IN without hash, or TOKEN_REFRESHED)
          // should NEVER redirect — respect whatever URL the user is on.
          if (event === 'SIGNED_IN' && hasAuthHash) {
            const rl = role.toLowerCase();
            const targetPath =
              rl === 'super_admin' ? (PAGE_TO_PATH[Page.DASHBOARD] ?? '/dashboard') :
              rl === 'admin' ? (PAGE_TO_PATH[Page.DASHBOARD] ?? '/dashboard') :
              rl === 'supervisor' ? (PAGE_TO_PATH[Page.DASHBOARD] ?? '/dashboard') :
              '/dashboard/daily-input';
            navigate(targetPath);
            setCurrentPageState(Page.DASHBOARD);
            // Clean the hash so it doesn't trigger again on refresh
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Navigation handler: updates both URL and state
  const handleNavigate = useCallback((page: Page) => {
    const path = PAGE_TO_PATH[page] ?? '/';
    navigate(path);
    setCurrentPageState(page);
  }, [navigate]);

  const handleLogin = useCallback((user: UserProfile) => {
    // The onAuthStateChange listener handles super_admin elevation via a DB
    // query. Here we just set the user from auth metadata and navigate — the
    // listener fires immediately after sign-in and will update the role if needed.
    setCurrentUser(user);
    const role = user.role.toLowerCase();
    if (role === 'basic' || role === 'view') {
      navigate('/dashboard/daily-input');
      setCurrentPageState(Page.DASHBOARD);
    } else {
      handleNavigate(Page.DASHBOARD);
    }
  }, [handleNavigate, navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase signout failed", e);
    } finally {
      window.location.href = '/';
    }
  }, []);

  // ── Inactivity auto-logout with renewal modal ──
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>();
  const showTimeoutModalRef = useRef(false);
  useEffect(() => { showTimeoutModalRef.current = showTimeoutModal; }, [showTimeoutModal]);

  useEffect(() => {
    if (!currentUser) return;
    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 min idle → show warning
    const GRACE_PERIOD = 60; // 60s countdown to auto-logout

    const startCountdown = () => {
      if (showTimeoutModalRef.current) return; // already counting
      setShowTimeoutModal(true);
      setCountdown(GRACE_PERIOD);
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const resetIdleTimer = () => {
      if (showTimeoutModalRef.current) return; // don't reset while modal is open
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      clearTimeout(idleTimerRef.current);
      clearInterval(countdownTimerRef.current);
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
    };
  }, [currentUser, handleLogout]); // ← showTimeoutModal removed from deps

  const renewSession = useCallback(() => {
    clearInterval(countdownTimerRef.current);
    setShowTimeoutModal(false);
    setCountdown(60);
    // Reset idle timer by dispatching a user activity event
    window.dispatchEvent(new MouseEvent('mousedown'));
  }, []);

  const handleUpdateUser = useCallback((updatedFields: Partial<UserProfile>) => {
    setCurrentUser(prev => prev ? { ...prev, ...updatedFields } : null);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case Page.HOME:
        return <LandingPage onNavigate={handleNavigate} isLoggedIn={!!currentUser} />;
      case Page.EARLY_ACCESS:
        return <UnderConstruction onNavigate={handleNavigate} />;
      case Page.ASSESSMENT:
        return <AssessmentForm onNavigate={handleNavigate} />;
      case Page.ABOUT:
        return <AboutPage />;
      case Page.FAQ:
        return <FAQPage />;
      case Page.PRIVACY:
        return <PrivacyPage />;
      case Page.TERMS:
        return <TermsPage />;
      case Page.CONTACT:
        return <ContactPage />;
      case Page.TRANSLATION_MANAGER:
        return currentUser
          ? (currentUser.role.toLowerCase() === 'super_admin'
            ? <TranslationManager onNavigate={handleNavigate} />
            : <DashboardPage user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />)
          : <AuthPage currentView={Page.SIGN_IN} onNavigate={handleNavigate} onLogin={handleLogin} />;
      case Page.DASHBOARD:
        return currentUser
          ? <DashboardPage user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
          : <LandingPage onNavigate={handleNavigate} isLoggedIn={false} />;
      case Page.SIGN_IN:
      case Page.SIGN_UP:
      case Page.FORGOT_PASSWORD:
        return <AuthPage currentView={currentPage} onNavigate={handleNavigate} onLogin={handleLogin} />;
      default:
        return <LandingPage onNavigate={handleNavigate} isLoggedIn={!!currentUser} />;
    }
  };

  const hideNavigation =
    currentPage === Page.DASHBOARD ||
    currentPage === Page.ASSESSMENT ||
    currentPage === Page.EARLY_ACCESS ||
    currentPage === Page.SIGN_IN ||
    currentPage === Page.SIGN_UP ||
    currentPage === Page.FORGOT_PASSWORD ||
    currentPage === Page.TRANSLATION_MANAGER;

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white font-body selection:bg-brand-gold/30 selection:text-brand-gold">
      {!hideNavigation && <Navbar currentPage={currentPage} onNavigate={handleNavigate} isLoggedIn={!!currentUser} userInitial={currentUser?.fullName?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') ?? 'A'} onLogout={handleLogout} userRole={currentUser?.role} userId={currentUser?.id} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {!hideNavigation && <Footer onNavigate={handleNavigate} currentPage={currentPage} />}

      {/* Inactivity timeout modal */}
      {showTimeoutModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-[#1c3933] border border-brand-gold/30 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-alert/15 border border-brand-alert/30 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF3131" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Session Expiring</h3>
            <p className="text-sm text-white/60 mb-1">You've been inactive for 15 minutes.</p>
            <p className="text-sm text-white/60 mb-5">You'll be automatically signed out in:</p>
            <div className="text-4xl font-black text-brand-alert tabular-nums mb-6">{countdown}s</div>
            <div className="flex gap-3">
              <button
                onClick={renewSession}
                className="flex-1 py-3 rounded-xl bg-brand-eco text-brand-dark font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Stay Signed In
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl border border-white/15 text-white/50 font-black text-xs uppercase tracking-widest hover:border-brand-alert/50 hover:text-brand-alert transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default App;
