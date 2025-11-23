import { IImpressoraRepository, AtualizarImpressoraDTO } from '@/src/domain/repositories/IImpressoraRepository'
import { Impressora } from '@/src/domain/entities/Impressora'
import { AtualizarImpressoraSchema } from '@/src/application/dto/AtualizarImpressoraDTO'

/**
 * Caso de uso para atualizar impressora
 */
export class AtualizarImpressoraUseCase {
  constructor(private repository: IImpressoraRepository) {}

  async execute(id: string, data: AtualizarImpressoraDTO): Promise<Impressora> {
    if (!id) {
      throw new Error('ID da impressora é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarImpressoraSchema.parse(data)

    return this.repository.atualizarImpressora(id, validatedData)
  }
}

