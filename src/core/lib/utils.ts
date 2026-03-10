/**
 * Safely parses a JSON string, handling potential markdown blocks or extra text.
 */
export function safeJsonParse<T>(text: string): T | null {
  if (!text) return null;

  try {
    // 1. Try direct parse
    return JSON.parse(text) as T;
  } catch {
    try {
      // 2. Try to extract JSON from markdown code blocks
      const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
      let match;
      while ((match = jsonBlockRegex.exec(text)) !== null) {
        try {
          return JSON.parse(match[1]) as T;
        } catch {
          continue;
        }
      }

      // 3. Fallback: Find the first '{' and last '}'
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(potentialJson) as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}
