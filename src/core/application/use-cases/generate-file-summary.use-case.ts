import { ILLMProvider } from "../ports/llm-provider.port";
import { IKnowledgeRepositoryPort } from "../ports/knowledge-repository.port";
import { FILE_SUMMARY_PROMPT } from "@core/prompts/admin";

export class GenerateFileSummaryUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly knowledgeRepo: IKnowledgeRepositoryPort
  ) {}

  public async execute(fileId: string, content: string): Promise<string> {
    const headings = content.match(/^#{1,3}\s.*$/gm) || [];
    const structure = headings.slice(0, 20).join("\n");
    const sampleSize = 600;
    const length = content.length;
    const samples = [
      content.slice(0, sampleSize),
      content.slice(Math.floor(length * 0.25), Math.floor(length * 0.25) + sampleSize),
      content.slice(Math.floor(length * 0.5), Math.floor(length * 0.5) + sampleSize),
      content.slice(Math.floor(length * 0.75), Math.floor(length * 0.75) + sampleSize),
      content.slice(Math.max(0, length - sampleSize))
    ];

    const skeleton = `STRUCTURE:\n${structure}\n\nSAMPLED SNIPPETS:\n${samples.join("\n---\n")}`;

    const res = await this.llmProvider.completion({
      messages: [
        { role: 'system', content: FILE_SUMMARY_PROMPT },
        { role: 'user', content: skeleton },
      ],
      effort: 'low'
    });

    const summary = (res.content || '').trim();
    if (summary) {
      await this.knowledgeRepo.upsertFile({ id: fileId, summary });
    }

    return summary;
  }
}
