import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SnapshotCategoriaAusenteError } from '@/src/application/errors/SnapshotCategoriaAusenteError'
import { BffHttpError } from '@/src/infrastructure/api/bffClient'

const atualizarGrupo = vi.fn()

vi.mock('@/src/infrastructure/api/repositories/MenuBffRepository', () => ({
  menuBffRepository: {
    atualizarGrupo: (...args: unknown[]) => atualizarGrupo(...args),
  },
}))

import { MenuGrupoSnapshotBffWriter } from '@/src/infrastructure/api/adapters/MenuGrupoSnapshotBffWriter'

describe('MenuGrupoSnapshotBffWriter', () => {
  beforeEach(() => {
    atualizarGrupo.mockReset()
  })

  it('converte 404 do BFF em snapshot ausente', async () => {
    atualizarGrupo.mockRejectedValue(new BffHttpError('não encontrado', 404))
    const writer = new MenuGrupoSnapshotBffWriter()

    await expect(
      writer.atualizarAtivo({
        token: 'tok',
        menuId: 'm1',
        grupoProdutoId: 'g1',
        ativo: false,
      })
    ).rejects.toBeInstanceOf(SnapshotCategoriaAusenteError)
  })

  it('repassa erro que não é snapshot ausente', async () => {
    atualizarGrupo.mockRejectedValue(new BffHttpError('falha interna', 500))
    const writer = new MenuGrupoSnapshotBffWriter()

    await expect(
      writer.atualizarAtivo({
        token: 'tok',
        menuId: 'm1',
        grupoProdutoId: 'g1',
        ativo: true,
      })
    ).rejects.toMatchObject({ status: 500, message: 'falha interna' })
  })
})
