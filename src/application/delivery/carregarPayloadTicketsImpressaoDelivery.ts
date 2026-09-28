import { montarTicketsResponseFromInstrucoes } from '@/src/application/delivery/montarTicketsResponseFromInstrucoes'
import type { EmpresaMeResumo } from '@/src/application/dto/EmpresaMeDTO'
import type { EstacaoImpressaoMapeamento } from '@/src/domain/estacao-impressao/EstacaoImpressao'
import {
  modosImpressaoPorImpressoraIdDeMapeamentos,
  type ModoImpressaoImpressora,
} from '@/src/domain/types/modoImpressaoImpressora'
import type { PreferenciasImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'
import type { InstrucoesImpressaoResponse } from '@/src/shared/types/instrucoesImpressao'
import type { VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'
import { erroImpressao, logImpressao } from '@/src/shared/utils/logImpressaoDelivery'

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

export type CarregarPayloadTicketsImpressao = (
  params: CarregarPayloadTicketsImpressaoParams
) => Promise<CarregarPayloadTicketsImpressaoResult>

type FetchResult<T> = { ok: true; data: T } | { ok: false; status: number; error?: string }

export type CarregarPayloadTicketsImpressaoDeps = {
  obterEstacaoId(): string | null
  buscarInstrucoes(
    vendaId: string,
    accessToken: string | undefined,
    estacaoId: string | null
  ): Promise<FetchResult<InstrucoesImpressaoResponse>>
  buscarPedido(
    vendaId: string,
    accessToken: string | undefined
  ): Promise<FetchResult<Record<string, unknown>>>
  buscarMapeamentos(token: string, estacaoId: string): Promise<EstacaoImpressaoMapeamento[]>
  buscarModosPorIds(
    ids: string[],
    accessToken: string | undefined,
    estacaoId: string | null
  ): Promise<Record<string, ModoImpressaoImpressora>>
  snapshotNomesMeios(): Record<string, string>
  lembrarNomeMeio(id: string, nome: string): void
  obterNomeMeio(id: string): string | null | undefined
  fetchMeioPagamento(id: string, token: string): Promise<Record<string, unknown> | null | undefined>
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  return v as Record<string, unknown>
}

async function resolverNomesMeiosPagamentoPedido(
  deps: CarregarPayloadTicketsImpressaoDeps,
  pedido: Record<string, unknown>,
  accessToken: string | undefined
): Promise<Record<string, string>> {
  const map: Record<string, string> = { ...deps.snapshotNomesMeios() }
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
      deps.lembrarNomeMeio(meioId, nome)
    }
  }

  const faltando = Array.from(ids).filter(id => !map[id]?.trim())
  const token = accessToken?.trim()
  if (!token || faltando.length === 0) return map

  await Promise.all(
    faltando.map(async id => {
      const cached = deps.obterNomeMeio(id)
      if (cached) {
        map[id] = cached
        return
      }
      try {
        const data = await deps.fetchMeioPagamento(id, token)
        const nome = String(data?.nome ?? data?.name ?? '').trim()
        if (nome) {
          map[id] = nome
          deps.lembrarNomeMeio(id, nome)
        }
      } catch {
        /* ignora falha individual */
      }
    })
  )

  return map
}

export function criarCarregarPayloadTicketsImpressaoDelivery(
  deps: CarregarPayloadTicketsImpressaoDeps
): CarregarPayloadTicketsImpressao {
  return async function carregarPayloadTicketsImpressaoDelivery(params) {
    const estacao = (params.estacaoImpressaoId ?? deps.obterEstacaoId())?.trim() || null

    logImpressao('carregarPayloadTickets.inicio', {
      vendaId: params.vendaId,
      temEstacao: Boolean(estacao),
    })

    const mapeamentosPromise =
      estacao && params.accessToken
        ? deps.buscarMapeamentos(params.accessToken, estacao).catch(error => {
            erroImpressao('carregarPayloadTickets.mapeamentos_estacao_falhou', {
              vendaId: params.vendaId,
              estacao,
              mensagem: error instanceof Error ? error.message : String(error),
            })
            return []
          })
        : Promise.resolve([])

    const [instrucoesFetch, pedidoFetch, mapeamentosEstacao] = await Promise.all([
      deps.buscarInstrucoes(params.vendaId, params.accessToken, estacao),
      deps.buscarPedido(params.vendaId, params.accessToken),
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
        deps,
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
          const fetched = await deps.buscarModosPorIds(faltando, params.accessToken, estacao)
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
