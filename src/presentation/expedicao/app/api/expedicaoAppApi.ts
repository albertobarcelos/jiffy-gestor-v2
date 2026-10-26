import {
  isoIntervaloComissao,
  intervaloComissaoEntregador,
  type PeriodoComissaoEntregador,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'
import {
  filtrarPedidosAtivosDoEntregador,
  mesclarPedidoPegoNaLista,
} from '@/src/application/expedicao/app/filtrarPedidosDoEntregador'
import {
  aplicarNomesMeiosNoPedido,
  mapPedidoAppEntregador,
  type PedidoResumoAppEntregador,
} from '@/src/application/expedicao/app/mapPedidoAppEntregador'
import {
  montarComissaoEntregadorApp,
  type ComissaoEntregadorApp,
} from '@/src/application/expedicao/app/montarComissaoEntregadorApp'
import {
  atualizarCobrancasPedidoDeliveryUseCase,
  confirmarCobrancaPendentePedidoDeliveryUseCase,
} from '@/src/infrastructure/composition/pedidoUseCases'
import { montarQueryListagemMeiosPagamento } from '@/src/application/meios-pagamentos/listagemMeiosPagamentoQuery'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import {
  filtrarMeiosPagamentoNaPortaApp,
  type MeioPagamentoAppEntregador,
} from '@/src/application/expedicao/app/pagamentoFinalizarEntregaApp'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { avaliarPedidoParaRodada, type PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { mapPedidoLeituraExpedicao } from '@/src/application/expedicao/mapPedidoLeituraExpedicao'
import {
  buscarPedidoPorCodigo,
  marcarPedidoPronto,
  vincularEDespacharPedido,
  vincularPedidoAoEntregador,
} from '@/src/presentation/expedicao/api/expedicaoApi'

export type { PedidoResumoAppEntregador }

export type { ComissaoEntregadorApp, MeioPagamentoAppEntregador }

async function lerErro(res: Response, fallback: string): Promise<string> {
  const raw: unknown = await res.json().catch(() => ({}))
  return textoErroCorpoApi(raw) || fallback
}

export async function listarPedidosAtivosEntregador(input: {
  token: string
  entregadorId: string
}): Promise<PedidoResumoAppEntregador[]> {
  const params = new URLSearchParams()
  params.set('limit', '100')
  params.set('offset', '0')
  params.set('cancelado', 'false')
  params.append('statusDelivery', 'PRONTO')
  params.append('statusDelivery', 'EM_ROTA')
  const res = await fetchGestorApi(`/api/delivery/pedidos?${params.toString()}`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(await lerErro(res, 'Não foi possível carregar os pedidos.'))
  const data = (await res.json()) as { items?: unknown[] }
  const pedidos = (Array.isArray(data.items) ? data.items : [])
    .map(mapPedidoAppEntregador)
    .filter((item): item is PedidoResumoAppEntregador => item !== null)
  const ativos = filtrarPedidosAtivosDoEntregador(pedidos, input.entregadorId)
  const ids = [...new Set(ativos.flatMap(pedido => pedido.meioPagamentoIds))]
  if (ids.length === 0) return ativos
  const nomes = await buscarNomesMeiosPagamentoApp(input.token, ids)
  return ativos.map(pedido => aplicarNomesMeiosNoPedido(pedido, nomes))
}

export async function buscarPedidoResumoApp(input: {
  token: string
  pedidoId: string
}): Promise<PedidoResumoAppEntregador | null> {
  const res = await fetchGestorApi(`/api/delivery/pedidos/${encodeURIComponent(input.pedidoId)}`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/json' },
  })
  if (!res.ok) return null
  const pedido = mapPedidoAppEntregador(await res.json())
  if (!pedido) return null
  const ids = pedido.meioPagamentoIds
  if (ids.length === 0) return pedido
  const nomes = await buscarNomesMeiosPagamentoApp(input.token, ids)
  return aplicarNomesMeiosNoPedido(pedido, nomes)
}

export { mesclarPedidoPegoNaLista }

let cacheNomesMeios: { em: number; nomes: Record<string, string> } | null = null

async function buscarNomesMeiosPagamentoApp(
  token: string,
  ids: string[]
): Promise<Record<string, string>> {
  const agora = Date.now()
  const nomes = { ...(cacheNomesMeios && agora - cacheNomesMeios.em < 5 * 60_000 ? cacheNomesMeios.nomes : {}) }
  if (Object.keys(nomes).length === 0) {
    const res = await fetchGestorApi('/api/meios-pagamentos?limit=100&offset=0', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.ok) {
      const data = (await res.json()) as { items?: Array<{ id?: string; nome?: string }> }
      for (const item of data.items ?? []) {
        const id = String(item.id ?? '').trim()
        const nome = String(item.nome ?? '').trim()
        if (id && nome) nomes[id] = nome
      }
    }
  }
  const faltando = ids.filter(id => !nomes[id])
  await Promise.all(
    faltando.map(async id => {
      const res = await fetchGestorApi(`/api/meios-pagamentos/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
      if (!res.ok) return
      const item = (await res.json()) as { id?: string; nome?: string }
      const nome = String(item.nome ?? '').trim()
      if (nome) nomes[id] = nome
    })
  )
  cacheNomesMeios = { em: agora, nomes }
  return nomes
}

export async function listarMeiosPagamentoEntregaApp(
  token: string
): Promise<MeioPagamentoAppEntregador[]> {
  const query = montarQueryListagemMeiosPagamento({
    ativo: true,
    ativoEntregaDelivery: true,
    ativoDelivery: true,
    limit: 100,
    offset: 0,
  })
  const res = await fetchGestorApi(`/api/meios-pagamentos?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(await lerErro(res, 'Não foi possível carregar as formas de pagamento.'))
  const data = (await res.json()) as {
    items?: Array<{ id?: string; nome?: string; ativo?: boolean }>
  }
  const nomes: Record<string, string> = { ...(cacheNomesMeios?.nomes ?? {}) }
  for (const item of data.items ?? []) {
    const id = String(item.id ?? '').trim()
    const nome = String(item.nome ?? '').trim()
    if (id && nome) nomes[id] = nome
  }
  const meios = filtrarMeiosPagamentoNaPortaApp(data.items ?? [])
  cacheNomesMeios = { em: Date.now(), nomes }
  return meios
}

export async function buscarComissaoEntregador(input: {
  token: string
  entregadorId: string
  periodo: PeriodoComissaoEntregador
}): Promise<ComissaoEntregadorApp> {
  const intervalo = isoIntervaloComissao(intervaloComissaoEntregador(input.periodo))
  const params = new URLSearchParams({
    dataFinalizacaoInicio: intervalo.dataFinalizacaoInicio,
    dataFinalizacaoFim: intervalo.dataFinalizacaoFim,
    limit: '50',
    offset: '0',
  })
  const res = await fetchGestorApi(
    `/api/relatorios/entregadores/${encodeURIComponent(input.entregadorId)}/entregas?${params}`,
    { headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/json' } }
  )
  if (!res.ok) throw new Error(await lerErro(res, 'Não foi possível carregar as comissões.'))
  return montarComissaoEntregadorApp((await res.json()) as Record<string, unknown>, input.entregadorId)
}

/**
 * Pega o pedido: marca PRONTO se ainda não estiver e vincula o entregador.
 * EM_ROTA fica para Conferir / Em rota, para o scan não travar na porta.
 */
export async function adicionarPedidoNaRodada(input: {
  token: string
  codigoVenda: string
  entregadorId: string
}): Promise<PedidoLeituraExpedicao> {
  const pedido = await buscarPedidoPorCodigo(input.token, input.codigoVenda)
  const avaliacao = avaliarPedidoParaRodada(pedido, input.entregadorId)
  if (!avaliacao.ok) {
    throw new Error(avaliacao.motivo)
  }
  const etapa = String(pedido.etapa ?? '').trim().toUpperCase()
  const jaMeu = String(pedido.entregadorId ?? '').trim() === input.entregadorId
  if (jaMeu && (etapa === 'EM_ROTA' || etapa === 'PRONTO')) {
    return pedido
  }
  await marcarPedidoPronto({
    token: input.token,
    pedidoId: pedido.id,
    etapaAtual: pedido.etapa,
  })
  if (!jaMeu) {
    await vincularPedidoAoEntregador({
      token: input.token,
      pedidoId: pedido.id,
      entregadorId: input.entregadorId,
    })
  }
  return {
    ...pedido,
    etapa: etapa === 'EM_ROTA' ? 'EM_ROTA' : 'PRONTO',
    entregadorId: input.entregadorId,
  }
}

export async function expedirPedidosDaRodada(input: {
  token: string
  entregadorId: string
  pedidos: PedidoLeituraExpedicao[]
}): Promise<Array<{ codigo: string; motivo: string }>> {
  const falhas: Array<{ codigo: string; motivo: string }> = []
  for (const pedido of input.pedidos) {
    try {
      await vincularEDespacharPedido({
        token: input.token,
        pedidoId: pedido.id,
        entregadorId: input.entregadorId,
      })
    } catch (error) {
      falhas.push({
        codigo: pedido.codigoVenda || pedido.id,
        motivo: error instanceof Error ? error.message : 'Falha ao sair para entrega.',
      })
    }
  }
  return falhas
}

async function efetivarCobrancasPendentesDoPedido(input: {
  token: string
  pedidoId: string
}): Promise<void> {
  try {
    await confirmarCobrancaPendentePedidoDeliveryUseCase.execute(input.pedidoId, input.token)
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : ''
    if (mensagem.includes('Nenhuma cobrança pendente')) return
    throw error
  }
}

export async function buscarItensPedidoApp(input: {
  token: string
  pedidoId: string
}): Promise<PedidoLeituraExpedicao['itens']> {
  const res = await fetchGestorApi(`/api/delivery/pedidos/${encodeURIComponent(input.pedidoId)}`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(await lerErro(res, 'Não foi possível carregar os itens.'))
  return mapPedidoLeituraExpedicao(await res.json())?.itens ?? []
}

/**
 * Confirma a entrega: efetiva cobranças pendentes (ex.: dinheiro na entrega)
 * e só então transiciona para FINALIZADO — o backend rejeita finalizar com pendência.
 */
export async function confirmarEntregaPedido(input: {
  token: string
  pedidoId: string
  pagamentos?: PagamentoSelecionado[] | null
}): Promise<void> {
  if (input.pagamentos && input.pagamentos.length > 0) {
    await atualizarCobrancasPedidoDeliveryUseCase.execute(
      input.pedidoId,
      input.token,
      input.pagamentos,
      'ja_pago'
    )
  }
  await efetivarCobrancasPendentesDoPedido(input)

  const res = await fetchGestorApi(`/api/delivery/pedidos/${encodeURIComponent(input.pedidoId)}/transicao-status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ toStatus: 'FINALIZADO' }),
  })
  if (!res.ok) throw new Error(await lerErro(res, 'Não foi possível confirmar a entrega.'))
}
