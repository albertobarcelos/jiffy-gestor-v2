import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { CopiarNcmSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class CopiarConfiguracaoNcmUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(ncmOrigem: string, input: unknown): Promise<void> {
    const dto = CopiarNcmSchema.parse(input)
    if (dto.ncmsDestino.includes(ncmOrigem)) {
      throw new Error('NCM origem não pode estar na lista de destino')
    }
    await this.repository.copiarConfiguracaoNcm(ncmOrigem, dto)
  }
}
