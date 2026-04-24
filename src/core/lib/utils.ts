/**
 * Safely parses a JSON string, handling potential markdown blocks or extra text.
 */
import { getEncoding } from "js-tiktoken";

/**
 * Normalizes a string to ASCII-safe slug (lowercase, no accents, underscores instead of spaces).
 * Critical for reliable Qdrant collection naming.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s_]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Accurately counts tokens in a string using cl100k_base encoding.
 * Pure JS implementation (No WASM required).
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  const encoding = getEncoding("cl100k_base");
  return encoding.encode(text).length;
}

/**
 * Accurate token estimation using js-tiktoken.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  try {
    return countTokens(text);
  } catch (e) {
    return Math.ceil(text.length / 4);
  }
}

export function safeJsonParse<T>(str: string): T | null {
  if (!str) return null;

  try {
    // 1. Try direct parse
    return JSON.parse(str) as T;
  } catch {
    try {
      // 2. Try to extract JSON from markdown code blocks
      const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      let match;
      while ((match = jsonBlockRegex.exec(str)) !== null) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          continue;
        }
      }

      // 3. Fallback: Find the first '{' and last '}'
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = str.substring(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson) as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}
