import { describe, it, expect } from 'vitest';
import { ingestRequestSchema } from './ingest-request-schema';

describe('ingestRequestSchema - valid inputs', () => {
  it('accepts valid ingest request with all fields', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/vstep_2026.md', filename: 'vstep_2026.md',
      mode: 'vstep-mastery', folder: 'root',
      fileId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts request without optional fields', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: 'doc.pdf', mode: 'general',
    });
    expect(result.success).toBe(true);
  });

  it('accepts mode with hyphens and numbers', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: 'doc.pdf', mode: 'vstep-2026_mastery',
    });
    expect(result.success).toBe(true);
  });

  it('accepts paths with dots and slashes', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/subdir/file_v2.0.pdf', filename: 'doc.pdf', mode: 'general',
    });
    expect(result.success).toBe(true);
  });
});

describe('ingestRequestSchema - rejection cases', () => {
  it('rejects empty storagePath', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: '', filename: 'doc.pdf', mode: 'general',
    });
    expect(result.success).toBe(false);
  });

  it('rejects storagePath with spaces', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/my file.pdf', filename: 'doc.pdf', mode: 'general',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty filename', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: '', mode: 'general',
    });
    expect(result.success).toBe(false);
  });

  it('rejects filename exceeding 255 characters', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: 'a'.repeat(256), mode: 'general',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mode with uppercase characters', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: 'doc.pdf', mode: 'VSTEP_Mastery',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID fileId', () => {
    const result = ingestRequestSchema.safeParse({
      storagePath: 'sources/doc.pdf', filename: 'doc.pdf', mode: 'general', fileId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
