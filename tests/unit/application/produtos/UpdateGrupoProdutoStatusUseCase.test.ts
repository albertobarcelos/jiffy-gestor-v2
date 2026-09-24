import { describe, expect, it, vi } from 'vitest'
import type { IGrupoProdutoStatusWriter } from '@/src/application/ports/IGrupoProdutoStatusWriter'
import { UpdateGrupoProdutoStatusUseCase } from '@/src/application/use-cases/produtos/UpdateGrupoProdutoStatusUseCase'

describe('UpdateGrupoProdutoStatusUseCase', () => {
  it('grava o cadastro base e depois replica nos snapshots', async () => {
    const ordem: string[] = []
    const grupoStatusWriter: IGrupoProdutoStatusWriter = {
      atualizarAtivo: vi.fn().mockImplementation(async () => {
        ordem.push('base')
      }),
    }
    const replicar = {
      execute: vi.fn().mockImplementation(async () => {
        ordem.push('replica')
        return { menuIdsAlterados: ['m1'] }
      }),
    }
    const useCase = new UpdateGrupoProdutoStatusUseCase(grupoStatusWriter, replicar)

    await useCase.execute({
      grupoId: ' grupo-1 ',
      novoStatus: false,
      token: 'tok',
    })

    expect(grupoStatusWriter.atualizarAtivo).toHaveBeenCalledWith({
      token: 'tok',
      grupoId: 'grupo-1',
      ativo: false,
    })
    expect(replicar.execute).toHaveBeenCalledWith({
      token: 'tok',
      grupoProdutoId: 'grupo-1',
      ativo: false,
    })
    expect(ordem).toEqual(['base', 'replica'])
  })

  it('não replica se a gravação da base falhar', async () => {
    const grupoStatusWriter: IGrupoProdutoStatusWriter = {
      atualizarAtivo: vi.fn().mockRejectedValue(new Error('base falhou')),
    }
    const replicar = { execute: vi.fn() }
    const useCase = new UpdateGrupoProdutoStatusUseCase(grupoStatusWriter, replicar)

    await expect(
      useCase.execute({
        grupoId: 'grupo-1',
        novoStatus: true,
        token: 'tok',
      })
    ).rejects.toThrow('base falhou')
    expect(replicar.execute).not.toHaveBeenCalled()
  })
})
