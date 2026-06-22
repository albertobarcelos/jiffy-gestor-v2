import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import { fetchInstrucoesImpressaoPedido } from '@/src/infrastructure/api/fetchInstrucoesImpressaoPedido'
import { fetchPedidoDeliveryDetalhe } from '@/src/infrastructure/api/fetchPedidoDeliveryDetalhe'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { getEstacaoImpressaoId } from '@/src/infrastructure/printing/estacaoImpressaoStorage'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import type { EmpresaMeResumo } from '@/src/presentation/hooks/useEmpresaMe'
import { vendaDetalheReadRepository } from '@/src/infrastructure/api/repositories/VendaDetalheReadRepository'
import { logImpressao, erroImpressao } from '@/src/shared/utils/logImpressaoDelivery'

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

async function resolverNomesMeiosPagamentoPedido(
  pedido: Record<string, unknown>,
  accessToken: string | undefined
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const ids = new Set<string>()
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []

  for (const c of cobrancas) {
    const r = asRecord(c)
    if (!r) continue
    const meioId = String(r.meioPagamentoId ?? '').trim()
    if (meioId) ids.add(meioId)

    const nested = asRecord(r.meioPagamento)
    const nome = String(nested?.nome ?? r.nomeMeioPagamento ?? '').trim()
    if (meioId && nome) map[meioId] = nome
  }

  const token = accessToken?.trim()
  if (!token) return map

  await Promise.all(
    Array.from(ids)
      .filter(id => !map[id])
      .map(async id => {
        try {
          const data = await vendaDetalheReadRepository.fetchMeioPagamento(id, token)
          const nome = String(data?.nome ?? data?.name ?? '').trim()
          if (nome) map[id] = nome
        } catch {
          /* ignora falha individual */
        }
      })
  )

  return map
}

export type CarregarPayloadTicketsImpressaoResult =
  | { ok: true; data: VendaGestorTicketsResponse }
  | { ok: false; status: number; error?: string }

/**
 * Carrega instruções de impressão + detalhe do pedido e monta payload compatível com tickets.
 */
export async function carregarPayloadTicketsImpressaoDelivery(params: {
  vendaId: string
  accessToken: string | undefined
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  estacaoImpressaoId?: string | null
}): Promise<CarregarPayloadTicketsImpressaoResult> {
  const estacao = (params.estacaoImpressaoId ?? getEstacaoImpressaoId())?.trim() || null

  logImpressao('carregarPayloadTickets.inicio', {
    vendaId: params.vendaId,
    temEstacao: Boolean(estacao),
  })

  const instrucoesFetch = await fetchInstrucoesImpressaoPedido(
    params.vendaId,
    params.accessToken,
    estacao
  )
  if (!instrucoesFetch.ok) {
    return instrucoesFetch
  }

  const pedidoFetch = await fetchPedidoDeliveryDetalhe(params.vendaId, params.accessToken)
  if (!pedidoFetch.ok) {
    return pedidoFetch
  }

  let mapeamentosEstacao: Awaited<ReturnType<typeof buscarMapeamentosEstacao>> = []
  if (estacao && params.accessToken) {
    try {
      mapeamentosEstacao = await buscarMapeamentosEstacao(params.accessToken, estacao)
      logImpressao('carregarPayloadTickets.mapeamentos_estacao', {
        vendaId: params.vendaId,
        estacao,
        qMapeamentos: mapeamentosEstacao.length,
      })
    } catch (error) {
      erroImpressao('carregarPayloadTickets.mapeamentos_estacao_falhou', {
        vendaId: params.vendaId,
        estacao,
        mensagem: error instanceof Error ? error.message : String(error),
      })
    }
  }

  let nomesMeiosPagamentoPorId: Record<string, string> = {}
  try {
    nomesMeiosPagamentoPorId = await resolverNomesMeiosPagamentoPedido(
      pedidoFetch.data,
      params.accessToken
    )
  } catch (error) {
    erroImpressao('carregarPayloadTickets.meios_pagamento_falhou', {
      vendaId: params.vendaId,
      mensagem: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    const data = montarTicketsResponseFromInstrucoes({
      instrucoes: instrucoesFetch.data,
      pedido: pedidoFetch.data,
      prefs: params.prefs,
      empresa: params.empresa,
      estacaoImpressaoId: estacao,
      mapeamentosEstacao,
      nomesMeiosPagamentoPorId,
    })

    logImpressao('carregarPayloadTickets.ok', {
      vendaId: params.vendaId,
      numeroVenda: data.numeroVenda,
      qTickets: data.tickets.length,
      tiposCupom: data.tickets.map(t => t.tipoCupom),
      modo: data.modoImpressaoDelivery,
    })

    return { ok: true, data }
  } catch (error) {
    erroImpressao('carregarPayloadTickets.montagem_erro', {
      vendaId: params.vendaId,
      mensagem: error instanceof Error ? error.message : String(error),
    })
    return {
      ok: false,
      status: 500,
      error: 'Erro ao montar tickets de impressão.',
    }
  }
}
