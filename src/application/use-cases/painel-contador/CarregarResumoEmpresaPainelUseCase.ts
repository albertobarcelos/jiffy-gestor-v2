import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { FiscalPainelMapper } from '@/src/application/mappers/FiscalPainelMapper'
import type { ResumoEmpresaPainelDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class CarregarResumoEmpresaPainelUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(): Promise<ResumoEmpresaPainelDTO> {
    const [empresa, configFiscal] = await Promise.all([
      this.repository.getEmpresaMe(),
      this.repository.getConfiguracaoFiscal(),
    ])
    return FiscalPainelMapper.toResumoEmpresaDTO(empresa, configFiscal)
  }
}
