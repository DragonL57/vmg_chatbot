import { randomUUID } from "crypto";
import pLimit from "p-limit";
import { ILLMProvider } from "../ports/llm-provider.port";
import { IVectorStorePort } from "../ports/vector-store.port";
import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";
import { hierarchicalChunk } from "../../domain/services/chunking.service";
import { DocumentChunk, TokenAccumulator } from "../../domain/entities/indexing";
import { INDEXING_ENRICH_PROMPT } from "../../prompts/rag-agents";
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

  public async execute(input: IndexKnowledgeFileInput): Promise<void> {
    const { markdown, sourceFile, collectionName, fileId } = input;
    const tokens: TokenAccumulator = { prompt: 0, completion: 0, total: 0 };
    let logs: string[] = [];

    const addLog = async (msg: string, progress: number) => {
      logs = [...logs, `[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`].slice(-100);
      await this.knowledgeRepo.upsertFile({ id: fileId, filename: sourceFile, mode: collectionName, status: 'indexing', progress, logs });
    };

    try {
      await addLog(`START: ${sourceFile}`, 2);
      await this.vectorStore.ensureCollection(collectionName);
      await this.vectorStore.deleteBySource(sourceFile, collectionName);
      const segments = hierarchicalChunk(markdown);
      const chunks = await this.processSegments(segments, sourceFile, tokens, addLog);

      await addLog(`UPLOADING: Syncing ${chunks.length} points...`, 95);
      await this.vectorStore.upsert(chunks, collectionName);
      await this.finalizeIndexing(fileId, sourceFile, collectionName, markdown, tokens, logs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.knowledgeRepo.upsertFile({ id: fileId, filename: sourceFile, mode: collectionName, status: 'failed', progress: 0, logs: [...logs, `[ERROR] ${msg}`] });
    }
  }

  private async processSegments(segments: { child: string; parent: string; header: string }[], sourceFile: string, tokens: TokenAccumulator, addLog: (msg: string, progress: number) => Promise<void>): Promise<DocumentChunk[]> {
    const limit = pLimit(5);
    const parentIdMap = new Map<string, string>();
    let processed = 0;

    return Promise.all(segments.map((seg, i) => limit(async () => {
      const parentId = parentIdMap.get(seg.parent) || randomUUID();
      parentIdMap.set(seg.parent, parentId);

      const result = await this.enrichSegment(seg, tokens);

      processed++;
      await addLog(`COMPLETE: Segment ${i + 1}`, 10 + Math.floor((processed / segments.length) * 80));

      return { id: randomUUID(), parentId, title: result.title, content: `[INTENTS]: ${result.questions.join("; ")}\n\n[CONTENT]: ${result.rewritten}`, source: sourceFile, parentContent: seg.parent };
    })));
  }

  private async enrichSegment(seg: { child: string; parent: string }, tokens: TokenAccumulator): Promise<{ rewritten: string; title: string; questions: string[] }> {
    const fallback = { rewritten: seg.child, title: seg.parent.slice(0, 80) || 'Untitled', questions: [] };
    try {
      const res = await this.llmProvider.completion({
        messages: [
          { role: 'system', content: INDEXING_ENRICH_PROMPT },
          { role: 'user', content: `Parent context: ${seg.parent.slice(0, 300)}\n\nChunk to process:\n${seg.child.slice(0, 2000)}` }
        ],
        jsonMode: true,
        effort: 'low'
      });
      this.accumulateTokens(tokens, res.usage);
      const parsed = JSON.parse(res.content || '{}');
      return {
        rewritten: parsed.rewritten || seg.child,
        title: (parsed.title || 'Untitled').trim().slice(0, 80),
        questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : [],
      };
    } catch {
      return fallback;
    }
  }

  private async finalizeIndexing(fileId: string, source: string, col: string, md: string, tokens: TokenAccumulator, logs: string[]) {
    const res = await this.llmProvider.completion({
      messages: [{ role: 'system', content: FILE_SUMMARY_PROMPT }, { role: 'user', content: md.slice(0, 3000) }],
      effort: 'low'
    });
    this.accumulateTokens(tokens, res.usage);
    await this.knowledgeRepo.upsertFile({ id: fileId, filename: source, mode: col, status: 'completed', progress: 100, summary: res.content || '', logs: [...logs, `[SUCCESS] Indexing finished.`] });
    await this.refreshCollectionDescription(col);
  }

  private accumulateTokens(accum: TokenAccumulator, usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) {
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
      messages: [{ role: 'system', content: COLLECTION_DESCRIPTION_PROMPT }, { role: 'user', content: `Document list:\n${summaries}` }],
      effort: 'low'
    });
    const collections = await this.knowledgeRepo.listCollections();
    const col = collections.find(c => c.qdrantName === collectionName);
    if (col && res.content) await this.knowledgeRepo.updateCollection(col.id, { description: res.content });
  }
}
