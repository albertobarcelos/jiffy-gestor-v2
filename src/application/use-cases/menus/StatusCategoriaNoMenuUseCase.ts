import type { IMenuGrupoSnapshotWriter } from '@/src/application/ports/IMenuGrupoSnapshotWriter'

export class StatusCategoriaNoMenuUseCase {
  constructor(private readonly snapshotWriter: IMenuGrupoSnapshotWriter) {}

  async execute(input: {
    token: string
    menuId: string
    grupoProdutoId: string
    ativo: boolean
  }): Promise<void> {
    if (!input.menuId.trim() || !input.grupoProdutoId.trim()) {
      throw new Error('Menu e categoria são obrigatórios')
    }

    await this.snapshotWriter.atualizarAtivo({
      token: input.token,
      menuId: input.menuId.trim(),
      grupoProdutoId: input.grupoProdutoId.trim(),
      ativo: input.ativo,
    })
  }
}
