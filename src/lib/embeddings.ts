import { Mistral } from '@mistralai/mistralai';
import { env } from '@/env';

/**
 * Native Mistral client for embeddings.
 * Model: mistral-embed (1024 dimensions)
 */
const mistral = new Mistral({ apiKey: env.MISTRAL_API_KEY });

/**
 * Embeds a single text string using Mistral's embedding model.
 */
export async function embed(text: string): Promise<number[]> {
  const response = await mistral.embeddings.create({
    model: 'mistral-embed',
    inputs: [text.slice(0, 8192)],
  });
  return response.data[0].embedding as number[];
}

/**
 * Embeds a batch of texts. Uses small batches to avoid rate limits.
 */
export async function embedBatch(texts: string[], batchSize = 10): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map(t => t.slice(0, 8192));
    const response = await mistral.embeddings.create({
      model: 'mistral-embed',
      inputs: batch,
    });
    for (const item of response.data) {
      results.push(item.embedding as number[]);
    }
  }
  return results;
}

