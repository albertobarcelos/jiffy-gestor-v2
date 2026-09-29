import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import {
  normalizarEstacaoImpressaoResumo,
  normalizarListaEstacoesImpressao,
} from '@/src/infrastructure/api/normalizarEstacaoImpressaoResumo'
import { normalizarListaMapeamentosEstacao } from '@/src/infrastructure/api/normalizarEstacaoImpressaoMapeamentos'
import type {
  AtualizarEstacaoImpressaoPatch,
  EstacaoImpressaoMapeamento,
  EstacaoImpressaoResumo,
  ImpressoraLogica,
  MapeamentoEstacaoParaSalvar,
} from '@/src/domain/estacao-impressao/EstacaoImpressao'

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
  const res = await fetchGestorApi(url, {
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
  const data = await requestJson<unknown>('/api/gestor/estacoes-impressao', token, {
    method: 'POST',
    body: JSON.stringify({ nome }),
  })
  const normalized = normalizarEstacaoImpressaoResumo(data)
  if (!normalized) {
    throw new Error(
      'Criação de estação retornou sem id. Verifique o BFF e o contrato da API gestor.'
    )
  }
  return normalized
}

export function listarEstacoesImpressao(token: string): Promise<EstacaoImpressaoResumo[]> {
  return requestJson<unknown>('/api/gestor/estacoes-impressao', token).then(data =>
    normalizarListaEstacoesImpressao(data)
  )
}

export async function atualizarEstacaoImpressao(
  token: string,
  estacaoId: string,
  patch: AtualizarEstacaoImpressaoPatch
): Promise<EstacaoImpressaoResumo> {
  const id = estacaoId.trim()
  if (!id) {
    throw new Error('ID da estação é obrigatório.')
  }
  const data = await requestJson<unknown>(
    `/api/gestor/estacoes-impressao/${encodeURIComponent(id)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  )
  const normalized = normalizarEstacaoImpressaoResumo(data)
  if (!normalized) {
    throw new Error(
      'Atualização de estação retornou sem id. Verifique o BFF e o contrato da API gestor.'
    )
  }
  return normalized
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

  return normalizadas
}

const MAPEAMENTOS_ESTACAO_CACHE = new Map<string, EstacaoImpressaoMapeamento[]>()

export function invalidarMapeamentosEstacaoCache(estacaoId?: string): void {
  const id = estacaoId?.trim()
  if (id) {
    MAPEAMENTOS_ESTACAO_CACHE.delete(id)
    return
  }
  MAPEAMENTOS_ESTACAO_CACHE.clear()
}

export async function buscarMapeamentosEstacao(
  token: string,
  estacaoId: string
): Promise<EstacaoImpressaoMapeamento[]> {
  const id = estacaoId.trim()
  const cached = id ? MAPEAMENTOS_ESTACAO_CACHE.get(id) : undefined
  if (cached) return cached

  const raw = await requestJson<unknown>(
    `/api/gestor/estacoes-impressao/${encodeURIComponent(estacaoId)}/impressoras`,
    token
  )
  const data = normalizarListaMapeamentosEstacao(raw)
  if (id) MAPEAMENTOS_ESTACAO_CACHE.set(id, data)
  return data
}

export async function salvarMapeamentosEstacao(
  token: string,
  estacaoId: string,
  mapeamentos: MapeamentoEstacaoParaSalvar[]
): Promise<EstacaoImpressaoMapeamento[]> {
  const data = normalizarListaMapeamentosEstacao(
    await requestJson<unknown>(
      `/api/gestor/estacoes-impressao/${encodeURIComponent(estacaoId)}/impressoras`,
      token,
      {
        method: 'PUT',
        body: JSON.stringify({ mapeamentos }),
      }
    )
  )
  const id = estacaoId.trim()
  if (id) MAPEAMENTOS_ESTACAO_CACHE.set(id, data)
  return data
}
