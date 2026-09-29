import type { PaginationOperacaoCaixaEstacaoDTO } from '@/src/application/dto/caixa-estacao/OperacaoCaixaEstacaoDTO'
import { mapPaginationOperacaoCaixaEstacao } from '@/src/application/mappers/caixa-estacao/OperacaoCaixaEstacaoMapper'
import type { IOperacaoCaixaEstacaoGateway } from '@/src/application/ports/IOperacaoCaixaEstacaoGateway'

export class ListarHistoricoCaixaEstacaoUseCase {
  constructor(private readonly gateway: IOperacaoCaixaEstacaoGateway) {}

  async execute(estacaoGestorId: string): Promise<PaginationOperacaoCaixaEstacaoDTO> {
    const id = estacaoGestorId?.trim()
    if (!id) {
      return {
        count: 0,
        limit: 20,
        offset: 0,
        page: 1,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
        items: [],
      }
    }
    const body = await this.gateway.listarOperacoes({
      limit: 20,
      offset: 0,
      status: 'fechado',
      estacaoGestorId: id,
    })
    return mapPaginationOperacaoCaixaEstacao(body)
  }
}
