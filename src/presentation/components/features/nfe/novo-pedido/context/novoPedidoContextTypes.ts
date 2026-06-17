'use client'

import type { Dispatch, RefObject, SetStateAction, MouseEvent, WheelEvent } from 'react'
import type { IconType } from 'react-icons'
import type { UseQueryResult } from '@tanstack/react-query'

import type { Produto } from '@/src/domain/entities/Produto'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import type { Taxa } from '@/src/domain/entities/Taxa'
import type { Cliente } from '@/src/domain/entities/Cliente'
import type { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import type { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import type {
  useCancelarVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarNotaFiscalVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import type { ProdutosTabsModalState } from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import type { ClientesTabsModalState } from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import type { ModalLancamentoProdutoPainelConfirmPayload, ModalLancamentoProdutoPainelModo } from '../../ModalLancamentoProdutoPainel'
import type {
  AbaDetalhesPedido,
  ComplementoSelecionado,
  DetalhesEntregaPedido,
  DetalhesPedidoMeta,
  FluxoPagamentoEntrega,
  NovoPedidoClienteEntregaVinculado,
  NovoPedidoMoradaEntrega,
  OrigemVenda,
  PagamentoSelecionado,
  ProdutoSelecionado,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
  StatusVenda,
  TipoAtendimentoDelivery,
  UsuarioPdvEntregadorOption,
} from '../types'
import type { UnidadeMedidaProduto } from '@/src/shared/types/unidadeMedidaProduto'

type EmpresaMe = ReturnType<typeof useEmpresaMe>['empresa']
type StatusPagamentoExibicao = 'pendente' | 'parcial' | 'pago'
type ScrollRef = RefObject<HTMLDivElement | null>
type MouseHandler = (event: MouseEvent<HTMLDivElement>) => void

interface StatusOption {
  value: string
  label: string
}

/** Estado central do pedido em edição (produtos, pagamentos, cliente, status). */
export interface NovoPedidoFormSlice {
  origem: OrigemVenda
  setOrigem: Dispatch<SetStateAction<OrigemVenda>>
  status: StatusVenda
  setStatus: Dispatch<SetStateAction<StatusVenda>>
  statusDisponiveis: StatusOption[]
  clienteNome: string
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  setPagamentos: Dispatch<SetStateAction<PagamentoSelecionado[]>>
  meioPagamentoId: string
  setMeioPagamentoId: Dispatch<SetStateAction<string>>
  valorRecebido: string
  setValorRecebido: Dispatch<SetStateAction<string>>
  meiosPagamento: MeioPagamento[]
  mostrarLoadingFormasPagamento: boolean
  subtotalProdutos: number
  totalProdutos: number
  totalItensPedido: number
  valorFinalVenda: number | null
  setValorFinalVenda: Dispatch<SetStateAction<number | null>>
  dataVenda: string
  observacaoPedido: string
  setObservacaoPedido: Dispatch<SetStateAction<string>>
}

/** Catálogo: grupos, produtos do grupo e busca. */
export interface NovoPedidoCatalogoSlice {
  grupos: GrupoProduto[]
  grupoSelecionadoId: string | null
  setGrupoSelecionadoId: Dispatch<SetStateAction<string | null>>
  buscaProdutoTexto: string
  setBuscaProdutoTexto: Dispatch<SetStateAction<string>>
  buscaProdutoFiltrada: string
  produtosList: Produto[]
  produtosError: Error | null
  catalogoProdutosPorId: Record<string, Produto>
  isLoadingGruposVenda: boolean
  isLoadingProdutosVenda: boolean
  isLoadingProdutos: boolean
  isLoadingBuscaProdutos: boolean
}

/** Edição/lançamento de linha de produto (painel e modal de edição). */
export interface NovoPedidoEdicaoLinhaSlice {
  adicionarProduto: (produtoId: string) => void
  removerProduto: (index: number) => void
  atualizarProduto: (index: number, campo: keyof ProdutoSelecionado, valor: unknown) => void
  atualizarComplemento: (
    produtoIndex: number,
    complementoIndex: number,
    campo: keyof ComplementoSelecionado,
    valor: unknown
  ) => void
  removerComplemento: (produtoIndex: number, complementoIndex: number) => void
  abrirModalEdicaoProduto: (index: number) => void
  abrirModalObservacaoProduto: (index: number) => void
  abrirModalComplementosProdutoExistente: (index: number) => void
  confirmarEdicaoProduto: () => void
  confirmarLancamentoProdutoPainel: (payload: ModalLancamentoProdutoPainelConfirmPayload) => void
  produtoTemComplementos: (produto: Produto) => boolean
  carregandoComplementosPainel: boolean
  produtoParaLancamentoPainel: Produto | null
  setProdutoParaLancamentoPainel: Dispatch<SetStateAction<Produto | null>>
  indiceLinhaPainelProduto: number | null
  setIndiceLinhaPainelProduto: Dispatch<SetStateAction<number | null>>
  painelLinhaModo: ModalLancamentoProdutoPainelModo
  setPainelLinhaModo: Dispatch<SetStateAction<ModalLancamentoProdutoPainelModo>>
  produtoIndexEdicao: number | null
  setProdutoIndexEdicao: Dispatch<SetStateAction<number | null>>
  quantidadeEdicao: number
  setQuantidadeEdicao: Dispatch<SetStateAction<number>>
  unidadeMedidaEdicao: UnidadeMedidaProduto
  setUnidadeMedidaEdicao: Dispatch<SetStateAction<UnidadeMedidaProduto>>
  ehAcrescimo: boolean
  setEhAcrescimo: Dispatch<SetStateAction<boolean>>
  ehPorcentagem: boolean
  setEhPorcentagem: Dispatch<SetStateAction<boolean>>
  valorDescontoAcrescimo: string
  setValorDescontoAcrescimo: Dispatch<SetStateAction<string>>
  valorUnitarioEdicaoPainel: string
  setValorUnitarioEdicaoPainel: Dispatch<SetStateAction<string>>
  valoresEmEdicao: Record<string | number, string>
  setValoresEmEdicao: Dispatch<SetStateAction<Record<string | number, string>>>
}

/** Derivados e ações de pagamento. */
export interface NovoPedidoPagamentoSlice {
  adicionarPagamentoPorCard: (meioPagamentoIdSelecionado: string) => void
  removerPagamento: (index: number, pagamentoId?: string) => void
  obterIconeMeioPagamento: (nome: string) => IconType
  pagamentoModoCobranca: boolean
  totalPagamentos: number
  totalPagamentosLancados: number
  valorAPagar: number
  valorAPagarLancamento: number
  trocoLancamento: number
  statusPagamentoExibicao: StatusPagamentoExibicao
  rotuloStatusPagamentoExibicao: string
  rotuloCobrancaPendente: string
  rotuloStatusResumoModal: string
  pagamentosVisiveisNaAbaDetalhes: PagamentoSelecionado[]
  nomesMeiosPagamentoPedido: Record<string, string>
}

/** Entrega/delivery: cliente vinculado, morada, taxa, entregadores. */
export interface NovoPedidoEntregaSlice {
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
  setFluxoPagamentoEntrega: Dispatch<SetStateAction<FluxoPagamentoEntrega>>
  handleTipoAtendimentoDeliveryChange: (tipo: TipoAtendimentoDelivery) => void
  pedidoDeliveryGestor: boolean
  pedidoComEntrega: boolean
  pedidoComRetirada: boolean
  pedidoEntregaAceitaPagamentoPendente: boolean
  pedidoGestorComPagamentoNoPasso3: boolean
  clienteEntregaVinculado: NovoPedidoClienteEntregaVinculado
  setClienteEntregaVinculado: Dispatch<SetStateAction<NovoPedidoClienteEntregaVinculado>>
  moradaEntregaSelecionada: NovoPedidoMoradaEntrega
  setMoradaEntregaSelecionada: Dispatch<SetStateAction<NovoPedidoMoradaEntrega>>
  telefoneBuscaEntrega: string
  setTelefoneBuscaEntrega: Dispatch<SetStateAction<string>>
  telefoneBuscadoEntrega: string | null
  setTelefoneBuscadoEntrega: Dispatch<SetStateAction<string | null>>
  tempoPrevistoMinutos: number
  setTempoPrevistoMinutos: Dispatch<SetStateAction<number>>
  taxaEntregaId: string
  setTaxaEntregaId: Dispatch<SetStateAction<string>>
  taxaEntregaSelecionada: Taxa | null
  taxasEntrega: Taxa[]
  taxasEntregaQuery: ReturnType<typeof useTaxasInfinite>
  valorTaxaEntrega: number
  entregadores: UsuarioPdvEntregadorOption[]
  entregadoresQuery: UseQueryResult<UsuarioPdvEntregadorOption[], Error>
  clienteTabsModalEntregaState: ClientesTabsModalState
  handleAbrirEdicaoClienteEntrega: () => void
  handleFecharClienteTabsModalEntrega: () => void
  handleTabChangeClienteTabsModalEntrega: (tab: 'cliente' | 'visualizar') => void
  handleReloadClienteEntregaAposEdicao: () => void
  handleSelectCliente: (cliente: Cliente) => void
  handleRemoveCliente: () => void
}

/** Estado de UI: passo, modais, drag-scroll, tooltip, navegação. */
export interface NovoPedidoUISlice {
  currentStep: 1 | 2 | 3 | 4
  empresa: EmpresaMe
  seletorClienteOpen: boolean
  setSeletorClienteOpen: Dispatch<SetStateAction<boolean>>
  tooltipGrupoId: string | null
  setTooltipGrupoId: Dispatch<SetStateAction<string | null>>
  tooltipPosition: { x: number; y: number } | null
  setTooltipPosition: Dispatch<SetStateAction<{ x: number; y: number } | null>>
  modalEdicaoProdutoOpen: boolean
  setModalEdicaoProdutoOpen: Dispatch<SetStateAction<boolean>>
  modalLancamentoProdutoPainelOpen: boolean
  setModalLancamentoProdutoPainelOpen: Dispatch<SetStateAction<boolean>>
  modalConfirmacaoSaidaOpen: boolean
  setModalConfirmacaoSaidaOpen: Dispatch<SetStateAction<boolean>>
  modalCancelarVendaOpen: boolean
  setModalCancelarVendaOpen: Dispatch<SetStateAction<boolean>>
  handleClose: () => void
  handleConfirmarSaida: () => void
  handleCancelarSaida: () => void
  gruposScrollRef: ScrollRef
  meiosPagamentoScrollRef: ScrollRef
  isDragging: boolean
  isDraggingMeiosPagamento: boolean
  hasMovedRef: RefObject<boolean>
  hasMovedMeiosPagamentoRef: RefObject<boolean>
  handleMouseDown: MouseHandler
  handleMouseDownMeiosPagamento: MouseHandler
  handleGruposWheel: (event: WheelEvent<HTMLDivElement>) => void
  handleMouseMove: () => void
  handleMouseUp: () => void
  handleMouseLeave: () => void
  longPressTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>
  longPressIndexRef: RefObject<number | null>
  longPressComplementoTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>
  longPressComplementoIndexRef: RefObject<number | null>
}

/** Modo visualização/detalhe (passo 4) e cancelamento. */
export interface NovoPedidoDetalheSlice {
  modoVisualizacao?: boolean
  tabelaOrigemVenda: 'venda' | 'venda_gestor'
  tipoInicioPedido: 'balcao' | 'entrega'
  statusFiscalUnificado: string | null
  isLoadingVenda: boolean
  abaDetalhesPedido: AbaDetalhesPedido
  detalhesPedidoMeta: DetalhesPedidoMeta | null
  detalhesEntregaPedido: DetalhesEntregaPedido | null
  resumoFinanceiroDetalhes: ResumoFinanceiroDetalhes | null
  resumoFiscal: ResumoFiscalVenda | null
  statusFiscalDetalhe: string | null
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
  podeEditarPagamentoEntregaEmAberto: boolean
  podeAjustarPagamentoEntregaEmAberto: boolean
  pagamentoEntregaConfirmado: boolean
  produtoTabsModalState: ProdutosTabsModalState
  handleAbrirEdicaoProdutoDetalhes: (produtoId: string | null | undefined) => void
  handleFecharProdutoTabsModal: () => void
  handleTabChangeProdutoModal: (
    tab: 'produto' | 'complementos' | 'impressoras' | 'grupo'
  ) => void
  handleConfirmarCancelamentoVenda: () => void
  cancelarVendaGestor: ReturnType<typeof useCancelarVendaGestor>
  cancelarNotaFiscalVendaPdv: ReturnType<typeof useCancelarNotaFiscalVendaPdv>
  cancelarNotaFiscalVendaGestor: ReturnType<typeof useCancelarNotaFiscalVendaGestor>
  tipoCancelamentoSelecionado: 'venda' | 'nota'
  setTipoCancelamentoSelecionado: Dispatch<SetStateAction<'venda' | 'nota'>>
  justificativaCancelamento: string
  setJustificativaCancelamento: Dispatch<SetStateAction<string>>
}

/** Formatadores e cálculos expostos para as views. */
export interface NovoPedidoFormattersSlice {
  calcularTotalProduto: (produto: ProdutoSelecionado) => number
  obterTotalComplemento: (complemento: ComplementoSelecionado) => number
  formatarNumeroComMilhar: (valor: number) => string
  formatarValorComplemento: (
    valor: number,
    tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
  ) => string
  formatarDescontoAcrescimo: (produto: ProdutoSelecionado) => string
  formatarValorRecebido: (valor: string) => string
  formatarDataDetalhePedido: (valor: string | null | undefined) => string
  formatarDataHoraResumoFiscal: (valor: string | null | undefined) => string
  formatarUsuarioPorId: (usuarioId: string | null | undefined) => string
  rotuloModeloNfe: (modelo: number | null | undefined) => string
}

/** Valor completo do contexto de Novo Pedido (união das fatias). */
export type NovoPedidoContextValue = NovoPedidoFormSlice &
  NovoPedidoCatalogoSlice &
  NovoPedidoEdicaoLinhaSlice &
  NovoPedidoPagamentoSlice &
  NovoPedidoEntregaSlice &
  NovoPedidoUISlice &
  NovoPedidoDetalheSlice &
  NovoPedidoFormattersSlice
