import { describe, it, expect } from 'vitest';

// Testing the pure parsing logic from router-expand.node.ts
function parseRouterOutput(output: string, fallbackQueries: string[], allCollections: string[]) {
  let parsed = { is_chit_chat: false, selected: [] as string[], queries: fallbackQueries, reasoning: '' };
  try {
    const rawParsed = JSON.parse(output);
    parsed = { ...parsed, ...rawParsed };
  } catch { /* silent */ }

  let finalSilos = parsed.selected;
  if (finalSilos.length === 0 && !parsed.is_chit_chat) finalSilos = allCollections;

  return { isChitChat: !!parsed.is_chit_chat, targetCollections: finalSilos, queries: parsed.queries };
}

describe('routerExpandNode - parse logic', () => {
  const ALL_COLLECTIONS = ['vstep-mastery', 'ielts-prep', 'general'];

  it('parses a RAG query with selected collections', () => {
    const output = JSON.stringify({
      is_chit_chat: false,
      selected: ['vstep-mastery', 'ielts-prep'],
      queries: ['What is VSTEP?'],
      reasoning: 'Query about VSTEP program.',
    });
    const result = parseRouterOutput(output, ['What is VSTEP?'], ALL_COLLECTIONS);
    expect(result.isChitChat).toBe(false);
    expect(result.targetCollections).toEqual(['vstep-mastery', 'ielts-prep']);
  });

  it('parses chit-chat query', () => {
    const output = JSON.stringify({
      is_chit_chat: true,
      selected: [],
      queries: ['Hello'],
      reasoning: 'Greeting.',
    });
    const result = parseRouterOutput(output, ['Hello'], ALL_COLLECTIONS);
    expect(result.isChitChat).toBe(true);
    expect(result.targetCollections).toEqual([]);
  });

  it('falls back to all collections when none selected and not chit-chat', () => {
    const output = JSON.stringify({ is_chit_chat: false, selected: [], queries: ['test'], reasoning: '' });
    const result = parseRouterOutput(output, ['test'], ALL_COLLECTIONS);
    expect(result.isChitChat).toBe(false);
    expect(result.targetCollections).toEqual(ALL_COLLECTIONS);
  });

  it('falls back on JSON parse error', () => {
    const result = parseRouterOutput('invalid json', ['fallback query'], ALL_COLLECTIONS);
    expect(result.isChitChat).toBe(false);
    expect(result.targetCollections).toEqual(ALL_COLLECTIONS);
    expect(result.queries).toEqual(['fallback query']);
  });

  it('handles missing selected key', () => {
    const output = JSON.stringify({ is_chit_chat: false, queries: ['q'] });
    const result = parseRouterOutput(output, ['q'], ALL_COLLECTIONS);
    // selected defaults to [] → fallback to all collections
    expect(result.targetCollections).toEqual(ALL_COLLECTIONS);
  });
});
