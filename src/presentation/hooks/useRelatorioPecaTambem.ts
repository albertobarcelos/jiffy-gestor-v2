'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  MSG_SEM_DADOS_PECA_TAMBEM,
  mapRelatorioPecaTambemResponse,
  type RelatorioPecaTambemResponseDTO,
} from '@/src/shared/types/relatorioPecaTambemApi'

export type UseRelatorioPecaTambemParams = {
  de: string | null
  ate: string | null
  q?: string | null
}

function mensagemErroRelatorioPecaTambem(
  status: number,
  body: Record<string, unknown>
): string {
  const raw =
    (typeof body.error === 'string' && body.error.trim()) ||
    (typeof body.message === 'string' && body.message.trim()) ||
    ''

  const lower = raw.toLowerCase()
  if (
    status === 404 ||
    lower.includes('not found') ||
    lower === `erro ${status}` ||
    /^erro\s*404\b/.test(lower)
  ) {
    return MSG_SEM_DADOS_PECA_TAMBEM
  }

  if (raw) return raw
  return 'Não foi possível carregar o relatório Peça Também. Tente novamente em instantes.'
}

async function fetchRelatorioPecaTambem(
  token: string,
  de: string,
  ate: string,
  q: string | null
): Promise<RelatorioPecaTambemResponseDTO> {
  const qs = new URLSearchParams({ de, ate })
  if (q) qs.set('q', q)
  const response = await fetchGestorApi(`/api/relatorios/peca-tambem?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as Record<string, unknown>
    throw new Error(mensagemErroRelatorioPecaTambem(response.status, err))
  }
  const raw = (await response.json()) as Record<string, unknown>
  return mapRelatorioPecaTambemResponse(raw)
}

export function useRelatorioPecaTambem(params: UseRelatorioPecaTambemParams) {
  const de = params.de?.trim() || null
  const ate = params.ate?.trim() || null
  const q = params.q?.trim() || null
  const enabled = Boolean(de && ate)

  return useSecureTenantQuery(
    ['relatorio-peca-tambem', de ?? '', ate ?? '', q ?? ''],
    ({ token }) => fetchRelatorioPecaTambem(token, de!, ate!, q),
    {
      enabled,
      staleTime: 60_000,
    }
  )
}
