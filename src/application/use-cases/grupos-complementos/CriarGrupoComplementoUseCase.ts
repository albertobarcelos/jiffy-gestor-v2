import { IGrupoComplementoRepository, CriarGrupoComplementoDTO } from '@/src/domain/repositories/IGrupoComplementoRepository'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { CriarGrupoComplementoSchema } from '@/src/application/dto/CriarGrupoComplementoDTO'

/**
 * Caso de uso para criar grupo de complementos
 */
export class CriarGrupoComplementoUseCase {
  constructor(private repository: IGrupoComplementoRepository) {}

  async execute(data: CriarGrupoComplementoDTO): Promise<GrupoComplemento> {
    // Validação com Zod
    const validatedData = CriarGrupoComplementoSchema.parse(data)

    return this.repository.criarGrupoComplemento(validatedData)
  }
}

