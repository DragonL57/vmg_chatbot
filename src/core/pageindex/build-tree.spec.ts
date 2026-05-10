import { describe, it, expect } from 'vitest';
import { buildTree, collectLeaves } from './build-tree';

// ─── Mock LLM provider ────────────────────────────────────────────────────────

function createMockLLM() {
  return {
    completion: async ({ messages }: { messages: { role: string; content: string }[] }) => {
      const lastMsg = messages[messages.length - 1].content;
      // Extract section title from the prompt to generate a relevant summary
      const titleMatch = lastMsg.match(/Section title: (.+)/);
      const title = titleMatch ? titleMatch[1] : 'Document';
      return {
        content: JSON.stringify({ summary: `Summary of: ${title}` }),
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'mock',
      };
    },
  } as const;
}

// ─── Test data ────────────────────────────────────────────────────────────────

const SAMPLE_MARKDOWN = `# Học bổng Du học

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

### Điều kiện

- GPA từ 3.0 trở lên
- Có hoàn cảnh kinh tế khó khăn
- Cam kết tham gia các hoạt động tình nguyện

# Thủ tục Visa

## Visa Du học

Hướng dẫn chi tiết về quy trình xin visa du học.

### Hồ sơ cần chuẩn bị

- Hộ chiếu còn hạn
- Thư mời nhập học
- Chứng minh tài chính
- Khám sức khỏe

### Thời gian xử lý

Thời gian xử lý visa thường từ 4-6 tuần làm việc.
`;

const SAMPLE_NO_HEADINGS = `Đây là văn bản không có tiêu đề.
Nó chỉ có một đoạn văn bản duy nhất.
`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildTree', () => {
  it('parses headings and builds a tree structure', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test-doc.md', llm, { enableSummaries: false });

    expect(tree.sourceFile).toBe('test-doc.md');
    expect(tree.documentTitle).toBe('Học bổng Du học');
    expect(tree.totalNodes).toBeGreaterThan(0);
    expect(tree.root.children.length).toBe(2); // Two H1 sections
  });

  it('correctly nests child sections under parents', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    // First H1: "Học bổng Du học"
    const firstSection = tree.root.children[0];
    expect(firstSection.title).toBe('Học bổng Du học');
    expect(firstSection.children.length).toBe(2); // Two H2 sections

    // First H2: "Học bổng Toàn phần"
    const h2 = firstSection.children[0];
    expect(h2.title).toBe('Học bổng Toàn phần');
    expect(h2.children.length).toBe(2); // Two H3 sections
  });

  it('marks leaf nodes with content and branch nodes without', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    // Leaf node (H3): should have content, no children
    const firstSection = tree.root.children[0];
    const h2 = firstSection.children[0];
    const leaf = h2.children[0]; // "Yêu cầu"
    expect(leaf.content).toBeTruthy();
    expect(leaf.children.length).toBe(0);
  });

  it('enriches nodes with LLM summaries when enabled', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: true });

    // Root should have a summary (virtual root with children titles)
    expect(tree.root.summary).toBeTruthy();

    // First H1 section should have a summary
    const firstH1 = tree.root.children[0];
    expect(firstH1.title).toBe('Học bổng Du học');
    expect(firstH1.summary).toBeTruthy();
    expect(firstH1.children.length).toBeGreaterThan(0);

    // First H2 section should have a summary
    const firstH2 = firstH1.children[0];
    expect(firstH2.title).toBe('Học bổng Toàn phần');
    expect(firstH2.summary).toBeTruthy();
  });

  it('handles documents without headings', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_NO_HEADINGS, 'plain.txt', llm, { enableSummaries: false });

    expect(tree.root.children.length).toBe(1); // Single leaf with full content
    expect(tree.documentTitle).toBe('plain.txt');
    expect(tree.totalNodes).toBe(2); // Virtual root + single leaf with full content
  });

  it('reports correct tree depth and total nodes', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    expect(tree.depth).toBeGreaterThanOrEqual(3); // H1 → H2 → H3
    expect(tree.totalNodes).toBeGreaterThanOrEqual(8); // root + 2 H1 + 2 H2 + 2 H3 + 2 H2... etc.
  });
});

describe('collectLeaves', () => {
  it('collects all leaf nodes from the tree', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const leaves = collectLeaves(tree.root);
    // Should have 4 leaf nodes: Yêu cầu, Cách nộp đơn, Điều kiện, Hồ sơ cần chuẩn bị, Thời gian xử lý
    expect(leaves.length).toBeGreaterThanOrEqual(4);
    for (const leaf of leaves) {
      expect(leaf.node.content).toBeTruthy();
      expect(leaf.path.length).toBeGreaterThan(1);
    }
  });

  it('returns path from root to each leaf', async () => {
    const llm = createMockLLM();
    const tree = await buildTree(SAMPLE_MARKDOWN, 'test.md', llm, { enableSummaries: false });

    const leaves = collectLeaves(tree.root);
    const firstLeaf = leaves[0];
    expect(firstLeaf.path[0]).toBeTruthy(); // Root title
    expect(firstLeaf.path.length).toBeGreaterThanOrEqual(2); // At least one section deep
  });
});
