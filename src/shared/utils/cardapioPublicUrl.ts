/**
 * Host público do Cardápio (cliente).
 * Preferir `NEXT_PUBLIC_CARDAPIO_PUBLIC_URL` (hub no browser + middleware).
 * `CARDAPIO_PUBLIC_URL` permanece como alias server-side.
 * Ex.: http://localhost:5001 ou https://cardapio.jiffy.run
 * Sem barra no final. Vazio = loja ainda servida pelo Gestor (`/delivery/{slug}`).
 */
export function getCardapioPublicBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_CARDAPIO_PUBLIC_URL ??
    process.env.CARDAPIO_PUBLIC_URL ??
    ''
  ).trim()
  return raw.replace(/\/$/, '')
}

export function isCardapioPublicRedirectEnabled(): boolean {
  return getCardapioPublicBaseUrl().length > 0
}

/**
 * URL canônica da loja no Cardápio.
 * Com host configurado: `{base}/{slug}`
 * Sem host: legado `{origin}/delivery/{slug}` (ou path relativo).
 */
export function buildCardapioLojaUrl(slug: string, originFallback?: string): string {
  const clean = slug.trim()
  if (!clean) return ''

  const encoded = encodeURIComponent(clean)
  const base = getCardapioPublicBaseUrl()
  if (base) return `${base}/${encoded}`

  const legadoPath = `/delivery/${encoded}`
  if (originFallback) {
    return `${originFallback.replace(/\/$/, '')}${legadoPath}`
  }
  return legadoPath
}

/** Prefixo exibido no input do slug (hub). */
export function getCardapioSlugInputPrefix(): string {
  const base = getCardapioPublicBaseUrl()
  if (!base) return '/delivery/'
  try {
    return `${new URL(base).host}/`
  } catch {
    return `${base}/`
  }
}

/**
 * Converte path legado do Gestor (`/delivery/x` ou `/cardapio/x`) para URL do Cardápio.
 * `/delivery/foo/carrinho` → `{base}/foo/carrinho`
 * `/delivery` ou `/cardapio` → `{base}/`
 */
export function mapGestorPublicPathToCardapioUrl(
  pathname: string,
  search: string = ''
): string | null {
  const base = getCardapioPublicBaseUrl()
  if (!base) return null

  let rest = ''
  if (pathname === '/delivery' || pathname === '/cardapio') {
    rest = '/'
  } else if (pathname.startsWith('/delivery/')) {
    rest = pathname.slice('/delivery'.length) || '/'
  } else if (pathname.startsWith('/cardapio/')) {
    rest = pathname.slice('/cardapio'.length) || '/'
  } else {
    return null
  }

  return `${base}${rest}${search}`
}
