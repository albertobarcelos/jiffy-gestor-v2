import type { ItemCupomDelivery, VendaGestorCupomDTO } from '@/src/shared/types/deliveryImpressao'

/**
 * Cada linha vai para uma ou mais impressoras conforme cadastro do produto.
 * Mesma impressora: itens na mesma folha. Impressoras diferentes: folhas separadas (mesmo IP é irrelevante — nome QZ é por impressora lógica).
 * Linha sem produto/impressora não é impressa em produção; se todas estiverem sem vínculo, não há tickets.
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
      continue
    }

    const ids = impressorasPorProdutoId.get(pid)
    if (!ids || ids.length === 0) {
      continue
    }

    for (const impId of ids) {
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
