import type { QueryClient } from '@tanstack/react-query'
import type {
  AvisoHidratacaoCatalogoVenda,
  MotivoInvalidacaoCatalogoVenda,
  PlanoInvalidacaoCatalogoVenda,
} from '@/src/application/dto/CatalogoVendaInvalidacaoDTO'
import { invalidarCatalogoVendaUseCase } from '@/src/infrastructure/composition/pedidoUseCases'

export type { MotivoInvalidacaoCatalogoVenda }
export { motivoInvalidacaoDeSnapshotProduto } from '@/src/application/use-cases/vendas/InvalidarCatalogoVendaUseCase'

export const CATALOGO_VENDA_PRODUTOS_POR_GRUPO_KEY = 'catalogo-venda-produtos' as const
export const CATALOGO_VENDA_PRODUTOS_BUSCA_KEY = 'catalogo-venda-busca' as const
export const CATALOGO_VENDA_MENU_GRUPOS_KEY = 'catalogo-venda-menu-grupos' as const

const listenersHidratacao = new Set<(aviso: AvisoHidratacaoCatalogoVenda) => void>()

export function subscribeAvisoHidratacaoCatalogoVenda(
  listener: (aviso: AvisoHidratacaoCatalogoVenda) => void
): () => void {
  listenersHidratacao.add(listener)
  return () => {
    listenersHidratacao.delete(listener)
  }
}

export function publicarAvisoHidratacaoCatalogoVenda(
  aviso: AvisoHidratacaoCatalogoVenda
): void {
  listenersHidratacao.forEach(listener => listener(aviso))
}

export function refetchCatalogoVendaSeInvalidado(query: {
  state: { isInvalidated: boolean }
}): boolean {
  return query.state.isInvalidated
}

function idsNaoVazios(ids?: string[]): string[] {
  return (ids ?? []).map(id => id.trim()).filter(Boolean)
}

/** Mapa hidratado do pedido aberto: tira só o que o save deixou velho. */
export function aplicarAvisoHidratacaoCatalogoVenda<
  T extends {
    getId: () => string
    getGruposComplementos?: () => Array<{
      id?: string
      complementos?: ReadonlyArray<{ id?: string }>
    }>
  },
>(catalogo: Record<string, T>, aviso: AvisoHidratacaoCatalogoVenda): Record<string, T> {
  if (aviso.limparTodos) return {}

  const remover = new Set(idsNaoVazios(aviso.produtoIds))
  const gruposAlvo = new Set(idsNaoVazios(aviso.grupoComplementoIds))
  const complementoId = aviso.complementoId?.trim() ?? ''

  if (remover.size === 0 && gruposAlvo.size === 0 && !complementoId) {
    return catalogo
  }

  const next: Record<string, T> = {}
  for (const [id, produto] of Object.entries(catalogo)) {
    if (remover.has(id)) continue
    const grupos = produto.getGruposComplementos?.() ?? []
    if (gruposAlvo.size > 0 && grupos.some(grupo => gruposAlvo.has(grupo.id ?? ''))) {
      continue
    }
    if (
      complementoId &&
      grupos.some(grupo =>
        (grupo.complementos ?? []).some(item => item.id === complementoId)
      )
    ) {
      continue
    }
    next[id] = produto
  }
  return next
}

function invalidarPrefixo(
  queryClient: QueryClient,
  empresaId: string,
  segmento: string,
  menuIds: string[],
  grupoProdutoIds: string[]
): void {
  const base = ['tenant', empresaId, segmento] as const
  if (menuIds.length === 0) {
    if (grupoProdutoIds.length === 0) {
      void queryClient.invalidateQueries({ queryKey: [...base], exact: false })
      return
    }
    void queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey
        return (
          key[0] === 'tenant' &&
          key[1] === empresaId &&
          key[2] === segmento &&
          typeof key[4] === 'string' &&
          grupoProdutoIds.includes(key[4])
        )
      },
    })
    return
  }

  for (const menuId of menuIds) {
    if (grupoProdutoIds.length === 0) {
      void queryClient.invalidateQueries({
        queryKey: [...base, menuId],
        exact: false,
      })
      continue
    }
    for (const grupoId of grupoProdutoIds) {
      void queryClient.invalidateQueries({
        queryKey: [...base, menuId, grupoId],
        exact: false,
      })
    }
  }
}

function invalidarBuscaOuGrupos(
  queryClient: QueryClient,
  empresaId: string,
  segmento: string,
  menuIds: string[]
): void {
  const base = ['tenant', empresaId, segmento] as const
  if (menuIds.length === 0) {
    void queryClient.invalidateQueries({ queryKey: [...base], exact: false })
    return
  }
  for (const menuId of menuIds) {
    void queryClient.invalidateQueries({
      queryKey: [...base, menuId],
      exact: false,
    })
  }
}

function aplicarPlanoReactQuery(
  queryClient: QueryClient,
  empresaId: string,
  plano: PlanoInvalidacaoCatalogoVenda
): void {
  if (plano.invalidarProdutosPorGrupo) {
    invalidarPrefixo(
      queryClient,
      empresaId,
      CATALOGO_VENDA_PRODUTOS_POR_GRUPO_KEY,
      plano.menuIds,
      plano.grupoProdutoIds
    )
  }
  if (plano.invalidarBusca) {
    invalidarBuscaOuGrupos(
      queryClient,
      empresaId,
      CATALOGO_VENDA_PRODUTOS_BUSCA_KEY,
      plano.menuIds
    )
  }
  if (plano.invalidarMenuGrupos) {
    invalidarBuscaOuGrupos(
      queryClient,
      empresaId,
      CATALOGO_VENDA_MENU_GRUPOS_KEY,
      plano.menuIds
    )
  }
}

/**
 * Use case evicta grupos; aqui só React Query e o mapa hidratado da tela.
 */
export function invalidarCatalogoVendaQueries(
  queryClient: QueryClient,
  empresaId: string | null | undefined,
  motivo: MotivoInvalidacaoCatalogoVenda = { tipo: 'cardapio' }
): void {
  const plano = invalidarCatalogoVendaUseCase.execute(motivo)
  publicarAvisoHidratacaoCatalogoVenda(plano.hidratacao)
  if (!empresaId) return
  aplicarPlanoReactQuery(queryClient, empresaId, plano)
}
