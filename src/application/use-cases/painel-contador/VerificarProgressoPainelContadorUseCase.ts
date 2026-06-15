import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { EtapaDadosFiscaisCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaDadosFiscaisCompletaPolicy'
import { EtapaEmissorFiscalCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaEmissorFiscalCompletaPolicy'
import { EtapaCenarioFiscalCompletoPolicy } from '@/src/domain/policies/painel-contador/EtapaCenarioFiscalCompletoPolicy'
import { FiscalPainelMapper } from '@/src/application/mappers/FiscalPainelMapper'
import type { ProgressoEtapasDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'
import type { ProgressoEtapasMap } from '@/src/domain/policies/painel-contador/EtapaHabilitadaPolicy'

export class VerificarProgressoPainelContadorUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(): Promise<ProgressoEtapasDTO> {
    const [empresa, configFiscal, certResult, emissoes, ncmsPage] = await Promise.all([
      this.repository.getEmpresaMe(),
      this.repository.getConfiguracaoFiscal(),
      this.repository.getCertificado(),
      this.repository.listarConfiguracoesEmissao(),
      this.repository.listarNcms(0, 1000),
    ])

    const etapa1 = EtapaDadosFiscaisCompletaPolicy.check(
      empresa,
      configFiscal,
      certResult.certificado
    )
    const etapa2 = EtapaEmissorFiscalCompletaPolicy.check(emissoes)
    const etapa3 = EtapaCenarioFiscalCompletoPolicy.check(configFiscal, ncmsPage.content)
    const etapasConcluidas: ProgressoEtapasMap = {
      'etapa-1-dados-fiscais': etapa1.concluida,
      'etapa-2-emissor-fiscal': etapa2.concluida,
      'etapa-3-cenario-fiscal': etapa3.concluida,
      'etapa-4-numeracoes-fiscais': false,
    }

    return FiscalPainelMapper.toProgressoEtapasDTO(
      etapasConcluidas,
      etapa1.certificadoStatus
    )
  }
}
