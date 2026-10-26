import type { PedidoLeituraExpedicao } from '@/src/application/expedicao/avaliarPedidoParaRodada'
import { statusesAtePronto } from '@/src/application/expedicao/statusesAteEmRota'
import { filtrarTicketsPorTipoDecidido } from '@/src/application/delivery/filtrarTicketsPorTipoDecidido'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import { escolherEstacaoImpressaoParaCupom } from '@/src/application/expedicao/escolherEstacaoImpressaoParaCupom'
import { listarEstacoesImpressao } from '@/src/infrastructure/api/estacoesImpressaoApi'
import { fetchVendaGestorTickets } from '@/src/infrastructure/api/fetchVendaGestorTickets'
import { imprimirTicketsApiGestor } from '@/src/infrastructure/printing/imprimirTicketsApiGestor'
import type { DeliveryCupomTemplateConfig } from '@/src/shared/types/deliveryCupomTemplate'
import {
  tipoCupomParaReimpressao,
  type PreferenciasImpressaoDelivery,
} from '@/src/shared/types/deliveryImpressao'

export type EntregadorIdentificado = {
  id: string
  nome: string
  telefone: string | null
}

async function lerErro(res: Response, fallback: string): Promise<string> {
  const raw: unknown = await res.json().catch(() => ({}))
  return textoErroCorpoApi(raw) || fallback
}

export async function identificarEntregadorPorSenha(
  token: string,
  senha: string
): Promise<EntregadorIdentificado> {
  const res = await fetchGestorApi('/api/delivery/entregadores/identificar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ senha }),
  })
  if (!res.ok) {
    throw new Error(await lerErro(res, 'Senha não encontrada.'))
  }
  const data = (await res.json()) as EntregadorIdentificado
  if (!data.id || !data.nome) {
    throw new Error('Senha não encontrada.')
  }
  return data
}

export async function buscarPedidoPorCodigo(
  token: string,
  codigoVenda: string
): Promise<PedidoLeituraExpedicao> {
  const res = await fetchGestorApi(
    `/api/expedicao/pedidos/por-codigo?codigo=${encodeURIComponent(codigoVenda)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  )
  if (!res.ok) {
    throw new Error(await lerErro(res, 'Pedido não encontrado.'))
  }
  return (await res.json()) as PedidoLeituraExpedicao
}

async function transicionarStatus(
  token: string,
  pedidoId: string,
  toStatus: string,
  fallback: string
): Promise<void> {
  const transicao = await fetchGestorApi(
    `/api/delivery/pedidos/${encodeURIComponent(pedidoId)}/transicao-status`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ toStatus }),
    }
  )
  if (!transicao.ok) {
    throw new Error(await lerErro(transicao, fallback))
  }
}

export async function marcarPedidoPronto(input: {
  token: string
  pedidoId: string
  etapaAtual?: string | null
}): Promise<void> {
  for (const toStatus of statusesAtePronto(input.etapaAtual)) {
    await transicionarStatus(input.token, input.pedidoId, toStatus, 'Não foi possível marcar o pedido como pronto.')
  }
}

export async function vincularPedidoAoEntregador(input: {
  token: string
  pedidoId: string
  entregadorId: string
}): Promise<void> {
  const patch = await fetchGestorApi(`/api/delivery/pedidos/${encodeURIComponent(input.pedidoId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${input.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ entregadorId: input.entregadorId }),
  })
  if (!patch.ok) {
    throw new Error(await lerErro(patch, 'Não foi possível vincular o entregador.'))
  }
}

export async function vincularEDespacharPedido(input: {
  token: string
  pedidoId: string
  entregadorId: string
}): Promise<void> {
  await vincularPedidoAoEntregador(input)
  await transicionarStatus(input.token, input.pedidoId, 'EM_ROTA', 'Não foi possível expedir o pedido.')
}

async function resolverEstacaoReceptoraDeliveryDaLoja(token: string): Promise<string> {
  const estacoes = await listarEstacoesImpressao(token)
  const id = escolherEstacaoImpressaoParaCupom(estacoes)
  if (!id) {
    throw new Error('Nenhuma estação receptora de delivery configurada na loja.')
  }
  return id
}

export async function imprimirCupomExpedicaoPedido(input: {
  token: string
  pedidoId: string
  nomeEmpresa?: string
  prefs: PreferenciasImpressaoDelivery
  cupomTemplate?: DeliveryCupomTemplateConfig
  estacaoImpressaoId?: string | null
}): Promise<void> {
  const estacaoImpressaoId =
    input.estacaoImpressaoId?.trim() || (await resolverEstacaoReceptoraDeliveryDaLoja(input.token))
  const ticketsFetch = await fetchVendaGestorTickets(input.pedidoId, input.token, {
    prefs: input.prefs,
    estacaoImpressaoId,
  })
  if (!ticketsFetch.ok) {
    throw new Error(ticketsFetch.error || 'Não foi possível montar o cupom.')
  }
  const tipo = tipoCupomParaReimpressao(input.prefs.modo, 'EM_ROTA')
  const filtrados = filtrarTicketsPorTipoDecidido(ticketsFetch.data.tickets, tipo)
  if (filtrados.length === 0) {
    throw new Error('Nenhum cupom de expedição para imprimir.')
  }
  await imprimirTicketsApiGestor({
    response: ticketsFetch.data,
    ticketsAImprimir: filtrados,
    nomeEmpresa: input.nomeEmpresa,
    jobNamePrefix: 'Expedição',
    cupomTemplate: input.cupomTemplate,
    accessToken: input.token,
  })
}
