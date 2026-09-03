import { supabase } from './supabase';

// ── Types ──
export interface MilaDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  file_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  rank: number;
}

// ── Chunk a long text into smaller pieces for better retrieval ──
// No overlap — each chunk is unique content to avoid duplicates
export function chunkText(text: string, maxChunkSize = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > maxChunkSize && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── Upload a document (auto-chunks if large, dedup by title+source) ──
export async function uploadDocument(
  title: string,
  content: string,
  source = 'manual',
  category = 'general',
  autoChunk = true,
  file?: File
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Dedup: check if documents with the same title prefix already exist
    const baseTitle = title.replace(/ \(Part \d+\/\d+\)$/, '');
    const { data: existing } = await supabase
      .from('mila_documents')
      .select('id')
      .ilike('title', `${baseTitle}%`)
      .eq('source', source)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, count: 0, error: 'Document already exists (skipped duplicate)' };
    }

    // Upload original file to storage (if provided)
    let fileUrl: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const safeName = baseTitle.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase();
      const filePath = `${Date.now()}-${safeName}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('mila-documents')
        .upload(filePath, file, { contentType: file.type || 'application/octet-stream' });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('mila-documents')
          .getPublicUrl(filePath);
        fileUrl = urlData?.publicUrl || null;
      }
      // If upload fails, continue without file_url (text-only fallback)
    }

    if (!autoChunk || content.length <= 600) {
      const { error } = await supabase.from('mila_documents').insert({
        title, content, source, category, file_url: fileUrl
      });
      if (error) {
        // Retry without file_url if column doesn't exist yet
        if (error.message.includes('file_url') || error.code === '42703') {
          const { error: retryError } = await supabase.from('mila_documents').insert({
            title, content, source, category
          });
          if (retryError) return { success: false, count: 0, error: retryError.message };
        } else {
          return { success: false, count: 0, error: error.message };
        }
      }
      return { success: true, count: 1 };
    }

    // Chunk and insert each piece (no overlap = no duplicate content)
    const chunks = chunkText(content);
    const rows = chunks.map((chunk, i) => ({
      title: chunks.length > 1 ? `${title} (Part ${i + 1}/${chunks.length})` : title,
      content: chunk,
      source,
      category,
      file_url: i === 0 ? fileUrl : null, // Store file_url on first chunk only
    }));
    const { error } = await supabase.from('mila_documents').insert(rows);
    if (error) {
      // Retry without file_url if column doesn't exist yet
      if (error.message.includes('file_url') || error.code === '42703') {
        const fallbackRows = rows.map(({ file_url, ...rest }) => rest);
        const { error: retryError } = await supabase.from('mila_documents').insert(fallbackRows);
        if (retryError) return { success: false, count: 0, error: retryError.message };
      } else {
        return { success: false, count: 0, error: error.message };
      }
    }
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

// ── Search: full-text first, fuzzy fallback ──
export async function searchDocuments(query: string, matchCount = 5): Promise<SearchResult[]> {
  try {
    // 1. Try full-text search
    const { data: ftsResults, error: ftsError } = await supabase.rpc('match_mila_documents', {
      query_text: query,
      match_count: matchCount
    });

    if (!ftsError && ftsResults && ftsResults.length > 0) {
      return ftsResults as SearchResult[];
    }

    // 2. Fallback to fuzzy trigram search
    const { data: fuzzyResults, error: fuzzyError } = await supabase.rpc('fuzzy_mila_documents', {
      query_text: query,
      match_count: matchCount,
      similarity_threshold: 0.1
    });

    if (!fuzzyError && fuzzyResults) {
      return fuzzyResults.map((r: any) => ({
        ...r,
        rank: r.similarity
      })) as SearchResult[];
    }

    return [];
  } catch (err) {
    console.error('[Mila RAG] Search error:', err);
    return [];
  }
}

// ── Retrieve and format context for the LLM prompt ──
export async function retrieveContext(query: string, matchCount = 5): Promise<string> {
  const results = await searchDocuments(query, matchCount);
  if (results.length === 0) return '';

  const formatted = results.map((r, i) => {
    const snippet = r.content.length > 800 ? r.content.substring(0, 800) + '...' : r.content;
    return `[${i + 1}] ${r.title}\n${snippet}`;
  }).join('\n\n---\n\n');

  return formatted;
}

// ── Get a summary index of all documents (titles + counts) for meta-queries ──
export async function getKnowledgeBaseIndex(): Promise<{ total: number; titles: string[]; totalWords: number } | null> {
  try {
    const { data, error } = await supabase
      .from('mila_documents')
      .select('title, content');

    if (error || !data || data.length === 0) return null;

    // Group by base title (strip " (Part X/Y)" suffix)
    const uniqueTitles = new Set<string>();
    let totalWords = 0;
    data.forEach(d => {
      const base = d.title.replace(/ \(Part \d+\/\d+\)$/, '');
      uniqueTitles.add(base);
      totalWords += d.content.split(/\s+/).length;
    });

    return {
      total: uniqueTitles.size,
      titles: Array.from(uniqueTitles).sort(),
      totalWords,
    };
  } catch (err) {
    console.error('[Mila RAG] Index error:', err);
    return null;
  }
}

// ── List all documents (for admin UI) ──
export async function listDocuments(): Promise<MilaDocument[]> {
  const { data, error } = await supabase
    .from('mila_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Mila RAG] List error:', error);
    return [];
  }
  return data as MilaDocument[];
}

// ── Delete a document and all its chunks (by base title) ──
export async function deleteDocumentGroup(baseTitle: string): Promise<boolean> {
  const { error } = await supabase
    .from('mila_documents')
    .delete()
    .ilike('title', `${baseTitle}%`);
  return !error;
}

// ── Delete a single document by id ──
export async function deleteDocument(id: string): Promise<boolean> {
  const { error } = await supabase.from('mila_documents').delete().eq('id', id);
  return !error;
}

// ── Update a document ──
export async function updateDocument(
  id: string,
  updates: { title?: string; content?: string; category?: string }
): Promise<boolean> {
  const { error } = await supabase
    .from('mila_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// ── Seed the knowledge base from mila.knowledge.txt ──
export async function seedKnowledgeBase(knowledgeText: string): Promise<{ success: boolean; count: number; error?: string }> {
  // Check if already seeded
  const { data: existing } = await supabase
    .from('mila_documents')
    .select('id')
    .eq('source', 'knowledge_base')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, count: 0 }; // Already seeded
  }

  // Parse sections from the knowledge file
  const sections = knowledgeText.split(/^SECTION \d+:/m).filter(s => s.trim());
  const titles = knowledgeText.match(/^SECTION \d+:[^\n]+/gm) || [];

  const rows: { title: string; content: string; source: string; category: string }[] = [];

  // If we found sections, insert them individually
  if (titles.length > 0 && sections.length === titles.length) {
    for (let i = 0; i < titles.length; i++) {
      rows.push({
        title: titles[i].trim(),
        content: sections[i].trim(),
        source: 'knowledge_base',
        category: 'esg_criteria'
      });
    }
  } else {
    // Fallback: insert as one document
    rows.push({
      title: 'Mila Knowledge Base v2026.1',
      content: knowledgeText,
      source: 'knowledge_base',
      category: 'esg_criteria'
    });
  }

  const { error } = await supabase.from('mila_documents').insert(rows);
  if (error) return { success: false, count: 0, error: error.message };
  return { success: true, count: rows.length };
}

// ── Check if knowledge base is seeded ──
export async function isKnowledgeBaseSeeded(): Promise<boolean> {
  const { data, error } = await supabase
    .from('mila_documents')
    .select('id')
    .eq('source', 'knowledge_base')
    .limit(1);

  if (error) return false;
  return !!(data && data.length > 0);
}

// ── Remove duplicate documents (keeps oldest, deletes rest with same title) ──
export async function removeDuplicates(): Promise<{ removed: number; remaining: number }> {
  // Fetch all documents
  const { data: allDocs, error } = await supabase
    .from('mila_documents')
    .select('id, title, created_at')
    .order('created_at', { ascending: true });

  if (error || !allDocs) return { removed: 0, remaining: 0 };

  // Group by title, keep first (oldest), mark rest for deletion
  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const doc of allDocs) {
    if (seen.has(doc.title)) {
      toDelete.push(doc.id);
    } else {
      seen.add(doc.title);
    }
  }

  if (toDelete.length === 0) return { removed: 0, remaining: allDocs.length };

  // Delete in batches of 100 (Supabase limit)
  for (let i = 0; i < toDelete.length; i += 100) {
    const batch = toDelete.slice(i, i + 100);
    await supabase.from('mila_documents').delete().in('id', batch);
  }

  return { removed: toDelete.length, remaining: allDocs.length - toDelete.length };
}

// ── Clear all documents (nuclear option) ──
export async function clearAllDocuments(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('mila_documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) return { success: false, error: error.message };
  return { success: true };
}
