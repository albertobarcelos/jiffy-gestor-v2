import { IMeioPagamentoRepository, AtualizarMeioPagamentoDTO } from '@/src/domain/repositories/IMeioPagamentoRepository'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { AtualizarMeioPagamentoSchema } from '@/src/application/dto/AtualizarMeioPagamentoDTO'

/**
 * Caso de uso para atualizar meio de pagamento
 */
export class AtualizarMeioPagamentoUseCase {
  constructor(private repository: IMeioPagamentoRepository) {}

  async execute(id: string, data: AtualizarMeioPagamentoDTO): Promise<MeioPagamento> {
    if (!id) {
      throw new Error('ID do meio de pagamento é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarMeioPagamentoSchema.parse(data)

    return this.repository.atualizarMeioPagamento(id, validatedData)
  }
}

