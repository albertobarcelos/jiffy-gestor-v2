import type { InstrucoesImpressaoResponse } from '@/src/shared/types/instrucoesImpressao'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import {
  erroImpressao,
  logImpressao,
  warnImpressao,
} from '@/src/shared/utils/logImpressaoDelivery'

export type FetchInstrucoesImpressaoResult =
  | { ok: true; data: InstrucoesImpressaoResponse }
  | { ok: false; status: number; error?: string }

function normalizarInstrucoes(raw: Record<string, unknown>): InstrucoesImpressaoResponse {
  const mapeamentosRaw = raw.mapeamentos
  const warningsRaw = raw.warnings
  const mapeamentos = Array.isArray(mapeamentosRaw)
    ? mapeamentosRaw.map(m => {
        const o = m && typeof m === 'object' ? (m as Record<string, unknown>) : {}
        const idsRaw = o.produtosLancadosIds
        const produtosLancadosIds = Array.isArray(idsRaw)
          ? idsRaw.map(id => String(id)).filter(Boolean)
          : []
        return {
          impressoraId: o.impressoraId != null ? String(o.impressoraId) : null,
          impressoraNome: o.impressoraNome != null ? String(o.impressoraNome) : null,
          nomeImpressoraWindows:
            o.nomeImpressoraWindows != null ? String(o.nomeImpressoraWindows) : null,
          produtosLancadosIds,
        }
      })
    : []

  const warnings = Array.isArray(warningsRaw)
    ? warningsRaw.map(w => {
        if (typeof w === 'string') {
          return { code: w, message: w }
        }
        const o = w && typeof w === 'object' ? (w as Record<string, unknown>) : {}
        return {
          code: String(o.code ?? ''),
          message: String(o.message ?? o.code ?? ''),
          detalhe: o.detalhe != null ? String(o.detalhe) : undefined,
          contexto:
            o.contexto && typeof o.contexto === 'object' && !Array.isArray(o.contexto)
              ? (o.contexto as Record<string, unknown>)
              : undefined,
        }
      })
    : []

  return { mapeamentos, warnings }
}

/**
 * Cliente → BFF (`GET /api/delivery/pedidos/:id/instrucoes-impressao`).
 */
export async function fetchInstrucoesImpressaoPedido(
  vendaId: string,
  accessToken: string | undefined,
  estacaoImpressaoId?: string | null
): Promise<FetchInstrucoesImpressaoResult> {
  const token = accessToken?.trim()
  if (!token) {
    warnImpressao('fetchInstrucoes.abort', { motivo: 'sem_token', vendaId })
    return { ok: false, status: 401, error: 'Sem token' }
  }

  const estacao = (estacaoImpressaoId ?? getEstacaoImpressaoId())?.trim()
  if (!estacao) {
    warnImpressao('fetchInstrucoes.abort', { motivo: 'sem_estacao', vendaId })
    return {
      ok: false,
      status: 400,
      error: 'Estação de impressão não configurada neste terminal.',
    }
  }

  const params = new URLSearchParams({ estacaoImpressaoId: estacao })

  logImpressao('fetchInstrucoes.inicio', {
    vendaId,
    estacaoDigits: estacao.slice(0, 8) + '…',
  })

  const res = await fetch(
    `/api/delivery/pedidos/${encodeURIComponent(vendaId)}/instrucoes-impressao?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    let err = ''
    try {
      const j = (await res.json()) as { error?: string }
      err = j.error ?? ''
    } catch {
      /* ignore */
    }
    erroImpressao('fetchInstrucoes.http_erro', {
      vendaId,
      status: res.status,
      mensagemApi: err || null,
    })
    return { ok: false, status: res.status, error: err }
  }

  const raw = (await res.json()) as Record<string, unknown>
  const data = normalizarInstrucoes(raw)
  logImpressao('fetchInstrucoes.ok', {
    vendaId,
    qMapeamentos: data.mapeamentos.length,
    qWarnings: data.warnings.length,
  })
  return { ok: true, data }
}
