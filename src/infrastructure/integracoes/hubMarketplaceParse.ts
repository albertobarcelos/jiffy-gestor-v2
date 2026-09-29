function lerTexto(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const texto = value.trim()
  return texto.length > 0 ? texto : null
}

function caminhoOauthConnect(value: string): string | null {
  try {
    const url = value.startsWith('/') ? new URL(value, 'https://hub.local') : new URL(value)
    if (url.pathname !== '/oauth/conectar') return null
    return `${url.pathname}${url.search}`
  } catch {
    return null
  }
}

function lerCaminhoDeObjeto(row: Record<string, unknown>): string | null {
  const path = lerTexto(row.connectPath) ?? lerTexto(row.connect_path)
  if (path) {
    const normalizado = caminhoOauthConnect(path)
    if (normalizado) return normalizado
  }
  for (const key of ['connectUrl', 'connect_url', 'url'] as const) {
    const valor = lerTexto(row[key])
    if (!valor) continue
    const normalizado = caminhoOauthConnect(valor)
    if (normalizado) return normalizado
  }
  const id = lerTexto(row.id) ?? lerTexto(row.merchantConnectionId)
  if (id) return `/oauth/conectar?merchantConnectionId=${encodeURIComponent(id)}`
  return null
}

/** Caminho `/oauth/conectar?...` — o Gestor junta com HUB_BASE_URL. */
export function lerCaminhoConnectDoHub(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const row = payload as Record<string, unknown>
  const direto = lerCaminhoDeObjeto(row)
  if (direto) return direto
  if (row.data && typeof row.data === 'object') {
    return lerCaminhoDeObjeto(row.data as Record<string, unknown>)
  }
  return null
}

/** @deprecated use lerCaminhoConnectDoHub */
export function lerConnectUrlDoHub(payload: unknown): string | null {
  return lerCaminhoConnectDoHub(payload)
}

export function resolverUrlDoHub(connectUrl: string, hubBaseUrl: string): URL {
  return new URL(connectUrl, `${hubBaseUrl.replace(/\/+$/, '')}/`)
}

export function connectUrlPertenceAoHub(connectUrl: URL, hubBaseUrl: string): boolean {
  const hub = new URL(hubBaseUrl)
  return connectUrl.protocol === hub.protocol && connectUrl.hostname === hub.hostname
}

export function mensagemErroDoHub(body: string | null | undefined): string | null {
  if (!body) return null
  try {
    const json = JSON.parse(body) as { error?: unknown }
    if (typeof json.error === 'string' && json.error.trim()) return json.error.trim()
  } catch {
    /* corpo não é JSON */
  }
  return null
}

export function authorizationUrlValida(location: string): boolean {
  try {
    const url = new URL(location)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function lerLojasAtivasDoHub(payload: unknown): Array<{
  id: string
  empresaId: string
  marketplace: string
  merchantIdOd: string
  active: boolean
}> {
  const lista = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? ((payload as { data: unknown[] }).data)
      : []

  return lista.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const id = lerTexto(row.id)
    const empresaId = lerTexto(row.empresaId)
    const marketplace = lerTexto(row.marketplace)
    const merchantIdOd = lerTexto(row.merchantIdOd)
    if (!id || !empresaId || !marketplace || !merchantIdOd) return []
    return [
      {
        id,
        empresaId,
        marketplace,
        merchantIdOd,
        active: row.active !== false,
      },
    ]
  })
}

export function hubSemRotaDeCardapio(status: number, body: string | null | undefined): boolean {
  if (status !== 404 || !body) return false
  return /Cannot (GET|POST) \/cardapio\//i.test(body)
}

export function hubRecusouSegredo(detalhe: string | null | undefined): boolean {
  if (!detalhe) return false
  const texto = detalhe.toLowerCase()
  return texto.includes('webhook secret') || texto.includes('secret inválido') || texto.includes('secret invalido')
}

export function mensagemFalhaHub401(detalhe: string | null | undefined): {
  message: string
  code: string
} {
  if (hubRecusouSegredo(detalhe)) {
    return {
      message: 'O hub recusou o segredo. Confira HUB_WEBHOOK_SECRET.',
      code: 'INTEGRACAO_CONNECT_UNAUTHORIZED',
    }
  }
  if (detalhe && /invalid_client|unauthenticated|expir|oauth|magalu|refresh/i.test(detalhe)) {
    return {
      message:
        'O token Magalu da loja venceu. Isso não é o HUB_WEBHOOK_SECRET. O Hub renova sozinho; se falhar, conecte a loja de novo.',
      code: 'INTEGRACAO_MAGALU_TOKEN_EXPIRED',
    }
  }
  return {
    message: detalhe?.trim() || 'O Hub recusou a operação. Não foi o segredo do Gestor.',
    code: 'INTEGRACAO_HUB_UNAUTHORIZED',
  }
}

export function mensagemErroDoHubJson(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string' && error.trim()) return error.trim()
  const message = (payload as { message?: unknown }).message
  return typeof message === 'string' && message.trim() ? message.trim() : null
}
