import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";

export class DeleteKnowledgeFileUseCase {
  constructor(
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  public async execute(fileId: string): Promise<void> {
    await this.knowledgeRepo.deleteFile(fileId);
  }
}
