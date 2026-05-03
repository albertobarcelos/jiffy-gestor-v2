import type { ItemCupomDelivery, VendaGestorCupomDTO } from '@/src/shared/types/deliveryImpressao'

/** Bucket quando o produto não tem impressora ou não há `produtoId` na linha. */
export const FALLBACK_IMPRESSORA_AGRUPAMENTO = '__fallback__'

/**
 * Cada linha vai para uma ou mais impressoras conforme cadastro do produto.
 * Mesma impressora: itens na mesma folha. Impressoras diferentes: folhas separadas (mesmo IP é irrelevante — nome QZ é por impressora lógica).
 */
export function agruparItensProducaoPorImpressora(
  linhas: ItemCupomDelivery[],
  impressorasPorProdutoId: Map<string, string[]>
): Map<string, ItemCupomDelivery[]> {
  const buckets = new Map<string, ItemCupomDelivery[]>()

  const push = (key: string, item: ItemCupomDelivery) => {
    const arr = buckets.get(key) ?? []
    arr.push({ ...item })
    buckets.set(key, arr)
  }

  for (const line of linhas) {
    const pid = line.produtoId?.trim()
    if (!pid) {
      push(FALLBACK_IMPRESSORA_AGRUPAMENTO, line)
      continue
    }

    const ids = impressorasPorProdutoId.get(pid)
    const lista = ids && ids.length > 0 ? ids : [FALLBACK_IMPRESSORA_AGRUPAMENTO]

    for (const impId of lista) {
      push(impId, line)
    }
  }

  return buckets
}

export function montarVendaCupomComSubconjunto(
  base: VendaGestorCupomDTO,
  itens: ItemCupomDelivery[]
): VendaGestorCupomDTO {
  const valorParcial = itens.reduce((acc, i) => {
    const v = i.valorFinal
    return acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  }, 0)
  return {
    ...base,
    produtos: itens.map(({ produtoId: _p, ...rest }) => rest),
    valorFinal: valorParcial,
  }
}
