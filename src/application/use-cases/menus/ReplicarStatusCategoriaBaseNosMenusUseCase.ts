import { isSnapshotCategoriaAusente } from '@/src/application/errors/SnapshotCategoriaAusenteError'
import type { IMenuCatalogoReader } from '@/src/application/ports/IMenuCatalogoReader'
import type { IMenuGrupoSnapshotWriter } from '@/src/application/ports/IMenuGrupoSnapshotWriter'

export type ReplicarStatusCategoriaResultado = {
  menuIdsAlterados: string[]
}

export class ReplicarStatusCategoriaBaseNosMenusUseCase {
  constructor(
    private readonly menus: IMenuCatalogoReader,
    private readonly snapshotWriter: IMenuGrupoSnapshotWriter
  ) {}

  async execute(input: {
    token: string
    grupoProdutoId: string
    ativo: boolean
    excetoMenuId?: string
  }): Promise<ReplicarStatusCategoriaResultado> {
    if (!input.grupoProdutoId.trim()) {
      throw new Error('Categoria é obrigatória')
    }

    const { items } = await this.menus.listar({
      token: input.token,
      limit: 100,
      offset: 0,
    })

    const menuIdsAlterados: string[] = []
    const exceto = input.excetoMenuId?.trim()

    for (const menu of items) {
      if (exceto && menu.id === exceto) continue
      try {
        await this.snapshotWriter.atualizarAtivo({
          token: input.token,
          menuId: menu.id,
          grupoProdutoId: input.grupoProdutoId.trim(),
          ativo: input.ativo,
        })
        menuIdsAlterados.push(menu.id)
      } catch (error) {
        if (isSnapshotCategoriaAusente(error)) continue
        throw error
      }
    }

    return { menuIdsAlterados }
  }
}
