import { describe, it, expect } from 'vitest';
import type { IngestRequest } from './ingest-request';

describe('IngestRequest type', () => {
  it('accepts valid ingest request with all fields', () => {
    const request: IngestRequest = {
      storagePath: 'sources/vstep_2026.md',
      filename: 'vstep_2026.md',
      mode: 'vstep-mastery',
      folder: 'root',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(request.storagePath).toBe('sources/vstep_2026.md');
    expect(request.filename).toBe('vstep_2026.md');
    expect(request.mode).toBe('vstep-mastery');
    expect(request.folder).toBe('root');
    expect(request.fileId).toBeTruthy();
  });

  it('accepts ingest request without optional fields', () => {
    const request: IngestRequest = {
      storagePath: 'sources/doc.pdf',
      filename: 'doc.pdf',
      mode: 'general',
    };
    expect(request.folder).toBeUndefined();
    expect(request.fileId).toBeUndefined();
  });

  it('requires storagePath and filename', () => {
    const request: IngestRequest = {
      storagePath: 'sources/test.md',
      filename: 'test.md',
      mode: 'test',
    };
    expect(request.storagePath.length).toBeGreaterThan(0);
    expect(request.filename.length).toBeGreaterThan(0);
    expect(request.mode.length).toBeGreaterThan(0);
  });

  it('supports PDF filenames', () => {
    const request: IngestRequest = {
      storagePath: 'sources/course.pdf',
      filename: 'course.pdf',
      mode: 'courses',
    };
    expect(request.filename).toContain('.pdf');
  });
});
