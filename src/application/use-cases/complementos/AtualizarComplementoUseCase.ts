import { IComplementoRepository, AtualizarComplementoDTO } from '@/src/domain/repositories/IComplementoRepository'
import { Complemento } from '@/src/domain/entities/Complemento'
import { AtualizarComplementoSchema } from '@/src/application/dto/AtualizarComplementoDTO'

/**
 * Caso de uso para atualizar complemento
 */
export class AtualizarComplementoUseCase {
  constructor(private repository: IComplementoRepository) {}

  async execute(id: string, data: AtualizarComplementoDTO): Promise<Complemento> {
    if (!id) {
      throw new Error('ID do complemento é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarComplementoSchema.parse(data)

    return this.repository.atualizarComplemento(id, validatedData)
  }
}

