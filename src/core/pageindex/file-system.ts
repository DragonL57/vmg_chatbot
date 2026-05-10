/**
 * PageIndex File System — Scalable Multi-Tier Implementation
 *
 * Strategy for 1000+ documents:
 *   1. Pre-cluster: periodically group documents by summary using LLM into topics.
 *   2. Query-time: one LLM call selects relevant clusters (≤50 cluster labels → ~1K tokens).
 *   3. Build query-dependent tree only from documents in selected clusters.
 *   4. Cap at 5 documents for internal tree search.
 */

import { ILLMProvider } from '../application/ports/llm-provider.port';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FSTopicNode {
  id: string;
  label: string;
  description: string;
  children: FSTopicNode[];
  documentIds: string[];
}

export interface FSLeafNode {
  id: string;
  filename: string;
  summary: string;
}

export interface FileSystemTree {
  root: FSTopicNode;
  documents: Map<string, FSLeafNode>;
  totalNodes: number;
  generatedAt: string;
}

export interface FSSearchResult {
  documentId: string;
  path: string[];
  reasoning: string;
}

// ─── Query-Dependent Tree Builder ────────────────────────────────────────────

const TREE_BUILDER_PROMPT = `You are building a hierarchical file index for document retrieval.
Given a user query and a list of documents with summaries, organize them into a topic tree.

Rules:
- Group related documents under topic nodes. A document CAN appear under MULTIPLE topics.
- Create topic labels that are specific and search-friendly.
- The tree should help answer THIS specific query — organize by what matters for this question.
- If only 1-2 documents exist, a flat structure is fine.

Return JSON:
{
  "topics": [{ "label": "...", "description": "...", "children": [...], "documentIndices": [0] }],
  "unassignedIndices": [],
  "thinking": "Brief reasoning"
}`;

interface TopicSpec { label: string; description: string; children?: TopicSpec[]; documentIndices?: number[]; }

export async function buildFileSystemTree(
  query: string, documents: { id: string; filename: string; summary?: string | null }[], llm: ILLMProvider,
): Promise<FileSystemTree> {
  if (documents.length === 0) {
    return { root: { id: 'root', label: 'Root', description: '', children: [], documentIds: [] }, documents: new Map(), totalNodes: 0, generatedAt: new Date().toISOString() };
  }

  const docMap = new Map<string, FSLeafNode>();
  for (const d of documents) docMap.set(d.id, { id: d.id, filename: d.filename, summary: d.summary || '' });

  const docList = documents.map((d, i) => `[${i}] ${d.filename}${d.summary ? `\n    ${d.summary}` : ''}`).join('\n\n');
  const assigned = new Set<number>();
  let topics: TopicSpec[] = [];

  try {
    const res = await llm.completion({
      messages: [{ role: 'system', content: TREE_BUILDER_PROMPT }, { role: 'user', content: `Query: "${query}"\n\nDocuments:\n${docList}` }],
      jsonMode: true, effort: 'low',
    });
    const parsed = JSON.parse(res.content || '{}');
    topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    for (const t of topics) collectAssigned(t, assigned);
  } catch { /* fallback: all docs under root */ }

  const topicNodes = topics.map(t => buildTopicNode(t, documents));
  const unassigned = documents.filter((_, i) => !assigned.has(i)).map(d => d.id);

  return {
    root: { id: 'root', label: 'All Documents', description: '', children: topicNodes, documentIds: topicNodes.length === 0 ? documents.map(d => d.id) : unassigned },
    documents: docMap,
    totalNodes: countNodes({ id: 'root', label: 'Root', description: '', children: topicNodes, documentIds: unassigned }),
    generatedAt: new Date().toISOString(),
  };
}

function collectAssigned(t: TopicSpec, assigned: Set<number>) { if (t.documentIndices) t.documentIndices.forEach(i => assigned.add(i)); if (t.children) t.children.forEach(c => collectAssigned(c, assigned)); }
function buildTopicNode(s: TopicSpec, docs: { id: string }[]): FSTopicNode { return { id: randomUUID(), label: s.label, description: s.description || '', children: (s.children || []).map(c => buildTopicNode(c, docs)), documentIds: (s.documentIndices || []).map(i => docs[i]?.id).filter(Boolean) as string[] }; }
function countNodes(n: FSTopicNode): number { let c = 1 + n.documentIds.length; for (const child of n.children) c += countNodes(child); return c; }

// ─── File System Searcher ────────────────────────────────────────────────────

const FS_SEARCH_PROMPT = `You are navigating a document index tree.
At the current node, decide how to proceed:
- "layer": return child nodes to explore (their labels are informative)
- "flatten": collapse to leaf document IDs (labels uninformative, go straight to docs)
Return JSON: { "strategy": "layer"|"flatten", "childIndices": [0], "documentIds": [], "reasoning": "..." }`;

function addResult(results: FSSearchResult[], id: string, path: string[], reasoning: string) { if (!results.some(r => r.documentId === id)) results.push({ documentId: id, path, reasoning }); }
function collectAllDocIds(n: FSTopicNode): string[] { return [...new Set([...n.documentIds, ...n.children.flatMap(collectAllDocIds)])]; }
function docsUnder(n: FSTopicNode): number { return n.documentIds.length + n.children.reduce((s, c) => s + docsUnder(c), 0); }

async function navigateBranch(
  query: string, node: FSTopicNode, currentPath: string[],
  documents: Map<string, FSLeafNode>, llm: ILLMProvider, results: FSSearchResult[],
): Promise<void> {
  const childList = node.children.map((c, i) => `[${i}] ${c.label}: ${c.description} (${c.documentIds.length + docsUnder(c)} docs)`).join('\n');
  const directDocs = node.documentIds.map(id => documents.get(id)).filter(Boolean).map(d => `${d!.filename}: ${d!.summary.slice(0, 100)}`).join('\n');
  try {
    const res = await llm.completion({
      messages: [{ role: 'system', content: FS_SEARCH_PROMPT }, { role: 'user', content: `Query: "${query}"\nPath: ${currentPath.join(' > ')}\n\nChild topics:\n${childList}\n${directDocs ? `\nDirect documents:\n${directDocs}` : ''}` }],
      jsonMode: true, effort: 'low',
    });
    const p = JSON.parse(res.content || '{}');
    if (p.strategy === 'flatten') { for (const id of collectAllDocIds(node)) addResult(results, id, currentPath, p.reasoning || ''); return; }
    const idxs: number[] = Array.isArray(p.childIndices) ? p.childIndices.filter((i: unknown) => typeof i === 'number' && i >= 0 && i < node.children.length) : node.children.map((_, i) => i);
    for (const idx of idxs) await searchFSNode(query, node.children[idx], currentPath, documents, llm, results);
  } catch { for (const child of node.children) await searchFSNode(query, child, currentPath, documents, llm, results); }
  for (const id of node.documentIds) addResult(results, id, currentPath, 'Direct document');
}

async function searchFSNode(query: string, node: FSTopicNode, path: string[], documents: Map<string, FSLeafNode>, llm: ILLMProvider, results: FSSearchResult[]): Promise<void> {
  const currentPath = [...path, node.label];
  if (node.children.length > 0) { await navigateBranch(query, node, currentPath, documents, llm, results); return; }
  for (const id of node.documentIds) addResult(results, id, currentPath, 'Leaf topic');
}

export async function searchFileSystem(query: string, tree: FileSystemTree, llm: ILLMProvider): Promise<FSSearchResult[]> {
  if (tree.documents.size === 0) return [];
  const results: FSSearchResult[] = [];
  await searchFSNode(query, tree.root, [], tree.documents, llm, results);
  return results;
}
