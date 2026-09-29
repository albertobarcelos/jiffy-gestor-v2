import type { EstacaoImpressaoMapeamento } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import { modoImpressaoDeMapeamentoOpcional } from '@/src/domain/types/modoImpressaoImpressora'

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
): EstacaoImpressaoMapeamento | null {
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
): EstacaoImpressaoMapeamento[] {
  return extrairLista(payload)
    .map(normalizarEstacaoImpressaoMapeamento)
    .filter((item): item is EstacaoImpressaoMapeamento => item !== null)
}
