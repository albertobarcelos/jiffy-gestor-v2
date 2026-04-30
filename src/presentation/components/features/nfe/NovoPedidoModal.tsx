'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import { useNovoPedidoArrasteListas } from '@/src/presentation/hooks/useNovoPedidoArrasteListas'
import { useNovoPedidoCatalogoQueries } from '@/src/presentation/hooks/useNovoPedidoCatalogoQueries'
import { useNovoPedidoFinanceiro } from '@/src/presentation/hooks/useNovoPedidoFinanceiro'
import { useFormatarUsuarioPedido } from '@/src/presentation/hooks/useFormatarUsuarioPedido'
import { Produto } from '@/src/domain/entities/Produto'
import { Cliente } from '@/src/domain/entities/Cliente'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useCreateVendaGestor,
  useCancelarVendaGestor,
  useCancelarNotaFiscalVendaPdv,
  useCancelarNotaFiscalVendaGestor,
} from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdArrowForward, MdArrowBack, MdPerson, MdCancel } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { SeletorClienteModal } from './SeletorClienteModal'
import {
  ModalLancamentoProdutoPainel,
  type ModalLancamentoProdutoPainelConfirmPayload,
} from './ModalLancamentoProdutoPainel'
import { ModalBuscaProdutosPedido } from './ModalBuscaProdutosPedido'
import { PainelEdicaoProdutoLinhaPedido } from './PainelEdicaoProdutoLinhaPedido'
import {
  ProdutosTabsModal,
  ProdutosTabsModalState,
} from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import {
  PainelPedidoBackdrop,
  JiffyPainelSlide,
  footerBarGrayBarSx,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import type {
  AbaDetalhesPedido,
  ComplementoSelecionado,
  DetalhesPedidoMeta,
  OrigemVenda,
  PagamentoSelecionado,
  ProdutoSelecionado,
  ResumoFinanceiroDetalhes,
  ResumoFiscalVenda,
  StatusVenda,
} from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.types'
import {
  mapearPagamentoDetalheVenda,
  statusFiscalPermiteAbaNotaFiscal,
  statusFiscalPermiteCancelarNota,
} from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.utils'
import {
  calcularTotalProduto,
  formatarDataDetalhePedido,
  formatarDataHoraResumoFiscal,
  formatarDescontoAcrescimo,
  formatarNumeroComMilhar,
  formatarValorComplemento,
  formatarValorRecebido,
  rotuloModeloNfe,
} from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.calculos'
import { obterIconeMeioPagamento } from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.meioPagamentoIcon'

/** Fallback ao carregar o indicador de passos (faixa compacta). */
function NovoPedidoStepIndicatorFallback() {
  return (
    <div className="mt-2 flex h-10 items-center justify-center">
      <JiffyLoading />
    </div>
  )
}

/** Fallback ao carregar o conteúdo de cada passo (área rolável). */
function NovoPedidoStepFallback() {
  return (
    <div className="flex min-h-[160px] flex-1 items-center justify-center py-8">
      <JiffyLoading />
    </div>
  )
}

const NovoPedidoStepIndicator = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/nfe/NovoPedidoModal/NovoPedidoStepIndicator'
    ).then(m => m.NovoPedidoStepIndicator),
  { loading: NovoPedidoStepIndicatorFallback, ssr: false }
)

const InformacoesPedidoStep = dynamic(
  () =>
    import('@/src/presentation/components/features/nfe/NovoPedidoModal/InformacoesPedidoStep').then(
      m => m.InformacoesPedidoStep
    ),
  { loading: NovoPedidoStepFallback, ssr: false }
)

const ProdutosPedidoStep = dynamic(
  () =>
    import('@/src/presentation/components/features/nfe/NovoPedidoModal/ProdutosPedidoStep').then(
      m => m.ProdutosPedidoStep
    ),
  { loading: NovoPedidoStepFallback, ssr: false }
)

const PagamentoPedidoStep = dynamic(
  () =>
    import('@/src/presentation/components/features/nfe/NovoPedidoModal/PagamentoPedidoStep').then(
      m => m.PagamentoPedidoStep
    ),
  { loading: NovoPedidoStepFallback, ssr: false }
)

const DetalhesPedidoStep = dynamic(
  () =>
    import('@/src/presentation/components/features/nfe/NovoPedidoModal/DetalhesPedidoStep').then(
      m => m.DetalhesPedidoStep
    ),
  { loading: NovoPedidoStepFallback, ssr: false }
)

