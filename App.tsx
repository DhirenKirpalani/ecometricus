
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  [Page.SUPER_ADMIN]:           '/super-admin',
};

const PATH_TO_PAGE: Record<string, Page> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page as Page])
);

const pathToPage = (pathname: string): Page => {
  // Invite links: /access/OUTL01?token=abc → treat as sign-up
  if (pathname.startsWith('/access/')) return Page.SIGN_UP;
  // Dashboard sub-routes: /dashboard/company, /dashboard/team, etc. → all map to DASHBOARD
  if (pathname.startsWith('/dashboard')) return Page.DASHBOARD;
  if (pathname.startsWith('/super-admin')) return Page.SUPER_ADMIN;
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
          return;
        }

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const authUser = session.user;
          const meta = authUser.user_metadata || {};
          const fullName = meta.full_name || authUser.email?.split('@')[0] || 'Admin User';
          // ── Super Admin override: hardcode role for specific email ──
          const SUPER_ADMIN_EMAIL = 'dhirenkirpalani2308@gmail.com';
          const isSuperAdmin = authUser.email?.toLowerCase() === SUPER_ADMIN_EMAIL;
          const role = isSuperAdmin ? 'super_admin' : (meta.role || 'admin');
          const rl = role.toLowerCase();
          const position = rl === 'super_admin' ? 'F&B Director' : rl === 'admin' ? 'GM' : rl === 'basic' ? (meta.position || 'Chef Prep') : rl === 'view' ? (meta.position || 'GM') : 'Supervisor';

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
              rl === 'super_admin' ? PAGE_TO_PATH[Page.DASHBOARD] :
              rl === 'admin' ? PAGE_TO_PATH[Page.DASHBOARD] :
              rl === 'supervisor' ? PAGE_TO_PATH[Page.DASHBOARD] :
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
    // ── Super Admin override ──
    const SUPER_ADMIN_EMAIL = 'dhirenkirpalani2308@gmail.com';
    const effectiveUser = user.email?.toLowerCase() === SUPER_ADMIN_EMAIL
      ? { ...user, role: 'super_admin' as any }
      : user;
    setCurrentUser(effectiveUser);
    const role = effectiveUser.role.toLowerCase();
    if (role === 'super_admin') {
      handleNavigate(Page.DASHBOARD);
    } else if (role === 'admin') {
      handleNavigate(Page.DASHBOARD);
    } else if (role === 'supervisor') {
      handleNavigate(Page.DASHBOARD);
    } else {
      // Basic/view roles go to Daily Input on the dashboard
      navigate('/dashboard/daily-input');
      setCurrentPageState(Page.DASHBOARD);
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
          ? <TranslationManager onNavigate={handleNavigate} />
          : <AuthPage currentView={Page.SIGN_IN} onNavigate={handleNavigate} onLogin={handleLogin} />;
      case Page.DASHBOARD:
        return currentUser
          ? <DashboardPage user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
          : <LandingPage onNavigate={handleNavigate} isLoggedIn={false} />;
      case Page.SUPER_ADMIN:
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
    currentPage === Page.SUPER_ADMIN ||
    currentPage === Page.DASHBOARD ||
    currentPage === Page.ASSESSMENT ||
    currentPage === Page.EARLY_ACCESS ||
    currentPage === Page.SIGN_IN ||
    currentPage === Page.SIGN_UP ||
    currentPage === Page.FORGOT_PASSWORD ||
    currentPage === Page.TRANSLATION_MANAGER;

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white font-body selection:bg-brand-gold/30 selection:text-brand-gold">
      {!hideNavigation && <Navbar currentPage={currentPage} onNavigate={handleNavigate} isLoggedIn={!!currentUser} userInitial={currentUser?.fullName?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') ?? 'A'} onLogout={handleLogout} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {!hideNavigation && <Footer onNavigate={handleNavigate} currentPage={currentPage} />}
    </div>
  );
};

export default App;
