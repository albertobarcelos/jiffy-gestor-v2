import {
  boolFlagProduto,
  type CatalogoProdutoListaIndex,
  type MenuProdutoPermissoes,
} from '@/src/shared/utils/menuProdutoPermissoes'
import type { MenuProduto } from '@/src/shared/types/menus'

export function parseCodigoProdutoIndex(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value))
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  return ''
}

export function parseProdutoIdIndex(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export function parsePermissoesIndex(item: Record<string, unknown>): MenuProdutoPermissoes {
  return {
    permiteAcrescimo: boolFlagProduto(item.permiteAcrescimo),
    permiteDesconto: boolFlagProduto(item.permiteDesconto),
    abreComplementos: boolFlagProduto(item.abreComplementos),
    permiteAlterarPreco: boolFlagProduto(item.permiteAlterarPreco),
    incideTaxa: boolFlagProduto(item.incideTaxa),
  }
}

/** Item mínimo do índice de catálogo (BFF slim). */
export type CatalogoProdutoIndexItem = {
  id: string
  codigo: string
  permiteAcrescimo: boolean
  permiteDesconto: boolean
  abreComplementos: boolean
  permiteAlterarPreco: boolean
  incideTaxa: boolean
}

export function slimCatalogoProdutoIndexItem(
  raw: unknown
): CatalogoProdutoIndexItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as Record<string, unknown>
  const id = parseProdutoIdIndex(item.id)
  if (!id) return null
  return {
    id,
    codigo: parseCodigoProdutoIndex(item.codigoProduto ?? item.codigo),
    ...parsePermissoesIndex(item),
  }
}

export function montarCatalogoProdutoIndex(
  items: readonly unknown[]
): CatalogoProdutoListaIndex {
  const index: CatalogoProdutoListaIndex = { codigos: {}, permissoes: {} }
  for (const raw of items) {
    const slim = slimCatalogoProdutoIndexItem(raw)
    if (!slim) continue
    if (slim.codigo) index.codigos[slim.id] = slim.codigo
    index.permissoes[slim.id] = {
      permiteAcrescimo: slim.permiteAcrescimo,
      permiteDesconto: slim.permiteDesconto,
      abreComplementos: slim.abreComplementos,
      permiteAlterarPreco: slim.permiteAlterarPreco,
      incideTaxa: slim.incideTaxa,
    }
  }
  return index
}

/**
 * Prefere código do snapshot do menu quando a API já mandar;
 * senão usa o índice do cadastro.
 */
export function resolverCodigoMenuProduto(
  snapshot: Pick<MenuProduto, 'codigoProduto'> & { codigo?: string },
  codigoCadastro?: string
): string | undefined {
  const doSnapshot = parseCodigoProdutoIndex(
    snapshot.codigoProduto ?? snapshot.codigo
  )
  if (doSnapshot) return doSnapshot
  const doCadastro = parseCodigoProdutoIndex(codigoCadastro)
  return doCadastro || undefined
}
