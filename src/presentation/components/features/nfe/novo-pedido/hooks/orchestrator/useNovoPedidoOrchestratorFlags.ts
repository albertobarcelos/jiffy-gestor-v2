'use client'

import { useMemo } from 'react'
import { calcularTotalProduto } from '@/src/domain/services/pedido/CalculadoraPedido'
import {
  resolverSubtotalItensPedido,
  resolverTotalPedidoComTaxaEntrega,
  resolverValorTaxaEntregaPedido,
} from '@/src/application/mappers/resolverTotalPedidoEntrega'
import {
  podeExibirAbaDadosEntregaDetalhe,
  podeExibirAbaNotaFiscalDetalhe,
  podeExibirCancelarNotaFiscalDetalhe,
  resolverStatusFiscalExibicao,
} from '@/src/domain/services/pedido/RegrasFluxoPedidoGestor'
import { Taxa } from '@/src/domain/entities/Taxa'
import type {
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  OrigemVenda,
  ProdutoSelecionado,
  ResumoFiscalVenda,
  ResumoFinanceiroDetalhes,
  StatusVenda,
} from '../../types'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import { pagamentoEntregaConfirmadoNoPedido } from '@/src/domain/services/pedido/RegrasPagamentoPedido'

export type UseNovoPedidoOrchestratorFlagsParams = {
  modoVisualizacao: boolean | undefined
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  statusFiscalUnificado: string | null | undefined
  statusFiscalDetalhe: string | null
  resumoFiscal: ResumoFiscalVenda | null
  origem: OrigemVenda | null
  detalhesPedidoMeta: DetalhesPedidoMeta | null
  tipoInicioPedido: 'balcao' | 'entrega'
  status: StatusVenda
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
  currentStep: 1 | 2 | 3 | 4
  dataFinalizacaoCarregada: string | null
  vendaId: string | undefined
  vendaGestorJaCancelada: boolean
  pedidoComRetirada: boolean
  pedidoComEntrega: boolean
  valorFinalVenda: number | null
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  taxaEntregaId: string
  taxasEntrega: Taxa[]
  resumoFinanceiroDetalhes: ResumoFinanceiroDetalhes | null
  detalhesEntregaPedido: DetalhesEntregaPedido | null
}

