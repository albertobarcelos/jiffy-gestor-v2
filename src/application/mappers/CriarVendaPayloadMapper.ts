import type { CriarVendaGestorApiRequest } from '@/src/application/dto/api/vendaGestorApi'
import type { CriarVendaGestorInputDTO } from '@/src/application/dto/CriarVendaGestorDTO'
import { calcularTotalProduto } from '@/src/domain/services/pedido/CalculadoraPedido'
import type { PagamentoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import { observacoesArrayFromTexto } from '@/src/shared/helpers/observacaoPedido'

export function mapProdutosLancadosPayload(produtos: ProdutoSelecionado[]) {
  return produtos.map(p => {
    let valorDescontoFinal: number | null = null
    let valorAcrescimoFinal: number | null = null

    if (p.tipoDesconto && p.valorDesconto !== null && p.valorDesconto !== undefined) {
      valorDescontoFinal =
        p.tipoDesconto === 'porcentagem' ? p.valorDesconto / 100 : p.valorDesconto
    }
    if (p.tipoAcrescimo && p.valorAcrescimo !== null && p.valorAcrescimo !== undefined) {
      valorAcrescimoFinal =
        p.tipoAcrescimo === 'porcentagem' ? p.valorAcrescimo / 100 : p.valorAcrescimo
    }

    const valorFinalProduto = calcularTotalProduto(p)

    const observacoes = observacoesArrayFromTexto(p.observacao)

    return {
      produtoId: p.produtoId,
      quantidade: p.quantidade,
      valorUnitario: p.valorUnitario,
      valorFinal: valorFinalProduto,
      tipoDesconto: p.tipoDesconto || null,
      valorDesconto: valorDescontoFinal,
      tipoAcrescimo: p.tipoAcrescimo || null,
      valorAcrescimo: valorAcrescimoFinal,
      ...(observacoes ? { observacoes } : {}),
      complementos: (p.complementos || []).map(comp => ({
        complementoId: comp.id,
        grupoComplementoId: comp.grupoId,
        valorUnitario: comp.valor,
        quantidade: comp.quantidade,
      })),
    }
  })
}

export function buildPagamentosPayload(
  pagamentosBase: PagamentoSelecionado[],
  cobrarNaEntrega: boolean,
  incluirIdFormaPagamento = false
) {
  return pagamentosBase.map(p => ({
    ...(incluirIdFormaPagamento ? { id: p.meioPagamentoId } : {}),
    meioPagamentoId: p.meioPagamentoId,
    valor: p.valor,
    cobrarNaEntrega,
  }))
}

export function buildMeiosCobrancaPayload(
  pagamentosBase: PagamentoSelecionado[],
  meiosPagamento: Array<{ getId(): string; getNome(): string }>,
  nomesMeiosPagamentoPedido: Record<string, string>
) {
  return pagamentosBase.map(p => {
    const meio = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
    return {
      meioPagamentoId: p.meioPagamentoId,
      nome:
        meio?.getNome?.() ||
        nomesMeiosPagamentoPedido[p.meioPagamentoId] ||
        'Meio de pagamento',
      valor: p.valor,
    }
  })
}

export function buildPagamentosPayloadComEfetivado(
  pagamentosPayload: ReturnType<typeof buildPagamentosPayload>,
  pagamentos: PagamentoSelecionado[]
) {
  return pagamentosPayload.map(p => {
    const pgUI = pagamentos.find(
      ui => ui.meioPagamentoId === p.meioPagamentoId && ui.valor === p.valor
    )
    return {
      ...p,
      efetivado: pgUI?.naoEfetivo ? false : true,
    }
  })
}

export function buildCriarVendaGestorPayload(input: CriarVendaGestorInputDTO): CriarVendaGestorApiRequest {
  const produtosLancados = mapProdutosLancadosPayload(input.produtos)

  const vendaData: CriarVendaGestorApiRequest = {
    tipoVenda: input.tipoInicioPedido === 'entrega' ? 'entrega' : 'balcao',
    origem: input.origem,
    statusVenda: input.status,
    valorFinal: input.totalProdutos,
    totalDesconto: 0,
    totalAcrescimo: 0,
    produtosLancados,
    produtos: produtosLancados,
  }

  if (input.tipoInicioPedido === 'entrega') {
    vendaData.tipoAtendimento = input.tipoAtendimentoDelivery
    vendaData.modalidadeEntrega = input.tipoAtendimentoDelivery
    vendaData.tempoPrevistoMinutos = input.tempoPrevistoMinutos
    if (input.pedidoComEntrega && input.taxaEntregaSelecionada && input.valorTaxaEntrega > 0) {
      vendaData.taxaEntregaId = input.taxaEntregaSelecionada.getId()
      vendaData.taxaEntregaValor = input.valorTaxaEntrega
      vendaData.taxasLancadas = [
        {
          taxaId: input.taxaEntregaSelecionada.getId(),
          valorCalculado: input.valorTaxaEntrega,
        },
      ]
    }
  }

  vendaData.solicitarEmissaoFiscal = input.status === 'PENDENTE_EMISSAO'

  const clienteIdParaVenda =
    input.tipoInicioPedido === 'entrega'
      ? input.clienteEntregaVinculado?.id
      : input.clienteId
  if (clienteIdParaVenda) {
    vendaData.clienteId = clienteIdParaVenda
  }

  const observacoesPedido = observacoesArrayFromTexto(input.observacaoPedido)
  if (observacoesPedido) {
    vendaData.observacoes = observacoesPedido
  }

  if (input.pedidoComEntrega && input.moradaEntregaSelecionada?.endereco) {
    vendaData.enderecoEntrega = input.moradaEntregaSelecionada.endereco
  }

  const pagamentosPayload = buildPagamentosPayloadComEfetivado(
    buildPagamentosPayload(
      input.pagamentos,
      input.tipoInicioPedido === 'entrega' &&
        input.status === 'ABERTA' &&
        input.entregaComCobrancaPeloEntregador
    ),
    input.pagamentos
  )

  const meiosCobrancaPayload = buildMeiosCobrancaPayload(
    input.pagamentos,
    input.meiosPagamento,
    input.nomesMeiosPagamentoPedido
  )

  if (input.status === 'FINALIZADA' || input.status === 'PENDENTE_EMISSAO') {
    vendaData.dataFinalizacao = new Date().toISOString()
    vendaData.pagamentos = pagamentosPayload

    if (input.totalPagamentos < input.totalProdutos) {
      vendaData.pagamento = {
        status: 'pendente',
        cobrarCliente: true,
        valorReceber: input.totalProdutos,
        valorRecebido: input.totalPagamentos,
        valorFaltante: input.totalProdutos - input.totalPagamentos,
      }
    }
  } else if (input.tipoInicioPedido === 'entrega' && input.status === 'ABERTA') {
    const trocoPara =
      input.valorRecebido.trim() !== ''
        ? Number(input.valorRecebido.replace(/\./g, '').replace(',', '.')) || 0
        : 0

    if (input.entregaComCobrancaPeloEntregador) {
      vendaData.pagamentos = pagamentosPayload
      vendaData.pagamento = {
        status: 'pendente',
        cobrarCliente: true,
        meioPagamentoId: pagamentosPayload[0]?.meioPagamentoId,
        meioPagamento:
          input.meiosPagamento
            .find(m => m.getId() === pagamentosPayload[0]?.meioPagamentoId)
            ?.getNome?.() ?? null,
        valorReceber: input.totalProdutos,
        valorRecebido: 0,
        valorFaltante: input.totalProdutos,
        trocoPara:
          input.trocoLancamento > 0
            ? input.totalPagamentosLancados
            : trocoPara > 0
              ? trocoPara
              : undefined,
        meios: meiosCobrancaPayload,
      }
    } else {
      vendaData.pagamentos = pagamentosPayload
      vendaData.pagamento = {
        status: input.statusPagamentoPedido,
        cobrarCliente: input.statusPagamentoPedido !== 'pago',
        meioPagamentoId: pagamentosPayload[0]?.meioPagamentoId,
        valorReceber: input.valorAPagar,
        valorRecebido: Math.min(input.totalPagamentos, input.totalProdutos),
        valorFaltante: input.valorAPagar,
      }
    }
  } else {
    vendaData.pagamentos = []
  }

  return vendaData
}
