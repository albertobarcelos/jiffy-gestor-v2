import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/nfe/kanban/carregarPedidoKanbanQuickView'
import {
  formatarCelularExibicao,
  formatarCpfCnpjExibicao,
  formatarEnderecoEntregaMultilinha,
  formatarHoraPrevisaoEntrega,
} from '@/src/application/mappers/PedidoDisplayMapper'
import { transformarParaReal } from '@/src/shared/utils/formatters'

function montarRotuloPedido(numeroVenda: number | null, codigoVenda: string | null): string {
  if (numeroVenda == null && !codigoVenda) return '—'
  const numero = numeroVenda != null ? String(numeroVenda) : '—'
  const codigo = codigoVenda ? ` - #${codigoVenda}` : ''
  return `${numero}${codigo}`
}

function rotuloPagamento(
  fluxo: PedidoKanbanQuickViewData['fluxoPagamentoEntrega']
): string {
  return fluxo === 'cobrar_entregador' ? 'Cobrar na entrega' : 'Pago'
}

function montarLinhasProdutos(dados: PedidoKanbanQuickViewData): string[] {
  if (dados.produtos.length === 0) return ['Nenhum produto']

  const linhas: string[] = []
  for (const produto of dados.produtos) {
    linhas.push(`${produto.quantidade}x ${produto.nome}`)
    for (const comp of produto.complementos) {
      linhas.push(`  ${comp.quantidade}x ${comp.nome}`)
    }
  }
  return linhas
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
    '*Dados do Pedido*',
    '',
    empresa,
    '',
    `Pedido: ${montarRotuloPedido(dados.numeroVenda, dados.codigoVenda)}`,
    `*${rotuloPagamento(dados.fluxoPagamentoEntrega)}*`,
    '',
    `Cliente: ${dados.clienteNome}`,
    `Celular: ${formatarCelularExibicao(dados.detalhesEntrega.clienteCelular)}`,
  ]

  if (cpfCnpjExibicao) {
    linhas.push(`CPF/CNPJ: ${cpfCnpjExibicao}`)
  }

  linhas.push('', `*Previsão de entrega: ${previsao}*`, '')

  linhas.push('*Endereço para entrega*')
  linhas.push(...enderecoLinhas)
  linhas.push('', '*Pedido:*', ...montarLinhasProdutos(dados))

  if (dados.totalAReceber > 0) {
    linhas.push('', `*Total a Receber: ${transformarParaReal(dados.totalAReceber)}*`)
  }
  if (dados.troco > 0) {
    linhas.push(`*Levar Troco: ${transformarParaReal(dados.troco)}*`)
  }

  linhas.push('', '######## Boa Viagem ########')

  return linhas.join('\n')
}
