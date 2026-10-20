import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class RenomearEstacaoDestePcUseCase {
  constructor(
    private readonly gateway: IEstacaoImpressaoGateway,
    private readonly store: IEstacaoDestePcStore
  ) {}

  async execute(estacaoId: string, nome: string): Promise<EstacaoImpressaoResumo> {
    const id = estacaoId.trim()
    const trimmed = nome.trim()
    if (!id) throw new Error('Selecione uma estação para renomear.')
    if (!trimmed) throw new Error('Informe o nome da estação.')
    const atualizada = await this.gateway.atualizar(id, { nome: trimmed })
    this.store.salvar(id, trimmed)
    return atualizada
  }
}
