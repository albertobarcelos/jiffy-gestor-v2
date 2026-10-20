import { describe, expect, it, vi } from 'vitest'
import { SnapshotCategoriaAusenteError } from '@/src/application/errors/SnapshotCategoriaAusenteError'
import type { IMenuCatalogoReader } from '@/src/application/ports/IMenuCatalogoReader'
import type { IMenuGrupoSnapshotWriter } from '@/src/application/ports/IMenuGrupoSnapshotWriter'
import { ReplicarStatusCategoriaBaseNosMenusUseCase } from '@/src/application/use-cases/menus/ReplicarStatusCategoriaBaseNosMenusUseCase'

function menusMock(ids: string[]): IMenuCatalogoReader {
  return {
    listar: vi.fn().mockResolvedValue({ items: ids.map(id => ({ id })) }),
  }
}

describe('ReplicarStatusCategoriaBaseNosMenusUseCase', () => {
  it('replica o ativo nos menus que já têm o snapshot', async () => {
    const snapshotWriter: IMenuGrupoSnapshotWriter = {
      atualizarAtivo: vi.fn().mockResolvedValue(undefined),
    }
    const useCase = new ReplicarStatusCategoriaBaseNosMenusUseCase(
      menusMock(['m1', 'm2']),
      snapshotWriter
    )

    const result = await useCase.execute({
      token: 'tok',
      grupoProdutoId: 'cat-1',
      ativo: false,
    })

    expect(snapshotWriter.atualizarAtivo).toHaveBeenCalledTimes(2)
    expect(result.menuIdsAlterados).toEqual(['m1', 'm2'])
  })

  it('ignora menu sem snapshot e propaga erro real', async () => {
    const snapshotWriter: IMenuGrupoSnapshotWriter = {
      atualizarAtivo: vi
        .fn()
        .mockRejectedValueOnce(new SnapshotCategoriaAusenteError())
        .mockRejectedValueOnce(new Error('falha de rede')),
    }
    const useCase = new ReplicarStatusCategoriaBaseNosMenusUseCase(
      menusMock(['sem-snap', 'com-erro']),
      snapshotWriter
    )

    await expect(
      useCase.execute({
        token: 'tok',
        grupoProdutoId: 'cat-1',
        ativo: true,
      })
    ).rejects.toThrow('falha de rede')
  })

  it('não altera o menu de origem quando informado', async () => {
    const snapshotWriter: IMenuGrupoSnapshotWriter = {
      atualizarAtivo: vi.fn().mockResolvedValue(undefined),
    }
    const useCase = new ReplicarStatusCategoriaBaseNosMenusUseCase(
      menusMock(['origem', 'outro']),
      snapshotWriter
    )

    const result = await useCase.execute({
      token: 'tok',
      grupoProdutoId: 'cat-1',
      ativo: true,
      excetoMenuId: 'origem',
    })

    expect(snapshotWriter.atualizarAtivo).toHaveBeenCalledTimes(1)
    expect(snapshotWriter.atualizarAtivo).toHaveBeenCalledWith({
      token: 'tok',
      menuId: 'outro',
      grupoProdutoId: 'cat-1',
      ativo: true,
    })
    expect(result.menuIdsAlterados).toEqual(['outro'])
  })
})
