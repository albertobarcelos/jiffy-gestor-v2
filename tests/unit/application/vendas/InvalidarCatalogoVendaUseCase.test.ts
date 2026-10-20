import { describe, expect, it, vi } from 'vitest'
import type { IGrupoComplementoCatalogoCache } from '@/src/application/ports/IGrupoComplementoCatalogoCache'
import {
  InvalidarCatalogoVendaUseCase,
  LimparCacheGruposComplementosCatalogoUseCase,
  montarPlanoInvalidacaoCatalogoVenda,
  motivoInvalidacaoDeSnapshotProduto,
} from '@/src/application/use-cases/vendas/InvalidarCatalogoVendaUseCase'

function cacheFake(): IGrupoComplementoCatalogoCache {
  return {
    limpar: vi.fn(),
    removerPorIds: vi.fn(),
    removerPorComplementoId: vi.fn(),
  }
}

describe('InvalidarCatalogoVendaUseCase', () => {
  it('save de nome/preço não zera grupos de complemento nem abas do cardápio', () => {
    const plano = montarPlanoInvalidacaoCatalogoVenda({
      tipo: 'produto-campos-simples',
      produtoId: 'p1',
      grupoProdutoId: 'lanches',
      menuIds: ['menu-a'],
    })
    expect(plano.invalidarProdutosPorGrupo).toBe(true)
    expect(plano.invalidarBusca).toBe(true)
    expect(plano.invalidarMenuGrupos).toBe(false)
    expect(plano.menuIds).toEqual(['menu-a'])
    expect(plano.grupoProdutoIds).toEqual(['lanches'])
    expect(plano.hidratacao).toEqual({ produtoIds: ['p1'] })
    expect(plano.cacheGrupos).toEqual({ modo: 'nenhum' })
  })

  it('estrutura com ids de grupo evicta só esses grupos', () => {
    const cache = cacheFake()
    const useCase = new InvalidarCatalogoVendaUseCase(cache)
    const plano = useCase.execute({
      tipo: 'produto-estrutura',
      produtoId: 'p1',
      grupoComplementoIds: ['doces', 'add'],
    })
    expect(plano.cacheGrupos).toEqual({ modo: 'ids', ids: ['doces', 'add'] })
    expect(cache.removerPorIds).toHaveBeenCalledWith(['doces', 'add'])
    expect(cache.limpar).not.toHaveBeenCalled()
  })

  it('estrutura sem ids de grupo limpa o cache inteiro', () => {
    const cache = cacheFake()
    new InvalidarCatalogoVendaUseCase(cache).execute({
      tipo: 'produto-estrutura',
      produtoId: 'p1',
    })
    expect(cache.limpar).toHaveBeenCalledOnce()
  })

  it('classifica snapshot: só preço = campos simples; com grupos = estrutura', () => {
    expect(
      motivoInvalidacaoDeSnapshotProduto({
        produtoId: 'p1',
        snapshot: { grupoProdutoId: 'lanches' },
        menuIds: ['menu-a'],
      })
    ).toMatchObject({ tipo: 'produto-campos-simples', produtoId: 'p1' })

    expect(
      motivoInvalidacaoDeSnapshotProduto({
        produtoId: 'p1',
        snapshot: { gruposComplementosIds: ['doces'] },
      })
    ).toMatchObject({ tipo: 'produto-estrutura', grupoComplementoIds: ['doces'] })
  })

  it('complemento e grupo de complemento não pedem refetch da grade', () => {
    const cache = cacheFake()
    const useCase = new InvalidarCatalogoVendaUseCase(cache)
    expect(useCase.execute({ tipo: 'complemento', complementoId: 'c1' })).toMatchObject({
      invalidarProdutosPorGrupo: false,
      cacheGrupos: { modo: 'complemento', complementoId: 'c1' },
    })
    expect(cache.removerPorComplementoId).toHaveBeenCalledWith('c1')

    expect(
      useCase.execute({ tipo: 'grupo-complemento', grupoComplementoId: 'doces' })
    ).toMatchObject({
      invalidarProdutosPorGrupo: false,
      cacheGrupos: { modo: 'ids', ids: ['doces'] },
    })
    expect(cache.removerPorIds).toHaveBeenCalledWith(['doces'])
  })

  it('reset do pedido limpa o cache via port', () => {
    const cache = cacheFake()
    new LimparCacheGruposComplementosCatalogoUseCase(cache).execute()
    expect(cache.limpar).toHaveBeenCalledOnce()
  })
})
