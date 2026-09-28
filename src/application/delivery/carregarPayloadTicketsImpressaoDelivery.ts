import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import type { EmpresaMeResumo } from '@/src/application/dto/EmpresaMeDTO'
import type { IVendaDetalheReadRepository } from '@/src/domain/repositories/IVendaDetalheReadRepository'
import {
  modosImpressaoPorImpressoraIdDeMapeamentos,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { InstrucoesImpressaoResponse } from '@/src/shared/types/instrucoesImpressao'
import type { EstacaoImpressaoMapeamento } from '@/src/shared/types/estacaoImpressao'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { logImpressao, erroImpressao } from '@/src/shared/utils/logImpressaoDelivery'

export type CarregarPayloadTicketsImpressaoResult =
  | { ok: true; data: VendaGestorTicketsResponse }
  | { ok: false; status: number; error?: string }

export type CarregarPayloadTicketsImpressaoParams = {
  vendaId: string
  accessToken: string | undefined
  prefs: PreferenciasImpressaoDelivery
  empresa?: EmpresaMeResumo | null
  estacaoImpressaoId?: string | null
}

export type CarregarPayloadTicketsImpressaoDelivery = (
  params: CarregarPayloadTicketsImpressaoParams
) => Promise<CarregarPayloadTicketsImpressaoResult>

type FetchOk<T> = { ok: true; data: T } | { ok: false; status: number; error?: string }

export type CarregarPayloadTicketsImpressaoDeliveryDeps = {
  fetchInstrucoesImpressaoPedido: (
    vendaId: string,
    accessToken: string | undefined,
    estacaoImpressaoId: string | null
  ) => Promise<FetchOk<InstrucoesImpressaoResponse>>
  fetchPedidoDeliveryDetalhe: (
    vendaId: string,
    accessToken: string | undefined
  ) => Promise<FetchOk<Record<string, unknown>>>
  buscarMapeamentosEstacao: (
    accessToken: string,
    estacaoId: string
  ) => Promise<EstacaoImpressaoMapeamento[]>
  fetchModosImpressaoDaEstacaoPorIds: (
    impressoraIds: string[],
    accessToken: string | undefined,
    estacaoImpressaoId: string | null
  ) => Promise<Record<string, ModoImpressaoImpressora>>
  getEstacaoImpressaoId: () => string | null
  lembrarNomeMeioPagamento: (meioId: string, nome: string) => void
  obterNomeMeioPagamentoCache: (meioId: string) => string | null
  snapshotNomesMeiosPagamentoCache: () => Record<string, string>
  vendaDetalheReadRepository: Pick<IVendaDetalheReadRepository, 'fetchMeioPagamento'>
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

function criarResolverNomesMeiosPagamentoPedido(
  deps: CarregarPayloadTicketsImpressaoDeliveryDeps
) {
  return async function resolverNomesMeiosPagamentoPedido(
    pedido: Record<string, unknown>,
    accessToken: string | undefined
  ): Promise<Record<string, string>> {
    const map: Record<string, string> = { ...deps.snapshotNomesMeiosPagamentoCache() }
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
        deps.lembrarNomeMeioPagamento(meioId, nome)
      }
    }

    const faltando = Array.from(ids).filter(id => !map[id]?.trim())
    const token = accessToken?.trim()
    if (!token || faltando.length === 0) return map

    await Promise.all(
      faltando.map(async id => {
        const cached = deps.obterNomeMeioPagamentoCache(id)
        if (cached) {
          map[id] = cached
          return
        }
        try {
          const data = await deps.vendaDetalheReadRepository.fetchMeioPagamento(id, token)
          const nome = String(data?.nome ?? data?.name ?? '').trim()
          if (nome) {
            map[id] = nome
            deps.lembrarNomeMeioPagamento(id, nome)
          }
        } catch {
          /* ignora falha individual */
        }
      })
    )

    return map
  }
}

/**
 * Carrega instruções + detalhe + mapeamentos em paralelo (cache em memória quando fresco).
 */
export function criarCarregarPayloadTicketsImpressaoDelivery(
  deps: CarregarPayloadTicketsImpressaoDeliveryDeps
): CarregarPayloadTicketsImpressaoDelivery {
  const resolverNomesMeiosPagamentoPedido = criarResolverNomesMeiosPagamentoPedido(deps)

  return async function carregarPayloadTicketsImpressaoDelivery(
    params: CarregarPayloadTicketsImpressaoParams
  ): Promise<CarregarPayloadTicketsImpressaoResult> {
    const estacao = (params.estacaoImpressaoId ?? deps.getEstacaoImpressaoId())?.trim() || null

    logImpressao('carregarPayloadTickets.inicio', {
      vendaId: params.vendaId,
      temEstacao: Boolean(estacao),
    })

    const mapeamentosPromise =
      estacao && params.accessToken
        ? deps.buscarMapeamentosEstacao(params.accessToken, estacao).catch(error => {
            erroImpressao('carregarPayloadTickets.mapeamentos_estacao_falhou', {
              vendaId: params.vendaId,
              estacao,
              mensagem: error instanceof Error ? error.message : String(error),
            })
            return []
          })
        : Promise.resolve([])

    const [instrucoesFetch, pedidoFetch, mapeamentosEstacao] = await Promise.all([
      deps.fetchInstrucoesImpressaoPedido(params.vendaId, params.accessToken, estacao),
      deps.fetchPedidoDeliveryDetalhe(params.vendaId, params.accessToken),
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

    let modoPorImpressoraId: Record<string, ModoImpressaoImpressora> = {}
    if (params.prefs.modo === 'separado') {
      const ids = instrucoesFetch.data.mapeamentos
        .map(m => m.impressoraId)
        .filter((id): id is string => Boolean(id?.trim()))
      modoPorImpressoraId = {
        ...modosImpressaoPorImpressoraIdDeMapeamentos(instrucoesFetch.data.mapeamentos),
        ...modosImpressaoPorImpressoraIdDeMapeamentos(mapeamentosEstacao),
      }
      const faltando = ids.filter(id => !modoPorImpressoraId[id])
      if (faltando.length > 0) {
        try {
          const fetched = await deps.fetchModosImpressaoDaEstacaoPorIds(
            faltando,
            params.accessToken,
            estacao
          )
          modoPorImpressoraId = { ...fetched, ...modoPorImpressoraId }
        } catch (error) {
          erroImpressao('carregarPayloadTickets.modos_impressora_falhou', {
            vendaId: params.vendaId,
            estacao,
            mensagem: error instanceof Error ? error.message : String(error),
          })
        }
      }
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
        modoPorImpressoraId,
      })

      logImpressao('carregarPayloadTickets.ok', {
        vendaId: params.vendaId,
        numeroVenda: data.numeroVenda,
        qTickets: data.tickets.length,
        tiposCupom: data.tickets.map(t => t.tipoCupom),
        viasProducao: data.tickets
          .filter(t => t.tipoCupom === 'producao')
          .map(t => t.viaProducao?.kind ?? 'single'),
        modoCupom: data.modoImpressaoDelivery,
        modoPorImpressoraId,
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
}
