import { SnapshotCategoriaAusenteError } from '@/src/application/errors/SnapshotCategoriaAusenteError'
import type { IMenuGrupoSnapshotWriter } from '@/src/application/ports/IMenuGrupoSnapshotWriter'
import { isBffNotFound } from '@/src/infrastructure/api/bffClient'
import { menuBffRepository } from '@/src/infrastructure/api/repositories/MenuBffRepository'

export class MenuGrupoSnapshotBffWriter implements IMenuGrupoSnapshotWriter {
  async atualizarAtivo(input: {
    token: string
    menuId: string
    grupoProdutoId: string
    ativo: boolean
  }): Promise<void> {
    try {
      await menuBffRepository.atualizarGrupo(
        input.token,
        input.menuId,
        input.grupoProdutoId,
        { ativo: input.ativo }
      )
    } catch (error) {
      if (isBffNotFound(error)) {
        throw new SnapshotCategoriaAusenteError(
          error instanceof Error ? error.message : undefined
        )
      }
      throw error
    }
  }
}

export const menuGrupoSnapshotBffWriter = new MenuGrupoSnapshotBffWriter()
