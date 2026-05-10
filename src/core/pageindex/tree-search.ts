/**
 * PageIndex Tree Search — Reasoning-based Retrieval
 *
 * Recursive layer-by-layer tree navigation, matching how a human expert reads:
 * scan the table of contents → pick relevant chapters → read them → if partial,
 * continue deeper or follow cross-references.
 *
 * NEVER flattens the entire tree — at each level the LLM sees only immediate children.
 */

import { ILLMProvider } from '../../core/application/ports/llm-provider.port';
import { PageIndexTree, PageIndexNode, TreeSearchResult, SearchOptions } from './types';

// ─── Prompt ───────────────────────────────────────────────────────────────────

const BRANCH_SELECTION_PROMPT = `You are navigating a document to find information.
At the current level, you see section titles and summaries.
Decide which sections are worth opening to answer the query.

Rules:
- Match by meaning, not exact keywords. "E-pioneer" matches "E-Pioneer", "ePioneer", etc.
- A section about "độ tuổi" answers an age question even if the title doesn't mention "tuổi".
- If the document context tells you what the document covers, use it.
- If a section's title seems clearly irrelevant, skip it.
- If unsure, explore the section. Better to check than to miss.
- If NO section seems relevant, return an empty array.

Return JSON:
{
  "selectedIndices": [0, 2],
  "reasoning": "Why these sections were selected"
}`;

// ─── Search logic ─────────────────────────────────────────────────────────────

async function selectBranches(
  query: string,
  children: PageIndexNode[],
  llm: ILLMProvider,
  options: SearchOptions,
): Promise<number[]> {
  if (children.length === 0) return [];

  const childList = children.map((c, i) => {
    const info = c.summary || c.children.map(cc => cc.title).join(', ') || '(leaf)';
    return `[${i}] ${c.title}\n    ${info}`;
  }).join('\n\n');

  const docCtx = options.documentContext
    ? `\nDocument: ${options.documentContext}\n`
    : '';

  try {
    const res = await llm.completion({
      messages: [
        { role: 'system', content: BRANCH_SELECTION_PROMPT },
        { role: 'user', content: `Query: "${query}"${docCtx}\n\nSections:\n${childList}` },
      ],
      jsonMode: true,
      effort: 'low',
      model: options.model,
    });

    const parsed = JSON.parse(res.content || '{}');
    const indices: number[] = Array.isArray(parsed.selectedIndices)
      ? parsed.selectedIndices.filter((i: unknown) => typeof i === 'number' && i >= 0 && i < children.length)
      : [];
    console.warn('[PageIndex] branch:', children[0]?.title?.slice(0, 30), '→ selected', indices.length, 'of', children.length,
      '|', (parsed.reasoning || '').slice(0, 80));
    if (options.onStep) {
      const branchName = children[0]?.title?.slice(0, 50) || '(root)';
      const selectedNames = indices.map(i => children[i].title).join(', ');
      options.onStep(`[${branchName}] chọn ${indices.length}/${children.length}: ${selectedNames || '(bỏ qua)'}`);
    }
    return indices;
  } catch {
    // On error, be permissive — explore all
    return children.map((_, i) => i);
  }
}

async function searchNode(
  query: string,
  node: PageIndexNode,
  path: string[],
  llm: ILLMProvider,
  options: SearchOptions,
): Promise<TreeSearchResult[]> {
  const currentPath = [...path, node.title];

  // Leaf: return content
  if (node.children.length === 0) {
    if (!node.content) return [];
    return [{ node, path: currentPath, relevance: `Leaf: ${node.title}` }];
  }

  // Branch: select relevant children and recurse
  const indices = await selectBranches(query, node.children, llm, options);

  if (indices.length === 0) {
    // Nothing selected — but maybe this node ITSELF has content worth checking
    if (node.content) {
      return [{ node, path: currentPath, relevance: `Branch content: ${node.title}` }];
    }
    return [];
  }

  const results = await Promise.all(
    indices.map(i => searchNode(query, node.children[i], currentPath, llm, options)),
  );

  const flat = results.flat();
  if (flat.length === 0 && node.content) {
    // Branches explored but nothing found — include this node's own content as context
    return [{ node, path: currentPath, relevance: `Fallback context: ${node.title}` }];
  }

  return flat.slice(0, options.maxResults ?? 5);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function searchTree(
  query: string,
  tree: PageIndexTree,
  llm: ILLMProvider,
  options: SearchOptions = {},
): Promise<TreeSearchResult[]> {
  return searchNode(query, tree.root, [], llm, options);
}

/**
 * Greedy keyword fallback — used only when LLM search completely fails.
 */
export function greedySearch(query: string, tree: PageIndexTree, maxResults: number = 5): TreeSearchResult[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length >= 2);

  const results: TreeSearchResult[] = [];

  function walk(node: PageIndexNode, path: string[]) {
    const currentPath = [...path, node.title];
    if (node.children.length === 0 && node.content) {
      const contentLower = node.content.toLowerCase();
      const matchCount = queryTerms.filter(t => contentLower.includes(t)).length;
      if (matchCount > 0) {
        results.push({ node, path: currentPath, relevance: `Keyword: ${matchCount}/${queryTerms.length}` });
      }
    }
    for (const child of node.children) walk(child, currentPath);
  }

  walk(tree.root, []);
  return results.sort((a, b) => b.relevance.length - a.relevance.length).slice(0, maxResults);
}
