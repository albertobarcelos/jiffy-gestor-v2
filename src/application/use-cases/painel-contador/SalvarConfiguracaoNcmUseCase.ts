import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { SalvarNcmImpostosSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class SalvarConfiguracaoNcmUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(ncm: string, input: unknown): Promise<void> {
    const parsed = SalvarNcmImpostosSchema.safeParse(input)
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? 'Dados de impostos inválidos')
    }
    await this.repository.salvarConfiguracaoNcm(ncm, parsed.data)
  }
}
