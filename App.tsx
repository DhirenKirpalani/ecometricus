
import React, { useState, useEffect, useCallback } from 'react';
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
import StaffPortal from './components/StaffPortal';
import SupervisorDashboard from './components/SupervisorDashboard';
import AssessmentForm from './components/AssessmentForm';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import ContactPage from './components/ContactPage';
import TranslationManager from './components/TranslationManager';
import Footer from './components/Footer';

// ── URL ↔ Page mappings ───────────────────────────────────────────────────────
const PAGE_TO_PATH: Record<Page, string> = {
  [Page.HOME]:                 '/',
  [Page.ABOUT]:                '/about',
  [Page.FAQ]:                  '/faq',
  [Page.SIGN_IN]:              '/login',
  [Page.SIGN_UP]:              '/signup',
  [Page.FORGOT_PASSWORD]:      '/forgot-password',
  [Page.DASHBOARD]:            '/dashboard',
  [Page.STAFF_PORTAL]:         '/staff',
  [Page.SUPERVISOR_DASHBOARD]: '/supervisor',
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

const pathToPage = (pathname: string): Page =>
  PATH_TO_PAGE[pathname] ?? Page.HOME;

// ─────────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();

  const [currentPage, setCurrentPageState] = useState<Page>(() =>
    pathToPage(location.pathname)
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

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

  // ── Handle email confirmation redirect ──
  // When a user clicks the confirmation link in their email, Supabase fires
  // SIGNED_IN with event type 'EMAIL_CONFIRMED'. We detect this and route them
  // straight to the dashboard instead of landing on the home page.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          // Only auto-route on email confirmation (not every login, which the
          // AuthPage handleSubmit already handles)
          if (event === 'SIGNED_IN' && !currentUser) {
            const authUser = session.user;
            const meta = authUser.user_metadata || {};
            const fullName = meta.full_name || authUser.email?.split('@')[0] || 'Admin User';
            const role = meta.role || 'admin';
            const position = role === 'admin' ? 'GM' : role === 'manager' ? 'Outlet Manager' : role === 'chef' ? 'Head Chef' : 'Supervisor';

            const profile: UserProfile = {
              id: authUser.id,
              fullName,
              email: authUser.email || '',
              role: role as any,
              position: position as any,
              outletCode: meta.outlet_code || 'ROY02',
              legal_consent: true,
            };

            setCurrentUser(profile);
            const targetPage =
              role === 'admin' || role === 'manager' ? Page.DASHBOARD :
              role === 'supervisor' ? Page.SUPERVISOR_DASHBOARD :
              Page.STAFF_PORTAL;
            const path = PAGE_TO_PATH[targetPage];
            navigate(path);
            setCurrentPageState(targetPage);
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
    setCurrentUser(user);
    if (user.role === 'admin' || user.role === 'manager') {
      handleNavigate(Page.DASHBOARD);
    } else if (user.role === 'supervisor') {
      handleNavigate(Page.SUPERVISOR_DASHBOARD);
    } else {
      handleNavigate(Page.STAFF_PORTAL);
    }
  }, [handleNavigate]);

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
        return <TranslationManager onNavigate={handleNavigate} />;
      case Page.DASHBOARD:
        return currentUser
          ? <DashboardPage user={currentUser} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
          : <LandingPage onNavigate={handleNavigate} isLoggedIn={false} />;
      case Page.SUPERVISOR_DASHBOARD:
        return currentUser
          ? <SupervisorDashboard user={currentUser} onLogout={handleLogout} />
          : <LandingPage onNavigate={handleNavigate} isLoggedIn={false} />;
      case Page.STAFF_PORTAL:
        return currentUser
          ? <StaffPortal user={currentUser} onLogout={handleLogout} />
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
    currentPage === Page.STAFF_PORTAL ||
    currentPage === Page.SUPERVISOR_DASHBOARD ||
    currentPage === Page.DASHBOARD ||
    currentPage === Page.ASSESSMENT ||
    currentPage === Page.EARLY_ACCESS ||
    currentPage === Page.SIGN_IN ||
    currentPage === Page.SIGN_UP ||
    currentPage === Page.FORGOT_PASSWORD ||
    currentPage === Page.TRANSLATION_MANAGER;

  return (
    <div className="min-h-screen flex flex-col bg-brand-dark text-white font-body selection:bg-brand-gold/30 selection:text-brand-gold">
      {!hideNavigation && <Navbar currentPage={currentPage} onNavigate={handleNavigate} isLoggedIn={!!currentUser} userInitial={currentUser?.fullName?.[0] ?? 'A'} onLogout={handleLogout} />}
      <main className="flex-grow">
        {renderPage()}
      </main>
      {!hideNavigation && <Footer onNavigate={handleNavigate} currentPage={currentPage} />}
    </div>
  );
};

export default App;
