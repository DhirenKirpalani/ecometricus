import { useEffect } from 'react';
import { Page } from '../types';

interface SeoMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: string;
}

const BASE_URL = 'https://www.ecometricus.com';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;

const PAGE_META: Record<Page, SeoMeta> = {
  [Page.HOME]: {
    title: 'Ecometricus — AI-Powered ESG & Sustainability Intelligence for Luxury F&B',
    description: 'The premier AI-powered ESG platform for luxury hotel Food & Beverage operations. Measure food waste, water, energy, and carbon in real time with audit-ready reporting.',
    path: '/',
  },
  [Page.ABOUT]: {
    title: 'About Ecometricus — Our Vision for Sustainable Hospitality',
    description: 'Empowering the hotel Food & Beverage industry with a comprehensive, intelligent platform for optimizing performance and enhancing profitability through sustainability.',
    path: '/about',
  },
  [Page.CONTACT]: {
    title: 'Contact Ecometricus — Get in Touch',
    description: 'Have a question, partnership idea, or want to explore what Ecometricus can do for your property? Reach out to our team.',
    path: '/contact',
  },
  [Page.FAQ]: {
    title: 'FAQ — Ecometricus ESG Platform Questions Answered',
    description: 'Find answers to common questions about Ecometricus, the AI-powered ESG intelligence platform for luxury hotel F&B operations.',
    path: '/faq',
  },
  [Page.PRIVACY]: {
    title: 'Privacy Policy — Ecometricus',
    description: 'How Ecometricus collects, uses, and protects your personal data. Read our full privacy policy.',
    path: '/privacy',
  },
  [Page.TERMS]: {
    title: 'Terms of Service — Ecometricus',
    description: 'The terms and conditions for using the Ecometricus ESG intelligence platform.',
    path: '/terms',
  },
  [Page.SIGN_IN]: {
    title: 'Sign In — Ecometricus',
    description: 'Sign in to your Ecometricus account to access the operational intelligence core.',
    path: '/login',
  },
  [Page.SIGN_UP]: {
    title: 'Create Account — Ecometricus',
    description: 'Get started with Ecometricus for free. Full dashboard access from day one. No credit card required.',
    path: '/signup',
  },
  [Page.FORGOT_PASSWORD]: {
    title: 'Forgot Password — Ecometricus',
    description: 'Reset your Ecometricus account password. Enter your email to receive a secure reset link.',
    path: '/forgot-password',
  },
  [Page.DASHBOARD]: {
    title: 'Dashboard — Ecometricus',
    description: 'Your ESG intelligence dashboard. Track food waste, water, energy, and carbon across all outlets.',
    path: '/dashboard',
  },
  [Page.ASSESSMENT]: {
    title: 'Assessment — Ecometricus',
    description: 'Complete your ESG sustainability assessment with Ecometricus.',
    path: '/assessment',
  },
  [Page.EARLY_ACCESS]: {
    title: 'Early Access — Ecometricus',
    description: 'Get early access to Ecometricus, the AI-powered ESG platform for luxury hospitality.',
    path: '/early-access',
  },
  [Page.STAFF_PORTAL]: {
    title: 'Staff Portal — Ecometricus',
    description: 'Staff portal for Ecometricus ESG platform.',
    path: '/staff-portal',
  },
  [Page.SUPERVISOR_DASHBOARD]: {
    title: 'Supervisor Dashboard — Ecometricus',
    description: 'Supervisor dashboard for Ecometricus ESG platform.',
    path: '/supervisor-dashboard',
  },
  [Page.TRANSLATION_MANAGER]: {
    title: 'Translation Manager — Ecometricus',
    description: 'Manage and edit translations for the Ecometricus platform.',
    path: '/translations',
  },
};

function setMeta(attr: string, key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Hook that updates document title, meta tags, canonical URL,
 * Open Graph, Twitter Card, and structured data per page.
 */
export function useSeo(page: Page) {
  useEffect(() => {
    const meta = PAGE_META[page] ?? PAGE_META[Page.HOME];
    const url = `${BASE_URL}${meta.path}`;
    const image = meta.image ?? DEFAULT_IMAGE;
    const type = meta.type ?? 'website';

    // Title
    document.title = meta.title;

    // Standard meta
    setMeta('name', 'title', meta.title);
    setMeta('name', 'description', meta.description);

    // Open Graph
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:type', type);

    // Twitter
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:url', url);
    setMeta('name', 'twitter:image', image);

    // Canonical
    setLink('canonical', url);
  }, [page]);
}
