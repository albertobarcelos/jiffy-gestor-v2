import type { IGrupoComplementoCatalogoCache } from '@/src/application/ports/IGrupoComplementoCatalogoCache'
import type {
  MotivoInvalidacaoCatalogoVenda,
  PlanoInvalidacaoCatalogoVenda,
} from '@/src/application/dto/CatalogoVendaInvalidacaoDTO'

function menuIdsDe(ids?: string[], menuId?: string): string[] {
  if (ids?.length) return ids.filter(id => id.trim() !== '')
  if (menuId?.trim()) return [menuId]
  return []
}

function idsNaoVazios(ids?: string[]): string[] {
  return (ids ?? []).map(id => id.trim()).filter(Boolean)
}

export function motivoInvalidacaoDeSnapshotProduto(params: {
  produtoId: string
  snapshot: { grupoProdutoId?: string; gruposComplementosIds?: string[] }
  menuIds?: string[]
}): MotivoInvalidacaoCatalogoVenda {
  const base = {
    produtoId: params.produtoId,
    grupoProdutoId: params.snapshot.grupoProdutoId,
    menuIds: params.menuIds,
  }
  if (params.snapshot.gruposComplementosIds !== undefined) {
    return {
      tipo: 'produto-estrutura',
      ...base,
      grupoComplementoIds: params.snapshot.gruposComplementosIds,
    }
  }
  return { tipo: 'produto-campos-simples', ...base }
}

export function montarPlanoInvalidacaoCatalogoVenda(
  motivo: MotivoInvalidacaoCatalogoVenda
): PlanoInvalidacaoCatalogoVenda {
  switch (motivo.tipo) {
    case 'produto-campos-simples':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: false,
        menuIds: menuIdsDe(motivo.menuIds),
        grupoProdutoIds: idsNaoVazios(
          motivo.grupoProdutoId ? [motivo.grupoProdutoId] : []
        ),
        hidratacao: { produtoIds: [motivo.produtoId] },
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'produto-estrutura': {
      const grupoIds = idsNaoVazios(motivo.grupoComplementoIds)
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(motivo.menuIds),
        grupoProdutoIds: idsNaoVazios(
          motivo.grupoProdutoId ? [motivo.grupoProdutoId] : []
        ),
        hidratacao: { produtoIds: [motivo.produtoId] },
        cacheGrupos:
          motivo.grupoComplementoIds === undefined
            ? { modo: 'todos' }
            : grupoIds.length > 0
              ? { modo: 'ids', ids: grupoIds }
              : { modo: 'nenhum' },
      }
    }
    case 'produto-removido':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(motivo.menuIds),
        grupoProdutoIds: [],
        hidratacao: { produtoIds: [motivo.produtoId] },
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'vinculo-menu':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(motivo.menuIds),
        grupoProdutoIds: [],
        hidratacao: { produtoIds: [motivo.produtoId] },
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'complemento':
      return {
        invalidarProdutosPorGrupo: false,
        invalidarBusca: false,
        invalidarMenuGrupos: false,
        menuIds: [],
        grupoProdutoIds: [],
        hidratacao: motivo.complementoId
          ? { complementoId: motivo.complementoId }
          : { limparTodos: true },
        cacheGrupos: motivo.complementoId
          ? { modo: 'complemento', complementoId: motivo.complementoId }
          : { modo: 'todos' },
      }
    case 'grupo-complemento':
      return {
        invalidarProdutosPorGrupo: false,
        invalidarBusca: false,
        invalidarMenuGrupos: false,
        menuIds: [],
        grupoProdutoIds: [],
        hidratacao: motivo.grupoComplementoId
          ? { grupoComplementoIds: [motivo.grupoComplementoId] }
          : { limparTodos: true },
        cacheGrupos: motivo.grupoComplementoId
          ? { modo: 'ids', ids: [motivo.grupoComplementoId] }
          : { modo: 'todos' },
      }
    case 'cardapio':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(undefined, motivo.menuId),
        grupoProdutoIds: [],
        hidratacao: { limparTodos: true },
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'categoria':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: true,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(undefined, motivo.menuId),
        grupoProdutoIds: idsNaoVazios(
          motivo.grupoProdutoId ? [motivo.grupoProdutoId] : []
        ),
        hidratacao: motivo.produtoId ? { produtoIds: [motivo.produtoId] } : {},
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'ordem-produtos':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: false,
        invalidarMenuGrupos: false,
        menuIds: menuIdsDe(undefined, motivo.menuId),
        grupoProdutoIds: [],
        hidratacao: {},
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'ordem-categorias':
      return {
        invalidarProdutosPorGrupo: false,
        invalidarBusca: false,
        invalidarMenuGrupos: true,
        menuIds: menuIdsDe(undefined, motivo.menuId),
        grupoProdutoIds: [],
        hidratacao: {},
        cacheGrupos: { modo: 'nenhum' },
      }
    case 'imagem-produto':
      return {
        invalidarProdutosPorGrupo: true,
        invalidarBusca: false,
        invalidarMenuGrupos: false,
        menuIds: menuIdsDe(motivo.menuIds),
        grupoProdutoIds: [],
        hidratacao: { produtoIds: [motivo.produtoId] },
        cacheGrupos: { modo: 'nenhum' },
      }
  }
}

/**
 * Após cadastro/cardápio mudar: evicta o cache de grupos e devolve o plano
 * para a apresentação invalidar React Query e o mapa hidratado.
 */
export class InvalidarCatalogoVendaUseCase {
  constructor(private readonly cache: IGrupoComplementoCatalogoCache) {}

  execute(
    motivo: MotivoInvalidacaoCatalogoVenda = { tipo: 'cardapio' }
  ): PlanoInvalidacaoCatalogoVenda {
    const plano = montarPlanoInvalidacaoCatalogoVenda(motivo)
    this.aplicarCacheGrupos(plano)
    return plano
  }

  private aplicarCacheGrupos(plano: PlanoInvalidacaoCatalogoVenda): void {
    switch (plano.cacheGrupos.modo) {
      case 'nenhum':
        return
      case 'todos':
        this.cache.limpar()
        return
      case 'ids':
        this.cache.removerPorIds(plano.cacheGrupos.ids)
        return
      case 'complemento':
        this.cache.removerPorComplementoId(plano.cacheGrupos.complementoId)
    }
  }
}

/** Reset do pedido e forceRefresh do Lançar. */
export class LimparCacheGruposComplementosCatalogoUseCase {
  constructor(private readonly cache: IGrupoComplementoCatalogoCache) {}

  execute() {
    this.cache.limpar()
  }
}
