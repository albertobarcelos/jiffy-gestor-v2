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
  let best: FlySourceRect | null = null
  let bestArea = 0

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (!isRectVisible(rect)) continue
    const area = rect.width * rect.height
    if (area > bestArea) {
      bestArea = area
      best = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
    }
  }

  return best
}
