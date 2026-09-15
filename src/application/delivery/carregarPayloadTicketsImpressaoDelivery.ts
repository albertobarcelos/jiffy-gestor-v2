import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import { fetchInstrucoesImpressaoPedido } from '@/src/infrastructure/api/fetchInstrucoesImpressaoPedido'
import { fetchPedidoDeliveryDetalhe } from '@/src/infrastructure/api/fetchPedidoDeliveryDetalhe'
import { buscarMapeamentosEstacao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import {
  lembrarNomeMeioPagamento,
  obterNomeMeioPagamentoCache,
  snapshotNomesMeiosPagamentoCache,
} from '@/src/infrastructure/api/meiosPagamentoNomeCache'
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
  const map: Record<string, string> = { ...snapshotNomesMeiosPagamentoCache() }
  const ids = new Set<string>()
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []

  for (const c of cobrancas) {
    const r = asRecord(c)
    if (!r) continue
    const meioId = String(r.meioPagamentoId ?? '').trim()
    if (meioId) ids.add(meioId)

    const nested = asRecord(r.meioPagamento)
    const nome = String(nested?.nome ?? r.nomeMeioPagamento ?? '').trim()
    if (meioId && nome) {
      map[meioId] = nome
      lembrarNomeMeioPagamento(meioId, nome)
    }
  }

  const faltando = Array.from(ids).filter(id => !map[id]?.trim())
  const token = accessToken?.trim()
  if (!token || faltando.length === 0) return map

  await Promise.all(
    faltando.map(async id => {
      const cached = obterNomeMeioPagamentoCache(id)
      if (cached) {
        map[id] = cached
        return
      }
      try {
        const data = await vendaDetalheReadRepository.fetchMeioPagamento(id, token)
        const nome = String(data?.nome ?? data?.name ?? '').trim()
        if (nome) {
          map[id] = nome
          lembrarNomeMeioPagamento(id, nome)
        }
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
 * Carrega instruções + detalhe + mapeamentos em paralelo (cache em memória quando fresco).
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

  const mapeamentosPromise =
    estacao && params.accessToken
      ? buscarMapeamentosEstacao(params.accessToken, estacao).catch(error => {
          erroImpressao('carregarPayloadTickets.mapeamentos_estacao_falhou', {
            vendaId: params.vendaId,
            estacao,
            mensagem: error instanceof Error ? error.message : String(error),
          })
          return []
        })
      : Promise.resolve([])

  const [instrucoesFetch, pedidoFetch, mapeamentosEstacao] = await Promise.all([
    fetchInstrucoesImpressaoPedido(params.vendaId, params.accessToken, estacao),
    fetchPedidoDeliveryDetalhe(params.vendaId, params.accessToken),
    mapeamentosPromise,
  ])

  if (!instrucoesFetch.ok) {
    return instrucoesFetch
  }
  if (!pedidoFetch.ok) {
    return pedidoFetch
  }

  if (estacao) {
    logImpressao('carregarPayloadTickets.mapeamentos_estacao', {
      vendaId: params.vendaId,
      estacao,
      qMapeamentos: mapeamentosEstacao.length,
    })
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
