import { IVectorStorePort } from "../ports/vector-store.port";
import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";

export class DeleteKnowledgeFileUseCase {
  constructor(
    private readonly vectorStore: IVectorStorePort,
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  async execute(fileId: string, filename: string, collectionName: string): Promise<void> {
    await this.vectorStore.deleteBySource(filename, collectionName);
    await this.knowledgeRepo.deleteFile(fileId);
  }
}
