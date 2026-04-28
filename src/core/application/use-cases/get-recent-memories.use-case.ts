import { IMemoryRepository } from "../ports/memory-repository.port";
import { UserMemory } from "../../domain/entities/memory";

export class GetRecentMemoriesUseCase {
  constructor(private readonly memoryRepository: IMemoryRepository) {}

  async execute(userId: string, limit = 20): Promise<UserMemory[]> {
    return this.memoryRepository.getByUserId(userId, limit);
  }
}
