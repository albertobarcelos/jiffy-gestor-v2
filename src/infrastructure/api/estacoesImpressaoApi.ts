import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { logImpressao } from '@/src/shared/utils/logImpressaoDelivery'

export interface EstacaoImpressaoResumo {
  id: string
  nome: string
  ativo: boolean
}

export interface ImpressoraLogica {
  id: string
  nome: string
}

export interface EstacaoImpressaoMapeamento {
  impressoraId: string
  nomeImpressora: string
  nomeImpressoraWindows: string
}

export class EstacaoImpressaoApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'EstacaoImpressaoApiError'
  }
}

export function isEstacaoImpressaoNotFoundError(error: unknown): boolean {
  return error instanceof EstacaoImpressaoApiError && error.status === 404
}

async function requestJson<T>(
  url: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}))
    const asObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
    const msgRaw =
      textoErroCorpoApi(body) ||
      (typeof asObj.error === 'string' ? asObj.error : '') ||
      (typeof asObj.message === 'string' ? asObj.message : '')
    const msg = (msgRaw || `Erro HTTP ${res.status}`).trim()
    throw new EstacaoImpressaoApiError(msg, res.status)
  }

  return (await res.json()) as T
}

export async function criarEstacaoImpressao(
  token: string,
  nome: string
): Promise<EstacaoImpressaoResumo> {
  const data = await requestJson<EstacaoImpressaoResumo>('/api/gestor/estacoes-impressao', token, {
    method: 'POST',
    body: JSON.stringify({ nome }),
  })
  const id = data?.id != null ? String(data.id).trim() : ''
  if (!id) {
    throw new Error(
      'Criação de estação retornou sem id. Verifique o BFF e o contrato da API gestor.'
    )
  }
  return {
    id,
    nome: data?.nome != null ? String(data.nome) : '',
    ativo: typeof data?.ativo === 'boolean' ? data.ativo : true,
  }
}

export function listarEstacoesImpressao(token: string): Promise<EstacaoImpressaoResumo[]> {
  return requestJson<EstacaoImpressaoResumo[]>('/api/gestor/estacoes-impressao', token)
}

export async function buscarImpressorasLogicas(token: string): Promise<ImpressoraLogica[]> {
  const limit = 100
  let offset = 0
  const all: Array<Record<string, unknown>> = []

  for (;;) {
    const data = await requestJson<{
      items?: Array<Record<string, unknown>>
      data?: Array<Record<string, unknown>>
      results?: Array<Record<string, unknown>>
      impressoras?: Array<Record<string, unknown>>
      count?: number
      total?: number
    }>(
      `/api/impressoras?limit=${limit}&offset=${offset}`,
      token
    )
    const items =
      (Array.isArray(data.items) && data.items) ||
      (Array.isArray(data.data) && data.data) ||
      (Array.isArray(data.results) && data.results) ||
      (Array.isArray(data.impressoras) && data.impressoras) ||
      []
    logImpressao('modal.impressoras_logicas.pagina', {
      offset,
      limit,
      qItems: items.length,
      count: data.count ?? data.total ?? null,
      chavesResposta: Object.keys(data),
    })
    all.push(...items)
    if (items.length < limit) break
    offset += limit
  }

  const normalizadas = all
    .map(item => ({
      id: item.id != null ? String(item.id) : '',
      nome: item.nome != null ? String(item.nome) : '',
    }))
    .filter(item => item.id && item.nome)

  logImpressao('modal.impressoras_logicas.final', {
    recebidas: all.length,
    normalizadas: normalizadas.length,
    idsResumo: normalizadas.map(item => item.id.slice(0, 8)),
  })

  return normalizadas
}

export function buscarMapeamentosEstacao(
  token: string,
  estacaoId: string
): Promise<EstacaoImpressaoMapeamento[]> {
  return requestJson<EstacaoImpressaoMapeamento[]>(
    `/api/gestor/estacoes-impressao/${encodeURIComponent(estacaoId)}/impressoras`,
    token
  )
}

export function salvarMapeamentosEstacao(
  token: string,
  estacaoId: string,
  mapeamentos: Array<{ impressoraId: string; nomeImpressoraWindows: string }>
): Promise<EstacaoImpressaoMapeamento[]> {
  return requestJson<EstacaoImpressaoMapeamento[]>(
    `/api/gestor/estacoes-impressao/${encodeURIComponent(estacaoId)}/impressoras`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ mapeamentos }),
    }
  )
}
