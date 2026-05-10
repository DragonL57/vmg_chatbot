/**
 * PageIndex Experiment — Query Script
 *
 * @file CLI dev tool — console output is intentional
 */
/* eslint-disable no-console */

/**
 * Loads a PageIndex tree JSON and performs reasoning-based tree search.
 * Uses Inception Labs LLM for branch selection (via dotenv -e .env.local).
 *
 * Usage:
 *   dotenv -e .env.local -- npx tsx src/core/pageindex/scripts/query.ts <tree.json> "your question"
 *   dotenv -e .env.local -- npx tsx src/core/pageindex/scripts/query.ts --greedy <tree.json> "your question"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { deserializeTree } from '../build-tree';
import { searchTree, greedySearch } from '../tree-search';
import { completion } from '../llm-client';
import type { ILLMProvider } from '../../../core/application/ports/llm-provider.port';
import type { TreeSearchResult } from '../types';

function createExperimentLLM(): ILLMProvider {
  return {
    completion: async (params) => {
      const res = await completion({
        messages: params.messages,
        jsonMode: params.jsonMode,
        effort: params.effort || 'low',
        model: params.model,
      });
      return {
        content: res.content,
        usage: res.usage,
        model: params.model || 'mercury-2',
      };
    },
  };
}

function printResults(results: TreeSearchResult[], query: string, method: string, elapsed: string) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Query: "${query}"`);
  console.log(`Method: ${method} | Results: ${results.length} | Time: ${elapsed}s`);
  console.log(`${'═'.repeat(60)}`);

  if (results.length === 0) {
    console.log('\n  No relevant sections found.');
    return;
  }

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`\n── Result ${i + 1} ──`);
    console.log(`  Path:  ${r.path.filter(p => p.length > 0).join(' > ')}`);
    console.log(`  Why:   ${r.relevance}`);
    const content = r.node.content || '';
    const preview = content.slice(0, 400).replace(/\n/g, '\n  ');
    console.log(`  Text:  ${preview}${content.length > 400 ? '...' : ''}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const greedy = args.includes('--greedy');
  const showTree = args.includes('--tree');
  const maxFlagIdx = args.indexOf('--max');
  const maxResults = maxFlagIdx >= 0 ? parseInt(args[maxFlagIdx + 1]) || 5 : 5;

  // Positional: filter out flags and their values
  const valueFlags = new Set(['--output', '--model', '--max']);
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      // Skip flag and its value only for value flags
      if (valueFlags.has(args[i]) && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        i++;
      }
    } else {
      positional.push(args[i]);
    }
  }

  const treeFile = positional[0];
  const query = positional.slice(1).join(' ');

  if (!treeFile || !query) {
    console.error('Usage: dotenv -e .env.local -- npx tsx src/core/pageindex/scripts/query.ts <tree.json> "your question" [--greedy] [--tree] [--max 5]');
    process.exit(1);
  }

  const treePath = resolve(treeFile);

  console.log(`[INFO] Loading: ${treePath}`);
  const json = readFileSync(treePath, 'utf-8');
  const tree = deserializeTree(json);

  // Count leaves
  let leafCount = 0;
  function count(n: typeof tree.root) {
    if (n.children.length === 0) leafCount++;
    for (const c of n.children) count(c);
  }
  count(tree.root);
  console.log(`[INFO] Tree: "${tree.documentTitle}" — ${tree.totalNodes} nodes, ${leafCount} leaves, depth ${tree.depth}`);

  if (showTree) {
    console.log('\n── Full Tree ──');
    function printNode(n: typeof tree.root, indent = '') {
      if (n.level > 0) {
        console.log(`${indent}${'#'.repeat(n.level)} ${n.title}`);
        if (n.summary) console.log(`${indent}   > ${n.summary}`);
      }
      for (const c of n.children) printNode(c, indent + '  ');
    }
    printNode(tree.root);
  }

  if (greedy) {
    console.log('[INFO] Using greedy keyword search (no LLM)...');
    const start = Date.now();
    const results = greedySearch(query, tree, maxResults);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    printResults(results, query, 'greedy-keyword', elapsed);
  } else {
    console.log('[INFO] Using LLM reasoning tree search...');
    const llm = createExperimentLLM();
    const start = Date.now();
    const results = await searchTree(query, tree, llm, { maxResults });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    printResults(results, query, 'reasoning-tree-search', elapsed);
  }
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
