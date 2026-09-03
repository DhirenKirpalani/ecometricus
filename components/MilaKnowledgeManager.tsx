import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload, Trash2, FileText, Search, Plus, RefreshCw, CheckCircle2, AlertTriangle,
  BookOpen, Sparkles, Layers, Zap, TrendingUp, Database, Award, X, FileCode, Globe, Leaf, Users, DollarSign, FlaskConical, FolderOpen, Eye, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  listDocuments, uploadDocument, deleteDocumentGroup,
  clearAllDocuments, MilaDocument
} from '../lib/mila-rag';
import { extractFileText, isSupportedFile } from '../lib/file-extract';
import { useI18n } from '../lib/useI18n';
// @ts-ignore

// Category metadata — icon + color + label
const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  'esg_criteria':   { icon: Award,         color: '#C8A413', label: 'ESG Criteria' },
  'operational':    { icon: Zap,           color: '#F97316', label: 'Operational' },
  'environmental':  { icon: Leaf,          color: '#22C55E', label: 'Environmental' },
  'social':         { icon: Users,         color: '#3B82F6', label: 'Social' },
  'financial':      { icon: DollarSign,    color: '#A855F7', label: 'Financial' },
  'regional':       { icon: Globe,         color: '#06B6D4', label: 'Regional' },
  'general':        { icon: FolderOpen,    color: '#94A3B8', label: 'General' },
};

const CATEGORIES = Object.keys(CATEGORY_META);

// XP system — each document earns XP
const XP_PER_DOC = 50;
const XP_PER_UPLOAD = 100;
const LEVELS = [
  { name: 'Initiate',     xp: 0,    icon: Sparkles },
  { name: 'Curator',      xp: 200,  icon: BookOpen },
  { name: 'Architect',    xp: 500,  icon: Layers },
  { name: 'Sage',         xp: 1000, icon: Database },
  { name: 'Oracle',       xp: 2000, icon: Award },
];

function getLevel(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1] || LEVELS[0];
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || LEVELS[i];
    }
  }
  const progress = next.xp === current.xp ? 100 : Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100);
  return { current, next, progress, levelIndex: LEVELS.indexOf(current) };
}

