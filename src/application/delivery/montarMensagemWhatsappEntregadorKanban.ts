import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/kanban/carregarPedidoKanbanQuickView'
import {
  formatarCelularExibicao,
  formatarCpfCnpjExibicao,
  formatarEnderecoEntregaMultilinha,
  formatarHoraPrevisaoEntrega,
} from '@/src/application/mappers/PedidoDisplayMapper'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  montarLinhasProdutosWhatsapp,
  montarRotuloPedidoWhatsapp,
} from './montarMensagemWhatsappHelpers'
import { E } from './whatsappMensagemEmojis'

function rotuloPagamento(
  fluxo: PedidoKanbanQuickViewData['fluxoPagamentoEntrega']
): string {
  return fluxo === 'cobrar_entregador' ? 'Cobrar na entrega' : 'Pago'
}

export function montarMensagemWhatsappEntregadorKanban(args: {
  dados: PedidoKanbanQuickViewData
  nomeEmpresa: string
}): string {
  const { dados, nomeEmpresa } = args
  const empresa = nomeEmpresa.trim() || 'Empresa'
  const cpfCnpj = formatarCpfCnpjExibicao(dados.detalhesEntrega.clienteCpfCnpj)
  const cpfCnpjExibicao = cpfCnpj === '—' ? '' : cpfCnpj
  const enderecoLinhas = formatarEnderecoEntregaMultilinha(dados.detalhesEntrega.enderecoEntrega)
  const previsao = formatarHoraPrevisaoEntrega(
    dados.detalhesEntrega.previsaoEntrega,
    dados.dataCriacao
  )

  const linhas: string[] = [
    `${E.package} *Dados do Pedido*`,
    '',
    `${E.store} ${empresa}`,
    '',
    `${E.numbers} Pedido: ${montarRotuloPedidoWhatsapp(dados.numeroVenda, dados.codigoVenda)}`,
    `${E.moneyBag} *${rotuloPagamento(dados.fluxoPagamentoEntrega)}*`,
    '',
    `${E.user} Cliente: ${dados.clienteNome}`,
    `${E.mobile} Celular: ${formatarCelularExibicao(dados.detalhesEntrega.clienteCelular)}`,
  ]

  if (cpfCnpjExibicao) {
    linhas.push(`${E.page} CPF/CNPJ: ${cpfCnpjExibicao}`)
  }

  linhas.push('', `${E.clock} *Previsão de entrega: ${previsao}*`, '')

  linhas.push(`${E.pin} *Endereço para entrega*`)
  linhas.push(...enderecoLinhas)
  linhas.push('', `${E.cart} *Pedido:*`, ...montarLinhasProdutosWhatsapp(dados.produtos))

  if (dados.totalAReceber > 0) {
    linhas.push('', `${E.money} *Total a Receber: ${transformarParaReal(dados.totalAReceber)}*`)
  }
  if (dados.troco > 0) {
    linhas.push(`${E.recycle} *Levar Troco: ${transformarParaReal(dados.troco)}*`)
  }

  linhas.push('', `${E.rocket} ######## Boa Viagem ########`)

  return linhas.join('\n')
}
