import { IAuthRepository } from "../ports/auth-repository.port";

export class GetInternalUserIdUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  public async execute(supabaseUserId: string): Promise<string | null> {
    return this.authRepo.getInternalId(supabaseUserId);
  }
}
