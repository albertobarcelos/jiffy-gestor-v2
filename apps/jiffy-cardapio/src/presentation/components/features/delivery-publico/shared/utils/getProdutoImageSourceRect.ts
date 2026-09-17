import type { FlySourceRect } from '../components/FlyingProduct'

export const DELIVERY_PRODUTO_IMG_ATTR = 'data-delivery-produto-img'

export function deliveryProdutoImgSelector(produtoId: string): string {
  return `[${DELIVERY_PRODUTO_IMG_ATTR}="${CSS.escape(produtoId)}"]`
}

function isRectVisible(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

/** Retângulo da imagem do produto no viewport (prioriza a maior imagem visível, ex.: modal). */
export function getProdutoImageSourceRect(produtoId: string): FlySourceRect | null {
  if (typeof document === 'undefined') return null
  const nodes = document.querySelectorAll(deliveryProdutoImgSelector(produtoId))
  let best: DOMRect | null = null
  let bestArea = 0

  nodes.forEach(node => {
    if (!(node instanceof HTMLElement)) return
    const rect = node.getBoundingClientRect()
    if (!isRectVisible(rect)) return
    const area = rect.width * rect.height
    if (area > bestArea) {
      bestArea = area
      best = rect
    }
  })

  if (!best) return null
  return {
    left: best.left,
    top: best.top,
    width: best.width,
    height: best.height,
  }
}
