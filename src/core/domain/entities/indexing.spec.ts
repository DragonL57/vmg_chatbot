import { describe, it, expect } from 'vitest';
import type { DocumentChunk, TokenAccumulator } from './indexing';
import type { KnowledgeCollection } from '../../application/ports/knowledge-repository.port';

describe('Indexing domain types', () => {
  it('creates a DocumentChunk with required fields', () => {
    const chunk: DocumentChunk = {
      id: 'chunk-1',
      title: 'Introduction',
      content: 'Some text content...',
      source: 'document.pdf',
    };
    expect(chunk.id).toBe('chunk-1');
    expect(chunk.parentId).toBeUndefined();
    expect(chunk.score).toBeUndefined();
  });

  it('creates a DocumentChunk with parent reference', () => {
    const chunk: DocumentChunk = {
      id: 'child-1',
      parentId: 'parent-1',
      title: 'Details',
      content: 'Child content',
      source: 'doc.pdf',
      parentContent: 'Parent content for context',
      collection: 'study-abroad',
      score: 0.95,
    };
    expect(chunk.parentId).toBe('parent-1');
    expect(chunk.parentContent).toBe('Parent content for context');
    expect(chunk.score).toBe(0.95);
    expect(chunk.collection).toBe('study-abroad');
  });

  it('creates a KnowledgeCollection', () => {
    const collection: KnowledgeCollection = {
      id: 'col-1',
      name: 'Study Abroad',
      qdrantName: 'study_abroad',
      description: 'Information about studying abroad programs',
    };
    expect(collection.name).toBe('Study Abroad');
    expect(collection.description).toBe('Information about studying abroad programs');
  });

  it('creates a KnowledgeCollection without description', () => {
    const collection: KnowledgeCollection = {
      id: 'col-2',
      name: 'ESL',
      qdrantName: 'esl',
    };
    expect(collection.description).toBeUndefined();
  });

  it('creates a TokenAccumulator', () => {
    const acc: TokenAccumulator = { prompt: 100, completion: 50, total: 150 };
    expect(acc.prompt).toBe(100);
    expect(acc.total).toBe(acc.prompt + acc.completion);
  });

  it('TokenAccumulator defaults to zero', () => {
    const acc: TokenAccumulator = { prompt: 0, completion: 0, total: 0 };
    expect(acc.total).toBe(0);
  });
});
