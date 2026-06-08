import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import type { GapsQueryDTO } from '@/src/application/dto/painel-contador/PainelContadorDTO'

export class ConsultarGapsNumeracaoUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async execute(params: GapsQueryDTO) {
    return this.repository.consultarGapsNumeracao(params)
  }

  async listarEmissoes() {
    return this.repository.listarConfiguracoesEmissao()
  }

  async getContextoFiscal() {
    return this.repository.getConfiguracaoFiscal()
  }

  async listarInutilizacoes(modelo: number, serie: number) {
    return this.repository.listarInutilizacoes(modelo, serie)
  }
}
