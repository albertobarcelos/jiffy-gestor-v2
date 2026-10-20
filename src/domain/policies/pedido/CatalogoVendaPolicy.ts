import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { Produto } from '@/src/domain/entities/Produto'
import type { CanalVendaCatalogo } from '@/src/domain/repositories/INovoPedidoReadRepository'

export const MIN_CARACTERES_BUSCA_CATALOGO_VENDA = 2
/** Máximo aceito pelo BFF de menus (`limit` ≤ 100). */
export const TAMANHO_PAGINA_CATALOGO_GRUPO = 100
/** Primeira página da busca: suficiente para o operador, sem varrer o menu. */
export const TAMANHO_PAGINA_CATALOGO_BUSCA = 50

type GrupoCatalogo = Pick<GrupoProduto, 'getId' | 'getNome' | 'getOrdem' | 'isAtivo'>
type ProdutoCatalogo = Pick<Produto, 'getNome' | 'isAtivo'>

export function buscaCatalogoVendaAtiva(textoBusca: string): boolean {
  return textoBusca.trim().length >= MIN_CARACTERES_BUSCA_CATALOGO_VENDA
}

/** Delivery manual e delivery público usam `menuDeliveryId`; balcão usa `menuVendaGestorId`. */
export function resolverMenuCatalogoNovoPedido(
  canal: CanalVendaCatalogo,
  menuDeliveryId: string | null,
  menuVendaGestorId: string | null
): string | null {
  return canal === 'entrega' ? menuDeliveryId : menuVendaGestorId
}

export function ordenarGruposCatalogoVenda<T extends GrupoCatalogo>(grupos: T[]): T[] {
  return [...grupos].sort((a, b) => {
    const ordemA = a.getOrdem()
    const ordemB = b.getOrdem()
    if (ordemA !== undefined && ordemB !== undefined) return ordemA - ordemB
    if (ordemA !== undefined && ordemB === undefined) return -1
    if (ordemA === undefined && ordemB !== undefined) return 1
    return a.getNome().localeCompare(b.getNome(), 'pt-BR')
  })
}

export function montarGruposCatalogoVenda<T extends GrupoCatalogo>(input: {
  menuId: string | null
  gruposMenu: T[]
  grupoIdsComProdutosAtivos?: Set<string>
  isLoadingGruposComProdutos?: boolean
}): T[] {
  if (!input.menuId) return []

  const elegiveis = input.gruposMenu.filter(grupo => grupo.isAtivo())

  if (input.isLoadingGruposComProdutos) return []

  if (input.grupoIdsComProdutosAtivos) {
    return ordenarGruposCatalogoVenda(
      elegiveis.filter(grupo => input.grupoIdsComProdutosAtivos!.has(grupo.getId()))
    )
  }

  return ordenarGruposCatalogoVenda(elegiveis)
}

export function resolverGrupoCatalogoSelecionadoId(
  grupos: Array<{ getId: () => string }>,
  grupoSelecionadoId: string | null
): string | null {
  if (grupos.length === 0) return grupoSelecionadoId
  const selecionadoValido =
    grupoSelecionadoId != null && grupos.some(grupo => grupo.getId() === grupoSelecionadoId)
  if (selecionadoValido) return grupoSelecionadoId
  return grupos[0].getId()
}

export function montarProdutosCatalogoVenda<T extends ProdutoCatalogo>(input: {
  menuId: string | null
  buscaFiltrada: string
  produtosBusca?: T[]
  produtosGrupo?: T[]
}): T[] {
  if (!input.menuId) return []

  const fonte = buscaCatalogoVendaAtiva(input.buscaFiltrada)
    ? input.produtosBusca
    : input.produtosGrupo
  if (!fonte) return []

  return fonte.filter(produto => produto.isAtivo())
}

function produtoCatalogoTemComplementosCarregados(produto: {
  getGruposComplementos?: () => Array<{ complementos?: readonly unknown[] }>
}): boolean {
  const grupos = produto.getGruposComplementos?.() ?? []
  return grupos.some(grupo => (grupo.complementos?.length ?? 0) > 0)
}

export function mesclarProdutosNoCatalogo<
  T extends {
    getId: () => string
    getGruposComplementos?: () => Array<{ complementos?: readonly unknown[] }>
  },
>(atual: Record<string, T>, produtos: T[]): Record<string, T> {
  const next = { ...atual }
  for (const produto of produtos) {
    const id = produto.getId()
    const existente = next[id]
    if (
      existente &&
      produtoCatalogoTemComplementosCarregados(existente) &&
      !produtoCatalogoTemComplementosCarregados(produto)
    ) {
      continue
    }
    next[id] = produto
  }
  return next
}
