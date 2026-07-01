import type { PedidoKanbanQuickViewData } from '@/src/presentation/components/features/delivery/kanban-panels/carregarPedidoKanbanQuickView'
import {
  formatarCelularExibicao,
  formatarDataDetalhePedido,
  formatarEnderecoEntregaCompleto,
  formatarHoraPrevisaoEntrega,
} from '@/src/application/mappers/PedidoDisplayMapper'
import type { EnderecoEntregaDetalhe } from '@/src/domain/types/vendaDetalhe'
import type { EnderecoEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { E } from './whatsappMensagemEmojis'

export function resolverNomeClienteWhatsapp(nome: string): string {
  const trimmed = nome.trim()
  if (trimmed === '' || trimmed === '—') return 'cliente'
  return trimmed
}

export function montarRotuloPedidoWhatsapp(
  numeroVenda: number | null,
  codigoVenda: string | null
): string {
  if (numeroVenda == null && !codigoVenda) return '—'
  const numero = numeroVenda != null ? String(numeroVenda) : '—'
  const codigo = codigoVenda ? ` (#${codigoVenda})` : ''
  return `#${numero}${codigo}`
}

export function mapEnderecoEmpresaMe(
  endereco: EnderecoEmpresaMe | null | undefined
): EnderecoEntregaDetalhe | null {
  if (!endereco) return null
  const mapped: EnderecoEntregaDetalhe = {
    rua: endereco.rua ?? null,
    numero: endereco.numero ?? null,
    bairro: endereco.bairro ?? null,
    cidade: endereco.cidade ?? null,
    estado: endereco.estado ?? null,
    cep: endereco.cep ?? null,
    complemento: endereco.complemento ?? null,
  }
  const hasAny = Object.values(mapped).some(v => v != null && String(v).trim() !== '')
  return hasAny ? mapped : null
}

export function formatarPrevisaoPedidoWhatsapp(
  previsao: string | null | undefined,
  dataCriacao: string | null | undefined,
  tipoVenda: 'entrega' | 'retirada'
): string {
  if (previsao == null || String(previsao).trim() === '') return '—'
  const str = String(previsao).trim()
  if (!Number.isNaN(Number(str)) && /^\d+$/.test(str)) {
    const minutos = Number(str)
    const rotulo = tipoVenda === 'retirada' ? 'retirada' : 'entrega'
    return `${minutos} minutos (${rotulo})`
  }
  return formatarHoraPrevisaoEntrega(previsao, dataCriacao)
}

export function montarLinhasProdutosWhatsapp(
  produtos: PedidoKanbanQuickViewData['produtos']
): string[] {
  if (produtos.length === 0) return ['Nenhum item']

  const linhas: string[] = []
  for (const produto of produtos) {
    linhas.push(`${E.bullet} ${produto.quantidade}x ${produto.nome}`)
    for (const comp of produto.complementos) {
      linhas.push(`  - ${comp.quantidade}x ${comp.nome}`)
    }
  }
  return linhas
}

export function calcularTotalPedidoWhatsapp(dados: PedidoKanbanQuickViewData): number {
  const total = dados.totalItens + dados.taxaEntrega
  return total > 0 ? Math.round(total * 100) / 100 : dados.totalItens
}

export function montarLinhasEnderecoLocalWhatsapp(args: {
  tipoVenda: 'entrega' | 'retirada'
  enderecoEntrega: EnderecoEntregaDetalhe | null | undefined
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
}): { rotulo: string; enderecoTexto: string } {
  if (args.tipoVenda === 'retirada') {
    const endereco = mapEnderecoEmpresaMe(args.enderecoEmpresa)
    return {
      rotulo: 'Local de retirada',
      enderecoTexto: formatarEnderecoEntregaCompleto(endereco),
    }
  }

  return {
    rotulo: 'Local de entrega',
    enderecoTexto: formatarEnderecoEntregaCompleto(args.enderecoEntrega),
  }
}

export function rotuloStatusPagamentoClienteWhatsapp(
  fluxo: PedidoKanbanQuickViewData['fluxoPagamentoEntrega']
): string {
  if (fluxo === 'cobrar_entregador') {
    return 'À pagar'
  }
  return 'Já pago'
}

export function montarLinhaFormaPagamentoWhatsapp(
  tipoPagamento: string,
  totalPedido: number,
  fluxo: PedidoKanbanQuickViewData['fluxoPagamentoEntrega']
): string {
  const forma =
    tipoPagamento.trim() && tipoPagamento !== '—'
      ? tipoPagamento
      : fluxo === 'cobrar_entregador'
        ? 'Cobrar na entrega'
        : '—'
  return `${E.bullet} ${forma}: ${transformarParaReal(totalPedido)}`
}

export function montarDetalhesPedidoClienteWhatsapp(args: {
  dados: PedidoKanbanQuickViewData
  tipoVenda: 'entrega' | 'retirada'
  enderecoEmpresa: EnderecoEmpresaMe | null | undefined
}): string {
  const { dados, tipoVenda, enderecoEmpresa } = args
  const nome = resolverNomeClienteWhatsapp(dados.clienteNome)
  const numeroPedido = montarRotuloPedidoWhatsapp(dados.numeroVenda, dados.codigoVenda)
  const dataPedido = formatarDataDetalhePedido(dados.dataCriacao)
  const celular = formatarCelularExibicao(dados.detalhesEntrega.clienteCelular)
  const { rotulo: rotuloLocal, enderecoTexto } = montarLinhasEnderecoLocalWhatsapp({
    tipoVenda,
    enderecoEntrega: dados.detalhesEntrega.enderecoEntrega,
    enderecoEmpresa,
  })
  const previsaoRotulo = tipoVenda === 'retirada' ? 'Previsão para retirada' : 'Previsão para entrega'
  const previsao = formatarPrevisaoPedidoWhatsapp(
    dados.detalhesEntrega.previsaoEntrega,
    dados.dataCriacao,
    tipoVenda
  )
  const totalPedido = calcularTotalPedidoWhatsapp(dados)
  const linhasProdutos = montarLinhasProdutosWhatsapp(dados.produtos)
  const linhaPagamento = montarLinhaFormaPagamentoWhatsapp(
    dados.tipoPagamento,
    totalPedido,
    dados.fluxoPagamentoEntrega
  )
  const statusPagamento = rotuloStatusPagamentoClienteWhatsapp(dados.fluxoPagamentoEntrega)

  const linhas: string[] = [
    `Oi, ${nome}! ${E.smile}`,
    '',
    `Recebemos seu pedido! ${E.check}`,
    '',
    `${E.numbers} Nº do pedido: ${numeroPedido}`,
    `${E.calendar} Data do pedido: ${dataPedido}`,
    '',
    `${E.user} Cliente: ${nome}`,
    `${E.phone} Contato: ${celular}`,
    '',
    `${E.pin} ${rotuloLocal}: ${enderecoTexto}`,
    `${E.hourglass} ${previsaoRotulo}: ${previsao}`,
    '',
    `${E.cart} Itens do Pedido:`,
    ...linhasProdutos,
    '',
    `${E.money} Valor do pedido: ${transformarParaReal(dados.totalItens)}`,
  ]

  if (dados.taxaEntrega > 0) {
    linhas.push(`${E.truck} Taxa de entrega: ${transformarParaReal(dados.taxaEntrega)}`)
  }

  linhas.push(
    `${E.dollar} Total: ${transformarParaReal(totalPedido)}`,
    '',
    `${E.card} Forma de pagamento:`,
    linhaPagamento,
    statusPagamento
  )

  return linhas.join('\n')
}
