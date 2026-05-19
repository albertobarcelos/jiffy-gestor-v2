/**
 * Nomes de parâmetro comuns em links de confirmação (query ou hash).
 * Ordem: mais específicos primeiro.
 */
const CHAVES_TOKEN_CONFIRMACAO = [
  'token',
  'confirmationToken',
  'confirmacaoToken',
  'code',
  'hash',
  'access_token',
] as const

function primeiroValor(params: URLSearchParams): string | null {
  for (const key of CHAVES_TOKEN_CONFIRMACAO) {
    const v = params.get(key)?.trim()
    if (v) return v
  }
  return null
}

/** Decodifica token vindo na URL (evita problemas com %xx). */
export function normalizarTokenUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return t
  try {
    return decodeURIComponent(t)
  } catch {
    return t
  }
}

/**
 * Obtém o token de confirmação a partir da query da rota e, no cliente, do hash (`#token=...`).
 */
export function extrairTokenConfirmacaoEmail(args: {
  searchParams: URLSearchParams
  hashFragment?: string | null
}): string | null {
  const daQuery = primeiroValor(args.searchParams)
  if (daQuery) return normalizarTokenUrl(daQuery)

  const hash = args.hashFragment?.replace(/^#/, '').trim()
  if (!hash) return null

  const fromHash = primeiroValor(new URLSearchParams(hash))
  return fromHash ? normalizarTokenUrl(fromHash) : null
}
