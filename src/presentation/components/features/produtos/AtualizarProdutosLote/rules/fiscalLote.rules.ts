import type { FiscalLoteDraft } from '../types'

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
