import type { Produto } from '@/src/domain/entities/Produto'
import type { BulkUpdateProdutoPayloadItem } from '../utils/produtosLoteMutations'
import type { FiscalCampoChave, FiscalLoteDraft } from '../types'

/**
 * Monta o body do PATCH fiscal em lote (objeto `fiscal` + `ncm` legado).
 * Só envia NCM/CEST completos para evitar PATCH com código parcial.
 * Retorna `null` quando não há nenhum campo fiscal preenchido.
 */
export function montarBodyFiscalLote(d: FiscalLoteDraft): Record<string, unknown> | null {
  const fiscal: Record<string, unknown> = {}
  const ncmT = d.ncm.replace(/\D/g, '').slice(0, 8)
  const cestT = d.cest.replace(/\D/g, '').slice(0, 7)
  if (ncmT.length === 8) fiscal.ncm = ncmT
  if (cestT.length === 7) fiscal.cest = cestT
  if (d.origemMercadoria !== '') {
    const om = parseInt(d.origemMercadoria, 10)
    if (!Number.isNaN(om)) fiscal.origemMercadoria = om
  }
  const tipoT = d.tipoProduto.trim()
  if (tipoT) fiscal.tipoProduto = tipoT
  const indT = d.indicadorProducaoEscala.trim()
  if (indT) fiscal.indicadorProducaoEscala = indT
  if (Object.keys(fiscal).length === 0) return null
  const body: Record<string, unknown> = { fiscal }
  if (ncmT.length === 8) body.ncm = ncmT
  return body
}

/** Monta itens para POST bulk-update com dados fiscais por produto. */
export function montarBulkUpdateItemsFiscal(
  produtoIds: string[],
  draft: FiscalLoteDraft
): BulkUpdateProdutoPayloadItem[] | null {
  const body = montarBodyFiscalLote(draft)
  if (!body) return null

  const fiscal = body.fiscal as BulkUpdateProdutoPayloadItem['fiscal']
  const ncm = typeof body.ncm === 'string' ? body.ncm : undefined

  return produtoIds.map((produtoId) => ({
    produtoId,
    ...(fiscal ? { fiscal } : {}),
    ...(ncm ? { ncm } : {}),
  }))
}

/** Monta itens para bulk-update limpando campos fiscais (`null`) nos produtos selecionados. */
export function montarBulkUpdateItemsLimparFiscal(
  produtoIds: string[],
  campos: Set<FiscalCampoChave>
): BulkUpdateProdutoPayloadItem[] | null {
  if (campos.size === 0) return null

  const fiscal: NonNullable<BulkUpdateProdutoPayloadItem['fiscal']> = {}
  if (campos.has('ncm')) fiscal.ncm = null
  if (campos.has('cest')) fiscal.cest = null
  if (campos.has('origemMercadoria')) fiscal.origemMercadoria = null
  if (campos.has('tipoProduto')) fiscal.tipoProduto = null
  if (campos.has('indicadorProducaoEscala')) fiscal.indicadorProducaoEscala = null

  return produtoIds.map((produtoId) => ({
    produtoId,
    fiscal,
    ...(campos.has('ncm') ? { ncm: null } : {}),
  }))
}

/** Produtos selecionados que não possuem CEST cadastrado (validação do indicador de escala). */
export function produtosSelecionadosSemCest(
  produtoIds: string[],
  produtos: Produto[]
): Produto[] {
  const porId = new Map(produtos.map((p) => [p.getId(), p]))
  return produtoIds
    .map((id) => porId.get(id))
    .filter((p): p is Produto => p != null)
    .filter((p) => p.getCest().trim() === '')
}
