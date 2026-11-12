import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import { montarPatchPapelReceptora } from '@/src/application/estacao-impressao/montarPatchAtualizarEstacao'
import { EmissaoAutomaticaEstacaoPolicy } from '@/src/domain/policies/estacao/EmissaoAutomaticaEstacaoPolicy'

export class DefinirEstacaoReceptoraDeliveryUseCase {
  constructor(private readonly gateway: IEstacaoImpressaoGateway) {}

  async execute(anterior: string | null, proxima: string | null): Promise<void> {
    const de = anterior?.trim() || null
    const para = proxima?.trim() || null
    if (de === para) return
    if (de && de !== para) {
      await this.gateway.atualizar(
        de,
        montarPatchPapelReceptora(EmissaoAutomaticaEstacaoPolicy.estadoAoDesligarReceptora())
      )
    }
    if (para) {
      await this.gateway.atualizar(
        para,
        montarPatchPapelReceptora(EmissaoAutomaticaEstacaoPolicy.estadoAoLigarReceptora())
      )
    }
  }
}
