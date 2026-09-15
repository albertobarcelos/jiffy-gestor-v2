import type { EstacaoImpressaoResumo } from '@/src/infrastructure/api/estacoesImpressaoApi'

/** Corpo típico: `{ id, nome, ativo, gestorDelivery }` ou `{ data: { … } }`. */
function extrairObjetoPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>
  }
  return o
}

export function normalizarEstacaoImpressaoResumo(payload: unknown): EstacaoImpressaoResumo | null {
  const o = extrairObjetoPayload(payload)
  if (!o) return null
  const id = o.id != null ? String(o.id).trim() : ''
  if (!id) return null
  const nome = o.nome != null ? String(o.nome) : ''
  const ativo = typeof o.ativo === 'boolean' ? o.ativo : true
  const gestorDelivery = typeof o.gestorDelivery === 'boolean' ? o.gestorDelivery : false
  return { id, nome, ativo, gestorDelivery }
}

export function normalizarListaEstacoesImpressao(payload: unknown): EstacaoImpressaoResumo[] {
  let rows: unknown[] | null = null
  if (Array.isArray(payload)) rows = payload
  else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    const inner = o.items ?? o.data ?? o.results
    if (Array.isArray(inner)) rows = inner
  }
  if (!rows) return []
  return rows
    .map(r => normalizarEstacaoImpressaoResumo(r))
    .filter((item): item is EstacaoImpressaoResumo => item !== null)
}
