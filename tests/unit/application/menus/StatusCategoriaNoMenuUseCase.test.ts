import { describe, expect, it, vi } from 'vitest'
import type { IMenuGrupoSnapshotWriter } from '@/src/application/ports/IMenuGrupoSnapshotWriter'
import { StatusCategoriaNoMenuUseCase } from '@/src/application/use-cases/menus/StatusCategoriaNoMenuUseCase'

function writerMock(
  overrides: Partial<IMenuGrupoSnapshotWriter> = {}
): IMenuGrupoSnapshotWriter {
  return {
    atualizarAtivo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('StatusCategoriaNoMenuUseCase', () => {
  it('grava ativo só no snapshot do menu', async () => {
    const snapshotWriter = writerMock()
    const useCase = new StatusCategoriaNoMenuUseCase(snapshotWriter)

    await useCase.execute({
      token: 'tok',
      menuId: ' menu-1 ',
      grupoProdutoId: ' grupo-1 ',
      ativo: false,
    })

    expect(snapshotWriter.atualizarAtivo).toHaveBeenCalledWith({
      token: 'tok',
      menuId: 'menu-1',
      grupoProdutoId: 'grupo-1',
      ativo: false,
    })
  })

  it('exige menu e categoria', async () => {
    const useCase = new StatusCategoriaNoMenuUseCase(writerMock())

    await expect(
      useCase.execute({
        token: 'tok',
        menuId: '  ',
        grupoProdutoId: 'grupo-1',
        ativo: true,
      })
    ).rejects.toThrow('Menu e categoria são obrigatórios')
  })
})
