import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError, mensagemLegivelApiError, textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

// ─── Client-side helpers (importáveis de infrastructure, não de presentation) ──

export async function lerErroCaixaEstacao(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => ({}))
  return (
    textoErroCorpoApi(body) ||
    (typeof body === 'object' && body && 'message' in body && typeof body.message === 'string'
      ? body.message
      : '') ||
    (typeof body === 'object' && body && 'error' in body && typeof body.error === 'string'
      ? body.error
      : '') ||
    `Erro ${response.status}`
  )
}

export function pathCaixaEstacaoAtual(estacaoGestorId: string, tipoRetorno = 'detalhado') {
  return `/api/caixa/operacao-caixa-estacao/current/${encodeURIComponent(estacaoGestorId)}?tipoRetorno=${tipoRetorno}`
}

export function pathMovimentacaoCaixaEstacao(
  estacaoGestorId: string,
  tipo: 'sangrias' | 'suprimentos'
) {
  return `/api/caixa/operacao-caixa-estacao/current/${encodeURIComponent(estacaoGestorId)}/${tipo}`
}

export function pathFechamentoCaixaEstacao(estacaoGestorId: string) {
  return `/api/caixa/operacao-caixa-estacao/current/${encodeURIComponent(estacaoGestorId)}/fechamento`
}

export function pathOperacaoCaixaEstacao(id: string, tipoRetorno = 'detalhado') {
  return `/api/caixa/operacao-caixa-estacao/${encodeURIComponent(id)}?tipoRetorno=${tipoRetorno}`
}

const UPSTREAM_PREFIX = '/api/v1/caixa/operacao-caixa-estacao'

export async function proxyOperacaoCaixaEstacao(
  request: NextRequest,
  path: string,
  init?: { method?: string; body?: string; extraQuery?: URLSearchParams }
): Promise<NextResponse> {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const method = init?.method ?? request.method
  const incoming = new URL(request.url)
  const query = init?.extraQuery ?? incoming.searchParams
  const qs = query.toString()
  const upstream = `${UPSTREAM_PREFIX}${path}${qs ? `?${qs}` : ''}`

  try {
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(upstream, {
      method,
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init?.body,
    })
    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      const payload =
        error.data && typeof error.data === 'object'
          ? error.data
          : { error: mensagemLegivelApiError(error) }
      return NextResponse.json(payload, { status: error.status })
    }
    console.error('[operacao-caixa-estacao]', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
