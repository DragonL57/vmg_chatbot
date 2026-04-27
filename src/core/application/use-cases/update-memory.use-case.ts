import { IMemoryRepository } from "../ports/memory-repository.port";

export class UpdateMemoryUseCase {
  constructor(private readonly memoryRepository: IMemoryRepository) {}

  async execute(id: string, userId: string, fact: string): Promise<void> {
    return this.memoryRepository.update(id, userId, fact);
  }
}
