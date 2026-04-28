import { IVectorStorePort } from "../ports/vector-store.port";

export class GetFullFileContentUseCase {
  constructor(private readonly vectorStore: IVectorStorePort) {}

  async execute(filename: string, collectionName: string): Promise<string> {
    const results = await this.vectorStore.listBySource(filename, collectionName);
    const parents = new Set<string>();
    results.forEach(r => {
      if (r.source === filename && r.parentContent) parents.add(r.parentContent);
    });
    return Array.from(parents).join("\n\n");
  }
}
