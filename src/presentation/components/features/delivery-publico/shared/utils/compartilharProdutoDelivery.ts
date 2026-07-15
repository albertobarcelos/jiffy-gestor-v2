import { showToast } from '@/src/shared/utils/toast'

export function buildProdutoShareUrl(slug: string, produtoId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = `/cardapio/${encodeURIComponent(slug)}`
  const url = new URL(path, origin || 'http://localhost')
  url.searchParams.set('produto', produtoId)
  return url.toString()
}

export async function compartilharLinkDelivery(options: {
  title: string
  text?: string
  url: string
}): Promise<void> {
  const { title, text, url } = options

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    showToast.success('Link copiado!')
  } catch {
    showToast.error('Não foi possível compartilhar o link')
  }
}
