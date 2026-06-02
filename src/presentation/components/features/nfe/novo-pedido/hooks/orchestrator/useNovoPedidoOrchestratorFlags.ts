'use client'

import { useMemo } from 'react'
import { calcularTotalProduto } from '@/src/domain/services/pedido/CalculadoraPedido'
import {
  podeExibirAbaDadosEntregaDetalhe,
  podeExibirAbaNotaFiscalDetalhe,
  podeExibirCancelarNotaFiscalDetalhe,
  resolverStatusFiscalExibicao,
} from '@/src/domain/services/pedido/RegrasFluxoPedidoGestor'
import { Taxa } from '@/src/domain/entities/Taxa'
import type {
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  OrigemVenda,
  ProdutoSelecionado,
  ResumoFiscalVenda,
  StatusVenda,
} from '../../types'

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
  taxaEntregaId: string
  taxasEntrega: Taxa[]
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
  taxaEntregaId,
  taxasEntrega,
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

  const subtotalProdutos = useMemo(() => {
    if (valorFinalVenda !== null) {
      return valorFinalVenda
    }
    return produtos.reduce((sum, p) => sum + calcularTotalProduto(p), 0)
  }, [produtos, valorFinalVenda])

  const taxaEntregaSelecionada = useMemo(
    () => taxasEntrega.find(taxa => taxa.getId() === taxaEntregaId) ?? null,
    [taxaEntregaId, taxasEntrega]
  )

  const valorTaxaEntrega = useMemo(() => {
    if (!pedidoComEntrega) return 0
    if (!taxaEntregaSelecionada || valorFinalVenda !== null) return 0
    return taxaEntregaSelecionada.getValor()
  }, [pedidoComEntrega, taxaEntregaSelecionada, valorFinalVenda])

  const totalProdutos = useMemo(
    () => subtotalProdutos + valorTaxaEntrega,
    [subtotalProdutos, valorTaxaEntrega]
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

  const podeEditarPagamentoEntregaEmAberto = useMemo(
    () =>
      modoVisualizacao === true &&
      tabelaOrigemVenda === 'venda_gestor' &&
      Boolean(vendaId) &&
      !dataFinalizacaoCarregada &&
      !vendaGestorJaCancelada &&
      currentStep === 4,
    [
      modoVisualizacao,
      tabelaOrigemVenda,
      vendaId,
      dataFinalizacaoCarregada,
      vendaGestorJaCancelada,
      currentStep,
    ]
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
  }
}
