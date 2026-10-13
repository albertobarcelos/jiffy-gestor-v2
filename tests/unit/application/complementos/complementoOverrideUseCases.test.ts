import { describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { AtualizarOverridesComplementoUseCase } from '@/src/application/use-cases/complementos/AtualizarOverridesComplementoUseCase'
import { AtualizarVinculosComplementoUseCase } from '@/src/application/use-cases/complementos/AtualizarVinculosComplementoUseCase'
import { ReordenarComplementoNoMenuUseCase } from '@/src/application/use-cases/complementos/ReordenarComplementoNoMenuUseCase'
import type { IComplementoOverrideRepository } from '@/src/domain/repositories/IComplementoOverrideRepository'
import { mapComplementoCompletoFromApi } from '@/src/infrastructure/database/repositories/mapComplementoCompletoFromApi'

function repositorioFake(): IComplementoOverrideRepository {
  return {
    buscarCompleto: vi.fn(),
    gravarOverrides: vi.fn().mockResolvedValue({
      message: 'Configurações atualizadas com sucesso',
      atualizados: 1,
    }),
    reordenarGrupoNoMenu: vi.fn(),
    reordenarComplementoNoMenu: vi.fn(),
  }
}

describe('overrides de complemento', () => {
  it('rejeita vínculo sem valor e sem ativo', async () => {
    const repository = repositorioFake()
    const useCase = new AtualizarVinculosComplementoUseCase(repository)

    await expect(
      useCase.execute({
        vinculos: [
          {
            menuId: 'menu-1',
            produtoId: 'prod-1',
            complementoId: 'comp-1',
            grupoComplementoId: 'grupo-1',
          },
        ],
      })
    ).rejects.toBeInstanceOf(ZodError)
    expect(repository.gravarOverrides).not.toHaveBeenCalled()
  })

  it('grava vínculos e grupos no mesmo PATCH', async () => {
    const repository = repositorioFake()
    const useCase = new AtualizarOverridesComplementoUseCase(repository)

    await useCase.execute({
      vinculos: [
        {
          menuId: 'menu-1',
          produtoId: 'prod-1',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 3.5,
        },
      ],
      grupos: [
        {
          grupoComplementoId: 'grupo-1',
          complementoId: 'comp-1',
          tipoImpactoPreco: 'aumenta',
        },
      ],
    })

    expect(repository.gravarOverrides).toHaveBeenCalledWith({
      vinculos: [
        {
          menuId: 'menu-1',
          produtoId: 'prod-1',
          complementoId: 'comp-1',
          grupoComplementoId: 'grupo-1',
          valor: 3.5,
        },
      ],
      grupos: [
        {
          grupoComplementoId: 'grupo-1',
          complementoId: 'comp-1',
          tipoImpactoPreco: 'aumenta',
        },
      ],
    })
  })

  it('reordena complemento com posição 1-based', async () => {
    const repository = repositorioFake()
    const useCase = new ReordenarComplementoNoMenuUseCase(repository)

    await useCase.execute(' menu-1 ', ' prod-1 ', {
      novaPosicao: 2,
      grupoComplementoId: 'grupo-1',
      complementoId: 'comp-1',
    })

    expect(repository.reordenarComplementoNoMenu).toHaveBeenCalledWith(
      'menu-1',
      'prod-1',
      'grupo-1',
      'comp-1',
      2
    )
  })

  it('mapeia o GET completo usando o id do produto de cadastro', () => {
    const completo = mapComplementoCompletoFromApi({
      id: 'comp-1',
      nome: 'Bacon',
      vinculos: [
        {
          menuProdutoId: 'mp-1',
          menu: { id: 'menu-1', nome: 'Delivery', ativo: true },
          produto: { id: 'prod-cadastro', nome: 'X-Burger', ativo: true },
          grupoProduto: { id: 'cat-1', nome: 'Lanches' },
          grupoComplementos: { id: 'grupo-1', nome: 'Adicionais' },
          complementoConfig: { ordem: 1, valor: 4, ativo: false },
        },
      ],
      grupos: [{ id: 'grupo-1', nome: 'Adicionais', tipoImpactoPreco: 'diminui' }],
    })

    expect(completo?.vinculos[0]?.produto.id).toBe('prod-cadastro')
    expect(completo?.vinculos[0]?.complementoConfig.ativo).toBe(false)
    expect(completo?.grupos[0]?.tipoImpactoPreco).toBe('diminui')
  })
})
