/**
 * PageIndex Adapter — vectorless RAG
 *
 * Tree building + LLM-guided recursive tree search + two-tier clustering.
 * Trees are stored in knowledge_files.metadata.pageindexTree (jsonb).
 */

import type { PageIndexTree, TreeSearchResult } from '../../pageindex/types';
import type { DocumentPassage } from '../../domain/entities/indexing';
import type { ILLMProvider } from '../../application/ports/llm-provider.port';
import { buildTree } from '../../pageindex/build-tree';
import { searchTree } from '../../pageindex/tree-search';
import { buildFileSystemTree, searchFileSystem } from '../../pageindex/file-system';
import { selectDocumentsByCluster } from './pageindex-cluster.adapter';
import { db } from '../../db';
import { knowledgeFiles, knowledgeCollections } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Re-export clustering for use by indexing use-case
export { clusterDocuments, persistClusters } from './pageindex-cluster.adapter';

// ─── Conversion ─────────────────────────────────────────────────────────────

function treeToPassages(tree: PageIndexTree, results: TreeSearchResult[]): DocumentPassage[] {
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

// ─── Search ─────────────────────────────────────────────────────────────────

export async function searchAllFiles(
  query: string,
  llm: ILLMProvider,
  maxResults: number = 10,
): Promise<{ passages: DocumentPassage[]; trace: string }> {
  const candidates = await selectDocumentsByCluster(query, llm);
  if (candidates.length === 0) return { passages: [], trace: 'No indexed documents found.' };

  const docs = candidates.slice(0, 5);
  const fsTree = await buildFileSystemTree(query, docs, llm);
  const fsResults = await searchFileSystem(query, fsTree, llm);

  const traceParts: string[] = [`Searched ${candidates.length} document${candidates.length > 1 ? 's' : ''}`];
  if (fsResults.length > 0) {
    const docNames = fsResults.map(r => docs.find(f => f.id === r.documentId)?.filename || r.documentId.slice(0, 8));
    traceParts.push(`Selected: ${docNames.join(', ')}`);
  } else {
    traceParts.push('No relevant documents found.');
  }

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

    try {
      const llmResults = await searchTree(query, tree, llm, {
        maxResults: 5,
        maxBranchesPerLevel: 5,
        documentContext: file.summary || undefined,
      });
      if (llmResults.length > 0) {
        allPassages.push(...treeToPassages(tree, llmResults));
        const sections = [...new Set(llmResults.map(r => r.path[r.path.length - 1]))];
        traceParts.push(`${file.filename}: ${sections.slice(0, 3).join(', ')}${sections.length > 3 ? ` +${sections.length - 3} more` : ''}`);
      }
    } catch { /* skip */ }
  }

  return { passages: allPassages.slice(0, maxResults), trace: traceParts.join(' → ') };
}

// ─── Tree Management ────────────────────────────────────────────────────────

export async function buildAndStoreTree(
  fileId: string,
  markdown: string,
  filename: string,
  llm: ILLMProvider,
  summary: string,
): Promise<PageIndexTree> {
  const tree = await buildTree(markdown, filename, llm, { enableSummaries: true });

  const [file] = await db.select({ metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles).where(eq(knowledgeFiles.id, fileId));

  const existingMeta = (file?.metadata || {}) as Record<string, unknown>;
  await db.update(knowledgeFiles)
    .set({
      metadata: { ...existingMeta, pageindexTree: tree },
      status: 'completed' as const,
      hasTree: true,
      progress: 100,
      summary,
    })
    .where(eq(knowledgeFiles.id, fileId));

  return tree;
}

export async function collectionUsesPageIndex(collectionName: string): Promise<boolean> {
  const [col] = await db.select({ id: knowledgeCollections.id })
    .from(knowledgeCollections)
    .where(eq(knowledgeCollections.collectionKey, collectionName));
  return !!col;
}

export async function getFileTree(fileId: string): Promise<PageIndexTree | null> {
  const [file] = await db.select({ metadata: knowledgeFiles.metadata })
    .from(knowledgeFiles)
    .where(eq(knowledgeFiles.id, fileId));
  const meta = (file?.metadata || {}) as Record<string, unknown>;
  return (meta.pageindexTree as PageIndexTree) || null;
}
