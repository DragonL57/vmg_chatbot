/**
 * Safely parses a JSON string, handling potential markdown blocks or extra text.
 */
export function safeJsonParse<T>(text: string): T | null {
  try {
    // Try direct parse
    return JSON.parse(text) as T;
  } catch {
    try {
      // Try to find JSON block in markdown
      const match = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/{[\s\S]*}/);
      if (match) {
        return JSON.parse(match[1] || match[0]) as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}
