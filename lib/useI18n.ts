import { useState, useCallback, useEffect } from 'react';
import { translations, Lang } from './translations';
import { supabase } from './supabase';

const STORAGE_KEY = 'ecometricus_lang';

// ─── Get stored language or default ─────────────────────────────────────────
function getStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'es' ? 'es' : 'en';
}

// ─── Global language state (shared across all hook instances) ───────────────
let globalLang: Lang = getStoredLang();
const listeners = new Set<(lang: Lang) => void>();

// ─── Override store: section.key → { en?, es? } ────────────────────────────
// Populated from Supabase on app start. Merges on top of the static defaults.
type Override = { en?: string; es?: string };
const overrides: Record<string, Override> = {};
let overridesLoaded = false;
let overridesLoading: Promise<void> | null = null;

function setGlobalLang(lang: Lang) {
  globalLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach(fn => fn(lang));
}

// ─── Load overrides from Supabase (called once on app start) ────────────────
export async function loadTranslationsFromSupabase(): Promise<void> {
  if (overridesLoaded || overridesLoading) return overridesLoading!;
  overridesLoading = (async () => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('section, key, en, es');
      if (error) throw error;
      if (data) {
        for (const row of data) {
          const fullKey = `${row.section}.${row.key}`;
          overrides[fullKey] = { en: row.en, es: row.es };
        }
      }
      overridesLoaded = true;
    } catch (err) {
      console.warn('[i18n] Failed to load translations from Supabase, using defaults:', err);
      overridesLoaded = true; // Don't retry forever — fall back to static defaults
    }
  })();
  return overridesLoading;
}

// ─── Save a single translation override to Supabase ─────────────────────────
export async function saveTranslationToSupabase(
  section: string,
  key: string,
  lang: Lang,
  value: string
): Promise<boolean> {
  try {
    // Upsert: insert or update
    const existing = overrides[`${section}.${key}`] || {};
    const newEn = lang === 'en' ? value : (existing.en ?? translations[section]?.[key]?.en ?? '');
    const newEs = lang === 'es' ? value : (existing.es ?? translations[section]?.[key]?.es ?? '');

    const { error } = await supabase
      .from('translations')
      .upsert(
        { section, key, en: newEn, es: newEs },
        { onConflict: 'section,key' }
      );
    if (error) throw error;

    // Update in-memory override
    overrides[`${section}.${key}`] = { en: newEn, es: newEs };
    return true;
  } catch (err) {
    console.error('[i18n] Failed to save translation to Supabase:', err);
    return false;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useI18n() {
  const [lang, setLang] = useState<Lang>(globalLang);

  useEffect(() => {
    const listener = (l: Lang) => setLang(l);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const changeLang = useCallback((l: Lang) => {
    setGlobalLang(l);
  }, []);

  /**
   * Translate a key. Supports {placeholder} interpolation.
   * Usage: t('navbar.home') or t('auth.errRateLimit', { n: 3 })
   *
   * Priority: Supabase override > static default > key string
   */
  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const [section, entryKey] = key.split('.');
    const sectionData = translations[section];
    if (!sectionData) return key;
    const entry = sectionData[entryKey];
    if (!entry) return key;

    // Check override first
    const override = overrides[key];
    let result = (override?.[lang] ?? entry[lang] ?? entry.en) as string;

    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return result;
  }, [lang]);

  return { t, lang, changeLang };
}

// ─── Direct translator (for use outside React components) ───────────────────
export function translate(key: string, vars?: Record<string, string | number>): string {
  const [section, entryKey] = key.split('.');
  const sectionData = translations[section];
  if (!sectionData) return key;
  const entry = sectionData[entryKey];
  if (!entry) return key;

  const override = overrides[key];
  let result = (override?.[globalLang] ?? entry[globalLang] ?? entry.en) as string;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return result;
}
