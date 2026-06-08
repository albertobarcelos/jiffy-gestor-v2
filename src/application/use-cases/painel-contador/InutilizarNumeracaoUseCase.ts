import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { InutilizarNumeracaoSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import { JustificativaInutilizacaoPolicy } from '@/src/domain/policies/painel-contador/JustificativaInutilizacaoPolicy'

export class InutilizarNumeracaoUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(input: unknown): Promise<void> {
    const dto = InutilizarNumeracaoSchema.parse(input)
    const justificativa = JustificativaInutilizacaoPolicy.check(dto.justificativa)
    if (!justificativa.valida) {
      throw new Error(justificativa.motivo)
    }
    await this.repository.inutilizarNumeracao(dto)
  }
}
