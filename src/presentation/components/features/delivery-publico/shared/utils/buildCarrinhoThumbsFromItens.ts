import type { DeliveryCarrinhoThumb } from '../components/DeliveryPedidoFooter'

const MAX_FOOTER_THUMBS = 5

type ItemThumbInput = {
  produtoId: string
  produtoImagemUrl: string | null
  quantidade: number
  adicionadoEm: string
}

/**
 * Miniaturas do footer: uma por produto, ordenadas pelo último lançamento
 * (relançar o mesmo produto move a thumb para a direita).
 */
export function buildCarrinhoThumbsFromItens(
  itens: ItemThumbInput[],
  maxThumbs = MAX_FOOTER_THUMBS
): DeliveryCarrinhoThumb[] {
  const byId = new Map<string, DeliveryCarrinhoThumb>()
  const order: string[] = []

  const sorted = [...itens].sort((a, b) => a.adicionadoEm.localeCompare(b.adicionadoEm))
  for (const item of sorted) {
    const imagemUrl = item.produtoImagemUrl?.trim()
    if (!imagemUrl) continue
    const existente = byId.get(item.produtoId)
    if (!existente) {
      order.push(item.produtoId)
      byId.set(item.produtoId, {
        produtoId: item.produtoId,
        imagemUrl,
        quantidade: item.quantidade,
      })
      continue
    }

    const idx = order.indexOf(item.produtoId)
    if (idx >= 0) order.splice(idx, 1)
    order.push(item.produtoId)

    byId.set(item.produtoId, {
      ...existente,
      imagemUrl,
      quantidade: existente.quantidade + item.quantidade,
    })
  }

  return order.slice(-maxThumbs).map(id => byId.get(id)!)
}
