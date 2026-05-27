'use client'

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import {
  Dialog,
  DialogContent,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { useTaxasInfinite } from '@/src/presentation/hooks/useTaxas'
import { Produto } from '@/src/domain/entities/Produto'
import { Cliente } from '@/src/domain/entities/Cliente'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useCreateVendaGestor,
  useCancelarVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarNotaFiscalVendaGestor,
  useFinalzarVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useImpressaoDelivery } from '@/src/presentation/hooks/useImpressaoDelivery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  MdArrowForward,
  MdArrowBack,
  MdAttachMoney,
  MdCreditCard,
  MdQrCode,
  MdCancel,
} from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'
import {
  type ModalLancamentoProdutoPainelConfirmPayload,
} from '../ModalLancamentoProdutoPainel'
import type { ProdutosTabsModalState } from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import type { ClientesTabsModalState } from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import {
  PainelPedidoBackdrop,
  JiffyPainelSlide,
  footerBarGrayBarSx,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import type {
  ComplementoSelecionado,
  FluxoPagamentoEntrega,
  NovoPedidoModalProps,
  OrigemVenda,
  PagamentoSelecionado,
  ProdutoSelecionado,
  ResumoFiscalVenda,
  StatusVenda,
  TipoAtendimentoDelivery,
  UsuarioPdvEntregadorOption,
} from './types'
import {
  mapearPagamentoDetalheVenda,
} from './novoPedidoPagamentoHelpers'
import {
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from './novoPedidoFiscalHelpers'
import {
  getUltimoEntregadorSelecionado,
  statusPadraoNovoPedido,
} from './novoPedidoTextHelpers'
import {
  calcularTotalProduto,
  formatarDescontoAcrescimo,
  formatarNumeroComMilhar,
  formatarValorComplemento,
  obterTotalComplemento,
} from './novoPedidoCalculations'
import { NovoPedidoHeader } from './components/NovoPedidoHeader'
import { NovoPedidoStepper } from './components/NovoPedidoStepper'
import { NovoPedidoFooterShell } from './components/NovoPedidoFooter'
import { NovoPedidoAuxiliaryModals } from './components/NovoPedidoAuxiliaryModals'
import { PedidoDetalhesView } from './components/PedidoDetalhesView'
import { PedidoWizardStepsView } from './components/PedidoWizardStepsView'
import { useNovoPedidoCatalogo } from './hooks/useNovoPedidoCatalogo'
import { fetchProdutosDoGrupo } from './novoPedidoProdutosApi'
import { useNovoPedidoDelivery } from './hooks/useNovoPedidoDelivery'
import { useNovoPedidoDetalhe } from './hooks/useNovoPedidoDetalhe'
import { useNovoPedidoPagamentos } from './hooks/useNovoPedidoPagamentos'
import {
  useNovoPedidoResetOnExit,
  useNovoPedidoSubmitGuard,
} from './hooks/useNovoPedidoSubmit'
import { NovoPedidoProvider } from './context/NovoPedidoContext'
import { useHorizontalDragScroll } from './hooks/useHorizontalDragScroll'

export function NovoPedidoModal({
  open,
  onClose,
  onSuccess,
  onAfterClose,
  vendaId,
  modoVisualizacao,
  tabelaOrigemVenda = 'venda_gestor',
  statusFiscalUnificado = null,
  tipoInicioPedido = 'balcao',
}: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const { empresa, preferenciasImpressaoDelivery } = useEmpresaMe()
  const { processarAposTransicaoVendaGestorId } = useImpressaoDelivery()
  const empresaId = useTenantEmpresaId()
  const createVendaGestor = useCreateVendaGestor()
  const { iniciarSubmit, finalizarSubmit } = useNovoPedidoSubmitGuard(createVendaGestor.isPending)
  const cancelarVendaGestor = useCancelarVendaGestor()
  const cancelarNotaFiscalVendaPdv = useCancelarNotaFiscalVendaPdv()
  const cancelarNotaFiscalVendaGestor = useCancelarNotaFiscalVendaGestor()
  const finalizarVendaGestor = useFinalzarVendaGestor()

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
  // Lista de grupos recolhível no passo 2: quando oculta, a área de produtos selecionados aumenta
  const [gruposExpandido, setGruposExpandido] = useState(true)
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  const [tooltipGrupoId, setTooltipGrupoId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  /** Morada de entrega selecionada via telefone (fluxo entrega) */
  const [moradaEntregaSelecionada, setMoradaEntregaSelecionada] = useState<MoradaTelefone | null>(null)
  /**
   * Telefone + última busca ficam no pai: o passo Informações desmonta ao avançar e o filho perdia estado local.
   */
  const [telefoneBuscaEntrega, setTelefoneBuscaEntrega] = useState('')
  const [telefoneBuscadoEntrega, setTelefoneBuscadoEntrega] = useState<string | null>(null)
  const [tempoPrevistoMinutos, setTempoPrevistoMinutos] = useState<number>(45)
  const [entregadorId, setEntregadorId] = useState<string>('')
  const [taxaEntregaId, setTaxaEntregaId] = useState<string>('')
  /**
   * Cliente vinculado encontrado ou criado no fluxo entrega.
   * Elevado ao pai para persistir entre etapas.
   */
  const [clienteEntregaVinculado, setClienteEntregaVinculado] = useState<{
    id: string
    nome: string
  } | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)

  // Estados para carregamento de venda existente
  const [isLoadingVenda, setIsLoadingVenda] = useState(false)
  const [isSavingPagamentoEntrega, setIsSavingPagamentoEntrega] = useState(false)
  const [dataVenda, setDataVenda] = useState<string>('') // Data da venda para exibição
  const [valorFinalVenda, setValorFinalVenda] = useState<number | null>(null) // Valor final da venda do backend (quando carregando pedido existente)
  // Metadados da venda gestor carregada (cancelamento — ver docs/CANCELAR_VENDA_GESTOR.md)
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
  /** Mesmo painel de edição da página Cadastros → Clientes (fluxo entrega). */
  const [clienteTabsModalEntregaState, setClienteTabsModalEntregaState] =
    useState<ClientesTabsModalState>({
      open: false,
      tab: 'cliente',
      mode: 'edit',
    })
  const {
    abaDetalhesPedido,
    setAbaDetalhesPedido,
    detalhesPedidoMeta,
    setDetalhesPedidoMeta,
    nomesUsuariosPedido,
    setNomesUsuariosPedido,
    nomesMeiosPagamentoPedido,
    setNomesMeiosPagamentoPedido,
    resumoFinanceiroDetalhes,
    setResumoFinanceiroDetalhes,
    resumoFiscal,
    setResumoFiscal,
    origemTextoApiDetalhe,
    setOrigemTextoApiDetalhe,
    statusVendaTextoApiDetalhe,
    setStatusVendaTextoApiDetalhe,
  } = useNovoPedidoDetalhe()
  const [vendaIdCriada, setVendaIdCriada] = useState<string | null>(null)

  const { pedidoDeliveryGestor, pedidoComEntrega, pedidoComRetirada } = useNovoPedidoDelivery({
    tipoInicioPedido,
    tipoAtendimentoDelivery,
  })
  const pedidoBalcao = tipoInicioPedido !== 'entrega'
  /** Balcão e delivery: passo de produtos é sempre o step 1 na criação. */
  const estaNoPassoProdutos = open && !modoVisualizacao && currentStep === 1

  /**
   * Aba Nota Fiscal quando o status fiscal indica nota (emitida, rejeitada, aguardando SEFAZ, etc.) e origem coerente:
   * - PDV (`tabelaOrigem`): lista unificada traz `statusFiscal`; detalhe não traz `origem`.
   * - Gestor: detalhe traz `origem: GESTOR`; `statusVenda` pode ser null — usar `resumoFiscal.status` ou `statusFiscal` unificado.
   */
  const podeExibirAbaNotaFiscal = useMemo(() => {
    if (!modoVisualizacao) return false

    const temFiscalParaExibir =
      statusFiscalPermiteAbaNotaFiscal(statusFiscalUnificado) ||
      statusFiscalPermiteAbaNotaFiscal(resumoFiscal?.status) ||
      statusFiscalPermiteAbaNotaFiscal(statusVendaTextoApiDetalhe)

    if (!temFiscalParaExibir) return false

    if (tabelaOrigemVenda === 'venda') {
      return true
    }

    if (origemTextoApiDetalhe === 'GESTOR') return true
    if (origemTextoApiDetalhe === 'PDV') return false
    if (origemTextoApiDetalhe != null && origemTextoApiDetalhe !== 'GESTOR') return false
    return (
      statusFiscalPermiteAbaNotaFiscal(statusFiscalUnificado) ||
      statusFiscalPermiteAbaNotaFiscal(resumoFiscal?.status)
    )
  }, [
    modoVisualizacao,
    tabelaOrigemVenda,
    statusFiscalUnificado,
    resumoFiscal?.status,
    statusVendaTextoApiDetalhe,
    origemTextoApiDetalhe,
  ])

  useEffect(() => {
    if (currentStep === 4 && abaDetalhesPedido === 'notaFiscal' && !podeExibirAbaNotaFiscal) {
      setAbaDetalhesPedido('infoPedido')
    }
  }, [currentStep, abaDetalhesPedido, podeExibirAbaNotaFiscal])

  // Estado para controlar valores em edição (índice do produto ou chave do complemento -> valor string)
  const [valoresEmEdicao, setValoresEmEdicao] = useState<Record<string | number, string>>({})

  /** Fluxo no grid / lista: painel único (slide) com preço e/ou complementos antes de lançar ou editar linha */
  const [modalLancamentoProdutoPainelOpen, setModalLancamentoProdutoPainelOpen] = useState(false)
  const [produtoParaLancamentoPainel, setProdutoParaLancamentoPainel] = useState<Produto | null>(
    null
  )

  /** Índice da linha ao editar preço/complementos no painel; `null` = novo item pelo grid */
  const [indiceLinhaPainelProduto, setIndiceLinhaPainelProduto] = useState<number | null>(null)

  // Estados para modal de edição de produto
  const [modalEdicaoProdutoOpen, setModalEdicaoProdutoOpen] = useState(false)
  const [produtoIndexEdicao, setProdutoIndexEdicao] = useState<number | null>(null)
  const [quantidadeEdicao, setQuantidadeEdicao] = useState<number>(1)
  const [ehAcrescimo, setEhAcrescimo] = useState<boolean>(false) // false = desconto, true = acréscimo
  const [ehPorcentagem, setEhPorcentagem] = useState<boolean>(false) // false = valor fixo, true = porcentagem
  const [valorDescontoAcrescimo, setValorDescontoAcrescimo] = useState<string>('0')
  /** Valor unitário no painel de edição de linha (formato brasileiro), quando `permiteAlterarPreco` */
  const [valorUnitarioEdicaoPainel, setValorUnitarioEdicaoPainel] = useState<string>('')

  // Estado para modal de confirmação de saída
  const [modalConfirmacaoSaidaOpen, setModalConfirmacaoSaidaOpen] = useState(false)
  // Estado interno para controlar o Dialog (para impedir fechamento quando houver dados)
  const [internalDialogOpen, setInternalDialogOpen] = useState(open)

  const {
    scrollRef: gruposScrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useHorizontalDragScroll<HTMLDivElement>()
  const {
    scrollRef: meiosPagamentoScrollRef,
    isDragging: isDraggingMeiosPagamento,
    hasMovedRef: hasMovedMeiosPagamentoRef,
    handleMouseDown: handleMouseDownMeiosPagamento,
  } = useHorizontalDragScroll<HTMLDivElement>()
  const nomeUsuarioCarregadoNoCicloRef = useRef(false)

  // Refs para long press na linha do produto
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndexRef = useRef<number | null>(null)

  // Refs para long press na linha do complemento
  const longPressComplementoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressComplementoIndexRef = useRef<number | null>(null)
  /** Ignora clique fantasma no backdrop logo após abrir (ex.: mouse com bounce duplo) */
  const ignorarBackdropAteRef = useRef(0)

  // Buscar grupos de produtos
  const { data: gruposData, isLoading: isLoadingGrupos } = useGruposProdutos({
    ativo: true,
    // Busca todos os grupos ativos em páginas de até 100 (ver useGruposProdutos).
    limit: 1000,
    enabled: estaNoPassoProdutos,
    refetchOnWindowFocus: false,
  })

  const buscaProdutoFiltrada = buscaProdutoTexto.trim().toLowerCase()
  const token = auth?.getAccessToken()
  const { data: produtosBuscadosData, isLoading: isLoadingBuscaProdutos } = useQuery({
    queryKey: ['produtos-busca', buscaProdutoFiltrada],
    queryFn: async () => {
      if (!token) throw new Error('Token não encontrado')
      const response = await fetch(`/api/produtos?name=${encodeURIComponent(buscaProdutoFiltrada)}&ativo=true&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Erro ao buscar produtos')
      const data = await response.json()
      const produtos = (data.items || []).map((item: any) => Produto.fromJSON(item))
      return { produtos }
    },
    enabled: !!token && estaNoPassoProdutos && buscaProdutoFiltrada.length >= 2,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  // Buscar produtos do grupo selecionado usando endpoint específico
  const {
    data: produtosPorGrupoData,
    isLoading: isLoadingProdutos,
    error: produtosError,
  } = useQuery({
    queryKey: ['produtos-por-grupo', grupoSelecionadoId, empresaId],
    queryFn: async () => {
      if (!grupoSelecionadoId || !auth?.getAccessToken()) {
        return { produtos: [], count: 0 }
      }

      return fetchProdutosDoGrupo(grupoSelecionadoId, auth.getAccessToken())
    },
    enabled: estaNoPassoProdutos && !!grupoSelecionadoId && !!auth?.getAccessToken(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Buscar meios de pagamento
  const {
    data: meiosPagamentoData,
    isPending: isPendingMeiosPagamento,
    isFetching: isFetchingMeiosPagamento,
  } = useMeiosPagamentoInfinite({
    limit: 100,
    ativo: true,
    // Step 3 usa meios de pagamento; em visualizacao/edicao pode ser usado para resolver nomes.
    enabled: open && (currentStep >= 3 || modoVisualizacao || !!vendaId),
    refetchOnWindowFocus: false,
  })

  // Handler para seleção de cliente
  const handleSelectCliente = (cliente: Cliente) => {
    if (tipoInicioPedido === 'entrega') {
      const telefone = cliente.getTelefone()?.trim() ?? ''
      const telefoneDigitos = telefone.replace(/\D/g, '')

      setClienteEntregaVinculado({ id: cliente.getId(), nome: cliente.getNome() })
      if (telefone) {
        setTelefoneBuscaEntrega(telefone)
        setTelefoneBuscadoEntrega(telefoneDigitos.length >= 8 ? telefoneDigitos : null)
      }
      setMoradaEntregaSelecionada(null)
      return
    }

    setClienteId(cliente.getId())
    setClienteNome(cliente.getNome())
  }

  const handleRemoveCliente = () => {
    setClienteId('')
    setClienteNome('')
  }

  const handleAbrirEdicaoClienteEntrega = useCallback(() => {
    const id = clienteEntregaVinculado?.id?.trim()
    if (!id) return
    setClienteTabsModalEntregaState({
      open: true,
      tab: 'cliente',
      mode: 'edit',
      clienteId: id,
    })
  }, [clienteEntregaVinculado?.id])

  const handleFecharClienteTabsModalEntrega = useCallback(() => {
    setClienteTabsModalEntregaState(prev => ({ ...prev, open: false }))
  }, [])

  const handleTabChangeClienteTabsModalEntrega = useCallback(
    (tab: 'cliente' | 'visualizar') => {
      setClienteTabsModalEntregaState(prev => ({ ...prev, tab }))
    },
    []
  )

  const handleReloadClienteEntregaAposEdicao = useCallback(async () => {
    const id = clienteEntregaVinculado?.id?.trim()
    if (!id) return
    const token = auth?.getAccessToken()
    if (!token) return
    try {
      const res = await fetch(`/api/clientes/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const c = Cliente.fromJSON(data)
      setClienteEntregaVinculado({ id: c.getId(), nome: c.getNome() })
    } catch {
      /* silencioso */
    }
  }, [auth, clienteEntregaVinculado?.id])

  // Ordenar grupos por ordem (campo ordem da API)
  const gruposOrdenados = useMemo(() => {
    if (!gruposData) return []
    return [...gruposData].sort((a, b) => {
      const ordemA = a.getOrdem()
      const ordemB = b.getOrdem()

      // Se ambos têm ordem, ordenar numericamente
      if (ordemA !== undefined && ordemB !== undefined) {
        return ordemA - ordemB
      }

      // Se apenas A tem ordem, A vem primeiro
      if (ordemA !== undefined && ordemB === undefined) {
        return -1
      }

      // Se apenas B tem ordem, B vem primeiro
      if (ordemA === undefined && ordemB !== undefined) {
        return 1
      }

      // Se nenhum tem ordem, usar ordem alfabética como fallback
      return a.getNome().localeCompare(b.getNome())
    })
  }, [gruposData])

  const grupos = useMemo(() => gruposOrdenados.filter(grupo => grupo.isAtivo()), [gruposOrdenados])

  const isLoadingGruposVenda = isLoadingGrupos

  useEffect(() => {
    if (!produtosPorGrupoData?.produtos?.length) return
    setCatalogoProdutosPorId(prev => {
      const next = { ...prev }
      for (const produto of produtosPorGrupoData.produtos) {
        next[produto.getId()] = produto
      }
      return next
    })
  }, [produtosPorGrupoData, setCatalogoProdutosPorId])

  // Grade do grupo: só produtos ativos; ordenação por nome
  // Se houver busca com pelo menos 2 caracteres, usamos o resultado da busca (todos os grupos)
  // Caso contrário, usamos os produtos do grupo selecionado.
  const produtosList = useMemo(() => {
    if (buscaProdutoFiltrada.length >= 2) {
      if (!produtosBuscadosData?.produtos) return []
      return [...produtosBuscadosData.produtos]
        .filter(p => p.isAtivo())
        .sort((a, b) => a.getNome().localeCompare(b.getNome()))
    }

    if (!produtosPorGrupoData?.produtos) return []
    return [...produtosPorGrupoData.produtos]
      .filter(p => p.isAtivo())
      .sort((a, b) => a.getNome().localeCompare(b.getNome()))
  }, [buscaProdutoFiltrada, produtosBuscadosData, produtosPorGrupoData])

  /** Resolve `Produto` do cache, da grade/busca ou via GET `/api/produtos/:id`. */
  const carregarProdutoNoCatalogoSeNecessario = useCallback(
    async (produtoId: string): Promise<Produto | null> => {
      const emCache =
        catalogoProdutosPorId[produtoId] ?? produtosList.find(p => p.getId() === produtoId)
      if (emCache) {
        setCatalogoProdutosPorId(prev =>
          prev[produtoId] ? prev : { ...prev, [emCache.getId()]: emCache }
        )
        return emCache
      }

      if (!token) return null

      try {
        const response = await fetch(`/api/produtos/${encodeURIComponent(produtoId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (!response.ok) return null
        const data = await response.json()
        const entity = Produto.fromJSON(data)
        setCatalogoProdutosPorId(prev => ({ ...prev, [entity.getId()]: entity }))
        return entity
      } catch {
        return null
      }
    },
    [catalogoProdutosPorId, produtosList, token]
  )

  const meiosPagamento = useMemo(() => {
    if (!meiosPagamentoData?.pages) return []
    return meiosPagamentoData.pages.flatMap(page => page.meiosPagamento || [])
  }, [meiosPagamentoData])

  const entregadoresQuery = useQuery({
    queryKey: ['usuarios-pdv-entregadores', { tipoUsuarioPdv: 'entregador' }],
    queryFn: async (): Promise<UsuarioPdvEntregadorOption[]> => {
      const token = auth?.getAccessToken()
      if (!token) return []

      const response = await fetch('/api/usuarios-pdv/entregadores?limit=100&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao carregar entregadores')
      }

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      return items
        .filter((item: any) => {
          const tipo = String(item.tipoUsuarioPdv ?? '')
            .trim()
            .toLowerCase()
          return tipo === 'entregador'
        })
        .map((item: any) => ({
          id: String(item.id ?? item.usuarioId ?? ''),
          nome: String(item.nome ?? item.name ?? '').trim(),
          telefone: item.telefone != null ? String(item.telefone) : undefined,
        }))
        .filter((item: UsuarioPdvEntregadorOption) => item.id && item.nome)
    },
    enabled: open && !modoVisualizacao && pedidoComEntrega,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const entregadores = entregadoresQuery.data ?? []
  const taxasEntregaQuery = useTaxasInfinite({ limit: 100 })
  const refetchTaxasEntrega = taxasEntregaQuery.refetch
  const taxasEntrega = useMemo(() => {
    return (taxasEntregaQuery.data?.pages.flatMap(page => page.taxas) ?? []).filter(taxa => {
      return taxa.isAtivo() && taxa.getTipo().trim().toLowerCase() === 'entrega'
    })
  }, [taxasEntregaQuery.data])

  useEffect(() => {
    if (!open || modoVisualizacao || !pedidoComEntrega) return
    void refetchTaxasEntrega()
  }, [open, modoVisualizacao, pedidoComEntrega, refetchTaxasEntrega])

  useEffect(() => {
    if (!open || vendaId || modoVisualizacao || !pedidoComEntrega || entregadorId) return
    if (entregadores.length === 0) return

    const ultimoEntregadorId = getUltimoEntregadorSelecionado()
    if (!ultimoEntregadorId) return

    const entregadorAindaDisponivel = entregadores.some(entregador => entregador.id === ultimoEntregadorId)
    if (entregadorAindaDisponivel) {
      setEntregadorId(ultimoEntregadorId)
    }
  }, [open, vendaId, modoVisualizacao, pedidoComEntrega, entregadorId, entregadores])

  /** Primeira carga ou fetch sem cache ainda — evita área vazia sem feedback */
  const mostrarLoadingFormasPagamento =
    isPendingMeiosPagamento || (isFetchingMeiosPagamento && meiosPagamentoData === undefined)

  // Refs estáveis: evitam que `carregarVendaExistente` mude quando queries atualizam ao focar a aba
  const meiosPagamentoRef = useRef(meiosPagamento)
  meiosPagamentoRef.current = meiosPagamento
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const authRef = useRef(auth)
  authRef.current = auth

  // Status disponíveis para vendas do gestor
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

  /**
   * Balcão finalizado / emitir NFe, ou entrega em triagem (ABERTA): passo 3 exibe meios de pagamento e valida total.
   */
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

  // Novo pedido (sem venda carregada): alinhar status ao tipo de fluxo ao abrir o painel
  useEffect(() => {
    if (!open || vendaId || modoVisualizacao) return
    setStatus(statusPadraoNovoPedido(tipoInicioPedido))
  }, [open, vendaId, modoVisualizacao, tipoInicioPedido])

  // Calcular totais do pedido
  // Se estiver carregando um pedido existente, usar valorFinal do backend
  // Caso contrário, calcular a partir dos produtos
  const subtotalProdutos = useMemo(() => {
    // Se temos valorFinal da venda (pedido existente), usar ele diretamente
    if (valorFinalVenda !== null) {
      return valorFinalVenda
    }
    // Para novo pedido, calcular a partir dos produtos
    return produtos.reduce((sum, p) => {
      // calcularTotalProduto já inclui complementos e aplica desconto/acréscimo sobre o total
      const totalProduto = calcularTotalProduto(p)
      return sum + totalProduto
    }, 0)
  }, [produtos, valorFinalVenda])

  const taxaEntregaSelecionada = useMemo(
    () => taxasEntrega.find(taxa => taxa.getId() === taxaEntregaId) ?? null,
    [taxaEntregaId, taxasEntrega]
  )

  const valorTaxaEntrega = useMemo(() => {
    if (!pedidoComEntrega) return 0
    if (!taxaEntregaSelecionada || valorFinalVenda !== null) return 0
    const valor = taxaEntregaSelecionada.getValor()
    return valor
  }, [pedidoComEntrega, taxaEntregaSelecionada, valorFinalVenda])

  const totalProdutos = useMemo(
    () => subtotalProdutos + valorTaxaEntrega,
    [subtotalProdutos, valorTaxaEntrega]
  )

  const totalItensPedido = useMemo(() => {
    return produtos.reduce((total, produto) => total + Math.max(0, Number(produto.quantidade) || 0), 0)
  }, [produtos])

  const {
    totalPagamentos,
    totalPagamentosLancados,
    valorAPagar,
    valorAPagarLancamento,
    statusPagamentoPedido,
    statusPagamentoExibicao,
    rotuloStatusPagamentoExibicao,
    troco,
    trocoLancamento,
    pagamentosVisiveisNaAbaDetalhes,
  } = useNovoPedidoPagamentos({
    pagamentos,
    totalProdutos,
    pagamentoModoCobranca,
    meiosPagamento,
  })

  // Passo 4: exibir cancelamento só para venda gestor carregada, finalizada e não cancelada
  const podeExibirCancelarVendaGestor = useMemo(
    () =>
      tabelaOrigemVenda === 'venda_gestor' &&
      Boolean(vendaId) &&
      Boolean(dataFinalizacaoCarregada) &&
      !vendaGestorJaCancelada &&
      currentStep === 4,
    [tabelaOrigemVenda, vendaId, dataFinalizacaoCarregada, vendaGestorJaCancelada, currentStep]
  )

  // Passo 4: exibir cancelamento de nota para PDV e Gestor quando status permitir
  const podeExibirCancelarNotaFiscal = useMemo(
    () =>
      (tabelaOrigemVenda === 'venda' || tabelaOrigemVenda === 'venda_gestor') &&
      Boolean(vendaId) &&
      currentStep === 4 &&
      statusFiscalPermiteCancelarNota(
        resumoFiscal?.status,
        statusFiscalUnificado,
        statusVendaTextoApiDetalhe
      ),
    [
      tabelaOrigemVenda,
      vendaId,
      currentStep,
      resumoFiscal?.status,
      statusFiscalUnificado,
      statusVendaTextoApiDetalhe,
    ]
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

  /** Datas do resumo fiscal (API ISO) */
  const formatarDataHoraResumoFiscal = (valor: string | null | undefined): string => {
    if (valor == null || String(valor).trim() === '') return '—'
    try {
      const d = new Date(valor)
      if (Number.isNaN(d.getTime())) return String(valor)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(valor)
    }
  }

  const formatarDataDetalhePedido = (valor: string | null | undefined): string => {
    if (!valor || String(valor).trim() === '') return '—'
    try {
      const d = new Date(valor)
      if (Number.isNaN(d.getTime())) return '—'
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '—'
    }
  }

  const formatarUsuarioPorId = (usuarioId: string | null | undefined): string => {
    const id = String(usuarioId || '').trim()
    if (!id) return '—'
    return nomesUsuariosPedido[id] || 'Usuário não identificado'
  }

  const rotuloModeloNfe = (modelo: number | null | undefined): string => {
    if (modelo === 55) return 'NF-e'
    if (modelo === 65) return 'NFC-e'
    if (modelo == null || modelo === undefined) return '—'
    return String(modelo)
  }

  // Função para obter ícone do meio de pagamento
  const obterIconeMeioPagamento = (nome: string) => {
    const nomeLower = nome.toLowerCase()
    if (nomeLower.includes('dinheiro') || nomeLower.includes('cash')) {
      return MdAttachMoney
    }
    if (nomeLower.includes('pix')) {
      return MdQrCode
    }
    if (
      nomeLower.includes('credito') ||
      nomeLower.includes('debito') ||
      nomeLower.includes('cartão') ||
      nomeLower.includes('cartao')
    ) {
      return MdCreditCard
    }
    return MdCreditCard // Ícone padrão
  }

  // Função para formatar valor recebido
  const formatarValorRecebido = (valor: string): string => {
    // Remove tudo exceto números
    const apenasNumeros = valor.replace(/\D/g, '')
    if (apenasNumeros === '') return ''

    // Converte para número (centavos) e divide por 100
    const valorCentavos = parseInt(apenasNumeros, 10)
    const valorReais = valorCentavos / 100

    return formatarNumeroComMilhar(valorReais)
  }

  // Função para verificar se é meio de pagamento em dinheiro
  const isMeioPagamentoDinheiro = (meioPagamentoId: string): boolean => {
    const meio = meiosPagamento.find(m => m.getId() === meioPagamentoId)
    if (!meio) return false
    const nomeMeio = meio.getNome().toLowerCase()
    return nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
  }

  // Função para adicionar pagamento ao clicar no card
  const adicionarPagamentoPorCard = (meioPagamentoIdSelecionado: string) => {
    const saldoParaLancar = pagamentoModoCobranca ? valorAPagarLancamento : valorAPagar
    // Se não houver valor digitado, usar o valor a pagar
    let valorParaUsar = 0

    if (valorRecebido && valorRecebido.trim() !== '') {
      // Converter valor formatado para número
      const valorLimpo = valorRecebido.replace(/\./g, '').replace(',', '.')
      valorParaUsar = parseFloat(valorLimpo) || 0
    } else {
      // Se não digitou valor, usar o valor a pagar
      valorParaUsar = saldoParaLancar
    }

    if (valorParaUsar <= 0) {
      showToast.error('Valor inválido')
      return
    }

    // Verificar se é dinheiro
    const isDinheiro = isMeioPagamentoDinheiro(meioPagamentoIdSelecionado)

    // Se não for dinheiro, limitar ao valor a pagar exato
    if (!isDinheiro && valorParaUsar > saldoParaLancar) {
      showToast.error(`Este meio de pagamento não pode ultrapassar o valor a pagar.`)
      return
    }

    // Se for dinheiro:
    // - Pode ser menor que o valor a pagar (pagamento parcial)
    // - Pode ser igual ao valor a pagar (pagamento exato)
    // - Pode ser maior que o valor a pagar (para calcular troco)
    // Não precisa de validação adicional para dinheiro

    // Permitir usar o mesmo meio de pagamento múltiplas vezes
    // A única restrição é que meios que não são dinheiro não podem ultrapassar o valor a pagar
    setPagamentos([
      ...pagamentos,
      {
        meioPagamentoId: meioPagamentoIdSelecionado,
        valor: valorParaUsar,
        cobrarNaEntrega: entregaComCobrancaPeloEntregador,
        naoEfetivo: entregaComCobrancaPeloEntregador,
      },
    ])

    // Limpar valor recebido
    setValorRecebido('')
  }

  // Função para verificar se o produto tem complementos
  const produtoTemComplementos = (produto: Produto): boolean => {
    const gruposComplementos = produto.getGruposComplementos()
    if (!gruposComplementos || gruposComplementos.length === 0) return false

    // Verifica se pelo menos um grupo tem pelo menos um complemento
    return gruposComplementos.some(grupo => grupo.complementos && grupo.complementos.length > 0)
  }

  const adicionarProduto = (produtoId: string) => {
    const produto =
      catalogoProdutosPorId[produtoId] ??
      produtosList.find(p => p.getId() === produtoId)
    if (!produto) return

    setCatalogoProdutosPorId(prev => ({ ...prev, [produto.getId()]: produto }))

    const mostrarAlterarPreco = produto.permiteAlterarPrecoAtivo()
    const mostrarComplementos =
      produto.abreComplementosAtivo() && produtoTemComplementos(produto)

    if (!mostrarAlterarPreco && !mostrarComplementos) {
      setProdutos(prev => [
        ...prev,
        {
          produtoId: produto.getId(),
          nome: produto.getNome(),
          quantidade: 1,
          valorUnitario: produto.getValor(),
          complementos: [],
        },
      ])
      return
    }

    setIndiceLinhaPainelProduto(null)
    setProdutoParaLancamentoPainel(produto)
    setModalLancamentoProdutoPainelOpen(true)
  }

  /** Confirma o painel unificado: novo item pelo grid ou edição de linha (preço/complementos) */
  const confirmarLancamentoProdutoPainel = ({
    valorUnitario,
    complementos,
  }: ModalLancamentoProdutoPainelConfirmPayload) => {
    const produto = produtoParaLancamentoPainel
    if (!produto) return

    const idxLinha = indiceLinhaPainelProduto

    const complementosLinha: ComplementoSelecionado[] = complementos.map(c => {
      if (idxLinha !== null) {
        const atual = produtos[idxLinha]
        const antigo = atual?.complementos.find(
          x => x.grupoId === c.grupoId && x.id === c.id
        )
        return {
          id: c.id,
          grupoId: c.grupoId,
          nome: c.nome,
          valor: c.valor,
          quantidade: antigo?.quantidade ?? c.quantidade,
          tipoImpactoPreco: c.tipoImpactoPreco,
        }
      }
      return {
        id: c.id,
        grupoId: c.grupoId,
        nome: c.nome,
        valor: c.valor,
        quantidade: c.quantidade,
        tipoImpactoPreco: c.tipoImpactoPreco,
      }
    })

    if (idxLinha !== null) {
      setProdutos(prev => {
        const novos = [...prev]
        const atual = novos[idxLinha]
        if (!atual) return prev
        novos[idxLinha] = {
          ...atual,
          valorUnitario,
          complementos: complementosLinha,
        }
        return novos
      })
    } else {
      setProdutos(prev => [
        ...prev,
        {
          produtoId: produto.getId(),
          nome: produto.getNome(),
          quantidade: 1,
          valorUnitario,
          complementos: complementosLinha,
          tipoDesconto: null,
          valorDesconto: null,
          tipoAcrescimo: null,
          valorAcrescimo: null,
        },
      ])
    }
    setCatalogoProdutosPorId(prev => ({ ...prev, [produto.getId()]: produto }))
    // Fechamento e limpeza de `produtoParaLancamentoPainel` ficam no painel (onOpenChange + onAfterClose)
  }

  /** Abre o painel de lançamento para ajustar complementos/preço em linha já na lista */
  const abrirModalComplementosProdutoExistente = async (index: number) => {
    const produtoSelecionado = produtos[index]
    if (!produtoSelecionado) return

    const produto = await carregarProdutoNoCatalogoSeNecessario(produtoSelecionado.produtoId)
    if (!produto) return

    setIndiceLinhaPainelProduto(index)
    setProdutoParaLancamentoPainel(produto)
    setModalLancamentoProdutoPainelOpen(true)
  }

  // Função para abrir modal de edição de produto
  const abrirModalEdicaoProduto = async (index: number) => {
    const produto = produtos[index]
    const produtoEntity = await carregarProdutoNoCatalogoSeNecessario(produto.produtoId)
    if (!produtoEntity) {
      showToast.error('Não foi possível obter os dados do produto para edição.')
      return
    }
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false

    setProdutoIndexEdicao(index)
    setQuantidadeEdicao(Math.floor(produto.quantidade)) // Garantir que seja sempre inteiro

    // Verificar se o produto ainda permite desconto/acréscimo e definir valores iniciais
    if (produto.tipoDesconto && produto.valorDesconto) {
      // Se tem desconto, usar desconto
      setEhAcrescimo(false)
      setEhPorcentagem(produto.tipoDesconto === 'porcentagem')
      setValorDescontoAcrescimo(
        produto.tipoDesconto === 'porcentagem'
          ? produto.valorDesconto.toString()
          : formatarNumeroComMilhar(produto.valorDesconto)
      )
    } else if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      // Se tem acréscimo, usar acréscimo
      setEhAcrescimo(true)
      setEhPorcentagem(produto.tipoAcrescimo === 'porcentagem')
      setValorDescontoAcrescimo(
        produto.tipoAcrescimo === 'porcentagem'
          ? produto.valorAcrescimo.toString()
          : formatarNumeroComMilhar(produto.valorAcrescimo)
      )
    } else {
      // Sem desconto nem acréscimo
      setEhAcrescimo(false)
      setEhPorcentagem(false)
      setValorDescontoAcrescimo('0')
    }

    setValorUnitarioEdicaoPainel(
      produto.valorUnitario > 0 ? formatarNumeroComMilhar(produto.valorUnitario) : ''
    )

    setModalEdicaoProdutoOpen(true)
  }

  // Função para confirmar edição do produto
  const confirmarEdicaoProduto = () => {
    if (produtoIndexEdicao === null) return

    const novosProdutos = [...produtos]
    const produtoAtual = novosProdutos[produtoIndexEdicao]

    // Buscar o produto atualizado da lista / catálogo para verificar permiteDesconto e permiteAcrescimo
    const produtoEntity =
      catalogoProdutosPorId[produtoAtual.produtoId] ??
      produtosList.find(p => p.getId() === produtoAtual.produtoId)
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
    const permiteAlterarPreco = produtoEntity?.permiteAlterarPrecoAtivo() ?? false

    let novoValorUnitario = produtoAtual.valorUnitario
    if (permiteAlterarPreco) {
      const limpo = valorUnitarioEdicaoPainel.replace(/\./g, '').replace(',', '.').trim()
      const v = parseFloat(limpo)
      if (
        valorUnitarioEdicaoPainel.trim() === '' ||
        !Number.isFinite(v) ||
        v <= 0
      ) {
        showToast.error('Informe um valor unitário válido (maior que zero).')
        return
      }
      novoValorUnitario = v
    }

    // Converter valor de desconto/acréscimo
    let valorNum: number | null = null

    // Só processar se houver valor e o produto permitir
    const valorDigitado = valorDescontoAcrescimo && valorDescontoAcrescimo !== '0'
    const podeAplicarDesconto = !ehAcrescimo && permiteDesconto && valorDigitado
    const podeAplicarAcrescimo = ehAcrescimo && permiteAcrescimo && valorDigitado

    if (podeAplicarDesconto || podeAplicarAcrescimo) {
      if (ehPorcentagem) {
        // Para porcentagem, o valor já está em porcentagem (0-100)
        valorNum = parseFloat(valorDescontoAcrescimo) || 0
      } else {
        // Para fixo, converter de formato brasileiro para número
        valorNum = parseFloat(valorDescontoAcrescimo.replace(/\./g, '').replace(',', '.')) || 0
      }
    }

    novosProdutos[produtoIndexEdicao] = {
      ...produtoAtual,
      valorUnitario: novoValorUnitario,
      quantidade: Math.floor(quantidadeEdicao), // Garantir que seja sempre inteiro
      tipoDesconto: podeAplicarDesconto ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
      valorDesconto: podeAplicarDesconto ? valorNum : null,
      tipoAcrescimo: podeAplicarAcrescimo ? (ehPorcentagem ? 'porcentagem' : 'fixo') : null,
      valorAcrescimo: podeAplicarAcrescimo ? valorNum : null,
    }

    setProdutos(novosProdutos)
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setValorUnitarioEdicaoPainel('')
  }

  const removerProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index))
  }

  const atualizarProduto = (index: number, campo: keyof ProdutoSelecionado, valor: any) => {
    const novosProdutos = [...produtos]
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor }
    setProdutos(novosProdutos)
  }

  const atualizarComplemento = (
    produtoIndex: number,
    complementoIndex: number,
    campo: keyof ComplementoSelecionado,
    valor: any
  ) => {
    const novosProdutos = [...produtos]
    const novosComplementos = [...novosProdutos[produtoIndex].complementos]
    novosComplementos[complementoIndex] = { ...novosComplementos[complementoIndex], [campo]: valor }
    novosProdutos[produtoIndex] = {
      ...novosProdutos[produtoIndex],
      complementos: novosComplementos,
    }
    setProdutos(novosProdutos)
  }

  const removerComplemento = (produtoIndex: number, complementoIndex: number) => {
    const novosProdutos = [...produtos]
    const novosComplementos = novosProdutos[produtoIndex].complementos.filter(
      (_, i) => i !== complementoIndex
    )
    novosProdutos[produtoIndex] = {
      ...novosProdutos[produtoIndex],
      complementos: novosComplementos,
    }
    setProdutos(novosProdutos)
  }

  const adicionarPagamento = () => {
    if (!meioPagamentoId) {
      showToast.error('Selecione um meio de pagamento')
      return
    }

    const valorRestante = totalProdutos - totalPagamentos
    if (valorRestante <= 0) {
      showToast.error('Valor já está totalmente pago')
      return
    }

    setPagamentos([
      ...pagamentos,
      {
        meioPagamentoId,
        valor: valorRestante,
      },
    ])
    setMeioPagamentoId('')
  }

  const removerPagamento = (index: number, pagamentoId?: string) => {
    setPagamentos(prev => {
      if (pagamentoId) return prev.filter(p => p.id !== pagamentoId)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleTipoAtendimentoDeliveryChange = (tipo: TipoAtendimentoDelivery) => {
    setTipoAtendimentoDelivery(tipo)
    if (tipo === 'retirada') {
      setEntregadorId('')
      setTaxaEntregaId('')
      setMoradaEntregaSelecionada(null)
    }
  }

  const atualizarPagamento = (index: number, valor: number) => {
    const novosPagamentos = [...pagamentos]
    novosPagamentos[index] = { ...novosPagamentos[index], valor }
    setPagamentos(novosPagamentos)
  }

  const buildMeiosCobrancaPayload = useCallback(
    (pagamentosBase: PagamentoSelecionado[]) =>
      pagamentosBase.map(p => {
        const meio = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
        return {
          meioPagamentoId: p.meioPagamentoId,
          nome:
            meio?.getNome?.() ||
            nomesMeiosPagamentoPedido[p.meioPagamentoId] ||
            'Meio de pagamento',
          valor: p.valor,
        }
      }),
    [meiosPagamento, nomesMeiosPagamentoPedido]
  )

  const buildPagamentosPayload = useCallback(
    (
      pagamentosBase: PagamentoSelecionado[],
      cobrarNaEntrega: boolean,
      incluirIdFormaPagamento = false
    ) =>
      pagamentosBase.map(p => ({
        ...(incluirIdFormaPagamento ? { id: p.meioPagamentoId } : {}),
        meioPagamentoId: p.meioPagamentoId,
        valor: p.valor,
        cobrarNaEntrega,
      })),
    []
  )

  const buildPagamentosPatchMeiosPayload = useCallback(
    (pagamentosBase: PagamentoSelecionado[]) =>
      pagamentosBase.map(p => ({
        meioPagamentoId: p.meioPagamentoId,
        valor: p.valor,
      })),
    []
  )

  const handleSalvarPagamentoEntregaEmAberto = useCallback(async () => {
    if (!vendaId || tabelaOrigemVenda !== 'venda_gestor') return
    if (pagamentos.length === 0) {
      showToast.error('Informe pelo menos uma forma de pagamento para cobrança.')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    const pagamentosPayload = buildPagamentosPatchMeiosPayload(pagamentos)
    const diferencaPagamentoEntrega = totalProdutos - totalPagamentosLancados
    const pagamentoEntregaQuitado = diferencaPagamentoEntrega <= 0.01
    const pagamentoEntregaComTrocoValido =
      totalPagamentosLancados > totalProdutos && trocoLancamento > 0

    if (!pagamentoEntregaQuitado && !pagamentoEntregaComTrocoValido) {
      showToast.error(
        `Valor das formas de pagamento (${transformarParaReal(totalPagamentosLancados)}) não cobre o total do pedido (${transformarParaReal(totalProdutos)}).`
      )
      return
    }

    setIsSavingPagamentoEntrega(true)
    try {
      const response = await fetch(`/api/vendas/gestor/${vendaId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pagamentos: pagamentosPayload,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || 'Erro ao atualizar pagamento')
      }

      setPagamentos(prev =>
        prev.map(p => ({
          ...p,
          cobrarNaEntrega: fluxoPagamentoEntrega === 'cobrar_entregador',
        }))
      )
      showToast.success('Cobrança da entrega atualizada.')
      onSuccess()
    } catch (error) {
      console.error('Erro ao atualizar pagamento da entrega:', error)
      showToast.error(error instanceof Error ? error.message : 'Erro ao atualizar pagamento')
    } finally {
      setIsSavingPagamentoEntrega(false)
    }
  }, [
    vendaId,
    tabelaOrigemVenda,
    pagamentos,
    auth,
    fluxoPagamentoEntrega,
    trocoLancamento,
    totalPagamentosLancados,
    buildPagamentosPatchMeiosPayload,
    totalProdutos,
    onSuccess,
  ])

  const handleSubmit = async () => {
    if (createVendaGestor.isPending) {
      return
    }

    if (produtos.length === 0) {
      showToast.error('Adicione pelo menos um produto')
      return
    }

    if (!validarInformacoesPedido(true)) {
      setCurrentStep(pedidoDeliveryGestor ? 2 : 1)
      return
    }

    if (
      pedidoGestorComPagamentoNoPasso3 &&
      !pedidoEntregaAceitaPagamentoPendente &&
      pagamentos.length === 0
    ) {
      showToast.error('Adicione pelo menos uma forma de pagamento')
      return
    }

    if (entregaComCobrancaPeloEntregador && pagamentos.length === 0) {
      showToast.error(
        pedidoComRetirada
          ? 'Informe como o cliente irá pagar na retirada.'
          : 'Informe como o cliente irá pagar na entrega.'
      )
      return
    }

    // Validar se pagamentos cobrem o total
    if (pedidoGestorComPagamentoNoPasso3 && !pedidoEntregaAceitaPagamentoPendente) {
      const diferenca = totalProdutos - totalPagamentos

      // Aceitar quando os pagamentos cobrem exatamente o total (diferença <= 0.01)
      // Ou quando há troco (pagamentos ultrapassam o total, o que é válido para dinheiro)
      const pagamentosCobremTotal = Math.abs(diferenca) <= 0.01
      const temTrocoValido = totalPagamentos > totalProdutos && troco > 0

      if (!pagamentosCobremTotal && !temTrocoValido) {
        showToast.error(
          `Valor dos pagamentos (${transformarParaReal(totalPagamentos)}) não corresponde ao total (${transformarParaReal(totalProdutos)})`
        )
        return
      }
    }

    if (!iniciarSubmit()) return
    try {
      // Mapear produtos para o payload (valorFinal por produto = total já calculado da linha)
      const produtosLancados = produtos.map(p => {
        // Converter valores de desconto/acréscimo para o formato esperado pelo backend
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

        // valorFinal do produto = total da linha (unitário + complementos + desconto/acréscimo)
        const valorFinalProduto = calcularTotalProduto(p)

        return {
          produtoId: p.produtoId,
          quantidade: p.quantidade,
          valorUnitario: p.valorUnitario,
          valorFinal: valorFinalProduto,
          tipoDesconto: p.tipoDesconto || null,
          valorDesconto: valorDescontoFinal,
          tipoAcrescimo: p.tipoAcrescimo || null,
          valorAcrescimo: valorAcrescimoFinal,
          complementos: (p.complementos || []).map(comp => ({
            complementoId: comp.id,
            grupoComplementoId: comp.grupoId,
            valorUnitario: comp.valor,
            quantidade: comp.quantidade,
          })),
        }
      })

      // Payload: valorFinal (raiz) = total da venda; produtosLancados = array com valorFinal por produto
      // statusVenda vem do fluxo: entrega nasce ABERTA; balcão nasce FINALIZADA.
      const vendaData: any = {
        tipoVenda: tipoInicioPedido === 'entrega' ? 'entrega' : 'balcao',
        origem,
        statusVenda: status,
        valorFinal: totalProdutos,
        totalDesconto: 0,
        totalAcrescimo: 0,
        produtosLancados,
        produtos: produtosLancados, // alias para compatibilidade
      }

      if (tipoInicioPedido === 'entrega') {
        vendaData.tipoAtendimento = tipoAtendimentoDelivery
        vendaData.modalidadeEntrega = tipoAtendimentoDelivery
        vendaData.tempoPrevistoMinutos = tempoPrevistoMinutos
        if (pedidoComEntrega && taxaEntregaSelecionada && valorTaxaEntrega > 0) {
          vendaData.taxaEntregaId = taxaEntregaSelecionada.getId()
          vendaData.taxaEntregaValor = valorTaxaEntrega
          vendaData.taxasLancadas = [
            {
              taxaId: taxaEntregaSelecionada.getId(),
              valorCalculado: valorTaxaEntrega,
            },
          ]
        }
        if (pedidoComEntrega && entregadorId) {
          vendaData.entregadorId = entregadorId
        }
      }

      // solicitarEmissaoFiscal: true apenas quando status é PENDENTE_EMISSAO, false nos demais casos
      vendaData.solicitarEmissaoFiscal = status === 'PENDENTE_EMISSAO'

      // Log para debug
      console.log('📤 Payload sendo enviado:', JSON.stringify(vendaData, null, 2))

      // Adicionar clienteId: fluxo entrega usa o cliente vinculado; balcão usa o seletor convencional
      const clienteIdParaVenda = tipoInicioPedido === 'entrega'
        ? clienteEntregaVinculado?.id
        : clienteId
      if (clienteIdParaVenda) {
        vendaData.clienteId = clienteIdParaVenda
      }

      // Adicionar endereço de entrega quando fluxo entrega e morada selecionada
      if (pedidoComEntrega && moradaEntregaSelecionada?.endereco) {
        vendaData.enderecoEntrega = moradaEntregaSelecionada.endereco
      }

      const pagamentosPayload = buildPagamentosPayload(
        pagamentos,
        tipoInicioPedido === 'entrega' && status === 'ABERTA' && entregaComCobrancaPeloEntregador
      )
      
      // Validação crucial: no passo 3, se o pagamento tem parcelas "naoEfetivo",
      // precisamos repassar para a API que ela NÃO deve considerar como valor recebido.
      // Isso se aplica especialmente a vendas tipo balcão finalizadas.
      pagamentosPayload.forEach((p: any) => {
        // Encontra o pagamento equivalente no array de UI
        const pgUI = pagamentos.find(ui => ui.meioPagamentoId === p.meioPagamentoId && ui.valor === p.valor)
        if (pgUI && pgUI.naoEfetivo) {
          // Garante que é enviado como pendente/não pago, dependendo do backend
          p.efetivado = false
        } else {
          // Se for pagamento parcial efetivo
          p.efetivado = true
        }
      })

      const meiosCobrancaPayload = buildMeiosCobrancaPayload(pagamentos)

      if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
        vendaData.dataFinalizacao = new Date().toISOString()
        vendaData.pagamentos = pagamentosPayload
        
        // Em vendas FINALIZADA com pagamento parcial EFETIVO
        if (totalPagamentos < totalProdutos) {
           vendaData.pagamento = {
             status: 'pendente',
             cobrarCliente: true,
             valorReceber: totalProdutos,
             valorRecebido: totalPagamentos,
             valorFaltante: totalProdutos - totalPagamentos,
           }
        }
      } else if (tipoInicioPedido === 'entrega' && status === 'ABERTA') {
        const trocoPara =
          valorRecebido.trim() !== ''
            ? Number(valorRecebido.replace(/\./g, '').replace(',', '.')) || 0
            : 0

        if (entregaComCobrancaPeloEntregador) {
          vendaData.pagamentos = pagamentosPayload
          vendaData.pagamento = {
            status: 'pendente',
            cobrarCliente: true,
            meioPagamentoId: pagamentosPayload[0]?.meioPagamentoId,
            meioPagamento:
              meiosPagamento.find(m => m.getId() === pagamentosPayload[0]?.meioPagamentoId)?.getNome?.() ??
              null,
            valorReceber: totalProdutos,
            valorRecebido: 0,
            valorFaltante: totalProdutos,
            trocoPara: trocoLancamento > 0 ? totalPagamentosLancados : trocoPara > 0 ? trocoPara : undefined,
            meios: meiosCobrancaPayload,
          }
        } else {
          vendaData.pagamentos = pagamentosPayload
          vendaData.pagamento = {
            status: statusPagamentoPedido,
            cobrarCliente: statusPagamentoPedido !== 'pago',
            meioPagamentoId: pagamentosPayload[0]?.meioPagamentoId,
            valorReceber: valorAPagar,
            valorRecebido: Math.min(totalPagamentos, totalProdutos),
            valorFaltante: valorAPagar,
          }
        }
      } else {
        vendaData.pagamentos = []
      }

      const resultado = await createVendaGestor.mutateAsync(vendaData)
      console.log('✅ Venda criada com sucesso:', resultado)
      showToast.success('Pedido criado com sucesso!')

      const idCriado =
        String(
          (resultado as any)?.id ||
            (resultado as any)?.vendaId ||
            (resultado as any)?.data?.id ||
            (resultado as any)?.data?.vendaId ||
            ''
        ).trim() || null

      if (idCriado) {
        setVendaIdCriada(idCriado)

        // Backend cria a venda pendente; balcão finalizado exige transição operacional (BFF → …/transicoes acao finalizar).
        if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
          try {
            await finalizarVendaGestor.mutateAsync({ id: idCriado })
          } catch {
            // Falha silenciosa: a venda foi criada e a lista será atualizada pelo fluxo de sucesso.
          }
        }

        if (
          tipoInicioPedido === 'entrega' &&
          status === 'ABERTA' &&
          preferenciasImpressaoDelivery.autoIniciarPreparoNovosPedidos
        ) {
          await processarAposTransicaoVendaGestorId(idCriado, 'iniciar_preparo')
        }
      }

      setInternalDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('❌ Erro ao criar pedido:', error)
      console.error('❌ Detalhes do erro:', {
        message: error?.message,
        response: error?.response,
        responseData: error?.response?.data,
        stack: error?.stack,
      })
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Erro ao criar pedido'
      showToast.error(errorMessage)
    } finally {
      finalizarSubmit()
    }
  }

  const resetForm = () => {
    // Limpar timeouts de long press
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = null
    }
    longPressIndexRef.current = null

    // Limpar timeouts de long press de complementos
    if (longPressComplementoTimeoutRef.current) {
      clearTimeout(longPressComplementoTimeoutRef.current)
      longPressComplementoTimeoutRef.current = null
    }
    longPressComplementoIndexRef.current = null

    setOrigem('GESTOR')
    setStatus(statusPadraoNovoPedido(tipoInicioPedido))
    setClienteId('')
    setClienteNome('')
    setMoradaEntregaSelecionada(null)
    setTelefoneBuscaEntrega('')
    setTelefoneBuscadoEntrega(null)
    setTempoPrevistoMinutos(45)
    setEntregadorId('')
    setTaxaEntregaId('')
    setClienteEntregaVinculado(null)
    setClienteTabsModalEntregaState({
      open: false,
      tab: 'cliente',
      mode: 'edit',
    })
    setProdutos([])
    setPagamentos([])
    setMeioPagamentoId('')
    setValorRecebido('')
    setFluxoPagamentoEntrega('cobrar_entregador')
    setTipoAtendimentoDelivery('entrega')
    setGrupoSelecionadoId(null)
    setCurrentStep(1)
    setModalLancamentoProdutoPainelOpen(false)
    setProdutoParaLancamentoPainel(null)
    setIndiceLinhaPainelProduto(null)
    setModalEdicaoProdutoOpen(false)
    setProdutoIndexEdicao(null)
    setQuantidadeEdicao(1)
    setEhAcrescimo(false)
    setEhPorcentagem(false)
    setValorDescontoAcrescimo('0')
    setValorUnitarioEdicaoPainel('')
    setValorFinalVenda(null) // Limpar valor final ao resetar
    setSeletorClienteOpen(false)
    setModalConfirmacaoSaidaOpen(false)
    setDataFinalizacaoCarregada(null)
    setVendaGestorJaCancelada(false)
    setModalCancelarVendaOpen(false)
    setJustificativaCancelamento('')
    setAbaDetalhesPedido('infoPedido')
    setResumoFiscal(null)
    setOrigemTextoApiDetalhe(null)
    setStatusVendaTextoApiDetalhe(null)
    setDetalhesPedidoMeta(null)
    setNomesUsuariosPedido({})
    setNomesMeiosPagamentoPedido({})
    setResumoFinanceiroDetalhes(null)
    setVendaIdCriada(null)
    setDataVenda('')
    setNomeUsuario('')
    nomeUsuarioCarregadoNoCicloRef.current = false
    setCatalogoProdutosPorId({})
    setIsLoadingVenda(false)
  }

  const handlePedidoPainelExited = useNovoPedidoResetOnExit(resetForm, onAfterClose)

  // Cleanup de timeouts quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
      if (longPressComplementoTimeoutRef.current) {
        clearTimeout(longPressComplementoTimeoutRef.current)
      }
    }
  }, [])

  // Verifica se há dados da venda que seriam perdidos
  const temDadosVenda = () => {
    // Em modo visualização, não há dados a perder
    if (vendaId && modoVisualizacao) {
      return false
    }
    return produtos.length > 0 || pagamentos.length > 0 || clienteId !== '' || currentStep > 1
  }

  const handleClose = () => {
    // Em modo visualização, fechar diretamente sem confirmação
    if (vendaId && modoVisualizacao) {
      onClose()
      return
    }

    if (temDadosVenda()) {
      setModalConfirmacaoSaidaOpen(true)
    } else {
      onClose()
    }
  }

  const handleConfirmarSaida = () => {
    setModalConfirmacaoSaidaOpen(false)
    setInternalDialogOpen(false)
    onClose()
  }

  const handleCancelarSaida = () => {
    setModalConfirmacaoSaidaOpen(false)
  }

  const handleAbrirEdicaoProdutoDetalhes = useCallback(
    (produtoId: string | null | undefined) => {
      const id = String(produtoId || '').trim()
      if (!id) {
        showToast.error('Não foi possível abrir a edição: produto sem ID.')
        return
      }
      const produtoPedido = produtos.find(p => p.produtoId === id)
      const produtoParaEditar = Produto.create(
        id,
        '',
        produtoPedido?.nome || 'Produto',
        produtoPedido?.valorUnitario || 0,
        true
      )
      setProdutoTabsModalState({
        open: true,
        tab: 'produto',
        mode: 'edit',
        produto: produtoParaEditar,
        // Abrir direto na etapa fiscal para ajuste rápido da tributação
        initialStepProduto: 2,
      })
    },
    [produtos]
  )

  const handleFecharProdutoTabsModal = useCallback(() => {
    setProdutoTabsModalState(prev => ({ ...prev, open: false }))
  }, [])

  const handleTabChangeProdutoModal = useCallback(
    (tab: 'produto' | 'complementos' | 'impressoras' | 'grupo') => {
      setProdutoTabsModalState(prev => ({ ...prev, tab }))
    },
    []
  )

  /** Confirma cancelamento (venda gestor OU nota fiscal por origem) */
  const handleConfirmarCancelamentoVenda = async () => {
    if (!vendaId) return

    if (justificativaCancelamento.trim().length < 15) {
      showToast.error('Justificativa deve ter no mínimo 15 caracteres')
      return
    }

    try {
      if (tipoCancelamentoSelecionado === 'venda') {
        await cancelarVendaGestor.mutateAsync({
          id: vendaId,
          motivo: justificativaCancelamento.trim(),
        })
      } else {
        if (tabelaOrigemVenda === 'venda_gestor') {
          await cancelarNotaFiscalVendaGestor.mutateAsync({
            id: vendaId,
            justificativa: justificativaCancelamento.trim(),
          })
        } else {
          await cancelarNotaFiscalVendaPdv.mutateAsync({
            id: vendaId,
            justificativa: justificativaCancelamento.trim(),
          })
        }
      }
      setModalCancelarVendaOpen(false)
      setJustificativaCancelamento('')
      setTipoCancelamentoSelecionado('venda')
      setInternalDialogOpen(false)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao cancelar venda:', error)
    }
  }

  // Função para carregar dados de uma venda existente
  const carregarVendaExistente = useCallback(
    async (vendaIdOverride?: string | null) => {
      const vendaIdParaCarregar = vendaIdOverride || vendaId || vendaIdCriada
      const authAtual = authRef.current
      if (!vendaIdParaCarregar || !open || !authAtual) return

      const token = authAtual.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      setIsLoadingVenda(true)
      setOrigemTextoApiDetalhe(null)
      setStatusVendaTextoApiDetalhe(null)

      try {
        const urlVenda =
          tabelaOrigemVenda === 'venda'
            ? `/api/vendas/${vendaIdParaCarregar}?incluirFiscal=true`
            : `/api/vendas/gestor/${vendaIdParaCarregar}?incluirFiscal=true`

        const response = await fetch(urlVenda, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.message || 'Erro ao carregar venda')
        }

        const vendaData = await response.json()

        setDetalhesPedidoMeta({
          numeroVenda: vendaData.numeroVenda ?? null,
          codigoVenda: vendaData.codigoVenda ?? null,
          tipoVenda: vendaData.tipoVenda ?? null,
          numeroMesa: vendaData.numeroMesa ?? null,
          statusMesa: vendaData.statusMesa ?? null,
          abertoPorId: vendaData.abertoPorId ?? null,
          ultimoResponsavelId: vendaData.ultimoResponsavelId ?? null,
          canceladoPorId: vendaData.canceladoPorId ?? null,
          codigoTerminal: vendaData.codigoTerminal ?? null,
          terminalId: vendaData.terminalId ?? null,
          identificacao: vendaData.identificacao ?? null,
          solicitarEmissaoFiscal: vendaData.solicitarEmissaoFiscal ?? null,
          dataCriacao: vendaData.dataCriacao ?? null,
          dataFinalizacao: vendaData.dataFinalizacao ?? null,
          dataCancelamento: vendaData.dataCancelamento ?? null,
          dataUltimaModificacao: vendaData.dataUltimaModificacao ?? null,
          dataUltimoProdutoLancado: vendaData.dataUltimoProdutoLancado ?? null,
        })

        if (vendaData.resumoFiscal && typeof vendaData.resumoFiscal === 'object') {
          setResumoFiscal(vendaData.resumoFiscal as ResumoFiscalVenda)
        } else {
          setResumoFiscal(null)
        }

        setOrigemTextoApiDetalhe(
          vendaData.origem !== undefined && vendaData.origem !== null
            ? String(vendaData.origem)
            : null
        )
        setStatusVendaTextoApiDetalhe(
          vendaData.statusVenda !== undefined && vendaData.statusVenda !== null
            ? String(vendaData.statusVenda)
            : null
        )

        // Mapear dados da venda para os estados do componente
        // Origem
        if (vendaData.origem) {
          setOrigem(vendaData.origem as OrigemVenda)
        }

        // Status
        if (vendaData.statusVenda) {
          setStatus(vendaData.statusVenda as StatusVenda)
        } else if (vendaData.dataFinalizacao) {
          setStatus('FINALIZADA')
        } else {
          setStatus('ABERTA')
        }

        // Cliente
        if (vendaData.clienteId) {
          setClienteId(vendaData.clienteId)
          // Buscar nome do cliente
          try {
            const clienteResponse = await fetch(`/api/clientes/${vendaData.clienteId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (clienteResponse.ok) {
              const clienteData = await clienteResponse.json()
              setClienteNome(clienteData.nome || clienteData.name || '')
            }
          } catch (error) {
            console.error('Erro ao buscar nome do cliente:', error)
          }
        }

        // Data da venda
        if (vendaData.dataCriacao) {
          setDataVenda(vendaData.dataCriacao)
        } else if (vendaData.dataFinalizacao) {
          setDataVenda(vendaData.dataFinalizacao)
        }

        // Valor final da venda (já calculado pelo backend)
        if (vendaData.valorFinal !== undefined && vendaData.valorFinal !== null) {
          setValorFinalVenda(vendaData.valorFinal)
        } else {
          setValorFinalVenda(null)
        }

        // Datas para regra de exibição do botão "Cancelar Venda" (gestor)
        const df = vendaData.dataFinalizacao
        setDataFinalizacaoCarregada(df != null && String(df).trim() !== '' ? String(df) : null)
        setVendaGestorJaCancelada(Boolean(vendaData.dataCancelamento || vendaData.canceladoPorId))

        // Produtos - Verificar tanto produtosLancados quanto produtos
        // A API pode retornar em qualquer um dos formatos
        const produtosRaw = vendaData.produtosLancados || vendaData.produtos

        if (produtosRaw && Array.isArray(produtosRaw)) {
          const produtosMapeadosTodos: ProdutoSelecionado[] = produtosRaw.map((prod: any) => {
            // Buscar nome do produto
            let nomeProduto = prod.nomeProduto || prod.nome || 'Produto sem nome'

            // Mapear complementos garantindo que todos os campos estejam presentes
            const complementosMapeados: ComplementoSelecionado[] = Array.isArray(prod.complementos)
              ? prod.complementos.map((comp: any) => {
                  // Normalizar tipoImpactoPreco (pode vir como string ou já no formato correto)
                  let tipoImpactoPreco: 'aumenta' | 'diminui' | 'nenhum' = 'nenhum'
                  if (comp.tipoImpactoPreco) {
                    const tipo = String(comp.tipoImpactoPreco).toLowerCase()
                    if (tipo === 'aumenta' || tipo === 'increase') {
                      tipoImpactoPreco = 'aumenta'
                    } else if (tipo === 'diminui' || tipo === 'decrease') {
                      tipoImpactoPreco = 'diminui'
                    } else {
                      tipoImpactoPreco = 'nenhum'
                    }
                  }

                  return {
                    id: comp.complementoId || comp.id || '',
                    grupoId: comp.grupoComplementoId || comp.grupoId || '',
                    nome: comp.nomeComplemento || comp.nome || 'Complemento',
                    valor: comp.valorUnitario || comp.valor || 0,
                    quantidade: comp.quantidade || 1,
                    tipoImpactoPreco,
                  }
                })
              : []

            // Mapear campos de desconto/acréscimo diretamente do backend
            let tipoDescontoFinal = prod.tipoDesconto || null
            let valorDescontoFinal: number | null =
              typeof prod.valorDesconto === 'string'
                ? parseFloat(prod.valorDesconto)
                : prod.valorDesconto || null
            let tipoAcrescimoFinal = prod.tipoAcrescimo || null
            let valorAcrescimoFinal: number | null =
              typeof prod.valorAcrescimo === 'string'
                ? parseFloat(prod.valorAcrescimo)
                : prod.valorAcrescimo || null

            // Subtotal do produto (para detectar se backend salvou valor em R$ em vez de taxa)
            const valorProdutoSubtotal = (prod.valorUnitario || 0) * (prod.quantidade || 1)
            const valorComplementosSubtotal = (
              complementosMapeados as ComplementoSelecionado[]
            ).reduce((sum, comp) => {
              const tipo = comp.tipoImpactoPreco || 'nenhum'
              const valorTotal = comp.valor * comp.quantidade * (prod.quantidade || 1)
              if (tipo === 'aumenta') return sum + valorTotal
              if (tipo === 'diminui') return sum - valorTotal
              return sum
            }, 0)
            const subtotalProduto = valorProdutoSubtotal + valorComplementosSubtotal

            // Se o backend retorna porcentagem como decimal (0.1 = 10%), converter para porcentagem (10 = 10%)
            // O frontend trabalha com porcentagem 0-100, não decimal 0-1
            // Se o backend salvou errado o valor em R$ (ex.: 2.10) em vez da taxa (0.1), detectar e converter para %
            if (
              tipoDescontoFinal === 'porcentagem' &&
              valorDescontoFinal !== null &&
              valorDescontoFinal !== undefined
            ) {
              if (valorDescontoFinal < 1 && valorDescontoFinal > 0) {
                valorDescontoFinal = valorDescontoFinal * 100
              } else if (
                subtotalProduto > 0 &&
                valorDescontoFinal >= 1 &&
                valorDescontoFinal <= subtotalProduto
              ) {
                // Valor entre 1 e subtotal: provavelmente backend salvou valor em R$ (ex.: 2.10) em vez de taxa (0.1)
                const taxaDecimal = valorDescontoFinal / subtotalProduto
                if (taxaDecimal >= 0.01 && taxaDecimal <= 1) {
                  valorDescontoFinal = Math.round(taxaDecimal * 1000) / 10
                }
              }
            }

            if (
              tipoAcrescimoFinal === 'porcentagem' &&
              valorAcrescimoFinal !== null &&
              valorAcrescimoFinal !== undefined
            ) {
              if (valorAcrescimoFinal < 1 && valorAcrescimoFinal > 0) {
                valorAcrescimoFinal = valorAcrescimoFinal * 100
              } else if (
                subtotalProduto > 0 &&
                valorAcrescimoFinal >= 1 &&
                valorAcrescimoFinal <= subtotalProduto
              ) {
                const taxaDecimal = valorAcrescimoFinal / subtotalProduto
                if (taxaDecimal >= 0.01 && taxaDecimal <= 1) {
                  valorAcrescimoFinal = Math.round(taxaDecimal * 1000) / 10
                }
              }
            }

            // Se backend enviou taxa decimal (0.03 = 3%) mas tipo veio fixo ou null, tratar como porcentagem
            if (
              valorDescontoFinal !== null &&
              valorDescontoFinal !== undefined &&
              valorDescontoFinal > 0 &&
              valorDescontoFinal < 1 &&
              tipoDescontoFinal !== 'porcentagem'
            ) {
              tipoDescontoFinal = 'porcentagem'
              valorDescontoFinal = Math.round(valorDescontoFinal * 1000) / 10
            }
            if (
              valorAcrescimoFinal !== null &&
              valorAcrescimoFinal !== undefined &&
              valorAcrescimoFinal > 0 &&
              valorAcrescimoFinal < 1 &&
              tipoAcrescimoFinal !== 'porcentagem'
            ) {
              tipoAcrescimoFinal = 'porcentagem'
              valorAcrescimoFinal = Math.round(valorAcrescimoFinal * 1000) / 10
            }

            // valorFinal do produto (dentro de produtosLancados): total já calculado da linha
            const valorFinalProduto =
              prod.valorFinal !== undefined && prod.valorFinal !== null
                ? Number(prod.valorFinal)
                : prod.valor_final !== undefined && prod.valor_final !== null
                  ? Number(prod.valor_final)
                  : null

            return {
              produtoId: prod.produtoId || prod.id || '',
              nome: nomeProduto,
              quantidade: prod.quantidade || 1,
              valorUnitario: prod.valorUnitario || 0,
              complementos: complementosMapeados,
              tipoDesconto: tipoDescontoFinal,
              valorDesconto: valorDescontoFinal,
              tipoAcrescimo: tipoAcrescimoFinal,
              valorAcrescimo: valorAcrescimoFinal,
              valorFinal: valorFinalProduto,
              lancadoPorId: prod.lancadoPorId || null,
              removido: Boolean(prod.removido),
              removidoPorId: prod.removidoPorId || null,
              dataLancamento: prod.dataLancamento || null,
              dataRemocao: prod.dataRemocao || null,
              ncm: prod.ncm || null,
            }
          })

          const produtosMapeados = produtosMapeadosTodos.filter(prod => !prod.removido)
          console.log('✅ Produtos mapeados:', produtosMapeados)
          setProdutos(produtosMapeados)

          // Resumo financeiro alinhado ao DetalhesVendas.tsx:
          // A) total itens lançados (inclui removidos), B) itens cancelados, C) A-B, descontos e acréscimos
          const vendaCancelada = Boolean(vendaData.dataCancelamento || vendaData.canceladoPorId)
          let totalItensLancados = 0
          let totalItensCancelados = 0
          let totalDescontosConta = 0
          let totalAcrescimosConta = 0

          produtosMapeadosTodos.forEach(produto => {
            const valorBaseProduto = produto.valorUnitario * produto.quantidade
            const valorComplementos = (produto.complementos || []).reduce((sum, comp) => {
              const tipo = comp.tipoImpactoPreco || 'nenhum'
              const valorTotal = comp.valor * comp.quantidade * produto.quantidade
              if (tipo === 'aumenta') return sum + valorTotal
              if (tipo === 'diminui') return sum - valorTotal
              return sum
            }, 0)
            const subtotal = valorBaseProduto + valorComplementos

            let valorDesconto = 0
            if (produto.tipoDesconto && produto.valorDesconto) {
              if (produto.tipoDesconto === 'porcentagem') {
                valorDesconto = subtotal * (produto.valorDesconto / 100)
              } else {
                valorDesconto = produto.valorDesconto
              }
            }
            let valorAcrescimo = 0
            if (produto.tipoAcrescimo && produto.valorAcrescimo) {
              if (produto.tipoAcrescimo === 'porcentagem') {
                valorAcrescimo = subtotal * (produto.valorAcrescimo / 100)
              } else {
                valorAcrescimo = produto.valorAcrescimo
              }
            }

            totalDescontosConta += valorDesconto
            totalAcrescimosConta += valorAcrescimo

            const totalLinha = produto.valorFinal ?? subtotal - valorDesconto + valorAcrescimo
            totalItensLancados += totalLinha
            if (vendaCancelada || produto.removido) {
              totalItensCancelados += totalLinha
            }
          })

          setResumoFinanceiroDetalhes({
            totalItensLancados,
            totalItensCancelados,
            totalDosItens: totalItensLancados - totalItensCancelados,
            totalDescontosConta,
            totalAcrescimosConta,
          })
        } else {
          console.warn(
            '⚠️ Nenhum produto encontrado na resposta da API. Campos disponíveis:',
            Object.keys(vendaData)
          )
          setProdutos([])
          setResumoFinanceiroDetalhes(null)
        }

        // Pagamentos efetivos ou cobrança prevista da entrega.
        const pagamentosApi = Array.isArray(vendaData.pagamentos) ? vendaData.pagamentos : []
        const pagamentoEntregaApi =
          vendaData.pagamento && typeof vendaData.pagamento === 'object'
            ? (vendaData.pagamento as Record<string, any>)
            : null
        const meiosCobrancaApi = Array.isArray(pagamentoEntregaApi?.meios)
          ? pagamentoEntregaApi.meios
          : []

        if (pagamentosApi.length > 0) {
          const pagamentosMapeados: PagamentoSelecionado[] = pagamentosApi.map(
            (pag: Record<string, unknown>) => mapearPagamentoDetalheVenda(pag)
          )
          setPagamentos(pagamentosMapeados)
          setFluxoPagamentoEntrega(
            pagamentosMapeados.some(pag => pag.cobrarNaEntrega)
              ? 'cobrar_entregador'
              : 'ja_pago'
          )
        } else if (meiosCobrancaApi.length > 0) {
          const pagamentosPrevistos: PagamentoSelecionado[] = meiosCobrancaApi
            .map((meio: Record<string, any>) => ({
              id: meio.id != null ? String(meio.id) : undefined,
              meioPagamentoId: String(meio.meioPagamentoId ?? meio.id ?? '').trim(),
              valor: Number(meio.valor ?? 0) || 0,
              cobrarNaEntrega: true,
            }))
            .filter((pag: PagamentoSelecionado) => pag.meioPagamentoId && pag.valor > 0)
          setPagamentos(pagamentosPrevistos)
          setFluxoPagamentoEntrega('cobrar_entregador')
        } else {
          setPagamentos([])
          if (
            pagamentoEntregaApi?.cobrarCliente === true ||
            String(pagamentoEntregaApi?.status ?? '').toLowerCase() === 'pendente'
          ) {
            setFluxoPagamentoEntrega('cobrar_entregador')
          }
        }

        // Resolver nomes de usuários em lote (sem exibir IDs)
        const idsUsuarios = new Set<string>()
        ;[vendaData.abertoPorId, vendaData.ultimoResponsavelId, vendaData.canceladoPorId].forEach(
          (id: unknown) => {
            const v = String(id || '').trim()
            if (v) idsUsuarios.add(v)
          }
        )
        ;(vendaData.produtosLancados || vendaData.produtos || []).forEach((prod: any) => {
          const lancadoPorId = String(prod?.lancadoPorId || '').trim()
          const removidoPorId = String(prod?.removidoPorId || '').trim()
          if (lancadoPorId) idsUsuarios.add(lancadoPorId)
          if (removidoPorId) idsUsuarios.add(removidoPorId)
        })
        ;(vendaData.pagamentos || []).forEach((pag: any) => {
          const realizadoPorId = String(pag?.realizadoPorId || '').trim()
          const canceladoPorId = String(pag?.canceladoPorId || '').trim()
          if (realizadoPorId) idsUsuarios.add(realizadoPorId)
          if (canceladoPorId) idsUsuarios.add(canceladoPorId)
        })

        const mapUsuarios: Record<string, string> = {}
        await Promise.all(
          Array.from(idsUsuarios).map(async usuarioId => {
            try {
              const endpoint =
                tabelaOrigemVenda === 'venda_gestor'
                  ? `/api/pessoas/usuarios-gestor/${usuarioId}`
                  : `/api/usuarios/${usuarioId}`
              const r = await fetch(endpoint, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              if (!r.ok) return
              const d = await r.json()
              const nome = String(d?.nome || d?.name || d?.username || '').trim()
              if (nome) mapUsuarios[usuarioId] = nome
            } catch {
              // segue silenciosamente; a UI usa fallback amigável
            }
          })
        )
        setNomesUsuariosPedido(mapUsuarios)

        // Resolver nomes de meios de pagamento faltantes da lista em memória (otimiza chamadas)
        const mapMeios: Record<string, string> = {}
        const idsMeios = new Set<string>()
        ;(vendaData.pagamentos || []).forEach((pag: any) => {
          const meioId = String(pag?.meioPagamentoId || '').trim()
          if (meioId) idsMeios.add(meioId)
        })
        meiosCobrancaApi.forEach((meio: any) => {
          const meioId = String(meio?.meioPagamentoId || meio?.id || '').trim()
          if (meioId) idsMeios.add(meioId)
          if (meioId && typeof meio?.nome === 'string' && meio.nome.trim()) {
            mapMeios[meioId] = meio.nome.trim()
          }
        })

        await Promise.all(
          Array.from(idsMeios).map(async meioId => {
            const meioCache = meiosPagamentoRef.current.find(m => m.getId() === meioId)
            if (meioCache) {
              mapMeios[meioId] = meioCache.getNome()
              return
            }
            try {
              const r = await fetch(`/api/meios-pagamentos/${meioId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              if (!r.ok) return
              const d = await r.json()
              const nome = String(d?.nome || d?.name || '').trim()
              if (nome) mapMeios[meioId] = nome
            } catch {
              // fallback visual amigável
            }
          })
        )
        setNomesMeiosPagamentoPedido(mapMeios)

        // Se estiver em modo visualização, ir direto para step 4
        if (modoVisualizacao) {
          setCurrentStep(4)
        }
      } catch (error: any) {
        console.error('Erro ao carregar venda:', error)
        showToast.error(error.message || 'Erro ao carregar dados da venda')
        onCloseRef.current()
      } finally {
        setIsLoadingVenda(false)
      }
    },
    [vendaId, vendaIdCriada, open, modoVisualizacao, tabelaOrigemVenda]
  )

  // Sincroniza o estado interno com o prop open; janela curta sem fechar pelo backdrop (hardware com duplo clique)
  useEffect(() => {
    setInternalDialogOpen(open)
    if (open) {
      ignorarBackdropAteRef.current = Date.now() + 550
    }
  }, [open])

  // Ao abrir um novo pedido (sem vendaId), define o step inicial como 1
  useEffect(() => {
    if (open && !vendaId) {
      setCurrentStep(1)
    }
  }, [open, vendaId])

  // Carregar venda existente quando modal abrir com vendaId
  useEffect(() => {
    if (open && vendaId) {
      // Se estiver em modo visualização, definir currentStep como 4 imediatamente
      // Mas ainda mostrar loading até os dados carregarem
      if (modoVisualizacao) {
        setCurrentStep(4)
      } else {
        setCurrentStep(1)
      }
      carregarVendaExistente()
    }
    // Limpeza ao fechar fica em resetForm via Transition onExited (evita sumir o conteúdo no meio do slide)
  }, [open, vendaId, modoVisualizacao, carregarVendaExistente])

  // Buscar nome do usuário gestor quando o modal abrir
  useEffect(() => {
    const fetchNomeUsuario = async () => {
      if (!open) {
        return
      }
      if (!auth) {
        setNomeUsuario('')
        nomeUsuarioCarregadoNoCicloRef.current = false
        setIsLoadingUsuario(false)
        return
      }

      if (nomeUsuarioCarregadoNoCicloRef.current) {
        return
      }
      nomeUsuarioCarregadoNoCicloRef.current = true

      try {
        setIsLoadingUsuario(true)
        const token = auth.getAccessToken()
        if (!token) {
          setNomeUsuario('')
          nomeUsuarioCarregadoNoCicloRef.current = false
          return
        }

        // 1. Buscar dados do /api/auth/me para obter o userId
        const meResponse = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!meResponse.ok) {
          setNomeUsuario('')
          nomeUsuarioCarregadoNoCicloRef.current = false
          return
        }

        const meData = await meResponse.json()
        const userId = meData.sub || meData.userId

        if (!userId) {
          setNomeUsuario('')
          nomeUsuarioCarregadoNoCicloRef.current = false
          return
        }

        // 2. Buscar dados completos do usuário gestor
        const gestorResponse = await fetch(`/api/pessoas/usuarios-gestor/${userId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!gestorResponse.ok) {
          // Se não encontrar, tenta usar o nome do User do authStore como fallback
          const user = auth.getUser()
          setNomeUsuario(user?.getName() || '')
          nomeUsuarioCarregadoNoCicloRef.current = false
          return
        }

        const gestorData = await gestorResponse.json()
        setNomeUsuario(gestorData.nome || gestorData.username || '')
      } catch (error) {
        // Em caso de erro, tenta usar o nome do User do authStore como fallback
        const user = auth.getUser()
        setNomeUsuario(user?.getName() || '')
        nomeUsuarioCarregadoNoCicloRef.current = false
      } finally {
        setIsLoadingUsuario(false)
      }
    }

    fetchNomeUsuario()
  }, [open, auth])

  // Refetch manual removido: o hook já controla atualização ao montar/abrir.

  // Intercepta o fechamento do Dialog
  const handleDialogOpenChange = (isOpen: boolean, reason?: 'backdropClick' | 'escapeKeyDown') => {
    if (!isOpen) {
      // Segundo "clique" do mouse pode cair no backdrop antes do painel capturar o foco
      if (reason === 'backdropClick' && Date.now() < ignorarBackdropAteRef.current) {
        setInternalDialogOpen(true)
        return
      }
      // Tentando fechar o modal
      if (temDadosVenda()) {
        // Impede o fechamento e mostra o modal de confirmação
        setInternalDialogOpen(true)
        setModalConfirmacaoSaidaOpen(true)
      } else {
        // Permite o fechamento se não houver dados (reset após Slide — onExited)
        setInternalDialogOpen(false)
        onClose()
      }
    } else {
      setInternalDialogOpen(true)
    }
  }

  // Validação dos steps
  function validarInformacoesPedido(exibirToast = false): boolean {
    if (!pedidoDeliveryGestor) return true

    if (!clienteEntregaVinculado?.id) {
      if (exibirToast) showToast.error('Informe o cliente do pedido antes de continuar.')
      return false
    }

    if (pedidoComEntrega && !moradaEntregaSelecionada?.endereco) {
      if (exibirToast) showToast.error('Selecione ou cadastre o endereço de entrega.')
      return false
    }

    if (pedidoComEntrega && !entregadorId) {
      if (exibirToast) showToast.error('Selecione o entregador antes de continuar.')
      return false
    }

    return true
  }

  const canGoToStep2 = () => {
    // entrega: step 1 = Produtos → precisa de pelo menos um produto para avançar
    if (tipoInicioPedido === 'entrega') return produtos.length > 0
    // balcão: step 1 = Produtos → precisa de pelo menos um produto para avançar ao pagamento
    return produtos.length > 0
  }

  const canGoToStep3 = () => {
    // entrega: step 2 = Informações → exige cliente/endereço/entregador conforme modalidade
    if (tipoInicioPedido === 'entrega') return validarInformacoesPedido(false)
    // balcão: step 2 = Produtos → precisa de pelo menos um produto
    return produtos.length > 0
  }

  const canSubmit = () => {
    if (!validarInformacoesPedido(false)) return false

    if (pedidoEntregaAceitaPagamentoPendente) {
      if (entregaComCobrancaPeloEntregador) return produtos.length > 0 && pagamentos.length > 0
      if (pagamentos.length === 0) return false
      return Math.abs(totalProdutos - totalPagamentos) <= 0.01 || (totalPagamentos > totalProdutos && troco > 0)
    }

    if (pedidoGestorComPagamentoNoPasso3) {
      // Se for FINALIZADA ou PENDENTE_EMISSAO, o pagamento TEM QUE estar completo (só dinheiro permite troco).
      if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
        if (pagamentos.length === 0) return false
        
        // Se houver algum pagamento não efetivo, não pode finalizar a venda
        // Pagamento não efetivo é aquele que precisa ser cobrado do cliente posteriormente
        if (pagamentos.some(p => p.naoEfetivo)) return false

        const diferenca = totalProdutos - totalPagamentos
        if (Math.abs(diferenca) <= 0.01) return true
        if (totalPagamentos > totalProdutos && troco > 0) return true
        return false
      }

      // Se for ABERTA, apenas permitir sem pagamentos se NÃO tiver cobrança pelo entregador e a UI permitir salvar aberta
      if (pagamentos.length === 0) return false

      // Aceitar quando os pagamentos cobrem o total (com tolerância de 0.01)
      // Ou quando há troco (pagamentos ultrapassam o total, o que é válido para dinheiro)
      const diferenca = totalProdutos - totalPagamentos

      // Se os pagamentos cobrem exatamente o total (diferença <= 0.01)
      if (Math.abs(diferenca) <= 0.01) return true

      // Se os pagamentos ultrapassam o total, verificar se há troco válido
      // (significa que foi um pagamento em dinheiro que gerou troco)
      if (totalPagamentos > totalProdutos && troco > 0) return true

      // Caso contrário, ainda falta pagar (e o status indica que o pagamento deve ser integral)
      return false
    }
    return true
  }

  // Navegação entre steps
  const handleNextStep = () => {
    // Não permitir navegação em modo visualização
    if (vendaId && modoVisualizacao) {
      return
    }

    if (currentStep === 1 && canGoToStep2()) {
      setCurrentStep(tipoInicioPedido === 'entrega' ? 2 : 3)
    } else if (currentStep === 1 && !canGoToStep2()) {
      showToast.error('Adicione pelo menos um produto antes de continuar')
    } else if (currentStep === 2 && canGoToStep3()) {
      setCurrentStep(3)
    } else if (currentStep === 2 && !canGoToStep3()) {
      if (tipoInicioPedido === 'entrega') {
        validarInformacoesPedido(true)
      } else {
        showToast.error('Adicione pelo menos um produto antes de continuar')
      }
    }
  }

  const handlePreviousStep = () => {
    if (vendaId && modoVisualizacao) {
      return
    }

    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(tipoInicioPedido === 'entrega' ? 2 : 1)
    }
  }

  const novoPedidoContextValue = {
    abaDetalhesPedido,
    adicionarPagamentoPorCard,
    adicionarProduto,
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    atualizarComplemento,
    atualizarProduto,
    buscaProdutoFiltrada,
    buscaProdutoTexto,
    calcularTotalProduto,
    cancelarNotaFiscalVendaGestor,
    cancelarNotaFiscalVendaPdv,
    cancelarVendaGestor,
    catalogoProdutosPorId,
    clienteTabsModalEntregaState,
    clienteEntregaVinculado,
    clienteNome,
    confirmarEdicaoProduto,
    confirmarLancamentoProdutoPainel,
    currentStep,
    dataVenda,
    detalhesPedidoMeta,
    ehAcrescimo,
    ehPorcentagem,
    empresa,
    entregadorId,
    entregadores,
    entregadoresQuery,
    fluxoPagamentoEntrega,
    formatarDataDetalhePedido,
    formatarDataHoraResumoFiscal,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarUsuarioPorId,
    formatarValorComplemento,
    formatarValorRecebido,
    grupoSelecionadoId,
    grupos,
    gruposExpandido,
    gruposScrollRef,
    handleAbrirEdicaoClienteEntrega,
    handleAbrirEdicaoProdutoDetalhes,
    handleCancelarSaida,
    handleFecharClienteTabsModalEntrega,
    handleFecharProdutoTabsModal,
    handleClose,
    handleConfirmarCancelamentoVenda,
    handleConfirmarSaida,
    handleMouseDown,
    handleMouseDownMeiosPagamento,
    handleMouseLeave,
    handleMouseMove,
    handleMouseUp,
    handleRemoveCliente,
    handleReloadClienteEntregaAposEdicao,
    handleSelectCliente,
    handleTabChangeClienteTabsModalEntrega,
    handleTabChangeProdutoModal,
    handleTipoAtendimentoDeliveryChange,
    hasMovedMeiosPagamentoRef,
    hasMovedRef,
    isDragging,
    isDraggingMeiosPagamento,
    isLoadingVenda,
    isLoadingBuscaProdutos,
    isLoadingGruposVenda,
    isLoadingProdutos,
    indiceLinhaPainelProduto,
    justificativaCancelamento,
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    longPressIndexRef,
    longPressTimeoutRef,
    meioPagamentoId,
    meiosPagamento,
    meiosPagamentoScrollRef,
    moradaEntregaSelecionada,
    mostrarLoadingFormasPagamento,
    modoVisualizacao,
    modalCancelarVendaOpen,
    modalConfirmacaoSaidaOpen,
    modalEdicaoProdutoOpen,
    modalLancamentoProdutoPainelOpen,
    nomesMeiosPagamentoPedido,
    obterIconeMeioPagamento,
    obterTotalComplemento,
    origem,
    origemTextoApiDetalhe,
    pagamentoModoCobranca,
    pagamentos,
    pagamentosVisiveisNaAbaDetalhes,
    podeEditarPagamentoEntregaEmAberto,
    podeExibirAbaNotaFiscal,
    pedidoComEntrega,
    pedidoComRetirada,
    pedidoDeliveryGestor,
    pedidoEntregaAceitaPagamentoPendente,
    pedidoGestorComPagamentoNoPasso3,
    produtoIndexEdicao,
    produtoParaLancamentoPainel,
    produtoTabsModalState,
    produtoTemComplementos,
    produtos,
    produtosError,
    produtosList,
    removerComplemento,
    removerPagamento,
    removerProduto,
    resumoFinanceiroDetalhes,
    resumoFiscal,
    rotuloModeloNfe,
    rotuloCobrancaPendente,
    rotuloStatusPagamentoExibicao,
    rotuloStatusResumoModal,
    setBuscaProdutoTexto,
    setClienteEntregaVinculado,
    setEhAcrescimo,
    setEhPorcentagem,
    setEntregadorId,
    setFluxoPagamentoEntrega,
    setGrupoSelecionadoId,
    setGruposExpandido,
    setMeioPagamentoId,
    setIndiceLinhaPainelProduto,
    setJustificativaCancelamento,
    setModalCancelarVendaOpen,
    setModalConfirmacaoSaidaOpen,
    setModalEdicaoProdutoOpen,
    setModalLancamentoProdutoPainelOpen,
    setMoradaEntregaSelecionada,
    setPagamentos,
    setProdutoIndexEdicao,
    setProdutoParaLancamentoPainel,
    setQuantidadeEdicao,
    setOrigem,
    setSeletorClienteOpen,
    setStatus,
    setTaxaEntregaId,
    setTelefoneBuscadoEntrega,
    setTelefoneBuscaEntrega,
    setTempoPrevistoMinutos,
    setTooltipGrupoId,
    setTooltipPosition,
    setTipoCancelamentoSelecionado,
    setValoresEmEdicao,
    setValorDescontoAcrescimo,
    setValorFinalVenda,
    setValorRecebido,
    setValorUnitarioEdicaoPainel,
    status,
    statusFiscalUnificado,
    statusDisponiveis,
    statusPagamentoExibicao,
    tabelaOrigemVenda,
    subtotalProdutos,
    taxaEntregaId,
    taxaEntregaSelecionada,
    taxasEntrega,
    taxasEntregaQuery,
    telefoneBuscadoEntrega,
    telefoneBuscaEntrega,
    tempoPrevistoMinutos,
    tipoCancelamentoSelecionado,
    tipoInicioPedido,
    tooltipGrupoId,
    tooltipPosition,
    totalItensPedido,
    totalPagamentos,
    totalPagamentosLancados,
    totalProdutos,
    trocoLancamento,
    valorAPagarLancamento,
    valorAPagar,
    valorDescontoAcrescimo,
    valorFinalVenda,
    valorRecebido,
    valorTaxaEntrega,
    valorUnitarioEdicaoPainel,
    valoresEmEdicao,
    quantidadeEdicao,
    seletorClienteOpen,
  }

  return (
    <NovoPedidoProvider value={novoPedidoContextValue}>
      <>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <Dialog
        open={internalDialogOpen}
        onOpenChange={handleDialogOpenChange}
        maxWidth={false}
        TransitionComponent={JiffyPainelSlide}
        transitionDuration={{ enter: 420, exit: 380 }}
        TransitionProps={{ onExited: handlePedidoPainelExited }}
        slots={{ backdrop: PainelPedidoBackdrop }}
        sx={{
          '& .MuiDialog-container': {
            zIndex: 1300,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'flex-end',
          },
          '& .MuiBackdrop-root': {
            zIndex: 1300,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            transition: 'none',
          },
          '& .MuiDialog-paper': {
            zIndex: 1300,
            backgroundColor: '#ffffff',
            opacity: 1,
            height: '100vh',
            maxHeight: '100vh',
            margin: 0,
            marginLeft: 'auto',
            // Mesma escala de largura que `GruposComplementosTabsModal` (panelClassName responsivo)
            width: { xs: '95vw', sm: '90vw', md: 'min(900px, 45vw)' },
            maxWidth: '100vw',
            borderRadius: 0,
          },
        }}
      >
        <DialogContent
          sx={{
            width: '100%',
            height: '100%',
            maxHeight: '100vh',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <NovoPedidoHeader
            modoVisualizacao={modoVisualizacao}
            nomeUsuario={nomeUsuario}
            currentStep={currentStep}
            isLoadingVenda={isLoadingVenda}
            abaDetalhesPedido={abaDetalhesPedido}
            onAbaDetalhesPedidoChange={setAbaDetalhesPedido}
            podeExibirAbaNotaFiscal={podeExibirAbaNotaFiscal}
          />
          <NovoPedidoStepper
            currentStep={currentStep}
            modoVisualizacao={modoVisualizacao}
            tipoInicioPedido={tipoInicioPedido}
          />

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '0 24px',
              minHeight: 0,
            }}
            className="scrollbar-thin"
          >
            {/* Loading em modo visualização - não mostrar steps até carregar */}
            {modoVisualizacao && isLoadingVenda && (
              <div className="flex h-full items-center justify-center bg-gray-50">
                <JiffyLoading />
              </div>
            )}

            <PedidoWizardStepsView />        
            <PedidoDetalhesView />
          </div>

          <NovoPedidoFooterShell>
            {/* Rodapé em faixa (mesmo padrão visual de `JiffySidePanelModal` footerVariant="bar") */}
            {currentStep === 4 ? (
              (() => {
                type ChaveRodape4 = 'cancelVenda' | 'cancelNota' | 'salvarCobranca' | 'fechar'
                const chaves: ChaveRodape4[] = []
                if (podeExibirCancelarVendaGestor) chaves.push('cancelVenda')
                if (podeExibirCancelarNotaFiscal) chaves.push('cancelNota')
                if (podeEditarPagamentoEntregaEmAberto && abaDetalhesPedido === 'pagamentos') {
                  chaves.push('salvarCobranca')
                }
                chaves.push('fechar')
                const n = chaves.length
                const painelRaioEsqInf = '0.75rem'
                return (
                  <div className="shrink-0 bg-white">
                    <div
                      className="grid w-full"
                      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                    >
                      {chaves.map((key, i) => (
                        <div
                          key={key}
                          className={
                            i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'
                          }
                        >
                          {key === 'cancelVenda' ? (
                            <Button
                              type="button"
                              variant="contained"
                              color="error"
                              disabled={
                                cancelarVendaGestor.isPending ||
                                cancelarNotaFiscalVendaPdv.isPending ||
                                cancelarNotaFiscalVendaGestor.isPending
                              }
                              onClick={() => {
                                setTipoCancelamentoSelecionado('venda')
                                setModalCancelarVendaOpen(true)
                              }}
                              className="h-12 min-h-12 w-full font-semibold shadow-none"
                              sx={{
                                borderRadius: 0,
                                boxShadow: 'none',
                                ...(i === 0 ? { borderBottomLeftRadius: painelRaioEsqInf } : {}),
                              }}
                            >
                              <span className="inline-flex w-full items-center justify-center gap-2">
                                <MdCancel className="h-5 w-5 shrink-0" aria-hidden />
                                Cancelar Venda
                              </span>
                            </Button>
                          ) : null}
                          {key === 'cancelNota' ? (
                            <Button
                              type="button"
                              variant="contained"
                              color="error"
                              disabled={
                                cancelarVendaGestor.isPending ||
                                cancelarNotaFiscalVendaPdv.isPending ||
                                cancelarNotaFiscalVendaGestor.isPending
                              }
                              onClick={() => {
                                setTipoCancelamentoSelecionado('nota')
                                setModalCancelarVendaOpen(true)
                              }}
                              className="h-12 min-h-12 w-full font-semibold shadow-none"
                              sx={{
                                borderRadius: 0,
                                boxShadow: 'none',
                                ...(i === 0 ? { borderBottomLeftRadius: painelRaioEsqInf } : {}),
                              }}
                            >
                              <span className="inline-flex w-full items-center justify-center gap-2">
                                <MdCancel className="h-5 w-5 shrink-0" aria-hidden />
                                Cancelar Nota
                              </span>
                            </Button>
                          ) : null}
                          {key === 'salvarCobranca' ? (
                            <Button
                              type="button"
                              variant="contained"
                              color="primary"
                              onClick={handleSalvarPagamentoEntregaEmAberto}
                              disabled={isSavingPagamentoEntrega || pagamentos.length === 0}
                              className="h-12 min-h-12 w-full font-semibold shadow-none"
                              sx={footerSavePrimaryBarSx(i === 0)}
                            >
                              {isSavingPagamentoEntrega ? 'Salvando...' : 'Salvar cobrança'}
                            </Button>
                          ) : null}
                          {key === 'fechar' ? (
                            <Button
                              type="button"
                              variant="contained"
                              color="primary"
                              onClick={() => {
                                onSuccess()
                                onClose()
                              }}
                              className="h-12 min-h-12 w-full font-semibold shadow-none"
                              sx={footerSavePrimaryBarSx(i === 0)}
                            >
                              {modoVisualizacao ? 'Fechar' : 'Concluir'}
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : (
              (() => {
                type ChaveWizard = 'cancelar' | 'anterior' | 'proximo' | 'criar'
                const chaves: ChaveWizard[] = ['cancelar']
                if (currentStep > 1) chaves.push('anterior')
                if (currentStep < 3) chaves.push('proximo')
                else chaves.push('criar')
                const n = chaves.length
                return (
                  <div className="shrink-0 bg-white">
                    <div
                      className="grid w-full"
                      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
                    >
                      {chaves.map((key, i) => {
                        const isPrimeiraColuna = i === 0
                        return (
                          <div
                            key={key}
                            className={
                              i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'
                            }
                          >
                            {key === 'cancelar' ? (
                              <Button
                                type="button"
                                variant="outlined"
                                color="inherit"
                                onClick={handleClose}
                                disabled={createVendaGestor.isPending}
                                className="h-12 min-h-12 w-full font-semibold shadow-none"
                                sx={footerBarGrayBarSx(isPrimeiraColuna)}
                              >
                                Cancelar
                              </Button>
                            ) : null}
                            {key === 'anterior' ? (
                              <Button
                                type="button"
                                variant="outlined"
                                color="inherit"
                                onClick={handlePreviousStep}
                                disabled={createVendaGestor.isPending}
                                className="h-12 min-h-12 w-full font-semibold shadow-none"
                                sx={footerBarPrimaryMutedSx(isPrimeiraColuna)}
                              >
                                <span className="inline-flex w-full items-center justify-center gap-1.5">
                                  <MdArrowBack className="h-5 w-5 shrink-0" aria-hidden />
                                  Anterior
                                </span>
                              </Button>
                            ) : null}
                            {key === 'proximo' ? (
                              <Button
                                type="button"
                                variant="contained"
                                color="primary"
                                onClick={handleNextStep}
                                disabled={createVendaGestor.isPending}
                                className="h-12 min-h-12 w-full font-semibold shadow-none"
                                sx={footerSavePrimaryBarSx(isPrimeiraColuna)}
                              >
                                <span className="inline-flex w-full items-center justify-center gap-1.5">
                                  Próximo
                                  <MdArrowForward className="h-5 w-5 shrink-0" aria-hidden />
                                </span>
                              </Button>
                            ) : null}
                            {key === 'criar' ? (
                              <Button
                                type="button"
                                variant="contained"
                                color="primary"
                                onClick={handleSubmit}
                                disabled={createVendaGestor.isPending || !canSubmit()}
                                className="h-12 min-h-12 w-full font-semibold shadow-none"
                                sx={footerSavePrimaryBarSx(isPrimeiraColuna)}
                              >
                                {createVendaGestor.isPending ? 'Criando...' : 'Criar Pedido'}
                              </Button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </NovoPedidoFooterShell>
        </DialogContent>

        <NovoPedidoAuxiliaryModals />
      </Dialog>
      </>
    </NovoPedidoProvider>
  )
}
