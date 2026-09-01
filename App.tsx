
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
  const [authReady, setAuthReady] = useState(false);

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
  // Explicitly check for existing session on mount (fixes refresh sign-out bug)
  useEffect(() => {
    const log = (...args: any[]) => console.log('%c[AUTH MOUNT]', 'color: #77B139; font-weight: bold;', ...args);
    log('App mounted — checking for existing session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) log('getSession error:', error.message);

      // Check if session is expired
      const expiresAt = session?.expires_at || 0;
      const nowSec = Math.floor(Date.now() / 1000);
      if (session && expiresAt && expiresAt < nowSec) {
        log(`Session EXPIRED (expired ${new Date(expiresAt * 1000).toISOString()}) — signing out`);
        supabase.auth.signOut();
        setAuthReady(true);
        return;
      }

      if (session?.user?.email_confirmed_at) {
        const authUser = session.user;
        const meta = authUser.user_metadata || {};
        const fullName = meta.full_name || authUser.email?.split('@')[0] || 'Admin User';
        const metaRole = (meta.role || '').toLowerCase();
        const role = metaRole || 'admin';
        const rl = role.toLowerCase();
        const position = rl === 'super_admin' ? 'Super Admin' : rl === 'admin' ? (meta.position || 'Admin') : rl === 'basic' ? (meta.position || 'Chef Prep') : rl === 'supervisor' ? (meta.position || 'Exec Chef') : (meta.position || 'GM');
        log(`Session restored: ${authUser.email} (${role}) | Path: ${window.location.pathname}`);
        setCurrentUser({
          id: authUser.id,
          fullName,
          email: authUser.email || '',
          role: role as any,
          position: position as any,
          outletCode: meta.outlet_code || 'ROY02',
          legal_consent: true,
        });
      } else {
        log('No valid session found on mount');
      }
      setAuthReady(true);
      log('authReady = true');
    });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const DEBUG = true;
        const log = (...args: any[]) => DEBUG && console.log('%c[AUTH STATE]', 'color: #60A5FA; font-weight: bold;', ...args);
        log(`Event: ${event} | Session: ${!!session} | Path: ${window.location.pathname} | Hash: ${window.location.hash || '(none)'}`);
        if (session?.user) {
          log(`  User: ${session.user.email} | Confirmed: ${!!session.user.email_confirmed_at} | Expires: ${new Date((session.expires_at || 0) * 1000).toISOString()}`);
        }
        if (currentUserRef.current) {
          log(`  Current user in state: ${currentUserRef.current.email} | Role: ${currentUserRef.current.role}`);
        } else {
          log(`  Current user in state: (null)`);
        }

        // Clear user on sign-out
        if (event === 'SIGNED_OUT') {
          log('→ SIGNED_OUT: clearing currentUser, redirecting from dashboard if needed');
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

          // ── Expired session guard ──
          // If the token is expired, sign out immediately — don't attempt DB queries
          // with an invalid token (they'll hang or fail silently)
          const expiresAt = session.expires_at || 0;
          const nowSec = Math.floor(Date.now() / 1000);
          if (expiresAt && expiresAt < nowSec) {
            log(`→ ${event}: SESSION EXPIRED (expired ${new Date(expiresAt * 1000).toISOString()}, now ${new Date(nowSec * 1000).toISOString()}) — signing out`);
            setCurrentUser(null);
            await supabase.auth.signOut();
            return;
          }

          const meta = authUser.user_metadata || {};
          const fullName = meta.full_name || authUser.email?.split('@')[0] || 'Admin User';
          log(`→ ${event}: building profile for ${authUser.email}`);
          log(`  Metadata: role=${meta.role}, position=${meta.position}, outlet_code=${meta.outlet_code}`);
          log(`  Email confirmed: ${!!authUser.email_confirmed_at}`);

          // ── Super Admin check: via personnel table or auth metadata ──
          const metaRole = (meta.role || '').toLowerCase();
          let isSuperAdmin = metaRole === 'super_admin';

          // If not already super_admin in metadata, check personnel table
          // But add a 3-second timeout so we don't hang forever
          if (!isSuperAdmin && (metaRole === 'admin' || metaRole === 'supervisor' || metaRole === '')) {
            log('  Querying personnel table for super_admin check...');
            const personnelStart = Date.now();
            try {
              const personnelPromise = supabase
                .from('personnel')
                .select('role')
                .ilike('email', authUser.email?.toLowerCase() || '')
                .maybeSingle();

              const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000)
              );

              const { data: personnelRow, error: personnelErr } = await Promise.race([personnelPromise, timeoutPromise]);
              log(`  Personnel query took ${Date.now() - personnelStart}ms | result: ${personnelRow ? JSON.stringify(personnelRow) : '(none)'}${personnelErr ? ' | error: ' + personnelErr.message : ''}`);
              isSuperAdmin = personnelRow?.role?.toLowerCase().includes('super_admin') ?? false;
            } catch (e: any) {
              log(`  Personnel query FAILED after ${Date.now() - personnelStart}ms:`, e?.message);
            }
          }

          const role = isSuperAdmin ? 'super_admin' : (meta.role || 'admin');
          const rl = role.toLowerCase();
          const position = rl === 'super_admin' ? 'Super Admin' : rl === 'admin' ? (meta.position || 'Admin') : rl === 'basic' ? (meta.position || 'Chef Prep') : rl === 'supervisor' ? (meta.position || 'Exec Chef') : (meta.position || 'GM');
          log(`  Final role: ${role} | Position: ${position} | isSuperAdmin: ${isSuperAdmin}`);

          const hasAuthHash = window.location.hash.includes('access_token');
          const isSignupConfirmation = window.location.hash.includes('type=signup');
          log(`  hasAuthHash: ${hasAuthHash} | isSignupConfirmation: ${isSignupConfirmation}`);

          // ── Unconfirmed user guard ──────────────────────────────────────────
          if (!authUser.email_confirmed_at) {
            log('  → UNCONFIRMED USER: signing out and returning');
            await supabase.auth.signOut();
            return;
          }

          // ── Email signup confirmation link ──────────────────────────────────
          if (event === 'SIGNED_IN' && hasAuthHash && isSignupConfirmation) {
            log('  → SIGNUP CONFIRMATION LINK: signing out, redirecting to /login?confirmed=true');
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
          log(`  → Setting currentUser: ${profile.email} (${profile.role})`);
          setCurrentUser(profile);

          // Only auto-redirect for other auth hash types (e.g. password reset).
          // Normal session restore (SIGNED_IN without hash, or TOKEN_REFRESHED)
          // should NEVER redirect — respect whatever URL the user is on.
          if (event === 'SIGNED_IN' && hasAuthHash) {
            const rl = role.toLowerCase();
            const pos = (position || '').toLowerCase();
            const isGMRedirect = pos === 'gm' || rl === 'gm';
            const targetPath =
              rl === 'super_admin' || rl === 'admin' || rl === 'supervisor' || isGMRedirect
                ? (PAGE_TO_PATH[Page.DASHBOARD] ?? '/dashboard')
                : '/dashboard/daily-input';
            log(`  → AUTH HASH redirect: navigating to ${targetPath}`);
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
    console.log('%c[AUTH LOGIN]', 'color: #C8A413; font-weight: bold;', 'handleLogin called:', user.email, `(${user.role})`);
    // The onAuthStateChange listener handles super_admin elevation via a DB
    // query. Here we just set the user from auth metadata and navigate — the
    // listener fires immediately after sign-in and will update the role if needed.
    setCurrentUser(user);
    const role = user.role.toLowerCase();
    const position = (user.position || '').toLowerCase();
    // GM (General Manager) is a company-wide read-only viewer — treat like
    // admin/supervisor/super_admin for routing, NOT like basic/view users.
    const isGM = position === 'gm' || role === 'gm';
    if ((role === 'basic' || role === 'view') && !isGM) {
      console.log('%c[AUTH LOGIN]', 'color: #C8A413; font-weight: bold;', 'Navigating to /dashboard/daily-input (basic/view)');
      navigate('/dashboard/daily-input');
      setCurrentPageState(Page.DASHBOARD);
    } else {
      console.log('%c[AUTH LOGIN]', 'color: #C8A413; font-weight: bold;', `Navigating to /dashboard (${role}${isGM ? '/GM' : ''})`);
      handleNavigate(Page.DASHBOARD);
    }
  }, [handleNavigate, navigate]);

  const handleLogout = useCallback(async () => {
    console.log('%c[AUTH LOGOUT]', 'color: #FF3131; font-weight: bold;', 'handleLogout called');
    try {
      await supabase.auth.signOut();
      console.log('%c[AUTH LOGOUT]', 'color: #FF3131; font-weight: bold;', 'signOut completed');
    } catch (e) {
      console.warn('%c[AUTH LOGOUT]', 'color: #FF3131; font-weight: bold;', 'Supabase signout failed', e);
    } finally {
      console.log('%c[AUTH LOGOUT]', 'color: #FF3131; font-weight: bold;', 'Redirecting to /');
      window.location.href = '/';
    }
  }, []);

  // ── Inactivity auto-logout with renewal modal ──
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
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
      {!authReady ? (
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Loading…</p>
          </div>
        </div>
      ) : (
        <>
      {!hideNavigation && <Navbar currentPage={currentPage} onNavigate={handleNavigate} isLoggedIn={!!currentUser} userInitial={currentUser?.fullName?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') ?? 'A'} onLogout={handleLogout} userRole={currentUser?.role} userPosition={currentUser?.position} userId={currentUser?.id} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {!hideNavigation && <Footer onNavigate={handleNavigate} currentPage={currentPage} />}
        </>
      )}

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
