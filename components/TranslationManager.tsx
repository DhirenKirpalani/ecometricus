import React, { useState, useMemo, useEffect } from 'react';
import { translations, getAllTranslationKeys, Lang } from '../lib/translations';
import { useI18n, saveTranslationToSupabase } from '../lib/useI18n';
import { Page } from '../types';
import { ArrowLeft, Search, Check, Globe, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface TranslationManagerProps {
  onNavigate: (page: Page) => void;
}

const SECTION_LABELS: Record<string, string> = {
  navbar: 'Navbar',
  footer: 'Footer',
  auth: 'Auth',
  authBranding: 'Auth Branding',
  homepage: 'Homepage',
  about: 'About Us',
  faq: 'FAQ',
  contact: 'Contact',
  assessment: 'Assessment',
  privacy: 'Privacy',
  terms: 'Terms',
  dashboard: 'Dashboard',
  misc: 'Miscellaneous',
};

const TranslationManager: React.FC<TranslationManagerProps> = ({ onNavigate }) => {
  const { lang, changeLang, t } = useI18n();
  const [editingLang, setEditingLang] = useState<Lang>('es');
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string>('all');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const allKeys = useMemo(() => getAllTranslationKeys(), []);

  const sections = useMemo(() => {
    const set = new Set(allKeys.map(k => k.section));
    return ['all', ...Array.from(set)];
  }, [allKeys]);

  const filtered = useMemo(() => {
    return allKeys.filter(k => {
      if (activeSection !== 'all' && k.section !== activeSection) return false;
      if (search) {
        const q = search.toLowerCase();
        return k.key.toLowerCase().includes(q) ||
               k.en.toLowerCase().includes(q) ||
               k.es.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allKeys, activeSection, search]);

  const editedCount = Object.keys(edits).length;
  const publishedCount = allKeys.length;

  const handleEdit = (section: string, key: string, value: string) => {
    setEdits(prev => ({ ...prev, [`${section}.${key}`]: value }));
  };

  const handlePublish = async () => {
    if (Object.keys(edits).length === 0) return;
    setPublishing(true);
    setPublishResult(null);

    const entries = Object.entries(edits);
    let successCount = 0;
    let failCount = 0;

    for (const [fullKey, value] of entries) {
      const [section, key] = fullKey.split('.');
      const ok = await saveTranslationToSupabase(section, key, editingLang, value);
      if (ok) {
        successCount++;
        // Also update in-memory defaults so the UI reflects immediately
        if (translations[section]?.[key]) {
          translations[section][key][editingLang] = value;
        }
      } else {
        failCount++;
      }
    }

    setPublishing(false);

    if (failCount === 0) {
      setPublishResult({ ok: true, msg: `${successCount} translation${successCount !== 1 ? 's' : ''} published to Supabase` });
      setEdits({});
    } else {
      setPublishResult({ ok: false, msg: `${successCount} saved, ${failCount} failed. Check console for details.` });
    }

    // Auto-clear result after 5 seconds
    setTimeout(() => setPublishResult(null), 5000);
  };

  const isEdited = (section: string, key: string) => {
    return `${section}.${key}` in edits;
  };

  const getEditValue = (section: string, key: string, lang: Lang) => {
    const fullKey = `${section}.${key}`;
    if (fullKey in edits) return edits[fullKey];
    return translations[section]?.[key]?.[lang] ?? '';
  };

  return (
    <div className="h-screen bg-brand-dark flex flex-col overflow-hidden">

      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-white/8 bg-[#0e1f1c] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate(Page.HOME)}
              className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-brand-gold" />
              <h1 className="text-sm font-geometric font-bold text-white uppercase tracking-widest">Translation Manager</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/30">
              <span className="text-brand-eco">{publishedCount} published</span>
              <span>·</span>
              <span className="text-brand-gold">{editedCount} edited</span>
            </div>

            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setEditingLang('en')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${editingLang === 'en' ? 'bg-brand-gold text-brand-dark' : 'text-white/40 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => setEditingLang('es')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${editingLang === 'es' ? 'bg-brand-gold text-brand-dark' : 'text-white/40 hover:text-white'}`}
              >
                ES
              </button>
            </div>

            {/* Publish */}
            <button
              onClick={handlePublish}
              disabled={editedCount === 0 || publishing}
              className="flex items-center gap-2 bg-brand-eco text-brand-dark px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {publishing ? (
                <><Loader2 size={14} className="animate-spin" /> Publishing…</>
              ) : (
                <><Check size={14} /> Publish</>
              )}
            </button>
          </div>
        </div>

        {/* Publish result banner */}
        {publishResult && (
          <div className={`px-6 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${publishResult.ok ? 'bg-brand-eco/10 text-brand-eco border-b border-brand-eco/20' : 'bg-red-500/10 text-red-400 border-b border-red-500/20'}`}>
            {publishResult.ok ? <Check size={12} /> : <AlertCircle size={12} />}
            {publishResult.msg}
          </div>
        )}
      </header>

      {/* ─── Body ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─── Sidebar: sections ──────────────────────────────────── */}
        <aside className="w-56 shrink-0 border-r border-white/8 bg-[#0e1f1c] overflow-y-auto">
          <div className="p-4 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 px-3 py-2">Sections</p>
            {sections.map(sec => {
              const count = sec === 'all'
                ? allKeys.length
                : allKeys.filter(k => k.section === sec).length;
              const editedInSec = sec === 'all'
                ? editedCount
                : allKeys.filter(k => k.section === sec && isEdited(k.section, k.key)).length;
              return (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                    activeSection === sec
                      ? 'bg-brand-gold/10 text-brand-gold font-bold'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{sec === 'all' ? 'All' : SECTION_LABELS[sec] ?? sec}</span>
                  <span className="flex items-center gap-1.5">
                    {editedInSec > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />}
                    <span className="text-[9px] text-white/30">{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── Main: translation table ────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Search bar */}
          <div className="sticky top-0 bg-brand-dark/95 backdrop-blur-xl border-b border-white/5 px-6 py-3 z-10">
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search translations..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-brand-gold/40 transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="px-6 py-4">
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[1.5fr_2fr_2fr] gap-4 px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                <div>Key</div>
                <div>English (EN)</div>
                <div>{editingLang === 'es' ? 'Spanish (ES)' : 'English (EN)'}</div>
              </div>

              {/* Rows */}
              {filtered.map(({ section, key, en, es }) => {
                const edited = isEdited(section, key);
                const fullKey = `${section}.${key}`;
                return (
                  <div
                    key={fullKey}
                    className={`grid grid-cols-[1.5fr_2fr_2fr] gap-4 px-4 py-3 rounded-lg transition-all ${edited ? 'bg-brand-gold/5 border border-brand-gold/20' : 'hover:bg-white/3 border border-transparent'}`}
                  >
                    {/* Key */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-mono text-white/60 truncate">{key}</span>
                      <span className="text-[9px] uppercase tracking-widest text-white/20">{SECTION_LABELS[section] ?? section}</span>
                      {edited && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-brand-gold font-bold uppercase tracking-widest mt-0.5">
                          <span className="w-1 h-1 rounded-full bg-brand-gold animate-pulse" /> Edited
                        </span>
                      )}
                    </div>

                    {/* EN (read-only reference) */}
                    <div className="text-sm text-white/50 leading-relaxed break-words">
                      {en}
                    </div>

                    {/* Editable language */}
                    <div>
                      <textarea
                        value={getEditValue(section, key, editingLang)}
                        onChange={e => handleEdit(section, key, e.target.value)}
                        rows={Math.max(1, Math.ceil((translations[section]?.[key]?.[editingLang] ?? '').length / 45))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-brand-gold/40 transition-all resize-none leading-relaxed"
                        placeholder={editingLang === 'es' ? 'Traducción al español...' : 'English translation...'}
                      />
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <FileText size={32} className="text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">No translations found</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TranslationManager;
