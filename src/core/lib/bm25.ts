/**
 * Lightweight BM25 implementation for lexical retrieval.
 * Used in combination with dense retrieval for hybrid search + RRF.
 */

interface BM25Doc {
  id: string;
  text: string;
}

interface BM25Result {
  id: string;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1EA0-\u1EF9]/g, ' ') // keep Latin + Vietnamese chars
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * BM25 retrieval over a list of documents.
 * Parameters: k1=1.5, b=0.75 (standard defaults)
 */
export function bm25Search(query: string, docs: BM25Doc[], topK = 10): BM25Result[] {
  if (docs.length === 0) return [];

  const K1 = 1.5;
  const B = 0.75;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Build term frequency index
  const tfIndex: Map<string, Map<string, number>> = new Map(); // term -> docId -> tf
  const docLengths: Map<string, number> = new Map();
  let totalLength = 0;

  for (const doc of docs) {
    const tokens = tokenize(doc.text);
    docLengths.set(doc.id, tokens.length);
    totalLength += tokens.length;

    const termCounts = new Map<string, number>();
    for (const token of tokens) {
      termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
    }
    for (const [term, count] of termCounts) {
      if (!tfIndex.has(term)) tfIndex.set(term, new Map());
      tfIndex.get(term)!.set(doc.id, count);
    }
  }

  const avgDocLength = totalLength / docs.length;
  const N = docs.length;

  // Score each document
  const scores = new Map<string, number>();

  for (const term of queryTokens) {
    const docFreqMap = tfIndex.get(term);
    if (!docFreqMap) continue;

    const df = docFreqMap.size;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

    for (const doc of docs) {
      if (!docFreqMap.has(doc.id)) continue;
      const tf = docFreqMap.get(doc.id)!;
      const dl = docLengths.get(doc.id)!;
      const norm = K1 * (1 - B + B * (dl / avgDocLength));
      const tfScore = (tf * (K1 + 1)) / (tf + norm);
      scores.set(doc.id, (scores.get(doc.id) ?? 0) + idf * tfScore);
    }
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, score }));
}

/**
 * Reciprocal Rank Fusion to merge dense and BM25 ranked lists.
 * s(d) = Σ 1/(k + rank_Li(d))  where k=60 (standard)
 */
export function reciprocalRankFusion(
  rankedLists: string[][],
  k = 60
): string[] {
  const scores = new Map<string, number>();

  for (const list of rankedLists) {
    list.forEach((id, idx) => {
      const rank = idx + 1; // 1-based
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