const MilaKnowledgeManager: React.FC = () => {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<MilaDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ category: 'general', autoChunk: true });
  const [uploadStatus, setUploadStatus] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [previewDoc, setPreviewDoc] = useState<GroupedDoc | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ message, onConfirm });

  // Multi-file upload queue
  interface FileQueueItem {
    id: string;
    file: File;
    name: string;
    status: 'pending' | 'extracting' | 'ready' | 'uploading' | 'done' | 'error';
    content: string;
    wordCount: number;
    error?: string;
  }
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const docs = await listDocuments();
    setDocuments(docs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // ── Stats ──
  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalWords = 0;
    let totalChunks = 0;

    // Count unique documents (grouped by base title)
    const uniqueTitles = new Set<string>();
    documents.forEach(d => {
      const base = d.title.replace(/ \(Part \d+\/\d+\)$/, '');
      uniqueTitles.add(base);
      totalChunks++;
      totalWords += d.content.split(/\s+/).length;
    });

    // Count categories/sources from unique docs only
    const seenTitles = new Set<string>();
    documents.forEach(d => {
      const base = d.title.replace(/ \(Part \d+\/\d+\)$/, '');
      if (seenTitles.has(base)) return;
      seenTitles.add(base);
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      bySource[d.source] = (bySource[d.source] || 0) + 1;
    });

    return {
      total: uniqueTitles.size,
      totalChunks,
      byCategory,
      bySource,
      totalWords,
      categories: Object.keys(byCategory).length,
      sources: Object.keys(bySource).length,
    };
  }, [documents]);

  // ── XP / Level ──
  const totalXP = stats.total * XP_PER_DOC;
  const { current: currentLevel, next: nextLevel, progress: levelProgress, levelIndex } = getLevel(totalXP);

  const handleUpload = async () => {
    const readyFiles = fileQueue.filter(f => f.status === 'ready');
    if (readyFiles.length === 0) return;

    setIsProcessing(true);
    let totalGained = 0;
    let totalChunks = 0;
    let successCount = 0;

    for (const item of readyFiles) {
      // Mark as uploading
      setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading' } : f));

      const result = await uploadDocument(
        item.name, item.content, 'manual', uploadForm.category, uploadForm.autoChunk, item.file
      );

      if (result.success) {
        totalGained += result.count * XP_PER_DOC + XP_PER_UPLOAD;
        totalChunks += result.count;
        successCount++;
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f));
      } else {
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: result.error } : f));
      }
    }

    if (totalGained > 0) {
      setXpGained(totalGained);
      setTimeout(() => setXpGained(null), 3000);
      setUploadStatus({ msg: t('mila.kbStatusIndexed', { count: successCount, chunks: totalChunks, xp: totalGained }), type: 'success' });
    }

    // Clear done items after a delay, refresh docs
    setTimeout(() => {
      setFileQueue(prev => prev.filter(f => f.status !== 'done'));
      loadDocs();
      setIsProcessing(false);
      // Close panel if all done
      setFileQueue(prev => {
        if (prev.length === 0) setShowUpload(false);
        return prev;
      });
    }, 1500);

    setTimeout(() => setUploadStatus(null), 4000);
  };

  const handleDelete = async (baseTitle: string) => {
    showConfirm(t('mila.kbConfirmDelete', { title: baseTitle }), async () => {
      const ok = await deleteDocumentGroup(baseTitle);
      if (ok) loadDocs();
    });
  };

  const handleClearAll = async () => {
    showConfirm(t('mila.kbConfirmClearAll'), async () => {
      const result = await clearAllDocuments();
      if (result.success) {
        setUploadStatus({ msg: t('mila.kbStatusDeleted'), type: 'success' });
        loadDocs();
      } else {
        setUploadStatus({ msg: result.error || t('mila.kbStatusClearFailed'), type: 'error' });
      }
      setTimeout(() => setUploadStatus(null), 4000);
    });
  };

  // Add files to queue and start extracting sequentially
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    // Filter supported files
    const supported = files.filter(isSupportedFile);
    const unsupported = files.length - supported.length;
    if (unsupported > 0) {
      setUploadStatus({ msg: t('mila.kbStatusUnsupported', { count: unsupported }), type: 'error' });
      setTimeout(() => setUploadStatus(null), 4000);
    }
    if (supported.length === 0) return;

    // Add all to queue as pending
    const newItems: FileQueueItem[] = supported.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name.replace(/\.[^.]+$/, ''),
      status: 'pending',
      content: '',
      wordCount: 0,
    }));
    setFileQueue(prev => [...prev, ...newItems]);

    // Process extraction sequentially with animation
    for (const item of newItems) {
      // Mark as extracting
      setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'extracting' } : f));

      try {
        const text = await extractFileText(item.file);
        if (!text || text.trim().length === 0) {
          setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: t('mila.kbQueueNoText') } : f));
        } else {
          setFileQueue(prev => prev.map(f => f.id === item.id ? {
            ...f, status: 'ready', content: text, wordCount: text.split(/\s+/).length
          } : f));
        }
      } catch (err: any) {
        setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', error: err.message || t('mila.kbQueueFailed') } : f));
      }
    }
  };

  const removeFromQueue = (id: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== id));
  };

  const readyCount = fileQueue.filter(f => f.status === 'ready').length;
  const doneCount = fileQueue.filter(f => f.status === 'done').length;

  // Group chunks into documents by base title (strip " (Part X/Y)" suffix)
  interface GroupedDoc {
    baseTitle: string;
    category: string;
    source: string;
    chunks: MilaDocument[];
    totalWords: number;
    createdAt: string;
    preview: string;
    fileUrl: string | null;
  }

  const groupedDocs = useMemo((): GroupedDoc[] => {
    const groups = new Map<string, GroupedDoc>();

    for (const doc of documents) {
      const baseTitle = doc.title.replace(/ \(Part \d+\/\d+\)$/, '');
      const existing = groups.get(baseTitle);

      if (existing) {
        existing.chunks.push(doc);
        existing.totalWords += doc.content.split(/\s+/).length;
        // Keep earliest createdAt
        if (doc.created_at && doc.created_at < existing.createdAt) {
          existing.createdAt = doc.created_at;
        }
        // Inherit file_url from any chunk that has it
        if (doc.file_url && !existing.fileUrl) {
          existing.fileUrl = doc.file_url;
        }
      } else {
        groups.set(baseTitle, {
          baseTitle,
          category: doc.category,
          source: doc.source,
          chunks: [doc],
          totalWords: doc.content.split(/\s+/).length,
          createdAt: doc.created_at || new Date().toISOString(),
          preview: doc.content.substring(0, 200),
          fileUrl: doc.file_url || null,
        });
      }
    }

    // Sort by createdAt descending (newest first)
    return Array.from(groups.values()).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return groupedDocs.filter(d => {
      const matchesSearch = !searchQuery ||
        d.baseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || d.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [groupedDocs, searchQuery, activeCategory]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── XP Gain Floating Notification ── */}
      {xpGained && (
        <div className="fixed top-24 right-8 z-[200] animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="bg-brand-gold text-brand-dark px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
            <Award size={20} />
            <div>
              <p className="text-xs font-black uppercase tracking-widest">+{xpGained} XP</p>
              <p className="text-[10px] font-bold opacity-70">Knowledge expanded!</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero Header with Level Progress ── */}
      <div className="relative overflow-hidden rounded-3xl border border-brand-gold/20 bg-gradient-to-br from-[#1c3933] via-[#152E2A] to-[#0f2420] p-6 sm:p-8">
        {/* Decorative glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-brand-eco/5 rounded-full blur-3xl" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Title + Level Badge */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl flex items-center justify-center shrink-0">
              <currentLevel.icon className="text-brand-gold" size={28} />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-gold rounded-full flex items-center justify-center text-[10px] font-black text-brand-dark border-2 border-[#152E2A]">
                {levelIndex + 1}
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                {t('mila.kbTitle')}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{currentLevel.name}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[11px] font-medium text-white/50">{t('mila.kbStats', { total: stats.total, totalWords: stats.totalWords.toLocaleString() })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Documents */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-4 hover:border-brand-gold/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={16} className="text-brand-gold" />
            </div>
            <TrendingUp size={12} className="text-brand-eco/50" />
          </div>
          <p className="text-2xl font-geometric font-black text-white leading-none">{stats.total}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">{t('mila.kbTotalDocuments')}</p>
        </div>

        {/* Categories */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-4 hover:border-brand-gold/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers size={16} className="text-[#3B82F6]" />
            </div>
          </div>
          <p className="text-2xl font-geometric font-black text-white leading-none">{stats.categories}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">{t('mila.kbCategories')}</p>
        </div>

        {/* Words Indexed */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-4 hover:border-brand-gold/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database size={16} className="text-[#22C55E]" />
            </div>
          </div>
          <p className="text-2xl font-geometric font-black text-white leading-none">
            {stats.totalWords >= 1000 ? `${(stats.totalWords / 1000).toFixed(1)}K` : stats.totalWords}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">{t('mila.kbWordsIndexed')}</p>
        </div>

        {/* Sources */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-4 hover:border-brand-gold/20 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Globe size={16} className="text-[#A855F7]" />
            </div>
          </div>
          <p className="text-2xl font-geometric font-black text-white leading-none">{stats.sources}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1.5">{t('mila.kbDataSources')}</p>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
            !activeCategory
              ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
              : 'bg-brand-dark/40 border-brand-gold/20 text-white/40 hover:text-white/70 hover:border-brand-gold/30'
          }`}
        >
          {t('mila.kbCategoryAll', { total: stats.total })}
        </button>
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat];
          const count = stats.byCategory[cat] || 0;
          if (count === 0 && activeCategory !== cat) return null;
          const Icon = meta.icon;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeCategory === cat
                  ? 'border-transparent text-white'
                  : 'bg-brand-dark/40 border-brand-gold/20 text-white/40 hover:text-white/70 hover:border-brand-gold/30'
              }`}
              style={activeCategory === cat ? { background: `${meta.color}25`, borderColor: `${meta.color}50`, color: meta.color } : {}}
            >
              <Icon size={11} style={{ color: activeCategory === cat ? meta.color : `${meta.color}80` }} />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('mila.kbSearchPlaceholder')}
            className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
        </div>

        <div className="flex items-center gap-2">
          {documents.length > 0 && (
            <button onClick={handleClearAll}
              className="p-2.5 rounded-xl bg-brand-dark/60 border border-brand-gold/10 text-white/30 hover:text-brand-alert hover:border-brand-alert/30 transition-all">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={loadDocs} className="p-2.5 rounded-xl bg-brand-dark/60 border border-brand-gold/10 text-white/50 hover:text-brand-gold hover:border-brand-gold/30 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-dark font-black text-sm uppercase tracking-wider hover:bg-brand-gold/90 transition-all shadow-lg shadow-brand-gold/20">
            <Plus size={16} /> {t('mila.kbAddDocument')}
          </button>
        </div>
      </div>

      {/* ── Status Messages ── */}
      {uploadStatus && (
        <div className={`rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${uploadStatus.type === 'success' ? 'bg-brand-eco/10 border border-brand-eco/30' : 'bg-brand-alert/10 border border-brand-alert/30'}`}>
          {uploadStatus.type === 'success' ? <CheckCircle2 size={16} className="text-brand-eco" /> : <AlertTriangle size={16} className="text-brand-alert" />}
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{uploadStatus.msg}</span>
        </div>
      )}

      {/* ── Upload Form (slide-in panel) ── */}
      {showUpload && (
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-400 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                <Upload size={18} className="text-brand-gold" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('mila.kbUploadTitle')}</h3>
                <p className="text-[10px] text-white/40 mt-0.5">{t('mila.kbUploadXpHint', { xp: XP_PER_UPLOAD })}</p>
              </div>
            </div>
            <button onClick={() => setShowUpload(false)} className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-brand-gold/10 transition-all">
              <X size={16} />
            </button>
          </div>

          {/* File drop zone — multi-file */}
          <label className="block">
            <div className="relative border-2 border-dashed border-brand-gold/15 rounded-xl py-6 px-4 text-center hover:border-brand-gold/40 transition-all cursor-pointer">
              <input type="file" accept=".txt,.md,.csv,.docx,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" multiple />
              <Upload size={22} className="mx-auto mb-2 text-white/30" />
              <p className="text-sm text-white/50 font-medium">{t('mila.kbUploadDropHint')}</p>
              <p className="text-[10px] text-white/25 mt-1.5">{t('mila.kbUploadFormats')}</p>
            </div>
          </label>

          {/* File queue — per-file processing animation */}
          {fileQueue.length > 0 && (
            <div className="space-y-2">
              {fileQueue.map(item => {
            const ext = item.file.name.split('.').pop()?.toUpperCase();
            return (
              <div key={item.id}
                className={`flex items-center gap-3 rounded-xl p-3 border transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  item.status === 'done' ? 'bg-brand-eco/10 border-brand-eco/30' :
                  item.status === 'error' ? 'bg-brand-alert/10 border-brand-alert/30' :
                  item.status === 'extracting' ? 'bg-brand-gold/10 border-brand-gold/30' :
                  item.status === 'uploading' ? 'bg-brand-gold/15 border-brand-gold/40' :
                  'bg-brand-dark/60 border-brand-gold/10'
                }`}>
                {/* Status icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  {item.status === 'pending' && <FileText size={16} className="text-white/30" />}
                  {item.status === 'extracting' && <RefreshCw size={16} className="text-brand-gold animate-spin" />}
                  {item.status === 'ready' && <FileText size={16} className="text-brand-gold" />}
                  {item.status === 'uploading' && <Upload size={16} className="text-brand-gold animate-bounce" />}
                  {item.status === 'done' && <CheckCircle2 size={16} className="text-brand-eco" />}
                  {item.status === 'error' && <AlertTriangle size={16} className="text-brand-alert" />}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/30 bg-brand-dark/60 px-1.5 py-0.5 rounded shrink-0">{ext}</span>
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {item.status === 'pending' && t('mila.kbQueuePending')}
                    {item.status === 'extracting' && t('mila.kbQueueExtracting')}
                    {item.status === 'ready' && t('mila.kbQueueReady', { count: item.wordCount.toLocaleString() })}
                    {item.status === 'uploading' && t('mila.kbQueueUploading')}
                    {item.status === 'done' && t('mila.kbQueueIndexed')}
                    {item.status === 'error' && (item.error || t('mila.kbQueueFailed'))}
                  </p>
                </div>

                {/* Remove button (only for ready/pending/error) */}
                {(item.status === 'ready' || item.status === 'pending' || item.status === 'error') && (
                  <button onClick={() => removeFromQueue(item.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-brand-alert hover:bg-brand-alert/10 transition-all shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
            </div>
          )}

          {/* Inline row: category pills + auto-chunk toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                const Icon = meta.icon;
                const active = uploadForm.category === cat;
                return (
                  <button key={cat} type="button" onClick={() => setUploadForm({ ...uploadForm, category: cat })}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border ${
                      active ? 'border-transparent' : 'bg-brand-dark/60 border-brand-gold/20 text-white/40 hover:text-white/60'
                    }`}
                    style={active ? { background: `${meta.color}20`, borderColor: `${meta.color}50`, color: meta.color } : {}}>
                    <Icon size={10} style={{ color: active ? meta.color : `${meta.color}80` }} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className={`relative w-8 h-4 rounded-full transition-all ${uploadForm.autoChunk ? 'bg-brand-gold' : 'bg-white/15'}`}>
                <input type="checkbox" checked={uploadForm.autoChunk} onChange={e => setUploadForm({ ...uploadForm, autoChunk: e.target.checked })}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${uploadForm.autoChunk ? 'left-4' : 'left-0.5'}`} />
              </div>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('mila.kbAutoChunk')}</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={handleUpload} disabled={readyCount === 0 || isProcessing}
              className="flex-1 px-5 py-3.5 rounded-xl bg-brand-gold text-brand-dark font-black text-sm uppercase tracking-wider hover:bg-brand-gold/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20 disabled:opacity-40 disabled:cursor-not-allowed">
              {isProcessing ? (
                <><RefreshCw size={16} className="animate-spin" /> {t('mila.kbProcessing')}</>
              ) : (
                <><Upload size={16} /> {t('mila.kbUploadButton', { count: readyCount })}</>
              )}
            </button>
            <button onClick={() => { setShowUpload(false); setFileQueue([]); }}
              className="px-5 py-3.5 rounded-xl bg-brand-dark/60 border border-brand-gold/10 text-white/60 font-bold text-sm uppercase tracking-wider hover:text-white transition-all">
              {t('mila.kbCancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── Document Grid ── */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 items-center justify-center mb-4">
            <RefreshCw size={20} className="animate-spin text-brand-gold/60" />
          </div>
          <p className="text-sm text-white/40 font-medium">{t('mila.kbLoading')}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-[#1c3933]/50 border border-brand-gold/20 rounded-2xl">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-dark/60 border border-brand-gold/20 items-center justify-center mb-4">
            <FileText size={24} className="text-white/20" />
          </div>
          <p className="text-sm text-white/40 font-medium mb-1">
            {documents.length === 0 ? t('mila.kbEmptyNoDocs') : t('mila.kbEmptyNoMatch')}
          </p>
          <p className="text-[11px] text-white/25">
            {documents.length === 0 ? t('mila.kbEmptyStart') : t('mila.kbEmptyAdjust')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredDocs.map((doc, idx) => {
            const meta = CATEGORY_META[doc.category] || CATEGORY_META['general'];
            const Icon = meta.icon;
            return (
              <div
                key={doc.baseTitle}
                className="group relative bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-4 hover:border-brand-gold/40 transition-all overflow-hidden animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${idx * 40}ms`, animationDuration: '400ms' }}
              >
                {/* Category accent bar */}
                <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: meta.color, opacity: 0.5 }} />

                <div className="flex items-center gap-3">
                  {/* Category icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
                  >
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>

                  {/* Document name + date */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate leading-tight mb-1">{doc.baseTitle}</h4>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-white/30 shrink-0" />
                      <span className="text-[10px] text-white/40 font-medium">
                        {new Date(doc.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Preview button — opens original file if available, else text modal */}
                  <button
                    onClick={() => {
                      if (doc.fileUrl) {
                        window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        setPreviewDoc(doc);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold/20 hover:border-brand-gold/50 transition-all shrink-0"
                  >
                    <Eye size={13} />
                    {t('mila.kbPreview')}
                  </button>

                  {/* Delete (hover only) */}
                  <button
                    onClick={() => handleDelete(doc.baseTitle)}
                    className="p-2 rounded-lg text-white/15 hover:text-brand-alert hover:bg-brand-alert/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-[#1c3933] border border-brand-gold/30 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 p-5 border-b border-brand-gold/20">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${CATEGORY_META[previewDoc.category]?.color || '#94A3B8'}15`, border: `1px solid ${CATEGORY_META[previewDoc.category]?.color || '#94A3B8'}30` }}
                >
                  {(() => {
                    const Icon = CATEGORY_META[previewDoc.category]?.icon || FileText;
                    return <Icon size={18} style={{ color: CATEGORY_META[previewDoc.category]?.color || '#94A3B8' }} />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate leading-tight">{previewDoc.baseTitle}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                      {new Date(previewDoc.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
                      {previewDoc.totalWords.toLocaleString()} {t('mila.kbWords')}
                    </span>
                    {previewDoc.chunks.length > 1 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-brand-gold/60">
                          {previewDoc.chunks.length} chunks
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-brand-gold/10 transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body — full content */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-[12px] text-white/60 leading-relaxed whitespace-pre-wrap">
                {previewDoc.chunks.map(c => c.content).join('\n\n')}
              </p>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-brand-gold/20">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                {CATEGORY_META[previewDoc.category]?.label || 'General'}
              </span>
              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-eco/10 border border-brand-eco/30 text-brand-eco font-black text-xs uppercase tracking-wider hover:bg-brand-eco/20 transition-all"
                  >
                    <FileText size={14} />
                    {t('mila.kbPreview')}
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2.5 rounded-xl bg-brand-gold text-brand-dark font-black text-xs uppercase tracking-wider hover:bg-brand-gold/90 transition-all"
                >
                  {t('mila.kbClose')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-brand-dark/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="relative bg-gradient-to-br from-[#1c3933] to-[#152e2a] border border-brand-alert/30 rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)] max-w-[400px] w-[calc(100%-2rem)] animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-alert/15 border border-brand-alert/40 flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.2)]">
                <Trash2 size={28} className="text-brand-alert" />
              </div>
            </div>

            {/* Message */}
            <p className="text-center text-sm text-white/60 leading-relaxed mb-7">{confirmModal.message}</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 border border-brand-gold/15 text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-brand-gold/30 transition-all"
              >
                {t('mila.kbCancel')}
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-1 px-5 py-3.5 rounded-xl bg-brand-alert/20 border border-brand-alert/50 text-brand-alert font-black text-xs uppercase tracking-widest hover:bg-brand-alert/30 hover:border-brand-alert/70 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> {t('mila.kbDelete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MilaKnowledgeManager;
