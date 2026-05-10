/**
 * PageIndex Clustering — auto-assign documents to topic clusters for two-tier retrieval.
 */
import type { ILLMProvider } from '../../application/ports/llm-provider.port';
import { db } from '../../db';
import { knowledgeFiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

export async function selectDocumentsByCluster(
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
