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

export function parseImagemUrlProdutoIndex(item: Record<string, unknown>): string | null {
  const image = item.image
  const nested =
    image && typeof image === 'object' && !Array.isArray(image)
      ? ((image as Record<string, unknown>).imageUrl ??
        (image as Record<string, unknown>).imagemUrl ??
        (image as Record<string, unknown>).url)
      : typeof image === 'string'
        ? image
        : null
  const raw = item.imagemUrl ?? item.imageUrl ?? nested
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
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
  imagemUrl: string | null
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
    imagemUrl: parseImagemUrlProdutoIndex(item),
    ...parsePermissoesIndex(item),
  }
}

export function montarCatalogoProdutoIndex(
  items: readonly unknown[]
): CatalogoProdutoListaIndex {
  const index: CatalogoProdutoListaIndex = { codigos: {}, permissoes: {}, imagens: {} }
  const imagens: Record<string, string> = {}
  for (const raw of items) {
    const slim = slimCatalogoProdutoIndexItem(raw)
    if (!slim) continue
    if (slim.codigo) index.codigos[slim.id] = slim.codigo
    if (slim.imagemUrl) imagens[slim.id] = slim.imagemUrl
    index.permissoes[slim.id] = {
      permiteAcrescimo: slim.permiteAcrescimo,
      permiteDesconto: slim.permiteDesconto,
      abreComplementos: slim.abreComplementos,
      permiteAlterarPreco: slim.permiteAlterarPreco,
      incideTaxa: slim.incideTaxa,
    }
  }
  index.imagens = imagens
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

/**
 * Prefere a foto do snapshot do menu; se o listão não mandar, usa a do cadastro.
 */
export function resolverImagemMenuProduto(
  snapshot: unknown,
  imagemCadastro?: string | null
): string | null {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    const doMenu = parseImagemUrlProdutoIndex(snapshot as Record<string, unknown>)
    if (doMenu) return doMenu
  }
  const cadastro = imagemCadastro?.trim()
  return cadastro || null
}
