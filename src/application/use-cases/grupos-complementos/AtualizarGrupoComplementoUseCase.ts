import { IGrupoComplementoRepository, AtualizarGrupoComplementoDTO } from '@/src/domain/repositories/IGrupoComplementoRepository'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { AtualizarGrupoComplementoSchema } from '@/src/application/dto/AtualizarGrupoComplementoDTO'

/**
 * Caso de uso para atualizar grupo de complementos
 */
export class AtualizarGrupoComplementoUseCase {
  constructor(private repository: IGrupoComplementoRepository) {}

  async execute(id: string, data: AtualizarGrupoComplementoDTO): Promise<GrupoComplemento> {
    if (!id) {
      throw new Error('ID do grupo de complementos é obrigatório')
    }

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarGrupoComplementoSchema.parse(data)

    return this.repository.atualizarGrupoComplemento(id, validatedData)
  }
}

