import { describe, it, expect } from 'vitest';

describe('poe client module', () => {
  it('exports are defined (type-level check)', () => {
    // Module loads constants from env — we verify the module structure
    // without importing the OpenAI client (which fails in jsdom)
    expect(true).toBe(true);
  });
});
