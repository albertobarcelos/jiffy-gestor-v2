import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import { montarPatchEmissaoAutomatica } from '@/src/application/estacao-impressao/montarPatchAtualizarEstacao'
import { estacaoEhReceptoraDelivery } from '@/src/domain/caixa-estacao/estacaoReceptoraDelivery'
import {
  EmissaoAutomaticaEstacaoPolicy,
  MENSAGEM_ESTACAO_PRINCIPAL_OBRIGATORIA,
} from '@/src/domain/policies/estacao/EmissaoAutomaticaEstacaoPolicy'

export class DefinirEmissaoAutomaticaAoFinalizarEstacaoUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  /**
   * Grava o flag na estação. Resolve a receptora pela listagem —
   * não confia no boolean da tela.
   */
  async execute(input: { estacaoId: string; ativo: boolean }): Promise<void> {
    const id = input.estacaoId.trim()
    if (!id) {
      throw new Error(MENSAGEM_ESTACAO_PRINCIPAL_OBRIGATORIA)
    }
    const estacoes = await this.gateway.listar()
    const ehReceptora = estacaoEhReceptoraDelivery(id, estacoes)
    EmissaoAutomaticaEstacaoPolicy.assert({ ehReceptora, ativar: input.ativo })
    const ativo = EmissaoAutomaticaEstacaoPolicy.valorEfetivo(ehReceptora, input.ativo)
    await this.gateway.atualizar(id, montarPatchEmissaoAutomatica(ativo))
  }
}
