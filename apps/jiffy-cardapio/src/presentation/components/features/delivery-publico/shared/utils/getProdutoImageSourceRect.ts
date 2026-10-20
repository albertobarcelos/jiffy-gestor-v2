import type { FlySourceRect } from '../components/FlyingProduct'

export const DELIVERY_PRODUTO_IMG_ATTR = 'data-delivery-produto-img'

export function deliveryProdutoImgSelector(produtoId: string): string {
  return `[${DELIVERY_PRODUTO_IMG_ATTR}="${CSS.escape(produtoId)}"]`
}

export type ProdutoImageFlySource = {
  rect: FlySourceRect
  /**
   * URL já resolvida pelo browser na imagem visível (ex.: `/_next/image?...`).
   * Preferir no fly-to-cart para reaproveitar o cache HTTP da thumb da lista/modal.
   */
  loadedSrc: string | null
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

function resolveLoadedSrc(node: HTMLElement): string | null {
  const readImg = (img: HTMLImageElement) => {
    const src = (img.currentSrc || img.src || '').trim()
    return src || null
  }

  if (node instanceof HTMLImageElement) {
    return readImg(node)
  }

  const nested = node.querySelector('img')
  if (nested instanceof HTMLImageElement) {
    return readImg(nested)
  }

  return null
}

/**
 * Origem do fly-to-cart: retângulo + URL já carregada da maior imagem visível do produto.
 */
export function getProdutoImageFlySource(produtoId: string): ProdutoImageFlySource | null {
  if (typeof document === 'undefined') return null
  const nodes = document.querySelectorAll(deliveryProdutoImgSelector(produtoId))
  let best: ProdutoImageFlySource | null = null
  let bestArea = 0

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (!isRectVisible(rect)) continue
    const area = rect.width * rect.height
    if (area > bestArea) {
      bestArea = area
      best = {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        loadedSrc: resolveLoadedSrc(node),
      }
    }
  }

  return best
}

/** Retângulo da imagem do produto no viewport (prioriza a maior imagem visível, ex.: modal). */
export function getProdutoImageSourceRect(produtoId: string): FlySourceRect | null {
  return getProdutoImageFlySource(produtoId)?.rect ?? null
}
