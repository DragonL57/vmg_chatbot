import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFullFileContentUseCase } from './get-full-file-content.use-case';
import { IVectorStorePort } from '../ports/vector-store.port';

function makeMockVectorStore(): IVectorStorePort {
  return {
    listBySource: vi.fn().mockResolvedValue([]),
    ensureCollection: vi.fn(), upsert: vi.fn(), search: vi.fn(),
    keywordSearch: vi.fn(), deleteBySource: vi.fn(), isIndexed: vi.fn(),
  };
}

describe('GetFullFileContentUseCase', () => {
  let useCase: GetFullFileContentUseCase;
  let mockVectorStore: IVectorStorePort;

  beforeEach(() => {
    mockVectorStore = makeMockVectorStore();
    useCase = new GetFullFileContentUseCase(mockVectorStore);
  });

  it('returns empty string when no chunks found', async () => {
    expect(await useCase.execute('test.md', 'test-collection')).toBe('');
  });

  it('reconstructs full content from parentContent fields', async () => {
    vi.mocked(mockVectorStore.listBySource).mockResolvedValue([
      { id: '1', title: 'A', content: 'c1', source: 'test.md', parentContent: '# Sec A\nContent A.' },
      { id: '2', title: 'B', content: 'c2', source: 'test.md', parentContent: '# Sec B\nContent B.' },
    ]);
    const content = await useCase.execute('test.md', 'test-collection');
    expect(content).toContain('# Sec A');
    expect(content).toContain('# Sec B');
  });
});

describe('GetFullFileContentUseCase - dedup and filtering', () => {
  let useCase: GetFullFileContentUseCase;
  let mockVectorStore: IVectorStorePort;

  beforeEach(() => {
    mockVectorStore = makeMockVectorStore();
    useCase = new GetFullFileContentUseCase(mockVectorStore);
  });

  it('deduplicates identical parentContent sections', async () => {
    vi.mocked(mockVectorStore.listBySource).mockResolvedValue([
      { id: '1', title: 'A', content: 'c1', source: 'test.md', parentContent: '# Sec A\nSame.' },
      { id: '2', title: 'B', content: 'c2', source: 'test.md', parentContent: '# Sec A\nSame.' },
    ]);
    const content = await useCase.execute('test.md', 'test-collection');
    expect(content.split('\n\n')).toHaveLength(1);
  });

  it('filters chunks not matching the source filename', async () => {
    vi.mocked(mockVectorStore.listBySource).mockResolvedValue([
      { id: '1', title: 'X', content: 'x', source: 'other.md', parentContent: '# Other\nDiff.' },
    ]);
    expect(await useCase.execute('test.md', 'test-collection')).toBe('');
  });

  it('skips chunks without parentContent', async () => {
    vi.mocked(mockVectorStore.listBySource).mockResolvedValue([
      { id: '1', title: 'No', content: 'child', source: 'test.md', parentContent: undefined },
      { id: '2', title: 'Yes', content: 'child', source: 'test.md', parentContent: '# Real\nReal.' },
    ]);
    const content = await useCase.execute('test.md', 'test-collection');
    expect(content).toContain('Real');
    expect(content).not.toContain('Just child');
  });
});
