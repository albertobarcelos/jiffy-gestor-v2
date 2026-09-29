import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import {
  ESTACAO_IMPRESSAO_CONFIG_VAZIA,
  EstacaoImpressaoNaoEncontradaError,
  type EstacaoImpressaoConfigResolvida,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class ResolverEstacaoImpressaoDestePcUseCase {
  constructor(
    private readonly gateway: IEstacaoImpressaoGateway,
    private readonly store: IEstacaoDestePcStore
  ) {}

  async execute(): Promise<EstacaoImpressaoConfigResolvida> {
    const estacaoId = this.store.obterId()?.trim() ?? ''
    if (!estacaoId) return ESTACAO_IMPRESSAO_CONFIG_VAZIA

    try {
      const [mapeamentos, estacoes] = await Promise.all([
        this.gateway.buscarMapeamentos(estacaoId),
        this.gateway.listar().catch(() => []),
      ])
      const gestorDelivery = estacoes.find(e => e.id === estacaoId)?.gestorDelivery === true
      return { estacaoId, gestorDelivery, mapeamentos }
    } catch (error) {
      if (error instanceof EstacaoImpressaoNaoEncontradaError) {
        this.store.limpar()
        return ESTACAO_IMPRESSAO_CONFIG_VAZIA
      }
      throw error
    }
  }
}
