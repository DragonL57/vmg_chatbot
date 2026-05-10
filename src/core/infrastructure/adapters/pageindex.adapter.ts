/**
 * PageIndex Adapter — vectorless RAG integration
 *
 * Hierarchical tree building + LLM-guided recursive tree search.
 * Trees are stored in knowledge_files.metadata.pageindexTree (jsonb).
 */

import type { PageIndexTree, TreeSearchResult } from '../../pageindex/types';
import type { DocumentPassage } from '../../domain/entities/indexing';
import type { ILLMProvider } from '../../application/ports/llm-provider.port';
import { buildTree } from '../../pageindex/build-tree';
import { searchTree } from '../../pageindex/tree-search';
import { buildFileSystemTree, searchFileSystem } from '../../pageindex/file-system';
import { db } from '../../db';
import { knowledgeFiles, knowledgeCollections } from '../../db/schema';
import { eq } from 'drizzle-orm';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function treeToPassages(
  tree: PageIndexTree,
  results: TreeSearchResult[],
): DocumentPassage[] {
  return results.map((r, i) => ({
    id: r.node.id,
    title: r.node.title,
    content: r.node.content || '',
    source: tree.sourceFile,
    parentContent: r.path.join(' > '),
    metadata: { path: r.path, relevance: r.relevance },
    score: 1 - i * 0.1,
  }));
}

// ─── Clustering (Two-Tier FS) ─────────────────────────────────────────────────

const CLUSTER_PROMPT = `Assign document to 1-3 topic clusters (kebab-case, max 20 chars).
Return JSON: { "clusters": ["label-1", "label-2"] }`;

export async function clusterDocuments(
  documents: { id: string; filename: string; summary?: string | null }[],
  llm: ILLMProvider,
): Promise<Map<string, string[]>> {
  const assignments = new Map<string, string[]>();
  for (const doc of documents) {
    if (!doc.summary) { assignments.set(doc.id, ['uncategorized']); continue; }
    try {
      const res = await llm.completion({
        messages: [{ role: 'system', content: CLUSTER_PROMPT }, { role: 'user', content: doc.summary.slice(0, 500) }],
        jsonMode: true, effort: 'low',
      });
      const parsed = JSON.parse(res.content || '{}');
      assignments.set(doc.id, (Array.isArray(parsed.clusters) ? parsed.clusters : ['uncategorized']).slice(0, 3));
    } catch { assignments.set(doc.id, ['uncategorized']); }
  }
  return assignments;
}

export async function persistClusters(assignments: Map<string, string[]>): Promise<void> {
  for (const [id, clusters] of assignments) {
    const [file] = await db.select({ metadata: knowledgeFiles.metadata }).from(knowledgeFiles).where(eq(knowledgeFiles.id, id));
    const existing = (file?.metadata || {}) as Record<string, unknown>;
    await db.update(knowledgeFiles).set({ metadata: { ...existing, clusters } }).where(eq(knowledgeFiles.id, id));
  }
}

