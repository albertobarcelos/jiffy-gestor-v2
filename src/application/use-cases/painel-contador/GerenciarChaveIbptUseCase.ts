import type { IFiscalPainelRepository } from '@/src/domain/repositories/IFiscalPainelRepository'
import { EtapaIbptCompletaPolicy } from '@/src/domain/policies/painel-contador/EtapaIbptCompletaPolicy'

export class GerenciarChaveIbptUseCase {
  constructor(private readonly repository: IFiscalPainelRepository) {}

  async getStatus() {
    const config = await this.repository.getConfiguracaoFiscal()
    return {
      ibptTokenStatus: config?.ibptTokenStatus ?? null,
      etapa: EtapaIbptCompletaPolicy.check(config),
    }
  }

  async salvar(chave: string): Promise<void> {
    const token = chave.trim()
    if (!token) throw new Error('Chave IBPT é obrigatória')
    await this.repository.salvarIbptToken(token)
  }

  async remover(): Promise<void> {
    await this.repository.salvarIbptToken('')
  }
}
