import { google } from '@/lib/gemini';
import { embed, embedMany } from 'ai';

/**
 * Task types supported by Google Generative AI embedding models.
 */
export type EmbeddingTaskType = 
  | 'SEMANTIC_SIMILARITY' 
  | 'CLASSIFICATION' 
  | 'CLUSTERING' 
  | 'RETRIEVAL_DOCUMENT' 
  | 'RETRIEVAL_QUERY' 
  | 'QUESTION_ANSWERING' 
  | 'FACT_VERIFICATION'
  | 'CODE_RETRIEVAL_QUERY';

/**
 * Service for generating text embeddings using Google Gemini via Vercel AI SDK.
 */
export class EmbeddingService {
  private static readonly MODEL_ID = 'gemini-embedding-001';

  /**
   * Generates an embedding for a single text.
   * 
   * @param text - The text to embed.
   * @param taskType - Optional task type to optimize the embedding.
   * @returns The embedding vector (number[]).
   */
  static async embed(
    text: string,
    taskType?: EmbeddingTaskType
  ): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: google.embedding(this.MODEL_ID),
        value: text,
        providerOptions: {
          google: {
            taskType,
          },
        },
      });

      return embedding;
    } catch (error) {
      console.error('Error in EmbeddingService.embed:', error);
      throw error;
    }
  }

  /**
   * Generates embeddings for multiple texts in batch.
   * 
   * @param texts - Array of strings to embed.
   * @param taskType - Optional task type to optimize the embeddings.
   * @returns Array of embedding vectors (number[][]).
   */
  static async embedMany(
    texts: string[],
    taskType?: EmbeddingTaskType
  ): Promise<number[][]> {
    try {
      const { embeddings } = await embedMany({
        model: google.embedding(this.MODEL_ID),
        values: texts,
        providerOptions: {
          google: {
            taskType,
          },
        },
      });

      return embeddings;
    } catch (error) {
      console.error('Error in EmbeddingService.embedMany:', error);
      throw error;
    }
  }
}