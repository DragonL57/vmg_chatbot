import { describe, it, expect } from 'vitest';
import { searchTree, greedySearch } from './tree-search';
import { buildTree } from './build-tree';

const SEARCH_MARKDOWN = `# Học bổng Du học

## Học bổng Toàn phần

Chương trình học bổng toàn phần bao gồm học phí, sinh hoạt phí và bảo hiểm y tế.

### Yêu cầu

- GPA từ 3.5 trở lên
- IELTS 7.0 hoặc tương đương
- Tối thiểu 2 hoạt động ngoại khóa

### Cách nộp đơn

Ứng viên nộp hồ sơ qua cổng thông tin trực tuyến trước ngày 31/3.

## Học bổng Bán phần

Học bổng bán phần hỗ trợ 50% học phí cho sinh viên có hoàn cảnh khó khăn.
`;

function createRecursiveMockLLM() {
  return {
    completion: async ({ messages }: { messages: { role: string; content: string }[] }) => {
      const lastMsg = messages[messages.length - 1].content;

      if (lastMsg.includes('Sections:')) {
        const queryMatch = lastMsg.match(/Query: "(.+?)"/);
        const query = queryMatch?.[1]?.toLowerCase() || '';

        // Match sections by keyword in the text
        const sections = lastMsg.split(/\[\d+\]/).slice(1);
        const indices: number[] = [];
        sections.forEach((s, i) => {
          const lower = s.toLowerCase();
          if (query.split(/\s+/).some(t => t.length >= 3 && lower.includes(t))) {
            indices.push(i);
          }
        });

        // "visa" / "weather" / "không liên quan" → no match
        if (query.includes('visa') || query.includes('weather') || query.includes('không')) {
          return { content: '{"selectedIndices":[],"reasoning":"No match"}', usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }, model: 'mock' };
        }

        // GPA → match
        if (query.includes('gpa')) {
          return { content: '{"selectedIndices":[0],"reasoning":"GPA in requirements"}', usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }, model: 'mock' };
        }

        // Default: return first matching, or all if nothing specific
        if (indices.length > 0) {
          return { content: JSON.stringify({ selectedIndices: indices.slice(0, 3), reasoning: 'Keyword match' }), usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }, model: 'mock' };
        }
        return { content: '{"selectedIndices":[],"reasoning":"No relevant sections"}', usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }, model: 'mock' };
      }

      return { content: '{"selectedIndices":[]}', usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }, model: 'mock' };
    },
  } as const;
}

describe('searchTree', () => {
  it('returns relevant results for a matching query', async () => {
    const llm = createRecursiveMockLLM();
    const tree = await buildTree(SEARCH_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const results = await searchTree('Yêu cầu GPA để xin học bổng?', tree, llm);

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.node.title).toBeTruthy();
      expect(result.path.length).toBeGreaterThan(0);
      expect(result.node.content).toBeTruthy();
    }
  });

  it('returns empty for irrelevant queries', async () => {
    const llm = createRecursiveMockLLM();
    const tree = await buildTree(SEARCH_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const results = await searchTree('Thời tiết hôm nay thế nào?', tree, llm);
    expect(results.length).toBe(0);
  });

  it('respects maxResults option', async () => {
    const llm = createRecursiveMockLLM();
    const tree = await buildTree(SEARCH_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const results = await searchTree('GPA', tree, llm, { maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

describe('greedySearch', () => {
  it('finds leaf nodes by keyword matching', async () => {
    const llm = createRecursiveMockLLM();
    const tree = await buildTree(SEARCH_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const results = greedySearch('GPA IELTS học bổng', tree);

    expect(results.length).toBeGreaterThan(0);
    const anyMatch = results.some(r => {
      const c = (r.node.content || '').toLowerCase();
      return c.includes('gpa') || c.includes('ielts');
    });
    expect(anyMatch).toBe(true);
  });

  it('returns empty for non-matching queries', async () => {
    const llm = createRecursiveMockLLM();
    const tree = await buildTree(SEARCH_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const results = greedySearch('xyzzy_nonexistent', tree);
    expect(results.length).toBe(0);
  });
});
