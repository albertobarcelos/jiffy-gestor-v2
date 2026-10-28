import { describe, expect, it, vi } from 'vitest'
import { ReplicacaoStatusCategoriaFalhouError } from '@/src/application/errors/ReplicacaoStatusCategoriaFalhouError'
import type { IGrupoProdutoStatusWriter } from '@/src/application/ports/IGrupoProdutoStatusWriter'
import { UpdateGrupoProdutoStatusUseCase } from '@/src/application/use-cases/produtos/UpdateGrupoProdutoStatusUseCase'

describe('UpdateGrupoProdutoStatusUseCase', () => {
  it('grava o cadastro, avisa a UI e só então publica nos cardápios', async () => {
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

    await useCase.execute(
      {
        grupoId: ' grupo-1 ',
        novoStatus: false,
        token: 'tok',
      },
      {
        aposGravarBase: async () => {
          ordem.push('ui')
        },
      }
    )

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
    expect(ordem).toEqual(['base', 'ui', 'replica'])
  })

  it('não replica se a gravação da base falhar', async () => {
    const aposGravarBase = vi.fn()
    const grupoStatusWriter: IGrupoProdutoStatusWriter = {
      atualizarAtivo: vi.fn().mockRejectedValue(new Error('base falhou')),
    }
    const replicar = { execute: vi.fn() }
    const useCase = new UpdateGrupoProdutoStatusUseCase(grupoStatusWriter, replicar)

    await expect(
      useCase.execute(
        {
          grupoId: 'grupo-1',
          novoStatus: true,
          token: 'tok',
        },
        { aposGravarBase }
      )
    ).rejects.toThrow('base falhou')
    expect(aposGravarBase).not.toHaveBeenCalled()
    expect(replicar.execute).not.toHaveBeenCalled()
  })

  it('se a publicação nos cardápios falhar, a base já gravou e a UI já foi avisada', async () => {
    const aposGravarBase = vi.fn()
    const grupoStatusWriter: IGrupoProdutoStatusWriter = {
      atualizarAtivo: vi.fn(),
    }
    const replicar = { execute: vi.fn().mockRejectedValue(new Error('menu 2 falhou')) }
    const useCase = new UpdateGrupoProdutoStatusUseCase(grupoStatusWriter, replicar)

    await expect(
      useCase.execute(
        { grupoId: 'grupo-1', novoStatus: false, token: 'tok' },
        { aposGravarBase }
      )
    ).rejects.toBeInstanceOf(ReplicacaoStatusCategoriaFalhouError)

    expect(grupoStatusWriter.atualizarAtivo).toHaveBeenCalled()
    expect(aposGravarBase).toHaveBeenCalled()
  })
})
