import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import {
  erroImpressao,
  logImpressao,
  warnImpressao,
} from '@/src/shared/utils/logImpressaoDelivery'

export type FetchVendaGestorTicketsResult =
  | { ok: true; data: VendaGestorTicketsResponse }
  | { ok: false; status: number; error?: string }

function normalizarResposta(raw: Record<string, unknown>): VendaGestorTicketsResponse {
  const ticketsRaw = raw.tickets
  const tickets = Array.isArray(ticketsRaw) ? ticketsRaw : []
  const warningsRaw = raw.warnings
  const warnings = Array.isArray(warningsRaw) ? warningsRaw : []

  return {
    rastreamento: raw.rastreamento as VendaGestorTicketsResponse['rastreamento'],
    vendaId: raw.vendaId != null ? String(raw.vendaId) : '',
    estacaoImpressaoId:
      raw.estacaoImpressaoId != null
        ? String(raw.estacaoImpressaoId)
        : (raw.rastreamento as Record<string, unknown> | undefined)?.estacaoImpressaoId != null
          ? String((raw.rastreamento as Record<string, unknown>).estacaoImpressaoId)
          : undefined,
    codigoVenda: raw.codigoVenda != null ? String(raw.codigoVenda) : undefined,
    numeroVenda: Number(raw.numeroVenda ?? 0) || 0,
    tipoVenda: raw.tipoVenda != null ? String(raw.tipoVenda) : null,
    dataPedido:
      raw.dataPedido != null
        ? String(raw.dataPedido)
        : String((raw.rastreamento as Record<string, unknown> | undefined)?.geradoEm ?? ''),
    dataPrevista: raw.dataPrevista != null ? String(raw.dataPrevista) : '',
    tiradoPor: (raw.tiradoPor as VendaGestorTicketsResponse['tiradoPor']) ?? null,
    entregador: raw.entregador as VendaGestorTicketsResponse['entregador'],
    statusOperacional:
      raw.statusOperacional != null ? String(raw.statusOperacional) : undefined,
    cliente: (raw.cliente as VendaGestorTicketsResponse['cliente']) ?? null,
    observacaoPedido:
      typeof raw.observacaoPedido === 'string' ? raw.observacaoPedido : undefined,
    enderecoEntrega: raw.enderecoEntrega as VendaGestorTicketsResponse['enderecoEntrega'],
    valorFinal: Number(raw.valorFinal ?? 0) || 0,
    resumoPedido: (raw.resumoPedido as VendaGestorTicketsResponse['resumoPedido']) ?? null,
    pagamento: (raw.pagamento as VendaGestorTicketsResponse['pagamento']) ?? null,
    empresa: (raw.empresa as VendaGestorTicketsResponse['empresa']) ?? null,
    modoImpressaoDelivery: raw.modoImpressaoDelivery as VendaGestorTicketsResponse['modoImpressaoDelivery'],
    copiasCupomUnificado:
      raw.copiasCupomUnificado != null ? Number(raw.copiasCupomUnificado) : undefined,
    imprimirAoReceber:
      typeof raw.imprimirAoReceber === 'boolean' ? raw.imprimirAoReceber : undefined,
    imprimirAoFicarPronto:
      typeof raw.imprimirAoFicarPronto === 'boolean' ? raw.imprimirAoFicarPronto : undefined,
    tickets: tickets as VendaGestorTicketsResponse['tickets'],
    warnings: warnings as VendaGestorTicketsResponse['warnings'],
  }
}

/**
 * Cliente → rota BFF Next (`GET /api/delivery/pedidos/:id/tickets`).
 */
export async function fetchVendaGestorTickets(
  vendaId: string,
  accessToken: string | undefined
): Promise<FetchVendaGestorTicketsResult> {
  const token = accessToken?.trim()
  if (!token) {
    warnImpressao('fetchTickets.abort', { motivo: 'sem_token', vendaId })
    return { ok: false, status: 401, error: 'Sem token' }
  }

  const params = new URLSearchParams()
  const estacaoImpressaoId = getEstacaoImpressaoId()
  if (estacaoImpressaoId) {
    params.set('estacaoImpressaoId', estacaoImpressaoId)
  }
  const query = params.toString()

  logImpressao('fetchTickets.inicio', {
    vendaId,
    temEstacaoImpressao: Boolean(estacaoImpressaoId),
    estacaoDigits: estacaoImpressaoId ? String(estacaoImpressaoId).slice(0, 8) + '…' : null,
    urlPath: `/api/delivery/pedidos/…/tickets`,
  })

  const res = await fetch(
    `/api/delivery/pedidos/${encodeURIComponent(vendaId)}/tickets${query ? `?${query}` : ''}`,
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
    if (res.status === 404) {
      warnImpressao('fetchTickets.nao_disponivel', {
        vendaId,
        status: res.status,
        motivo: 'endpoint_gestor_ou_pedido_modulo_delivery',
      })
    } else {
      erroImpressao('fetchTickets.http_erro', {
        vendaId,
        status: res.status,
        mensagemApi: err || null,
      })
    }
    return { ok: false, status: res.status, error: err }
  }

  const raw = (await res.json()) as Record<string, unknown>
  const data = normalizarResposta(raw)
  logImpressao('fetchTickets.ok', {
    vendaId,
    numeroVenda: data.numeroVenda,
    qTickets: data.tickets.length,
    qWarnings: data.warnings?.length ?? 0,
    tiposCupomNosTickets: data.tickets.map(t => t.tipoCupom),
    modoDelivery: data.modoImpressaoDelivery,
  })
  return { ok: true, data }
}
