import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { ILLMProvider } from "../ports/llm-provider.port";
import { IVectorStorePort } from "../ports/vector-store.port";
import { IKnowledgeRepositoryPort, KnowledgeFile } from "../ports/knowledge-repository.port";
import { hierarchicalChunk } from "../../domain/services/chunking.service";
import { DocumentChunk, TokenAccumulator } from "../../domain/entities/indexing";
import { 
  DOCUMENT_REWRITER_PROMPT, 
  KNOWLEDGE_TITLE_PROMPT, 
  FAQ_CREATOR_PROMPT 
} from "../../prompts/rag-agents";
import { FILE_SUMMARY_PROMPT, COLLECTION_DESCRIPTION_PROMPT } from "@core/prompts/admin";

export interface IndexKnowledgeFileInput {
  markdown: string;
  sourceFile: string;
  collectionName: string;
  fileId: string;
}

export class IndexKnowledgeFileUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly vectorStore: IVectorStorePort,
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  async execute(input: IndexKnowledgeFileInput): Promise<void> {
    const { markdown, sourceFile, collectionName, fileId } = input;
    const tokens: TokenAccumulator = { prompt: 0, completion: 0, total: 0 };
    let logs: string[] = [];

    const addLog = async (message: string, progress: number) => {
      const timestamp = new Date().toLocaleTimeString('vi-VN');
      logs = [...logs, `[${timestamp}] ${message}`].slice(-100);
      await this.knowledgeRepo.upsertFile({
        id: fileId,
        filename: sourceFile,
        mode: collectionName,
        status: 'indexing',
        progress,
        logs
      });
    };

    try {
      await addLog(`URASYS START: ${sourceFile}`, 2);
      await this.vectorStore.ensureCollection(collectionName);

      const segments = hierarchicalChunk(markdown);
      await addLog(`CHUNKING: Split into ${segments.length} segments`, 5);

      const limit = pLimit(2);
      let processedCount = 0;

      const chunks: DocumentChunk[] = await Promise.all(
        segments.map((seg, i) => 
          limit(async () => {
            const chunkIndex = i + 1;
            const parentId = randomUUID();
            
            // Phase 1: Context-Aware Rewriting
            const rewriteRes = await this.llmProvider.completion({
              messages: [
                { role: 'system', content: DOCUMENT_REWRITER_PROMPT },
                { role: 'user', content: `Context: ${seg.parent.slice(0, 300)}\n\nContent: ${seg.child}` }
              ],
              effort: 'low'
            });
            this.accumulateTokens(tokens, rewriteRes.usage);
            const rewrittenContent = rewriteRes.content || seg.child;

            // Phase 2: Title Assignment
            const titleRes = await this.llmProvider.completion({
              messages: [
                { role: 'system', content: KNOWLEDGE_TITLE_PROMPT },
                { role: 'user', content: rewrittenContent.slice(0, 600) }
              ],
              effort: 'low'
            });
            this.accumulateTokens(tokens, titleRes.usage);
            const title = (titleRes.content || 'Knowledge Node').trim().slice(0, 80);

            // Phase 3: FAQ Generation
            const faqRes = await this.llmProvider.completion({
              messages: [
                { role: 'system', content: FAQ_CREATOR_PROMPT },
                { role: 'user', content: rewrittenContent }
              ],
              jsonMode: true,
              effort: 'low'
            });
            this.accumulateTokens(tokens, faqRes.usage);
            
            let faqs: string[] = [];
            try {
              const parsed = JSON.parse(faqRes.content || "{}");
              faqs = Array.isArray(parsed.questions) ? parsed.questions : [];
            } catch (e) {
              console.error("[IndexKnowledgeFile] FAQ JSON parse error:", e, "Content:", faqRes.content);
            }

            const searchOptimizedContent = `[INTENTS]: ${faqs.join("; ")}\n\n[CONTENT]: ${rewrittenContent}`;

            processedCount++;
            const progress = 10 + Math.floor((processedCount / segments.length) * 80);
            await addLog(`URASYS COMPLETE: Segment ${chunkIndex} Enriched`, progress);

            return {
              id: randomUUID(),
              parentId,
              title,
              content: searchOptimizedContent,
              source: sourceFile,
              parentContent: seg.parent
            };
          })
        )
      );

      await addLog(`UPLOADING: Syncing ${chunks.length} points to Vector Store...`, 95);
      await this.vectorStore.upsert(chunks, collectionName);

      // Final Summarization
      await addLog(`SUMMARIZING: Generating file-level overview...`, 98);
      const summaryRes = await this.llmProvider.completion({
        messages: [
          { role: 'system', content: FILE_SUMMARY_PROMPT },
          { role: 'user', content: markdown.slice(0, 3000) }
        ],
        effort: 'low'
      });
      this.accumulateTokens(tokens, summaryRes.usage);

      await this.knowledgeRepo.upsertFile({
        id: fileId,
        filename: sourceFile,
        mode: collectionName,
        status: 'completed',
        progress: 100,
        summary: summaryRes.content || '',
        logs: [...logs, `[${new Date().toLocaleTimeString('en-US')}] URASYS SUCCESS: Indexing finished.`]
      });

      // Refresh Collection Description
      await this.refreshCollectionDescription(collectionName);

    } catch (err) {
      console.error('[IndexKnowledgeFileUseCase] Error:', err);
      await this.knowledgeRepo.upsertFile({
        id: fileId,
        filename: sourceFile,
        mode: collectionName,
        status: 'failed',
        progress: 0,
        logs: [...logs, `[ERROR] ${err instanceof Error ? err.message : String(err)}`]
      });
    }
  }

  private accumulateTokens(accum: TokenAccumulator, usage: any) {
    accum.prompt += usage.prompt_tokens || 0;
    accum.completion += usage.completion_tokens || 0;
    accum.total += usage.total_tokens || 0;
  }

  private async refreshCollectionDescription(collectionName: string) {
    const allFiles = await this.knowledgeRepo.listFiles();
    const collectionFiles = allFiles.filter(f => f.mode === collectionName && f.status === 'completed');
    if (collectionFiles.length === 0) return;

    const summaries = collectionFiles.filter(f => f.summary).map(f => `- ${f.filename}: ${f.summary}`).join("\n");
    if (!summaries) return;

    const res = await this.llmProvider.completion({
      messages: [
        { role: 'system', content: COLLECTION_DESCRIPTION_PROMPT },
        { role: 'user', content: `Document list:\n${summaries}` }
      ],
      effort: 'low'
    });

    const collections = await this.knowledgeRepo.listCollections();
    const col = collections.find(c => c.qdrantName === collectionName);
    if (col && res.content) {
      await this.knowledgeRepo.updateCollection(col.id, { description: res.content });
    }
  }
}