export function useNovoPedidoOrchestratorFlags({
  modoVisualizacao,
  tabelaOrigemVenda,
  statusFiscalUnificado,
  statusFiscalDetalhe,
  resumoFiscal,
  origem,
  detalhesPedidoMeta,
  tipoInicioPedido,
  status,
  fluxoPagamentoEntrega,
  currentStep,
  dataFinalizacaoCarregada,
  vendaId,
  vendaGestorJaCancelada,
  pedidoComRetirada,
  pedidoComEntrega,
  valorFinalVenda,
  produtos,
  pagamentos,
  taxaEntregaId,
  taxasEntrega,
  resumoFinanceiroDetalhes,
  detalhesEntregaPedido,
}: UseNovoPedidoOrchestratorFlagsParams) {
  const statusFiscal = useMemo(
    () =>
      resolverStatusFiscalExibicao(
        statusFiscalUnificado,
        statusFiscalDetalhe,
        resumoFiscal?.status
      ),
    [statusFiscalUnificado, statusFiscalDetalhe, resumoFiscal?.status]
  )

  const podeExibirAbaNotaFiscal = useMemo(
    () =>
      podeExibirAbaNotaFiscalDetalhe({
        modoVisualizacao,
        tabelaOrigemVenda,
        statusFiscal,
        origem,
      }),
    [modoVisualizacao, tabelaOrigemVenda, statusFiscal, origem]
  )

  const podeExibirAbaDadosEntrega = useMemo(
    () =>
      podeExibirAbaDadosEntregaDetalhe({
        modoVisualizacao,
        tipoVenda: detalhesPedidoMeta?.tipoVenda,
      }),
    [modoVisualizacao, detalhesPedidoMeta?.tipoVenda]
  )

  const statusDisponiveis = [
    { value: 'ABERTA', label: 'Aberta (Em Andamento)' },
    { value: 'FINALIZADA', label: 'Finalizada' },
    { value: 'PENDENTE_EMISSAO', label: 'Finalizada + Emitir NFe' },
  ]

  const rotuloStatusResumoModal = useMemo(() => {
    if (tipoInicioPedido === 'entrega' && status === 'ABERTA') {
      return 'Pendente (novos pedidos)'
    }
    return statusDisponiveis.find(s => s.value === status)?.label ?? String(status)
  }, [tipoInicioPedido, status])

  const pedidoGestorComPagamentoNoPasso3 =
    status === 'FINALIZADA' ||
    status === 'PENDENTE_EMISSAO' ||
    (tipoInicioPedido === 'entrega' && status === 'ABERTA')

  const pedidoEntregaAceitaPagamentoPendente = tipoInicioPedido === 'entrega' && status === 'ABERTA'

  const entregaComCobrancaPeloEntregador =
    pedidoEntregaAceitaPagamentoPendente && fluxoPagamentoEntrega === 'cobrar_entregador'

  const pagamentoModoCobranca =
    fluxoPagamentoEntrega === 'cobrar_entregador' &&
    (pedidoEntregaAceitaPagamentoPendente ||
      (currentStep === 4 && tabelaOrigemVenda === 'venda_gestor' && !dataFinalizacaoCarregada))

  const rotuloCobrancaPendente =
    pedidoComRetirada ? 'Cobrança na Retirada' : 'Entregador vai cobrar'

  const subtotalProdutosCalculado = useMemo(
    () => produtos.reduce((sum, p) => sum + calcularTotalProduto(p), 0),
    [produtos]
  )

  const taxaEntregaSelecionada = useMemo(
    () => taxasEntrega.find(taxa => taxa.getId() === taxaEntregaId) ?? null,
    [taxaEntregaId, taxasEntrega]
  )

  const valorTaxaEntrega = useMemo(
    () =>
      resolverValorTaxaEntregaPedido({
        pedidoComEntrega,
        taxaEntregaValor: detalhesEntregaPedido?.taxaEntrega?.valor,
        resumoFinanceiroDetalhes,
        taxaEntregaCatalogoValor: taxaEntregaSelecionada?.getValor(),
      }),
    [
      pedidoComEntrega,
      detalhesEntregaPedido?.taxaEntrega?.valor,
      resumoFinanceiroDetalhes,
      taxaEntregaSelecionada,
    ]
  )

  const subtotalProdutos = useMemo(
    () => resolverSubtotalItensPedido(subtotalProdutosCalculado, resumoFinanceiroDetalhes),
    [subtotalProdutosCalculado, resumoFinanceiroDetalhes]
  )

  const totalProdutos = useMemo(
    () =>
      resolverTotalPedidoComTaxaEntrega({
        subtotalItens: subtotalProdutos,
        taxaEntrega: valorTaxaEntrega,
        valorFinalApi: valorFinalVenda,
        resumoFinanceiroDetalhes,
      }),
    [subtotalProdutos, valorTaxaEntrega, valorFinalVenda, resumoFinanceiroDetalhes]
  )

  const totalItensPedido = useMemo(
    () =>
      produtos.reduce(
        (total, produto) => total + Math.max(0, Number(produto.quantidade) || 0),
        0
      ),
    [produtos]
  )

  const podeExibirCancelarVendaGestor = useMemo(
    () =>
      tabelaOrigemVenda === 'venda_gestor' &&
      Boolean(vendaId) &&
      Boolean(dataFinalizacaoCarregada) &&
      !vendaGestorJaCancelada &&
      currentStep === 4,
    [tabelaOrigemVenda, vendaId, dataFinalizacaoCarregada, vendaGestorJaCancelada, currentStep]
  )

  const podeExibirCancelarNotaFiscal = useMemo(
    () =>
      (tabelaOrigemVenda === 'venda' || tabelaOrigemVenda === 'venda_gestor') &&
      podeExibirCancelarNotaFiscalDetalhe({
        vendaId,
        currentStep,
        statusFiscal,
        resumoFiscalStatus: resumoFiscal?.status,
      }),
    [tabelaOrigemVenda, vendaId, currentStep, statusFiscal, resumoFiscal?.status]
  )

  const pagamentoEntregaConfirmado = useMemo(
    () => pagamentoEntregaConfirmadoNoPedido(pagamentos, totalProdutos),
    [pagamentos, totalProdutos]
  )

  const podeEditarPagamentoEntregaEmAberto = useMemo(
    () =>
      modoVisualizacao === true &&
      tabelaOrigemVenda === 'venda_gestor' &&
      Boolean(vendaId) &&
      status === 'ABERTA' &&
      !dataFinalizacaoCarregada &&
      !vendaGestorJaCancelada &&
      currentStep === 4,
    [
      modoVisualizacao,
      tabelaOrigemVenda,
      vendaId,
      status,
      dataFinalizacaoCarregada,
      vendaGestorJaCancelada,
      currentStep,
    ]
  )

  const podeAjustarPagamentoEntregaEmAberto = useMemo(
    () => podeEditarPagamentoEntregaEmAberto && !pagamentoEntregaConfirmado,
    [podeEditarPagamentoEntregaEmAberto, pagamentoEntregaConfirmado]
  )

  return {
    statusFiscal,
    podeExibirAbaNotaFiscal,
    podeExibirAbaDadosEntrega,
    statusDisponiveis,
    rotuloStatusResumoModal,
    pedidoGestorComPagamentoNoPasso3,
    pedidoEntregaAceitaPagamentoPendente,
    entregaComCobrancaPeloEntregador,
    pagamentoModoCobranca,
    rotuloCobrancaPendente,
    subtotalProdutos,
    taxaEntregaSelecionada,
    valorTaxaEntrega,
    totalProdutos,
    totalItensPedido,
    podeExibirCancelarVendaGestor,
    podeExibirCancelarNotaFiscal,
    podeEditarPagamentoEntregaEmAberto,
    podeAjustarPagamentoEntregaEmAberto,
    pagamentoEntregaConfirmado,
  }
}
