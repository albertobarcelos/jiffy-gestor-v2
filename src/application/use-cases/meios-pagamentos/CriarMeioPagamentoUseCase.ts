import { IMeioPagamentoRepository, CriarMeioPagamentoDTO } from '@/src/domain/repositories/IMeioPagamentoRepository'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { CriarMeioPagamentoSchema } from '@/src/application/dto/CriarMeioPagamentoDTO'

/**
 * Caso de uso para criar meio de pagamento
 */
export class CriarMeioPagamentoUseCase {
  constructor(private repository: IMeioPagamentoRepository) {}

  async execute(data: CriarMeioPagamentoDTO): Promise<MeioPagamento> {
    // Validação com Zod
    const validatedData = CriarMeioPagamentoSchema.parse(data)

    return this.repository.criarMeioPagamento(validatedData)
  }
}

