import { describe, it, expect } from 'vitest';
import type { DocumentPassage } from './indexing';
import type { KnowledgeCollection } from '../../application/ports/knowledge-repository.port';

describe('Indexing domain types', () => {
  it('creates a DocumentPassage with required fields', () => {
    const passage: DocumentPassage = {
      id: 'p-1',
      title: 'Introduction',
      content: 'Some text content...',
      source: 'document.pdf',
    };
    expect(passage.id).toBe('p-1');
    expect(passage.parentId).toBeUndefined();
    expect(passage.score).toBeUndefined();
  });

  it('creates a DocumentPassage with parent reference', () => {
    const passage: DocumentPassage = {
      id: 'child-1',
      parentId: 'parent-1',
      title: 'Details',
      content: 'Child content',
      source: 'doc.pdf',
      parentContent: 'Parent content for context',
      collection: 'study-abroad',
      score: 0.95,
    };
    expect(passage.parentId).toBe('parent-1');
    expect(passage.parentContent).toBe('Parent content for context');
    expect(passage.score).toBe(0.95);
    expect(passage.collection).toBe('study-abroad');
  });

  it('creates a KnowledgeCollection', () => {
    const collection: KnowledgeCollection = {
      id: 'col-1',
      name: 'Study Abroad',
      collectionKey: 'study_abroad',
      description: 'Information about studying abroad programs',
    };
    expect(collection.name).toBe('Study Abroad');
    expect(collection.description).toBe('Information about studying abroad programs');
  });

  it('creates a KnowledgeCollection without description', () => {
    const collection: KnowledgeCollection = {
      id: 'col-2',
      name: 'ESL',
      collectionKey: 'esl',
    };
    expect(collection.description).toBeUndefined();
  });
});
