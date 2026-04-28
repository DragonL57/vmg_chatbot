import { ILLMProvider } from "../ports/llm-provider.port";
import { IChatRepository } from "../ports/chat-repository.port";
import { CONVERSATION_TITLE_PROMPT } from "@core/prompts/title-assigner";

export class GenerateTitleUseCase {
  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly chatRepo: IChatRepository
  ) {}

  async execute(conversationId: string, userId: string, firstMessage: string): Promise<string> {
    const res = await this.llmProvider.completion({
      messages: [
        { role: 'system', content: CONVERSATION_TITLE_PROMPT },
        { role: 'user', content: firstMessage },
      ],
      effort: 'low'
    });

    const title = (res.content || 'New Conversation').trim().replace(/^"|"$/g, '');
    await this.chatRepo.rename(conversationId, userId, title);

    return title;
  }
}
