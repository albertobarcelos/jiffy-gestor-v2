import { IMeioPagamentoRepository } from '@/src/domain/repositories/IMeioPagamentoRepository'

/**
 * Caso de uso para deletar meio de pagamento
 */
export class DeletarMeioPagamentoUseCase {
  constructor(private repository: IMeioPagamentoRepository) {}

  async execute(id: string): Promise<void> {
    if (!id) {
      throw new Error('ID do meio de pagamento é obrigatório')
    }

    return this.repository.deletarMeioPagamento(id)
  }
}