async function getAllClusters(): Promise<string[]> {
  const files = await db.select({ metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles).where(eq(knowledgeFiles.hasTree, true));
  const labelSet = new Set<string>();
  for (const f of files) {
    const c = ((f.metadata || {}) as Record<string, unknown>).clusters as string[] | undefined;
    if (c) c.forEach(l => labelSet.add(l));
  }
  return [...labelSet];
}

const CLUSTER_SELECT_PROMPT = `Select relevant document clusters for a query.
Return JSON: { "selectedClusters": ["label-1"], "reasoning": "..." }`;

async function selectDocumentsByCluster(
  query: string, llm: ILLMProvider,
): Promise<{ id: string; filename: string; summary?: string | null }[]> {
  const clusters = await getAllClusters();
  if (clusters.length === 0) {
    return db.select({ id: knowledgeFiles.id, filename: knowledgeFiles.filename, summary: knowledgeFiles.summary })
      .from(knowledgeFiles).where(eq(knowledgeFiles.hasTree, true)).limit(20);
  }
  if (clusters.length <= 3) {
    return db.select({ id: knowledgeFiles.id, filename: knowledgeFiles.filename, summary: knowledgeFiles.summary })
      .from(knowledgeFiles).where(eq(knowledgeFiles.hasTree, true));
  }

  let selected = new Set(clusters);
  try {
    const res = await llm.completion({
      messages: [{ role: 'system', content: CLUSTER_SELECT_PROMPT },
        { role: 'user', content: `Query: "${query}"\n\nClusters:\n${clusters.map((c, i) => `[${i}] ${c}`).join('\n')}` }],
      jsonMode: true, effort: 'low',
    });
    const p = JSON.parse(res.content || '{}');
    const s: string[] = Array.isArray(p.selectedClusters) ? p.selectedClusters : [];
    if (s.length > 0) selected = new Set(s);
  } catch { /* fallback: all clusters */ }

  const files = await db.select({ id: knowledgeFiles.id, filename: knowledgeFiles.filename, summary: knowledgeFiles.summary, metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles).where(eq(knowledgeFiles.hasTree, true));

  return files.filter(f => {
    const fc = (((f.metadata || {}) as Record<string, unknown>).clusters as string[]) || ['uncategorized'];
    return fc.some(c => selected.has(c));
  }).map(f => ({ id: f.id, filename: f.filename, summary: f.summary }));
}

// ─── File System Layer ───────────────────────────────────────────────────────

/**
 * Search all files with PageIndex trees using the full File System.
 *
 * 1. Build query-dependent virtual topic tree from all document summaries
 * 2. Navigate the topic tree with layer-wise/flatten strategies
 * 3. For each selected document, search its internal PageIndex tree
 */
export async function searchAllFiles(
  query: string,
  llm: ILLMProvider,
  maxResults: number = 10,
): Promise<{ passages: DocumentPassage[]; trace: string }> {
  // 1. Two-tier selection: clusters → documents (scales to 1000+ files)
  const candidates = await selectDocumentsByCluster(query, llm);
  if (candidates.length === 0) return { passages: [], trace: 'No indexed documents found.' };

  // Cap at 5 documents for internal tree search
  const docs = candidates.slice(0, 5);

  // 2. Build query-dependent FS tree from selected documents only
  const fsTree = await buildFileSystemTree(query, docs, llm);

  // 3. Navigate the file system tree
  const fsResults = await searchFileSystem(query, fsTree, llm);

  // Build the trace
  const traceParts: string[] = [];
  traceParts.push(`Searched ${candidates.length} document${candidates.length > 1 ? 's' : ''}`);
  if (fsResults.length > 0) {
    const docNames = fsResults.map(r => docs.find(f => f.id === r.documentId)?.filename || r.documentId.slice(0, 8));
    traceParts.push(`Selected: ${docNames.join(', ')}`);
  } else {
    traceParts.push('No relevant documents found.');
  }

  // 4. For each selected document, search its internal PageIndex tree
  const allPassages: DocumentPassage[] = [];
  const seenIds = new Set<string>();

  for (const result of fsResults) {
    if (seenIds.has(result.documentId)) continue;
    seenIds.add(result.documentId);

    const file = docs.find(f => f.id === result.documentId);
    if (!file) continue;

    const fileRecord = await db.select({ metadata: knowledgeFiles.metadata, summary: knowledgeFiles.summary })
      .from(knowledgeFiles).where(eq(knowledgeFiles.id, file.id)).limit(1);
    const meta = (fileRecord[0]?.metadata || {}) as Record<string, unknown>;
    const tree = meta.pageindexTree as PageIndexTree | undefined;
    if (!tree) continue;

    console.warn('[PageIndex] searching doc:', file.filename, { nodes: tree.totalNodes, depth: tree.depth });

    try {
      const llmResults = await searchTree(query, tree, llm, {
        maxResults: 5,
        maxBranchesPerLevel: 5,
        documentContext: file.summary || undefined,
      });
      console.warn('[PageIndex] doc results:', { file: file.filename, found: llmResults.length, sections: llmResults.map(r => r.path[r.path.length - 1]).join(', ') });
      if (llmResults.length > 0) {
        const passageList = treeToPassages(tree, llmResults);
        allPassages.push(...passageList);
        const sections = [...new Set(llmResults.map(r => r.path[r.path.length - 1]))];
        traceParts.push(`${file.filename}: ${sections.slice(0, 3).join(', ')}${sections.length > 3 ? ` +${sections.length - 3} more` : ''}`);
      }
    } catch {
      // Tree search failed — skip this document
    }
  }

  return { passages: allPassages.slice(0, maxResults), trace: traceParts.join(' → ') };
}

/**
 * Build a PageIndex tree from document content and store it in the DB.
 */
export async function buildAndStoreTree(
  fileId: string,
  markdown: string,
  filename: string,
  llm: ILLMProvider,
  summary: string,
): Promise<PageIndexTree> {
  const tree = await buildTree(markdown, filename, llm, { enableSummaries: true });

  // Read existing metadata to preserve non-pageindex fields
  const [file] = await db.select({ metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.id, fileId));

  const existingMeta = (file?.metadata || {}) as Record<string, unknown>;
  const mergedMeta = { ...existingMeta, pageindexTree: tree };
  await db.update(knowledgeFiles)
    .set({
      metadata: mergedMeta,
      status: 'completed' as const,
      hasTree: true,
      progress: 100,
      summary,
    })
    .where(eq(knowledgeFiles.id, fileId));

  return tree;
}

/**
 * Check if a collection exists. All collections use PageIndex.
 */
export async function collectionUsesPageIndex(collectionName: string): Promise<boolean> {
  const [col] = await db.select({ id: knowledgeCollections.id })
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.collectionKey, collectionName));
  return !!col;
}

/**
 * Get the tree for a specific file, if one exists.
 */
export async function getFileTree(fileId: string): Promise<PageIndexTree | null> {
  const [file] = await db.select({ metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.id, fileId));

  const meta = (file?.metadata || {}) as Record<string, unknown>;
  return (meta.pageindexTree as PageIndexTree) || null;
}
