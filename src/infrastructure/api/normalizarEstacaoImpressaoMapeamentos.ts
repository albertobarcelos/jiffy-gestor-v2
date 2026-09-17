import { modoImpressaoDeMapeamentoOpcional } from '@/src/domain/types/modoImpressaoImpressora'
import type { ModoImpressaoImpressora } from '@/src/domain/types/modoImpressaoImpressora'

export type EstacaoImpressaoMapeamentoNormalizado = {
  impressoraId: string
  nomeImpressora: string
  nomeImpressoraWindows: string
  modoImpressao?: ModoImpressaoImpressora
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function extrairLista(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  const o = asRecord(payload)
  if (!o) return []
  const inner = o.items ?? o.data ?? o.mapeamentos ?? o.results
  return Array.isArray(inner) ? inner : []
}

export function normalizarEstacaoImpressaoMapeamento(
  raw: unknown
): EstacaoImpressaoMapeamentoNormalizado | null {
  const o = asRecord(raw)
  if (!o) return null
  const impressoraId = String(o.impressoraId ?? o.impressora_id ?? '').trim()
  if (!impressoraId) return null
  const modoImpressao = modoImpressaoDeMapeamentoOpcional(o)
  return {
    impressoraId,
    nomeImpressora: String(o.nomeImpressora ?? o.nome_impressora ?? o.impressoraNome ?? '').trim(),
    nomeImpressoraWindows: String(
      o.nomeImpressoraWindows ?? o.nome_impressora_windows ?? ''
    ).trim(),
    ...(modoImpressao ? { modoImpressao } : {}),
  }
}

export function normalizarListaMapeamentosEstacao(
  payload: unknown
): EstacaoImpressaoMapeamentoNormalizado[] {
  return extrairLista(payload)
    .map(normalizarEstacaoImpressaoMapeamento)
    .filter((item): item is EstacaoImpressaoMapeamentoNormalizado => item !== null)
}
