'use client'

import { useState } from 'react'
import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'
import type { ProdutosTabsModalState } from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import { statusPadraoNovoPedido } from '@/src/domain/services/pedido/RegrasStatusPedido'
import type {
  FluxoPagamentoEntrega,
  OrigemVenda,
  PagamentoSelecionado,
  ProdutoSelecionado,
  StatusVenda,
  TipoAtendimentoDelivery,
} from '../../types'
import { useNovoPedidoCatalogo } from '../useNovoPedidoCatalogo'
import { useNovoPedidoDetalhe } from '../useNovoPedidoDetalhe'

export function useNovoPedidoFormState(tipoInicioPedido: 'balcao' | 'entrega') {
  const [origem, setOrigem] = useState<OrigemVenda>('GESTOR')
  const [status, setStatus] = useState<StatusVenda>(() => statusPadraoNovoPedido(tipoInicioPedido))
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteNome, setClienteNome] = useState<string>('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const { catalogoProdutosPorId, setCatalogoProdutosPorId } = useNovoPedidoCatalogo()
  const [pagamentos, setPagamentos] = useState<PagamentoSelecionado[]>([])
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>('')
  const [valorRecebido, setValorRecebido] = useState<string>('')
  const [fluxoPagamentoEntrega, setFluxoPagamentoEntrega] =
    useState<FluxoPagamentoEntrega>('cobrar_entregador')
  const [tipoAtendimentoDelivery, setTipoAtendimentoDelivery] =
    useState<TipoAtendimentoDelivery>('entrega')
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [buscaProdutoTexto, setBuscaProdutoTexto] = useState<string>('')
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  const [tooltipGrupoId, setTooltipGrupoId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [moradaEntregaSelecionada, setMoradaEntregaSelecionada] = useState<MoradaTelefone | null>(
    null
  )
  const [telefoneBuscaEntrega, setTelefoneBuscaEntrega] = useState('')
  const [telefoneBuscadoEntrega, setTelefoneBuscadoEntrega] = useState<string | null>(null)
  const [tempoPrevistoMinutos, setTempoPrevistoMinutos] = useState<number>(45)
  const [taxaEntregaId, setTaxaEntregaId] = useState<string>('')
  const [clienteEntregaVinculado, setClienteEntregaVinculado] = useState<{
    id: string
    nome: string
  } | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')
  const [isSavingPagamentoEntrega, setIsSavingPagamentoEntrega] = useState(false)
  const [dataVenda, setDataVenda] = useState<string>('')
  const [valorFinalVenda, setValorFinalVenda] = useState<number | null>(null)
  const [dataFinalizacaoCarregada, setDataFinalizacaoCarregada] = useState<string | null>(null)
  const [vendaGestorJaCancelada, setVendaGestorJaCancelada] = useState(false)
  const [modalCancelarVendaOpen, setModalCancelarVendaOpen] = useState(false)
  const [tipoCancelamentoSelecionado, setTipoCancelamentoSelecionado] = useState<'venda' | 'nota'>(
    'venda'
  )
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('')
  const [produtoTabsModalState, setProdutoTabsModalState] = useState<ProdutosTabsModalState>({
    open: false,
    tab: 'produto',
    mode: 'edit',
    produto: undefined,
    initialStepProduto: 0,
  })
  const detalhe = useNovoPedidoDetalhe()
  const [vendaIdCriada, setVendaIdCriada] = useState<string | null>(null)

  return {
    origem,
    setOrigem,
    status,
    setStatus,
    clienteId,
    setClienteId,
    clienteNome,
    setClienteNome,
    produtos,
    setProdutos,
    catalogoProdutosPorId,
    setCatalogoProdutosPorId,
    pagamentos,
    setPagamentos,
    meioPagamentoId,
    setMeioPagamentoId,
    valorRecebido,
    setValorRecebido,
    fluxoPagamentoEntrega,
    setFluxoPagamentoEntrega,
    tipoAtendimentoDelivery,
    setTipoAtendimentoDelivery,
    grupoSelecionadoId,
    setGrupoSelecionadoId,
    buscaProdutoTexto,
    setBuscaProdutoTexto,
    seletorClienteOpen,
    setSeletorClienteOpen,
    tooltipGrupoId,
    setTooltipGrupoId,
    tooltipPosition,
    setTooltipPosition,
    currentStep,
    setCurrentStep,
    moradaEntregaSelecionada,
    setMoradaEntregaSelecionada,
    telefoneBuscaEntrega,
    setTelefoneBuscaEntrega,
    telefoneBuscadoEntrega,
    setTelefoneBuscadoEntrega,
    tempoPrevistoMinutos,
    setTempoPrevistoMinutos,
    taxaEntregaId,
    setTaxaEntregaId,
    clienteEntregaVinculado,
    setClienteEntregaVinculado,
    nomeUsuario,
    setNomeUsuario,
    isSavingPagamentoEntrega,
    setIsSavingPagamentoEntrega,
    dataVenda,
    setDataVenda,
    valorFinalVenda,
    setValorFinalVenda,
    dataFinalizacaoCarregada,
    setDataFinalizacaoCarregada,
    vendaGestorJaCancelada,
    setVendaGestorJaCancelada,
    modalCancelarVendaOpen,
    setModalCancelarVendaOpen,
    tipoCancelamentoSelecionado,
    setTipoCancelamentoSelecionado,
    justificativaCancelamento,
    setJustificativaCancelamento,
    produtoTabsModalState,
    setProdutoTabsModalState,
    vendaIdCriada,
    setVendaIdCriada,
    ...detalhe,
  }
}

export type NovoPedidoFormState = ReturnType<typeof useNovoPedidoFormState>
