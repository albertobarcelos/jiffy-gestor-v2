import type { IEstacaoDestePcStore } from '@/src/application/ports/IEstacaoDestePcStore'
import type { IEstacaoImpressaoGateway } from '@/src/application/ports/IEstacaoImpressaoGateway'
import type { EstacaoImpressaoResumo } from '@/src/domain/estacao-impressao/EstacaoImpressao'

export class CriarEstacaoDestePcUseCase {
  constructor(
    private readonly gateway: IEstacaoImpressaoGateway,
    private readonly store: IEstacaoDestePcStore
  ) {}

  async execute(nome: string): Promise<EstacaoImpressaoResumo> {
    const trimmed = nome.trim()
    if (!trimmed) throw new Error('Informe o nome da estação.')
    const criada = await this.gateway.criar(trimmed)
    this.store.salvar(criada.id, criada.nome)
    return criada
  }
}
