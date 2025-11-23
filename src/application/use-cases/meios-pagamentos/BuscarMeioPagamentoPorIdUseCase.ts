import { IMeioPagamentoRepository } from '@/src/domain/repositories/IMeioPagamentoRepository'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

/**
 * Caso de uso para buscar meio de pagamento por ID
 */
export class BuscarMeioPagamentoPorIdUseCase {
  constructor(private repository: IMeioPagamentoRepository) {}

  async execute(id: string): Promise<MeioPagamento | null> {
    if (!id) {
      throw new Error('ID do meio de pagamento é obrigatório')
    }

    return this.repository.buscarMeioPagamentoPorId(id)
  }
}

