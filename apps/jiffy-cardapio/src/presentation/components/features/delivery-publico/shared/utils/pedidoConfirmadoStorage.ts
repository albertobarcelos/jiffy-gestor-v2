const STORAGE_PREFIX = 'jiffy-cardapio:ultimo-pedido:'

/** Ponteiro do último pedido neste dispositivo. O conteúdo vem da API. */
export type UltimoPedidoPublicoPonteiro = {
  version: 1
  slug: string
  id: string
  codigoVenda: string | null
  savedAt: string
}

function storageKey(slug: string): string {
  return `${STORAGE_PREFIX}${slug.trim().toLowerCase()}`
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function salvarUltimoPedidoPublico(
  slug: string,
  pedido: { id: string; codigoVenda: string | null }
): void {
  if (!isBrowser()) return
  const slugNorm = slug.trim()
  const id = pedido.id.trim()
  if (!slugNorm || !id) return

  const payload: UltimoPedidoPublicoPonteiro = {
    version: 1,
    slug: slugNorm,
    id,
    codigoVenda: pedido.codigoVenda?.trim() || null,
    savedAt: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(storageKey(slugNorm), JSON.stringify(payload))
  } catch {
    // Quota / modo privado — a navegação imediata ainda abre o pedido pelo id.
  }
}

export function lerUltimoPedidoPublico(slug: string): UltimoPedidoPublicoPonteiro | null {
  if (!isBrowser()) return null
  const slugNorm = slug.trim()
  if (!slugNorm) return null

  try {
    const raw = window.localStorage.getItem(storageKey(slugNorm))
    if (!raw) return null
    const parsed = JSON.parse(raw) as UltimoPedidoPublicoPonteiro
    if (parsed?.version !== 1 || !parsed.id?.trim()) return null
    return parsed
  } catch {
    return null
  }
}
