/**
 * PageIndex Tree Builder
 *
 * Takes document text (markdown) and builds a hierarchical tree index:
 * 1. Parses markdown headings to create section nodes
 * 2. Optionally enriches each node with an LLM-generated summary
 * 3. Outputs a PageIndexTree ready for reasoning-based search
 *
 * Inspired by PageIndex (Vectify AI) — reasoning-based retrieval via tree search.
 */

import { randomUUID } from 'crypto';
import { ILLMProvider } from '../../core/application/ports/llm-provider.port';
import { PageIndexNode, PageIndexTree, BuildTreeOptions } from './types';

// ─── Heading parsing ──────────────────────────────────────────────────────────

const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;

interface HeadingEntry {
  level: number;
  title: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse markdown headings and their content ranges.
 */
function parseHeadings(markdown: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = HEADING_RE.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      title: match[2].trim(),
      startIndex: match.index,
      endIndex: markdown.length, // placeholder — set below
    });
  }

  // Set endIndex of each heading to the startIndex of the next one
  for (let i = 0; i < headings.length; i++) {
    headings[i].endIndex = i + 1 < headings.length
      ? headings[i + 1].startIndex
      : markdown.length;
  }

  return headings;
}

// ─── Tree construction ────────────────────────────────────────────────────────

/**
 * Build a nesting tree from flat heading entries.
 * Each heading becomes a node; children are headings with a higher level
 * that appear between this heading and the next heading of same or lower level.
 */
function buildNodeTree(headings: HeadingEntry[], markdown: string, startIdx: number = 0, parentLevel: number = 0): { nodes: PageIndexNode[]; consumed: number } {
  const nodes: PageIndexNode[] = [];
  let i = startIdx;

  while (i < headings.length) {
    const h = headings[i];

    // Stop if we've gone up a level (encountered a heading at parent or lower level)
    if (h.level <= parentLevel) break;

    // Extract content of this section (between this heading and its end)
    const content = markdown.slice(h.startIndex, h.endIndex).trim();

    // Build children from subsequent headings at a deeper level
    const { nodes: children, consumed } = buildNodeTree(headings, markdown, i + 1, h.level);

    const node: PageIndexNode = {
      id: randomUUID(),
      title: h.title,
      level: h.level,
      children,
      startIndex: h.startIndex,
      endIndex: h.endIndex,
      // Leaf nodes carry content; branch nodes store it too for full-text retrieval
      content: children.length === 0 ? content : undefined,
    };

    nodes.push(node);
    i += 1 + consumed; // skip past consumed children
  }

  return { nodes, consumed: i - startIdx };
}

/**
 * Compute tree metadata (total nodes, depth).
 */
function computeTreeStats(node: PageIndexNode, currentDepth: number): { total: number; maxDepth: number } {
  let total = 1;
  let maxDepth = currentDepth;
  for (const child of node.children) {
    const stats = computeTreeStats(child, currentDepth + 1);
    total += stats.total;
    maxDepth = Math.max(maxDepth, stats.maxDepth);
  }
  return { total, maxDepth };
}

// ─── LLM enrichment ───────────────────────────────────────────────────────────

const SECTION_SUMMARY_PROMPT = `You are a document indexing assistant.
Given a document section, produce a concise summary (1-2 sentences) of what this section covers.
Focus on topics, key terms, and what questions this section can answer.
Return ONLY a JSON object with a single key "summary".`;

/**
 * Generate an LLM summary for a single node (and recursively for its children).
 */
async function enrichNode(
  node: PageIndexNode,
  llm: ILLMProvider,
  options: BuildTreeOptions,
): Promise<PageIndexNode> {
  if (!options.enableSummaries) return node;

  // Determine what text to summarize
  // - Leaf nodes: use the node's own content
  // - Branch nodes: use child titles + actual text (up to 500 chars) for richer context
  const leafContent = node.content ?? '';
  const branchPreview = node.children.map(c => c.title).join(', ');
  const actualText = node.content ?? '';
  const contentToSummarize = leafContent || branchPreview || actualText.slice(0, 500);

  // Skip summarization only if there's truly nothing to summarize
  if (!contentToSummarize || contentToSummarize.length < 10) {
    return { ...node, children: await Promise.all(node.children.map(c => enrichNode(c, llm, options))) };
  }

  try {
    const res = await llm.completion({
      messages: [
        { role: 'system', content: SECTION_SUMMARY_PROMPT },
        { role: 'user', content: `Section title: ${node.title}\n\nContent:\n${contentToSummarize.slice(0, 2000)}` },
      ],
      jsonMode: true,
      effort: 'low',
      model: options.model,
    });
    const parsed = JSON.parse(res.content || '{}');
    const summary = typeof parsed.summary === 'string' ? parsed.summary : undefined;

    return {
      ...node,
      summary: summary ?? node.title,
      children: await Promise.all(node.children.map(c => enrichNode(c, llm, options))),
    };
  } catch {
    // Fallback: use title as summary
    return {
      ...node,
      summary: node.title,
      children: await Promise.all(node.children.map(c => enrichNode(c, llm, options))),
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a PageIndex tree from markdown document text.
 *
 * @param markdown - The full document text (markdown format)
 * @param sourceFile - Filename or identifier for the source
 * @param llm - LLM provider for summary generation
 * @param options - Build options
 * @returns A PageIndexTree ready for tree-search retrieval
 */
export async function buildTree(
  markdown: string,
  sourceFile: string,
  llm: ILLMProvider,
  options: BuildTreeOptions = {},
): Promise<PageIndexTree> {
  const headings = parseHeadings(markdown);
  const { nodes } = buildNodeTree(headings, markdown);

  // If no headings found, treat the entire document as a single leaf node
  const children = nodes.length > 0
    ? nodes
    : [{
        id: randomUUID(),
        title: sourceFile,
        level: 1,
        children: [],
        content: markdown,
      }];

  // Determine document title (first H1, or filename)
  const docTitle = headings.find(h => h.level === 1)?.title ?? sourceFile;

  // Create a virtual root that holds all top-level sections
  const root: PageIndexNode = {
    id: randomUUID(),
    title: docTitle,
    level: 0,
    children,
  };

  // Enrich with LLM summaries
  const enrichedRoot = options.enableSummaries
    ? await enrichNode(root, llm, options)
    : root;

  const stats = computeTreeStats(enrichedRoot, 1);

  return {
    sourceFile,
    documentTitle: docTitle,
    root: enrichedRoot,
    totalNodes: stats.total,
    depth: stats.maxDepth,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Collect all leaf nodes from the tree (useful for flat fallback search).
 */
export function collectLeaves(node: PageIndexNode, path: string[] = []): { node: PageIndexNode; path: string[] }[] {
  if (node.children.length === 0) {
    return [{ node, path: [...path, node.title] }];
  }
  return node.children.flatMap(c => collectLeaves(c, [...path, node.title]));
}

/**
 * Serialize the tree to a pretty-printed JSON string.
 */
export function serializeTree(tree: PageIndexTree): string {
  return JSON.stringify(tree, null, 2);
}

/**
 * Load a tree from a JSON string.
 */
export function deserializeTree(json: string): PageIndexTree {
  return JSON.parse(json) as PageIndexTree;
}
