import { IMemoryRepository } from "../ports/memory-repository.port";

export class DeleteMemoryUseCase {
  constructor(private readonly memoryRepository: IMemoryRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    return this.memoryRepository.delete(id, userId);
  }
}
