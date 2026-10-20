import type { MovimentacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { mapListaMovimentacoesCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'

export type TipoMovimentacaoCaixaEstacaoLista = 'sangrias' | 'suprimentos'

export class ListarMovimentacoesCaixaEstacaoUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(
    estacaoGestorId: string,
    tipo: TipoMovimentacaoCaixaEstacaoLista
  ): Promise<MovimentacaoCaixaEstacaoDTO[]> {
    const id = estacaoGestorId?.trim()
    if (!id) return []
    const body = await this.gateway.listarMovimentacoes(id, tipo)
    const lista = mapListaMovimentacoesCaixaEstacao(body)
    return [...lista].sort(
      (a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
    )
  }
}