interface NovoPedidoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  /** Chamado após o painel terminar a transição de saída (permite desmontar o pai sem cortar o slide) */
  onAfterClose?: () => void
  // Props opcionais para visualizar venda existente
  vendaId?: string // ID da venda para carregar e visualizar
  modoVisualizacao?: boolean // Se true, abre direto na step 4 em modo apenas visualização
  /** GET gestor vs PDV (`/api/vendas/gestor/:id` vs `/api/vendas/:id`); com `incluirFiscal=true` no carregamento */
  tabelaOrigemVenda?: 'venda' | 'venda_gestor'
  /**
   * `statusFiscal` do GET vendas unificado (Kanban). No PDV o GET de detalhe não repete esse campo;
   * use-o para saber se a nota está EMITIDA antes/sem depender só do `resumoFiscal`.
   */
  statusFiscalUnificado?: string | null
}

export function NovoPedidoModal({
  open,
  onClose,
  onSuccess,
  onAfterClose,
  vendaId,
  modoVisualizacao,
  tabelaOrigemVenda = 'venda_gestor',
  statusFiscalUnificado = null,
}: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const createVendaGestor = useCreateVendaGestor()
  const cancelarVendaGestor = useCancelarVendaGestor()
  const cancelarNotaFiscalVendaPdv = useCancelarNotaFiscalVendaPdv()
  const cancelarNotaFiscalVendaGestor = useCancelarNotaFiscalVendaGestor()

  const [origem, setOrigem] = useState<OrigemVenda>('GESTOR')
  const [status, setStatus] = useState<StatusVenda>('FINALIZADA')
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteNome, setClienteNome] = useState<string>('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  const [pagamentos, setPagamentos] = useState<PagamentoSelecionado[]>([])
  const [meioPagamentoId, setMeioPagamentoId] = useState<string>('')
  const [valorRecebido, setValorRecebido] = useState<string>('')
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  // Lista de grupos recolhível no passo 2: quando oculta, a área de produtos selecionados aumenta
  const [gruposExpandido, setGruposExpandido] = useState(true)
  const [seletorClienteOpen, setSeletorClienteOpen] = useState(false)
  const [tooltipGrupoId, setTooltipGrupoId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [nomeUsuario, setNomeUsuario] = useState<string>('')
  const [isLoadingUsuario, setIsLoadingUsuario] = useState(false)

  // Estados para carregamento de venda existente
  const [isLoadingVenda, setIsLoadingVenda] = useState(false)
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
  const [abaDetalhesPedido, setAbaDetalhesPedido] = useState<AbaDetalhesPedido>('infoPedido')
  const [detalhesPedidoMeta, setDetalhesPedidoMeta] = useState<DetalhesPedidoMeta | null>(null)
  const [nomesUsuariosPedido, setNomesUsuariosPedido] = useState<Record<string, string>>({})
  const [nomesMeiosPagamentoPedido, setNomesMeiosPagamentoPedido] = useState<
    Record<string, string>
  >({})
  const [resumoFinanceiroDetalhes, setResumoFinanceiroDetalhes] =
    useState<ResumoFinanceiroDetalhes | null>(null)
  const [vendaIdCriada, setVendaIdCriada] = useState<string | null>(null)
  const [resumoFiscal, setResumoFiscal] = useState<ResumoFiscalVenda | null>(null)
  /** Texto bruto de `origem` no GET de detalhe (GESTOR/PDV/…); PDV muitas vezes omite o campo */
  const [origemTextoApiDetalhe, setOrigemTextoApiDetalhe] = useState<string | null>(null)
  /** Texto bruto de `statusVenda` no GET de detalhe (Gestor pode vir null) */
  const [statusVendaTextoApiDetalhe, setStatusVendaTextoApiDetalhe] = useState<string | null>(null)

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
  const [modalBuscaProdutosOpen, setModalBuscaProdutosOpen] = useState(false)
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

  const nomeUsuarioCarregadoNoCicloRef = useRef(false)

  // Refs para long press na linha do produto
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndexRef = useRef<number | null>(null)

  // Refs para long press na linha do complemento
  const longPressComplementoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressComplementoIndexRef = useRef<number | null>(null)
  // Evita POST duplicado quando o usuário clica duas vezes rápido em "Criar Pedido" (isPending não bloqueia a tempo)
  const criacaoVendaGestorEmAndamentoRef = useRef(false)
  /** Ignora clique fantasma no backdrop logo após abrir (ex.: mouse com bounce duplo) */
  const ignorarBackdropAteRef = useRef(0)

  const {
    gruposScrollRef,
    isDragging,
    hasMovedRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    meiosPagamentoScrollRef,
    isDraggingMeiosPagamento,
    hasMovedMeiosPagamentoRef,
    handleMouseDownMeiosPagamento,
  } = useNovoPedidoArrasteListas()

  const {
    grupos,
    isLoadingGrupos,
    produtosList,
    isLoadingProdutos,
    produtosError,
    meiosPagamento,
    mostrarLoadingFormasPagamento,
  } = useNovoPedidoCatalogoQueries({
    open,
    modoVisualizacao,
    currentStep,
    grupoSelecionadoId,
    vendaId,
    token: auth?.getAccessToken() ?? null,
  })

  /** Produtos incluídos pela busca global ficam aqui até existirem em `produtosList` do grupo. */
  const produtosExtrasPorIdRef = useRef<Map<string, Produto>>(new Map())
  const [catalogoExtrasVersao, setCatalogoExtrasVersao] = useState(0)

  const produtosCatalogoUnificado = useMemo(() => {
    const map = new Map<string, Produto>()
    for (const p of produtosList) {
      map.set(p.getId(), p)
    }
    produtosExtrasPorIdRef.current.forEach((p, id) => {
      if (!map.has(id)) map.set(id, p)
    })
    return Array.from(map.values())
  }, [produtosList, catalogoExtrasVersao])

  const obterProdutoPorId = useCallback(
    (produtoId: string): Produto | undefined =>
      produtosList.find(p => p.getId() === produtoId) ??
      produtosExtrasPorIdRef.current.get(produtoId),
    [produtosList]
  )

  // Handler para seleção de cliente
  const handleSelectCliente = (cliente: Cliente) => {
    setClienteId(cliente.getId())
    setClienteNome(cliente.getNome())
  }

  const handleRemoveCliente = () => {
    setClienteId('')
    setClienteNome('')
  }

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

  const { totalProdutos, totalPagamentos, valorAPagar, troco, pagamentosVisiveisNaAbaDetalhes } =
    useNovoPedidoFinanceiro({
      produtos,
      pagamentos,
      valorFinalVenda,
      meiosPagamento,
    })

  const formatarUsuarioPorId = useFormatarUsuarioPedido(nomesUsuariosPedido)

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

  // Função para verificar se é meio de pagamento em dinheiro
  const isMeioPagamentoDinheiro = (meioPagamentoId: string): boolean => {
    const meio = meiosPagamento.find(m => m.getId() === meioPagamentoId)
    if (!meio) return false
    const nomeMeio = meio.getNome().toLowerCase()
    return nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
  }

  // Função para adicionar pagamento ao clicar no card
  const adicionarPagamentoPorCard = (meioPagamentoIdSelecionado: string) => {
    // Se não houver valor digitado, usar o valor a pagar
    let valorParaUsar = 0

    if (valorRecebido && valorRecebido.trim() !== '') {
      // Converter valor formatado para número
      const valorLimpo = valorRecebido.replace(/\./g, '').replace(',', '.')
      valorParaUsar = parseFloat(valorLimpo) || 0
    } else {
      // Se não digitou valor, usar o valor a pagar
      valorParaUsar = valorAPagar
    }

    if (valorParaUsar <= 0) {
      showToast.error('Valor inválido')
      return
    }

    // Verificar se é dinheiro
    const isDinheiro = isMeioPagamentoDinheiro(meioPagamentoIdSelecionado)

    // Se não for dinheiro, limitar ao valor a pagar exato
    if (!isDinheiro && valorParaUsar > valorAPagar) {
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
    const produto = obterProdutoPorId(produtoId)
    if (!produto) return

    const mostrarAlterarPreco = produto.permiteAlterarPrecoAtivo()
    const mostrarComplementos = produto.abreComplementosAtivo() && produtoTemComplementos(produto)

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
        const antigo = atual?.complementos.find(x => x.grupoId === c.grupoId && x.id === c.id)
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
    // Fechamento e limpeza de `produtoParaLancamentoPainel` ficam no painel (onOpenChange + onAfterClose)
  }

  /** Adiciona ao pedido todas as linhas marcadas na busca (quantidade + valor do cadastro). */
  const confirmarBuscaProdutosPedido = (itens: Array<{ produto: Produto; quantidade: number }>) => {
    if (itens.length === 0) return

    for (const { produto } of itens) {
      produtosExtrasPorIdRef.current.set(produto.getId(), produto)
    }

    const novasLinhas: ProdutoSelecionado[] = itens.map(({ produto, quantidade }) => ({
      produtoId: produto.getId(),
      nome: produto.getNome(),
      quantidade: Math.max(1, Math.floor(quantidade)),
      valorUnitario: produto.getValor(),
      complementos: [],
      tipoDesconto: null,
      valorDesconto: null,
      tipoAcrescimo: null,
      valorAcrescimo: null,
    }))

    setCatalogoExtrasVersao(v => v + 1)
    setProdutos(prev => [...prev, ...novasLinhas])
  }

  /** Abre o painel de lançamento para ajustar complementos/preço em linha já na lista */
  const abrirModalComplementosProdutoExistente = (index: number) => {
    const produtoSelecionado = produtos[index]
    const produto = obterProdutoPorId(produtoSelecionado.produtoId)

    if (!produto) return

    setIndiceLinhaPainelProduto(index)
    setProdutoParaLancamentoPainel(produto)
    setModalLancamentoProdutoPainelOpen(true)
  }

  // Função para abrir modal de edição de produto
  const abrirModalEdicaoProduto = (index: number) => {
    const produto = produtos[index]
    // Buscar o produto atualizado da lista de produtos para verificar permiteDesconto e permiteAcrescimo
    const produtoEntity = obterProdutoPorId(produto.produtoId)
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

    // Buscar o produto atualizado da lista para verificar permiteDesconto e permiteAcrescimo
    const produtoEntity = obterProdutoPorId(produtoAtual.produtoId)
    const permiteDesconto = produtoEntity?.permiteDescontoAtivo() || false
    const permiteAcrescimo = produtoEntity?.permiteAcrescimoAtivo() || false
    const permiteAlterarPreco = produtoEntity?.permiteAlterarPrecoAtivo() ?? false

    let novoValorUnitario = produtoAtual.valorUnitario
    if (permiteAlterarPreco) {
      const limpo = valorUnitarioEdicaoPainel.replace(/\./g, '').replace(',', '.').trim()
      const v = parseFloat(limpo)
      if (valorUnitarioEdicaoPainel.trim() === '' || !Number.isFinite(v) || v <= 0) {
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

  const removerPagamento = (index: number) => {
    setPagamentos(pagamentos.filter((_, i) => i !== index))
  }

  const atualizarPagamento = (index: number, valor: number) => {
    const novosPagamentos = [...pagamentos]
    novosPagamentos[index] = { ...novosPagamentos[index], valor }
    setPagamentos(novosPagamentos)
  }

  const handleSubmit = async () => {
    if (criacaoVendaGestorEmAndamentoRef.current || createVendaGestor.isPending) {
      return
    }

    if (produtos.length === 0) {
      showToast.error('Adicione pelo menos um produto')
      return
    }

    // Se status é FINALIZADA ou PENDENTE_EMISSAO, precisa de pagamento
    if ((status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') && pagamentos.length === 0) {
      showToast.error('Adicione pelo menos uma forma de pagamento para vendas finalizadas')
      return
    }

    // Validar se pagamentos cobrem o total
    if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
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

    criacaoVendaGestorEmAndamentoRef.current = true
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
      // statusVenda = valor escolhido no passo 1 (ABERTA | FINALIZADA | PENDENTE_EMISSAO)
      const vendaData: any = {
        tipoVenda: 'balcao',
        origem,
        statusVenda: status,
        valorFinal: totalProdutos,
        totalDesconto: 0,
        totalAcrescimo: 0,
        produtosLancados,
        produtos: produtosLancados, // alias para compatibilidade
      }

      // solicitarEmissaoFiscal: true apenas quando status é PENDENTE_EMISSAO, false nos demais casos
      vendaData.solicitarEmissaoFiscal = status === 'PENDENTE_EMISSAO'

      // Log para debug
      console.log('📤 Payload sendo enviado:', JSON.stringify(vendaData, null, 2))

      // Adicionar clienteId se selecionado
      if (clienteId) {
        vendaData.clienteId = clienteId
      }

      // Se finalizada, adicionar dataFinalizacao e pagamentos
      if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
        vendaData.dataFinalizacao = new Date().toISOString()
        vendaData.pagamentos = pagamentos.map(p => ({
          meioPagamentoId: p.meioPagamentoId,
          valor: p.valor,
        }))
      } else {
        // Venda aberta não tem pagamentos
        vendaData.pagamentos = []
      }

      const resultado = await createVendaGestor.mutateAsync(vendaData)
      console.log('✅ Venda criada com sucesso:', resultado)
      showToast.success('Pedido criado com sucesso!')
      // Ir para step 4 (Detalhes da Venda) após criar o pedido
      setCurrentStep(4)

      // Após criar, buscar o detalhe completo para preencher campos que dependem de lookup por ID
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
        await carregarVendaExistente(idCriado)
      }
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
      criacaoVendaGestorEmAndamentoRef.current = false
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
    setStatus('FINALIZADA')
    setClienteId('')
    setClienteNome('')
    setProdutos([])
    produtosExtrasPorIdRef.current.clear()
    setCatalogoExtrasVersao(v => v + 1)
    setModalBuscaProdutosOpen(false)
    setPagamentos([])
    setMeioPagamentoId('')
    setValorRecebido('')
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

    // Limpar timeouts de long press de complementos
    if (longPressComplementoTimeoutRef.current) {
      clearTimeout(longPressComplementoTimeoutRef.current)
      longPressComplementoTimeoutRef.current = null
    }
    longPressComplementoIndexRef.current = null
    setIsLoadingVenda(false)
  }

  const resetFormRef = useRef(resetForm)
  resetFormRef.current = resetForm

  /** Após o Slide de saída: evita reset síncrono que quebra a animação e notifica o pai (ex.: desmontar com contexto) */
  const handlePedidoPainelExited = useCallback(() => {
    resetFormRef.current()
    onAfterClose?.()
  }, [onAfterClose])

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

        // Pagamentos (PDV e Gestor: mesmo contrato visual; Gestor pode usar snake_case no payload)
        if (vendaData.pagamentos && Array.isArray(vendaData.pagamentos)) {
          const pagamentosMapeados: PagamentoSelecionado[] = vendaData.pagamentos.map(
            (pag: Record<string, unknown>) => mapearPagamentoDetalheVenda(pag)
          )
          setPagamentos(pagamentosMapeados)
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
  const canGoToStep2 = () => {
    // Step 1 sempre pode avançar (origem e status têm valores padrão)
    return true
  }

  const canGoToStep3 = () => {
    // Step 2 precisa ter pelo menos um produto
    return produtos.length > 0
  }

  const canSubmit = () => {
    // Step 3 precisa validar pagamentos se status for FINALIZADA ou PENDENTE_EMISSAO
    if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
      if (pagamentos.length === 0) return false

      // Aceitar quando os pagamentos cobrem o total (com tolerância de 0.01)
      // Ou quando há troco (pagamentos ultrapassam o total, o que é válido para dinheiro)
      const diferenca = totalProdutos - totalPagamentos

      // Se os pagamentos cobrem exatamente o total (diferença <= 0.01)
      if (Math.abs(diferenca) <= 0.01) return true

      // Se os pagamentos ultrapassam o total, verificar se há troco válido
      // (significa que foi um pagamento em dinheiro que gerou troco)
      if (totalPagamentos > totalProdutos && troco > 0) return true

      // Caso contrário, ainda falta pagar
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
      setCurrentStep(2)
    } else if (currentStep === 2 && canGoToStep3()) {
      setCurrentStep(3)
    } else if (currentStep === 2 && !canGoToStep3()) {
      showToast.error('Adicione pelo menos um produto antes de continuar')
    }
  }

  const handlePreviousStep = () => {
    // Não permitir navegação em modo visualização
    if (vendaId && modoVisualizacao) {
      return
    }

    if (currentStep === 2) {
      setCurrentStep(1)
    } else if (currentStep === 3) {
      setCurrentStep(2)
    }
  }

  return (
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
            // Painel desliza pela direita: cantos arredondados só no lado esquerdo (borda interna)
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
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
          <div className="px-3 py-1.5">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">
                {modoVisualizacao ? 'Detalhes do Pedido' : 'Novo Pedido'}
              </h1>
              {nomeUsuario && (
                <div className="flex items-center gap-2">
                  <MdPerson className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-gray-600">
                    Usuário Gestor:{' '}
                    <span className="font-semibold text-primary">{nomeUsuario}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Abas do passo 4 */}
            {currentStep === 4 && !isLoadingVenda && (
              <div
                className="mt-3 flex gap-1 border-b border-gray-200"
                role="tablist"
                aria-label="Seções dos detalhes do pedido"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhesPedido === 'infoPedido'}
                  id="tab-detalhes-info-pedido"
                  onClick={() => setAbaDetalhesPedido('infoPedido')}
                  className={`font-nunito -mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    abaDetalhesPedido === 'infoPedido'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Info Pedidos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhesPedido === 'listaProdutos'}
                  id="tab-detalhes-lista-produtos"
                  onClick={() => setAbaDetalhesPedido('listaProdutos')}
                  className={`font-nunito -mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    abaDetalhesPedido === 'listaProdutos'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Lista Produtos
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={abaDetalhesPedido === 'pagamentos'}
                  id="tab-detalhes-pagamentos"
                  onClick={() => setAbaDetalhesPedido('pagamentos')}
                  className={`font-nunito -mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                    abaDetalhesPedido === 'pagamentos'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Pagamentos
                </button>
                {podeExibirAbaNotaFiscal && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={abaDetalhesPedido === 'notaFiscal'}
                    id="tab-detalhes-nota-fiscal"
                    onClick={() => setAbaDetalhesPedido('notaFiscal')}
                    className={`font-nunito -mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                      abaDetalhesPedido === 'notaFiscal'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Nota Fiscal
                  </button>
                )}
              </div>
            )}

            {/* Detalhes do Pedido (venda existente): sem stepper no passo 4. Novo pedido: mantém stepper em todos os passos */}
            {!(modoVisualizacao && currentStep === 4) && (
              <NovoPedidoStepIndicator currentStep={currentStep as 1 | 2 | 3 | 4} />
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '0 16px',
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

            {/* STEP 1: Informações do Pedido */}
            {!modoVisualizacao && currentStep === 1 && (
              <InformacoesPedidoStep
                clienteNome={clienteNome}
                onOpenSeletorCliente={() => setSeletorClienteOpen(true)}
                onRemoveCliente={handleRemoveCliente}
                origem={origem}
                onOrigemChange={v => setOrigem(v)}
                status={status}
                onStatusChange={v => setStatus(v)}
                statusDisponiveis={statusDisponiveis}
              />
            )}

            {/* STEP 2: Seleção de Produtos */}
            {!modoVisualizacao && currentStep === 2 && (
              <ProdutosPedidoStep
                produtos={produtos}
                gruposExpandido={gruposExpandido}
                setGruposExpandido={setGruposExpandido}
                totalProdutos={totalProdutos}
                grupos={grupos}
                isLoadingGrupos={isLoadingGrupos}
                grupoSelecionadoId={grupoSelecionadoId}
                setGrupoSelecionadoId={setGrupoSelecionadoId}
                gruposScrollRef={gruposScrollRef}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
                handleMouseUp={handleMouseUp}
                handleMouseLeave={handleMouseLeave}
                hasMovedRef={hasMovedRef}
                isDragging={isDragging}
                isLoadingProdutos={isLoadingProdutos}
                produtosError={produtosError}
                produtosList={produtosCatalogoUnificado}
                adicionarProduto={adicionarProduto}
                valoresEmEdicao={valoresEmEdicao}
                setValoresEmEdicao={setValoresEmEdicao}
                atualizarProduto={atualizarProduto}
                longPressIndexRef={longPressIndexRef}
                longPressTimeoutRef={longPressTimeoutRef}
                abrirModalEdicaoProduto={abrirModalEdicaoProduto}
                formatarDescontoAcrescimo={formatarDescontoAcrescimo}
                formatarNumeroComMilhar={formatarNumeroComMilhar}
                calcularTotalProduto={calcularTotalProduto}
                removerProduto={removerProduto}
                atualizarComplemento={atualizarComplemento}
                removerComplemento={removerComplemento}
                abrirModalComplementosProdutoExistente={abrirModalComplementosProdutoExistente}
                formatarValorComplemento={formatarValorComplemento}
                longPressComplementoIndexRef={longPressComplementoIndexRef}
                longPressComplementoTimeoutRef={longPressComplementoTimeoutRef}
                onAbrirBuscaProdutos={() => setModalBuscaProdutosOpen(true)}
              />
            )}

            {/* STEP 3: Pagamento */}
            {!modoVisualizacao && currentStep === 3 && (
              <PagamentoPedidoStep
                status={status}
                clienteNome={clienteNome}
                origem={origem}
                statusDisponiveis={statusDisponiveis}
                produtos={produtos}
                totalProdutos={totalProdutos}
                valorAPagar={valorAPagar}
                valorRecebido={valorRecebido}
                setValorRecebido={setValorRecebido}
                formatarValorRecebido={formatarValorRecebido}
                meiosPagamentoScrollRef={meiosPagamentoScrollRef}
                mostrarLoadingFormasPagamento={mostrarLoadingFormasPagamento}
                handleMouseDownMeiosPagamento={handleMouseDownMeiosPagamento}
                hasMovedMeiosPagamentoRef={hasMovedMeiosPagamentoRef}
                isDraggingMeiosPagamento={isDraggingMeiosPagamento}
                meiosPagamento={meiosPagamento}
                obterIconeMeioPagamento={obterIconeMeioPagamento}
                adicionarPagamentoPorCard={adicionarPagamentoPorCard}
                totalPagamentos={totalPagamentos}
                troco={troco}
                pagamentos={pagamentos}
                removerPagamento={removerPagamento}
                transformarParaReal={transformarParaReal}
              />
            )}

            {/* STEP 4: Detalhes da Venda (visualização ou após criar pedido) */}
            {currentStep === 4 && !isLoadingVenda && (
              <DetalhesPedidoStep
                abaDetalhesPedido={abaDetalhesPedido}
                podeExibirAbaNotaFiscal={podeExibirAbaNotaFiscal}
                resumoFiscal={resumoFiscal}
                statusFiscalUnificado={statusFiscalUnificado}
                rotuloModeloNfe={rotuloModeloNfe}
                formatarDataHoraResumoFiscal={formatarDataHoraResumoFiscal}
                dataVenda={dataVenda}
                origemTextoApiDetalhe={origemTextoApiDetalhe}
                status={status}
                statusDisponiveis={statusDisponiveis}
                clienteNome={clienteNome}
                produtos={produtos}
                detalhesPedidoMeta={detalhesPedidoMeta}
                formatarUsuarioPorId={formatarUsuarioPorId}
                formatarDataDetalhePedido={formatarDataDetalhePedido}
                handleAbrirEdicaoProdutoDetalhes={handleAbrirEdicaoProdutoDetalhes}
                calcularTotalProduto={calcularTotalProduto}
                formatarDescontoAcrescimo={formatarDescontoAcrescimo}
                formatarNumeroComMilhar={formatarNumeroComMilhar}
                formatarValorComplemento={formatarValorComplemento}
                totalProdutos={totalProdutos}
                resumoFinanceiroDetalhes={resumoFinanceiroDetalhes}
                pagamentosVisiveisNaAbaDetalhes={pagamentosVisiveisNaAbaDetalhes}
                meiosPagamento={meiosPagamento}
                nomesMeiosPagamentoPedido={nomesMeiosPagamentoPedido}
                obterIconeMeioPagamento={obterIconeMeioPagamento}
                totalPagamentos={totalPagamentos}
                troco={troco}
                pagamentos={pagamentos}
              />
            )}
          </div>

          <DialogFooter
            sx={{
              padding: 0,
              flexShrink: 0,
              borderTop: '1px solid #e5e7eb',
              marginTop: 0,
              // DialogActions vem com justify-content: flex-end — o grid ficava encolhido à direita
              justifyContent: 'flex-start',
              alignItems: 'stretch',
              width: '100%',
              boxSizing: 'border-box',
              '& > *': {
                flex: '1 1 100%',
                maxWidth: '100%',
                minWidth: 0,
              },
            }}
          >
            {/* Rodapé em faixa (mesmo padrão visual de `JiffySidePanelModal` footerVariant="bar") */}
            {currentStep === 4
              ? (() => {
                  type ChaveRodape4 = 'cancelVenda' | 'cancelNota' | 'fechar'
                  const chaves: ChaveRodape4[] = []
                  if (podeExibirCancelarVendaGestor) chaves.push('cancelVenda')
                  if (podeExibirCancelarNotaFiscal) chaves.push('cancelNota')
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
                            className={i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'}
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
              : (() => {
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
                              className={i < n - 1 ? 'min-w-0 border-r border-gray-200' : 'min-w-0'}
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
                                  disabled={
                                    createVendaGestor.isPending ||
                                    (currentStep === 2 && !canGoToStep3())
                                  }
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
                })()}
          </DialogFooter>
        </DialogContent>

        {seletorClienteOpen && (
          <SeletorClienteModal
            open={seletorClienteOpen}
            onClose={() => setSeletorClienteOpen(false)}
            onSelect={handleSelectCliente}
          />
        )}

        {produtoParaLancamentoPainel ? (
          <ModalLancamentoProdutoPainel
            open={modalLancamentoProdutoPainelOpen}
            onOpenChange={setModalLancamentoProdutoPainelOpen}
            onAfterClose={() => {
              setProdutoParaLancamentoPainel(null)
              setIndiceLinhaPainelProduto(null)
            }}
            produto={produtoParaLancamentoPainel}
            mostrarAlterarPreco={produtoParaLancamentoPainel.permiteAlterarPrecoAtivo()}
            mostrarComplementos={
              produtoParaLancamentoPainel.abreComplementosAtivo() &&
              produtoTemComplementos(produtoParaLancamentoPainel)
            }
            tituloBarra={
              indiceLinhaPainelProduto !== null ? 'Ajustar produto no pedido' : 'Lançar na venda'
            }
            valorUnitarioInicial={
              indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.valorUnitario
                : undefined
            }
            chavesComplementosIniciais={
              indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.complementos?.map(c => `${c.grupoId}-${c.id}`)
                : undefined
            }
            onConfirm={confirmarLancamentoProdutoPainel}
          />
        ) : null}

        <ModalBuscaProdutosPedido
          open={modalBuscaProdutosOpen}
          onOpenChange={setModalBuscaProdutosOpen}
          token={auth?.getAccessToken() ?? null}
          onConfirm={confirmarBuscaProdutosPedido}
        />

        {modalEdicaoProdutoOpen && produtoIndexEdicao !== null ? (
          <PainelEdicaoProdutoLinhaPedido
            open={modalEdicaoProdutoOpen}
            onClose={() => {
              setModalEdicaoProdutoOpen(false)
              setProdutoIndexEdicao(null)
              setValorUnitarioEdicaoPainel('')
            }}
            onConfirmar={confirmarEdicaoProduto}
            title={produtos[produtoIndexEdicao].nome}
            produtoLinha={produtos[produtoIndexEdicao]}
            permiteAlterarPreco={
              obterProdutoPorId(
                produtos[produtoIndexEdicao].produtoId
              )?.permiteAlterarPrecoAtivo() ?? false
            }
            valorUnitarioInput={valorUnitarioEdicaoPainel}
            onValorUnitarioInputChange={setValorUnitarioEdicaoPainel}
            permiteDesconto={
              obterProdutoPorId(produtos[produtoIndexEdicao].produtoId)?.permiteDescontoAtivo() ??
              false
            }
            permiteAcrescimo={
              obterProdutoPorId(produtos[produtoIndexEdicao].produtoId)?.permiteAcrescimoAtivo() ??
              false
            }
            quantidadeEdicao={quantidadeEdicao}
            onQuantidadeEdicaoChange={setQuantidadeEdicao}
            ehAcrescimo={ehAcrescimo}
            onEhAcrescimoChange={setEhAcrescimo}
            ehPorcentagem={ehPorcentagem}
            onEhPorcentagemChange={setEhPorcentagem}
            valorDescontoAcrescimo={valorDescontoAcrescimo}
            onValorDescontoAcrescimoChange={setValorDescontoAcrescimo}
          />
        ) : null}

        {/* Modal de Confirmação de Saída */}
        <Dialog
          open={modalConfirmacaoSaidaOpen}
          onOpenChange={setModalConfirmacaoSaidaOpen}
          maxWidth="sm"
          sx={{
            '& .MuiDialog-container': {
              zIndex: 1400,
            },
          }}
        >
          <DialogContent sx={{ p: 3 }}>
            <DialogTitle sx={{ mb: 2 }}>Confirmar Saída</DialogTitle>
            <div style={{ marginBottom: '24px' }}>
              <DialogDescription>
                Você tem certeza que deseja sair? Todos os dados da venda serão perdidos.
              </DialogDescription>
            </div>
            <DialogFooter sx={{ gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleCancelarSaida}>
                Cancelar
              </Button>
              <Button variant="contained" color="error" onClick={handleConfirmarSaida}>
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de justificativa: cancelamento por origem (Gestor: venda | PDV: nota fiscal) */}
        <Dialog
          open={modalCancelarVendaOpen}
          onOpenChange={isOpen => {
            setModalCancelarVendaOpen(isOpen)
            if (!isOpen) {
              setJustificativaCancelamento('')
              setTipoCancelamentoSelecionado('venda')
            }
          }}
          maxWidth="sm"
          sx={{
            '& .MuiDialog-container': {
              zIndex: 1400,
            },
          }}
        >
          <DialogContent sx={{ p: 3 }}>
            <DialogTitle
              sx={{
                mb: 2,
                backgroundColor: 'var(--color-error, #d32f2f)',
                color: 'white',
                mx: -3,
                mt: -3,
                px: 3,
                py: 2,
              }}
            >
              {tipoCancelamentoSelecionado === 'venda' ? 'Cancelar Venda' : 'Cancelar Nota Fiscal'}
            </DialogTitle>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600">
                {tipoCancelamentoSelecionado === 'venda'
                  ? 'Esta ação cancelará a venda e, se houver nota fiscal emitida, também a cancelará na SEFAZ.'
                  : tabelaOrigemVenda === 'venda_gestor'
                    ? 'Esta ação cancelará a nota fiscal vinculada à venda do Gestor na SEFAZ.'
                    : 'Esta ação cancelará a nota fiscal vinculada à venda PDV na SEFAZ.'}
              </p>
              <p className="text-sm font-semibold text-red-600">Esta ação não pode ser desfeita!</p>
              <Textarea
                label="Justificativa do Cancelamento"
                placeholder="Digite o motivo do cancelamento (mínimo 15 caracteres)"
                value={justificativaCancelamento}
                onChange={e => setJustificativaCancelamento(e.target.value)}
                error={
                  justificativaCancelamento.length > 0 &&
                  justificativaCancelamento.trim().length < 15
                }
                helperText={`${justificativaCancelamento.length}/15 caracteres mínimos`}
                rows={4}
              />
            </div>
            <DialogFooter sx={{ gap: 2, justifyContent: 'flex-end', mt: 3, pt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setModalCancelarVendaOpen(false)
                  setJustificativaCancelamento('')
                  setTipoCancelamentoSelecionado('venda')
                }}
                disabled={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending
                }
              >
                Voltar
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleConfirmarCancelamentoVenda}
                disabled={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending ||
                  justificativaCancelamento.trim().length < 15
                }
                isLoading={
                  cancelarVendaGestor.isPending ||
                  cancelarNotaFiscalVendaPdv.isPending ||
                  cancelarNotaFiscalVendaGestor.isPending
                }
              >
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Dialog>
      <ProdutosTabsModal
        state={produtoTabsModalState}
        onClose={handleFecharProdutoTabsModal}
        onTabChange={handleTabChangeProdutoModal}
      />
    </>
  )
}
