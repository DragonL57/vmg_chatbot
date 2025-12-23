import { env } from '@/env';

/**
 * Service for generating text embeddings using Mistral AI API.
 * Model: mistral-embed
 * Dimensions: 1024
 */
export class EmbeddingService {
  private static readonly API_URL = "https://api.mistral.ai/v1/embeddings";
  private static readonly cache = new Map<string, number[]>();

  /**
   * Generates an embedding for a given text.
   * Includes simple caching to avoid redundant API calls.
   */
  public static async embed(text: string, taskType?: string): Promise<number[]> {
    const cleanText = text.trim().replace(/\n/g, " ");
    if (!cleanText) return [];

    if (this.cache.has(cleanText)) {
      return this.cache.get(cleanText)!;
    }

    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-embed",
          input: [cleanText],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Mistral API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const result = await response.json();
      const embedding = result.data?.[0]?.embedding;

      if (!Array.isArray(embedding) || embedding.length !== 1024) {
        throw new Error("Invalid embedding format or dimension from Mistral");
      }

      this.cache.set(cleanText, embedding);
      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw error;
    }
  }

  /**
   * Generates embeddings for multiple texts in a single batch.
   */
  public static async embedMany(texts: string[], taskType?: string): Promise<number[][]> {
    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const toFetch: { text: string; index: number }[] = [];

    // Check cache first
    texts.forEach((text, i) => {
      const cleanText = text.trim().replace(/\n/g, " ");
      if (this.cache.has(cleanText)) {
        results[i] = this.cache.get(cleanText)!;
      } else if (cleanText) {
        toFetch.push({ text: cleanText, index: i });
      } else {
        results[i] = new Array(1024).fill(0);
      }
    });

    if (toFetch.length === 0) return results as number[][];

    try {
      // Mistral supports batching
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-embed",
          input: toFetch.map((f) => f.text),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Mistral API Error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const result = await response.json();
      const data = result.data;

      if (Array.isArray(data)) {
        data.forEach((item: any, i: number) => {
          const embedding = item.embedding;
          if (Array.isArray(embedding) && embedding.length === 1024) {
            const originalIndex = toFetch[i].index;
            results[originalIndex] = embedding;
            this.cache.set(toFetch[i].text, embedding);
          }
        });
      }

      // Fill any remaining nulls with zero vectors just in case
      return results.map(r => r || new Array(1024).fill(0)) as number[][];
    } catch (error) {
      console.error("Error generating batch embeddings:", error);
      throw error;
    }
  }
}