import { ILLMProvider } from "../ports/llm-provider.port";
import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";
import { COLLECTION_DESCRIPTION_PROMPT } from "@core/prompts/admin";

export class GenerateCollectionDescriptionUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  public async execute(collectionId: string, collectionName: string): Promise<string> {
    const allFiles = await this.knowledgeRepo.listFiles();
    const collectionFiles = allFiles.filter(f => f.collectionKey === collectionName && f.status === 'completed');
    
    if (collectionFiles.length === 0) return '';

    const summaries = collectionFiles.filter(f => f.summary).map(f => `- ${f.filename}: ${f.summary}`).join("\n");
    if (!summaries) return '';

    const res = await this.llmProvider.completion({
      messages: [
        { role: 'system', content: COLLECTION_DESCRIPTION_PROMPT },
        { role: 'user', content: `Document list:\n${summaries}` },
      ],
      effort: 'low'
    });

    const description = (res.content || '').trim();
    if (description) {
      await this.knowledgeRepo.updateCollection(collectionId, { description });
    }

    return description;
  }
}
