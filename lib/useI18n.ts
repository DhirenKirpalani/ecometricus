import { useState, useCallback, useEffect } from 'react';
import { translations, Lang } from './translations';

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

function setGlobalLang(lang: Lang) {
  globalLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach(fn => fn(lang));
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
   */
  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const [section, entryKey] = key.split('.');
    const sectionData = translations[section];
    if (!sectionData) return key;
    const entry = sectionData[entryKey];
    if (!entry) return key;
    let result = entry[lang] ?? entry.en;
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
  let result = entry[globalLang] ?? entry.en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return result;
}
