import { IMeioPagamentoRepository, BuscarMeiosPagamentosParams } from '@/src/domain/repositories/IMeioPagamentoRepository'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

/**
 * Caso de uso para buscar meios de pagamento
 */
export class BuscarMeiosPagamentosUseCase {
  constructor(private repository: IMeioPagamentoRepository) {}

  async execute(params: BuscarMeiosPagamentosParams): Promise<{
    meiosPagamento: MeioPagamento[]
    total: number
  }> {
    return this.repository.buscarMeiosPagamentos(params)
  }
}

