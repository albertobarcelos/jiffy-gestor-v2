/**
 * Host público do Cardápio (cliente).
 * Ex.: http://localhost:5001 ou https://cardapio.jiffy.run
 * Sem barra no final. Vazio = loja ainda servida pelo Gestor.
 */
export function getCardapioPublicBaseUrl(): string {
  const raw = (process.env.CARDAPIO_PUBLIC_URL ?? '').trim()
  return raw.replace(/\/$/, '')
}

export function isCardapioPublicRedirectEnabled(): boolean {
  return getCardapioPublicBaseUrl().length > 0
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
