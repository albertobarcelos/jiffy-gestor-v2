import { ReordenarGrupoComplementoNoMenuSchema } from '@/src/application/dto/complementos/ComplementoOverrideSchemas'
import type { IComplementoOverrideRepository } from '@/src/domain/repositories/IComplementoOverrideRepository'

export class ReordenarGrupoComplementoNoMenuUseCase {
  constructor(private readonly repository: IComplementoOverrideRepository) {}

  async execute(menuId: string, produtoId: string, input: unknown): Promise<void> {
    const menu = menuId?.trim()
    const produto = produtoId?.trim()
    if (!menu) throw new Error('Menu não informado')
    if (!produto) throw new Error('Produto não informado')

    const data = ReordenarGrupoComplementoNoMenuSchema.parse(input)
    await this.repository.reordenarGrupoNoMenu(
      menu,
      produto,
      data.grupoComplementoId,
      data.novaPosicao
    )
  }
}
