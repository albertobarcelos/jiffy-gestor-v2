import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { SalvarNcmImpostosSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class SalvarConfiguracaoNcmUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(ncm: string, input: unknown): Promise<void> {
    const dto = SalvarNcmImpostosSchema.parse(input)
    await this.repository.salvarConfiguracaoNcm(ncm, dto)
  }
}
