import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { isLikelyHubSessionTokenError } from '@/src/presentation/components/features/minhas-empresas/utils/hubSessionTokenFeedback'
import { PAGE_SIZE_EMPRESAS_FLOW } from './filtrarEmpresasFlow'

export type PaginaEmpresasAcesso = {
  items: LoginEmpresaSnapshot[]
  hasNext: boolean
  count: number
}

export function mapEmpresaAcessoItem(raw: unknown): LoginEmpresaSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const id = p.id != null ? String(p.id).trim() : ''
  const nomeFantasia =
    (typeof p.nomeFantasia === 'string' && p.nomeFantasia.trim()) ||
    (typeof p.nome === 'string' && p.nome.trim()) ||
    (typeof p.razaoSocial === 'string' && p.razaoSocial.trim()) ||
    ''
  const cnpj =
    (typeof p.cnpj === 'string' && p.cnpj.trim()) ||
    (typeof p.documento === 'string' && p.documento.trim()) ||
    ''
  if (!id || !nomeFantasia || !cnpj) return null
  if (p.ativo === false) return null
  const bloqueado = typeof p.bloqueado === 'boolean' ? p.bloqueado : false
  return { id, nomeFantasia, cnpj, bloqueado }
}

export function parsePaginaEmpresasAcesso(payload: unknown): PaginaEmpresasAcesso {
  const rec = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
  const rawItems = Array.isArray(rec.items)
    ? rec.items
    : Array.isArray(rec.empresas)
      ? rec.empresas
      : []
  const items = rawItems
    .map(mapEmpresaAcessoItem)
    .filter((e): e is LoginEmpresaSnapshot => e !== null)
  const count = typeof rec.count === 'number' ? rec.count : items.length
  const hasNext =
    typeof rec.hasNext === 'boolean'
      ? rec.hasNext
      : items.length > 0 && items.length + (typeof rec.offset === 'number' ? rec.offset : 0) < count
  return { items, hasNext, count }
}

export function deveIrAoLoginPorSessao(status: number, message: string): boolean {
  if (status === 401) return true
  return isLikelyHubSessionTokenError(message)
}

export async function fetchEmpresasAcessoPagina(input: {
  offset: number
  q: string
  bearer: string
  limit?: number
}): Promise<PaginaEmpresasAcesso> {
  const limit = input.limit ?? PAGE_SIZE_EMPRESAS_FLOW
  const params = new URLSearchParams({
    offset: String(Math.max(0, input.offset)),
    limit: String(limit),
  })
  const q = input.q.trim()
  if (q) params.set('q', q)

  const res = await fetch(`/api/auth/empresas-acesso?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: { Authorization: `Bearer ${input.bearer}` },
  })
  const body = (await res.json().catch(() => null)) as
    | { message?: string; error?: string }
    | PaginaEmpresasAcesso
    | null
  const message =
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Erro ${res.status}`

  if (!res.ok) {
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return parsePaginaEmpresasAcesso(body)
}
