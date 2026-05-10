import { ILLMProvider } from "../ports/llm-provider.port";
import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";
import { FILE_SUMMARY_PROMPT } from "@core/prompts/admin";
import { buildAndStoreTree, clusterDocuments, persistClusters } from "../../infrastructure/adapters/pageindex.adapter";

export interface IndexKnowledgeFileInput {
  markdown: string;
  sourceFile: string;
  collectionName: string;
  fileId: string;
}

export class IndexKnowledgeFileUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  public async execute(input: IndexKnowledgeFileInput): Promise<void> {
    const { markdown, sourceFile, collectionName, fileId } = input;
    return this.executePageIndex(markdown, sourceFile, collectionName, fileId);
  }

  /**
   * PageIndex pipeline: build hierarchical tree, store in metadata, generate summary.
   */
  private async executePageIndex(
    markdown: string,
    sourceFile: string,
    collectionName: string,
    fileId: string,
  ): Promise<void> {
    const logs: string[] = [];
    const addLog = async (msg: string, progress: number) => {
      logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
      await this.knowledgeRepo.upsertFile({ id: fileId, status: 'indexing', progress, logs: [...logs] });
    };

    try {
      await addLog(`START [PageIndex]: ${sourceFile}`, 5);

      const res = await this.llmProvider.completion({
        messages: [{ role: 'system', content: FILE_SUMMARY_PROMPT }, { role: 'user', content: markdown.slice(0, 3000) }],
        effort: 'low'
      });

      const tree = await buildAndStoreTree(fileId, markdown, sourceFile, this.llmProvider, res.content || '');

      // Assign clusters for scalable two-tier search
      const assignments = await clusterDocuments([{ id: fileId, filename: sourceFile, summary: res.content || '' }], this.llmProvider);
      await persistClusters(assignments).catch(() => {}); // best-effort

      await this.knowledgeRepo.upsertFile({
        id: fileId,
        progress: 100,
        logs: [...logs, `[${new Date().toLocaleTimeString('vi-VN')}] SUCCESS: ${tree.totalNodes} nodes, depth ${tree.depth}`]
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.knowledgeRepo.upsertFile({
        id: fileId,
        status: 'failed',
        progress: 0,
        logs: [...logs, `[ERROR] ${msg}`]
      });
    }
  }
}
