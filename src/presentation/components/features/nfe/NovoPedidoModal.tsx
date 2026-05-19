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
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/src/presentation/components/ui/dialog'
import { Button } from '@/src/presentation/components/ui/button'
import { Label } from '@/src/presentation/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import { Input } from '@/src/presentation/components/ui/input'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useProdutos } from '@/src/presentation/hooks/useProdutos'
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
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import {
  MdLaunch,
  MdDelete,
  MdClear,
  MdSearch,
  MdArrowForward,
  MdArrowBack,
  MdCheckCircle,
  MdAttachMoney,
  MdCreditCard,
  MdQrCode,
  MdPerson,
  MdStore,
  MdPersonOutline,
  MdInfo,
  MdEdit,
  MdExpandLess,
  MdExpandMore,
  MdCancel,
  MdAccessTime,
  MdDeliveryDining,
} from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import {
  abrirDocumentoFiscalPdf,
  tipoDocFiscalFromModelo,
} from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import { SeletorClienteModal } from './SeletorClienteModal'
import { EntregaClienteSelector } from './EntregaClienteSelector'
import type { MoradaTelefone } from '@/src/presentation/hooks/useMoradaTelefone'
import {
  ModalLancamentoProdutoPainel,
  type ModalLancamentoProdutoPainelConfirmPayload,
} from './ModalLancamentoProdutoPainel'
import { PainelEdicaoProdutoLinhaPedido } from './PainelEdicaoProdutoLinhaPedido'
import {
  ProdutosTabsModal,
  ProdutosTabsModalState,
} from '@/src/presentation/components/features/produtos/ProdutosTabsModal'
import {
  ClientesTabsModal,
  type ClientesTabsModalState,
} from '@/src/presentation/components/features/clientes/ClientesTabsModal'
import {
  PainelPedidoBackdrop,
  JiffyPainelSlide,
  footerBarGrayBarSx,
  footerBarPrimaryMutedSx,
  footerSavePrimaryBarSx,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'

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
  /**
   * Tipo de pedido escolhido no EscolhaTipoPedidoModal.
   * 'balcao' (padrão): step inicial = Informações.
   * 'entrega': step inicial = Produtos (step 1 é pulado); tipoVenda enviado como 'entrega'.
   */
  tipoInicioPedido?: 'balcao' | 'entrega'
}

/** Trecho retornado pela API quando `incluirFiscal=true` */
interface ResumoFiscalVenda {
  status?: string | null
  numero?: number | null
  retornoSefaz?: string | null
  serie?: string | null
  dataEmissao?: string | null
  modelo?: number | null
  chaveFiscal?: string | null
  dataCriacao?: string | null
  dataUltimaModificacao?: string | null
  /** Id do documento fiscal — mesmo usado em GET `/api/nfe/[id]` (Kanban “Ver NFCe/NFe”) */
  documentoFiscalId?: string | null
}

interface ComplementoSelecionado {
  id: string
  grupoId: string
  nome: string
  valor: number
  quantidade: number
  tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
}

interface ProdutoSelecionado {
  produtoId: string
  nome: string
  quantidade: number
  valorUnitario: number
  complementos: ComplementoSelecionado[]
  tipoDesconto?: 'fixo' | 'porcentagem' | null
  valorDesconto?: number | null
  tipoAcrescimo?: 'fixo' | 'porcentagem' | null
  valorAcrescimo?: number | null
  valorFinal?: number | null // Valor final do produto quando carregado do backend (já calculado)
  lancadoPorId?: string
  removido?: boolean
  removidoPorId?: string
  dataLancamento?: string
  dataRemocao?: string
  ncm?: string
}

interface PagamentoSelecionado {
  id?: string
  meioPagamentoId: string
  valor: number
  cobrarNaEntrega?: boolean
  naoEfetivo?: boolean
  realizadoPorId?: string
  cancelado?: boolean
  canceladoPorId?: string
  dataCriacao?: string
  dataCancelamento?: string
  isTefUsed?: boolean
  isTefConfirmed?: boolean
  tefIdentifier?: string
  tefAdquirente?: string
  cnpjAdquirente?: string
  codigoAutorizacao?: string
  tipoIntegracao?: string
  bandeiraCartao?: string
}

/**
 * Mesma regra de DetalhesVendas: cancelado pela flag ou por dataCancelamento preenchida.
 */
function pagamentoEstaCancelado(p: PagamentoSelecionado): boolean {
  return (
    p.cancelado === true ||
    (p.dataCancelamento !== null && p.dataCancelamento !== undefined)
  )
}

/**
 * Pagamentos que entram no total pago e no troco (equivale a `trocoCalculado` / pagamentos válidos em DetalhesVendas).
 * Exclui cancelados; se usa TEF, exige isTefConfirmed === true.
 */
function pagamentoContaComoEfetivo(p: PagamentoSelecionado): boolean {
  if (pagamentoEstaCancelado(p)) return false
  if (p.cobrarNaEntrega === true || p.naoEfetivo === true) return false

  const usaTef = p.isTefUsed === true
  if (usaTef) {
    const tefConfirmado = p.isTefConfirmed === true
    if (!tefConfirmado) return false
  }
  return true
}

/**
 * Lista exibida no passo 4: oculta TEF não confirmado apenas em pagamento ainda ativo (cancelados seguem visíveis).
 * Igual ao `.filter` de Pagamentos Realizados em DetalhesVendas.
 */
function pagamentoDeveAparecerNosDetalhesPedido(p: PagamentoSelecionado): boolean {
  const isCancelado = pagamentoEstaCancelado(p)
  const usaTef = p.isTefUsed === true
  if (usaTef && !isCancelado) {
    if (p.isTefConfirmed !== true) return false
  }
  return true
}

/** Destaque vermelho: somente pagamentos cancelados (TEF pendente ativo não é renderizado na lista). */
function pagamentoComDestaqueCanceladoDetalhes(p: PagamentoSelecionado): boolean {
  return pagamentoEstaCancelado(p)
}

/**
 * Mapeia item de pagamento do GET venda (PDV ou Gestor) para o estado do modal.
 * Garante as mesmas regras de DetalhesVendas: cancelado explícito ou com dataCancelamento; TEF só quando isTefUsed.
 */
function mapearPagamentoDetalheVenda(pag: Record<string, unknown>): PagamentoSelecionado {
  const p = pag as Record<string, any>
  const dataCancelamentoRaw = p.dataCancelamento ?? p.data_cancelamento
  const temDataCancelamento =
    dataCancelamentoRaw != null &&
    dataCancelamentoRaw !== undefined &&
    String(dataCancelamentoRaw).trim() !== ''
  const canceladoExplicito =
    p.cancelado === true || p.cancelado === 'true' || p.cancelado === 1 || p.cancelado === '1'
  const cancelado = canceladoExplicito || temDataCancelamento

  const isTefUsed = p.isTefUsed === true || p.is_tef_used === true
  let isTefConfirmed: boolean | undefined
  if (isTefUsed) {
    if (p.isTefConfirmed === true || p.is_tef_confirmed === true) isTefConfirmed = true
    else if (p.isTefConfirmed === false || p.is_tef_confirmed === false) isTefConfirmed = false
  }

  return {
    id: p.id != null ? String(p.id) : p.pagamentoId != null ? String(p.pagamentoId) : undefined,
    meioPagamentoId: String(
      p.meioPagamentoId ?? p.meio_pagamento_id ?? p.meioPagamento?.id ?? ''
    ),
    valor: typeof p.valor === 'number' ? p.valor : Number(p.valor) || 0,
    cobrarNaEntrega:
      p.cobrarNaEntrega === true ||
      p.cobrar_na_entrega === true ||
      p.cobrarNaEntrega === 'true' ||
      p.cobrar_na_entrega === 'true',
    naoEfetivo: 
      p.efetivado === false || 
      p.efetivado === 'false' || 
      p.cobrarNaEntrega === true ||
      p.cobrar_na_entrega === true ||
      p.cobrarNaEntrega === 'true' ||
      p.cobrar_na_entrega === 'true',
    realizadoPorId: p.realizadoPorId ?? p.realizado_por_id ?? undefined,
    cancelado,
    canceladoPorId: p.canceladoPorId ?? p.cancelado_por_id ?? undefined,
    dataCriacao: p.dataCriacao ?? p.data_criacao ?? undefined,
    dataCancelamento: temDataCancelamento ? String(dataCancelamentoRaw) : undefined,
    isTefUsed,
    isTefConfirmed,
    tefIdentifier: p.tefIdentifier ?? p.tef_identifier ?? undefined,
    tefAdquirente: p.tefAdquirente ?? p.tef_adquirente ?? undefined,
    cnpjAdquirente: p.cnpjAdquirente ?? p.cnpj_adquirente ?? undefined,
    codigoAutorizacao: p.codigoAutorizacao ?? p.codigo_autorizacao ?? undefined,
    tipoIntegracao: p.tipoIntegracao ?? p.tipo_integracao ?? undefined,
    bandeiraCartao: p.bandeiraCartao ?? p.bandeira_cartao ?? undefined,
  }
}

type OrigemVenda = 'GESTOR' | 'IFOOD' | 'RAPPI' | 'OUTROS'
type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'PENDENTE_EMISSAO'
type FluxoPagamentoEntrega = 'cobrar_entregador' | 'ja_pago'
type TipoAtendimentoDelivery = 'entrega' | 'retirada'

const TEMPOS_PREVISTOS_ENTREGA = [30, 45, 60, 75, 90, 120]
const SEM_ENTREGADOR_VALUE = '__sem_entregador__'
const SEM_TAXA_ENTREGA_VALUE = '__sem_taxa_entrega__'
const ULTIMO_ENTREGADOR_STORAGE_KEY = 'jiffy:delivery:last-entregador-id'

interface UsuarioPdvEntregadorOption {
  id: string
  nome: string
  telefone?: string
}

function getUltimoEntregadorSelecionado(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(ULTIMO_ENTREGADOR_STORAGE_KEY) ?? ''
}

function setUltimoEntregadorSelecionado(entregadorId: string): void {
  if (typeof window === 'undefined') return
  if (entregadorId) {
    window.localStorage.setItem(ULTIMO_ENTREGADOR_STORAGE_KEY, entregadorId)
  }
}

/**
 * Pedidos entrega devem nascer abertos (triagem / Novos Pedidos no Kanban).
 * Balcão mantém finalização imediata como padrão — o operador pode mudar no passo Informações.
 */
function statusPadraoNovoPedido(tipoInicio: 'balcao' | 'entrega'): StatusVenda {
  return tipoInicio === 'entrega' ? 'ABERTA' : 'FINALIZADA'
}

/** Abas em Detalhes do Pedido (passo 4) */
type AbaDetalhesPedido = 'infoPedido' | 'listaProdutos' | 'pagamentos' | 'notaFiscal'

interface DetalhesPedidoMeta {
  numeroVenda?: number | null
  codigoVenda?: string | null
  tipoVenda?: string | null
  numeroMesa?: string | number | null
  statusMesa?: string | null
  abertoPorId?: string | null
  ultimoResponsavelId?: string | null
  canceladoPorId?: string | null
  codigoTerminal?: string | null
  terminalId?: string | null
  identificacao?: string | null
  solicitarEmissaoFiscal?: boolean | null
  dataCriacao?: string | null
  dataFinalizacao?: string | null
  dataCancelamento?: string | null
  dataUltimaModificacao?: string | null
  dataUltimoProdutoLancado?: string | null
}

interface ResumoFinanceiroDetalhes {
  totalItensLancados: number
  totalItensCancelados: number
  totalDosItens: number
  totalDescontosConta: number
  totalAcrescimosConta: number
}

/**
 * Texto do campo Origem no painel de detalhes (abas Dados / contexto visualização).
 * O GET de detalhe do PDV não retorna `origem`; nesse caso a venda é tratada como PDV.
 */
function rotuloOrigemParaExibicao(origemBrutaApi: string | null): string {
  if (origemBrutaApi == null || String(origemBrutaApi).trim() === '') {
    return 'PDV'
  }
  const o = String(origemBrutaApi).trim().toUpperCase()
  if (o === 'GESTOR') return 'Gestor'
  if (o === 'PDV') return 'PDV'
  if (o === 'IFOOD' || o === 'DELIVERY_IFOOD') return 'iFood'
  if (o === 'RAPPI' || o === 'DELIVERY_UBER') return 'Rappi'
  if (o === 'OUTROS') return 'Outros'
  return String(origemBrutaApi).trim()
}

/**
 * Status em que a aba Nota Fiscal e o resumo fazem sentido (incl. aguardando SEFAZ).
 * Alinhado ao Kanban e ao `StatusFiscalBadge` ("Aguardando SEFAZ..." para PENDENTE / PENDENTE_AUTORIZACAO).
 */
const STATUS_FISCAL_ABA_NOTA_FISCAL = new Set([
  'EMITIDA',
  'REJEITADA',
  'PENDENTE',
  'PENDENTE_AUTORIZACAO',
])

function statusFiscalPermiteAbaNotaFiscal(s: string | null | undefined): boolean {
  if (s == null || String(s).trim() === '') return false
  return STATUS_FISCAL_ABA_NOTA_FISCAL.has(String(s).trim().toUpperCase())
}

/** PDF DANFE/DANFCE só existe após autorização — mesmo critério do Kanban */
function statusFiscalEhEmitida(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusUnificado != null ? String(statusUnificado).trim() : ''
  const s = (r !== '' ? r : u).toUpperCase()
  return s === 'EMITIDA'
}

function statusFiscalPermiteCancelarNota(
  resumoStatus: string | null | undefined,
  statusUnificado: string | null | undefined,
  statusDetalhe: string | null | undefined
): boolean {
  const r = resumoStatus != null ? String(resumoStatus).trim() : ''
  const u = statusUnificado != null ? String(statusUnificado).trim() : ''
  const d = statusDetalhe != null ? String(statusDetalhe).trim() : ''
  const s = (r !== '' ? r : u !== '' ? u : d).toUpperCase()
  // Só é possível cancelar nota já emitida
  return s === 'EMITIDA'
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
  tipoInicioPedido = 'balcao',
}: NovoPedidoModalProps) {
  const { auth } = useAuthStore()
  const { empresa, preferenciasImpressaoDelivery } = useEmpresaMe()
  const { processarAposTransicaoVendaGestorId } = useImpressaoDelivery()
  const empresaId = useTenantEmpresaId()
  const createVendaGestor = useCreateVendaGestor()
  const cancelarVendaGestor = useCancelarVendaGestor()
  const cancelarNotaFiscalVendaPdv = useCancelarNotaFiscalVendaPdv()
  const cancelarNotaFiscalVendaGestor = useCancelarNotaFiscalVendaGestor()
  const finalizarVendaGestor = useFinalzarVendaGestor()

  const [origem, setOrigem] = useState<OrigemVenda>('GESTOR')
  const [status, setStatus] = useState<StatusVenda>(() => statusPadraoNovoPedido(tipoInicioPedido))
  const [clienteId, setClienteId] = useState<string>('')
  const [clienteNome, setClienteNome] = useState<string>('')
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([])
  /** Catálogo acumulado por id (todos os grupos visitados no passo 2 + GET /api/produtos/:id). Desacopla ações da linha do `grupoSelecionadoId`. */
  const [catalogoProdutosPorId, setCatalogoProdutosPorId] = useState<Record<string, Produto>>({})
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

  const pedidoDeliveryGestor = tipoInicioPedido === 'entrega'
  const pedidoComEntrega = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'entrega'
  const pedidoComRetirada = pedidoDeliveryGestor && tipoAtendimentoDelivery === 'retirada'

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

  // Estados para arrastar a lista horizontal
  const gruposScrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false) // Rastreia se houve movimento significativo durante o arraste

  // Estados para arrastar a lista horizontal de formas de pagamento
  const meiosPagamentoScrollRef = useRef<HTMLDivElement>(null)
  const [isDraggingMeiosPagamento, setIsDraggingMeiosPagamento] = useState(false)
  const startXMeiosPagamentoRef = useRef(0)
  const scrollLeftMeiosPagamentoRef = useRef(0)
  const nomeUsuarioCarregadoNoCicloRef = useRef(false)

  // Refs para long press na linha do produto
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndexRef = useRef<number | null>(null)

  // Refs para long press na linha do complemento
  const longPressComplementoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressComplementoIndexRef = useRef<number | null>(null)
  const hasMovedMeiosPagamentoRef = useRef(false)
  // Evita POST duplicado quando o usuário clica duas vezes rápido em "Criar Pedido" (isPending não bloqueia a tempo)
  const criacaoVendaGestorEmAndamentoRef = useRef(false)
  /** Ignora clique fantasma no backdrop logo após abrir (ex.: mouse com bounce duplo) */
  const ignorarBackdropAteRef = useRef(0)

  // Buscar grupos de produtos
  const { data: gruposData, isLoading: isLoadingGrupos } = useGruposProdutos({
    ativo: true,
    limit: 100,
    // Balcão: produtos no step 2. Entrega: produtos no step 1. Fora da etapa de produtos, não consulta.
    enabled:
      open &&
      !modoVisualizacao &&
      (currentStep >= 2 ||
        (tipoInicioPedido === 'entrega' && currentStep === 1)),
    // Evita refetch ao voltar o foco da aba (não deve recarregar o modal inteiro)
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
    enabled:
      !!token &&
      open &&
      !modoVisualizacao &&
      buscaProdutoFiltrada.length >= 2 &&
      (currentStep >= 2 || (tipoInicioPedido === 'entrega' && currentStep === 1)),
    staleTime: 1000 * 60 * 5,
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

      const token = auth.getAccessToken()
      const response = await fetch(
        `/api/grupos-produtos/${grupoSelecionadoId}/produtos?limit=100&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao carregar produtos do grupo')
      }

      const data = await response.json()

      // Verificar se data.items existe e é um array
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items.map((item: any) => Produto.fromJSON(item))

      return {
        produtos,
        count: data.count || produtos.length,
      }
    },
    enabled: open && !!grupoSelecionadoId && !!auth?.getAccessToken(),
    staleTime: 0,
    gcTime: 1000 * 60 * 1,
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

  // Handlers para arrastar a lista horizontal de grupos
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!gruposScrollRef.current) return
    hasMovedRef.current = false // Reset flag de movimento
    setIsDragging(true)

    const startXValue = e.pageX - gruposScrollRef.current.offsetLeft
    const scrollLeftValue = gruposScrollRef.current.scrollLeft
    startXRef.current = startXValue
    scrollLeftRef.current = scrollLeftValue

    gruposScrollRef.current.style.cursor = 'grabbing'
    gruposScrollRef.current.style.userSelect = 'none'

    // Adicionar listeners globais para capturar movimento mesmo fora do elemento
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!gruposScrollRef.current) return

      const x = e.pageX - gruposScrollRef.current.offsetLeft
      const walk = (x - startXRef.current) * 2 // Velocidade do scroll (ajustável)

      // Verificar se houve movimento significativo (mais de 5px)
      if (Math.abs(walk) > 5) {
        hasMovedRef.current = true
        e.preventDefault()
        e.stopPropagation()
      }

      if (hasMovedRef.current) {
        gruposScrollRef.current.scrollLeft = scrollLeftRef.current - walk
      }
    }

    const handleGlobalMouseUp = () => {
      if (!gruposScrollRef.current) return
      setIsDragging(false)
      gruposScrollRef.current.style.cursor = 'grab'
      gruposScrollRef.current.style.userSelect = 'auto'

      // Remover listeners globais
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)

      // Reset após um pequeno delay para permitir que o onClick do botão seja processado
      setTimeout(() => {
        hasMovedRef.current = false
      }, 100)
    }

    // Adicionar listeners globais
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Este handler não é mais necessário, mas mantemos para compatibilidade
    // O movimento real é tratado pelos listeners globais
  }, [])

  const handleMouseUp = useCallback(() => {
    // Este handler não é mais necessário, mas mantemos para compatibilidade
    // O mouseup real é tratado pelos listeners globais
  }, [])

  const handleMouseLeave = useCallback(() => {
    // Não resetar o dragging ao sair do elemento, pois o arraste pode continuar
    // O reset só acontece no mouseup global
  }, [])

  // Handlers para arrastar a lista horizontal de formas de pagamento
  const handleMouseDownMeiosPagamento = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!meiosPagamentoScrollRef.current) return
    hasMovedMeiosPagamentoRef.current = false
    setIsDraggingMeiosPagamento(true)

    const startXValue = e.pageX - meiosPagamentoScrollRef.current.offsetLeft
    const scrollLeftValue = meiosPagamentoScrollRef.current.scrollLeft
    startXMeiosPagamentoRef.current = startXValue
    scrollLeftMeiosPagamentoRef.current = scrollLeftValue

    meiosPagamentoScrollRef.current.style.cursor = 'grabbing'
    meiosPagamentoScrollRef.current.style.userSelect = 'none'

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!meiosPagamentoScrollRef.current) return

      const x = e.pageX - meiosPagamentoScrollRef.current.offsetLeft
      const walk = (x - startXMeiosPagamentoRef.current) * 2

      if (Math.abs(walk) > 5) {
        hasMovedMeiosPagamentoRef.current = true
        e.preventDefault()
        e.stopPropagation()
      }

      if (hasMovedMeiosPagamentoRef.current) {
        meiosPagamentoScrollRef.current.scrollLeft = scrollLeftMeiosPagamentoRef.current - walk
      }
    }

    const handleGlobalMouseUp = () => {
      if (!meiosPagamentoScrollRef.current) return
      setIsDraggingMeiosPagamento(false)
      meiosPagamentoScrollRef.current.style.cursor = 'grab'
      meiosPagamentoScrollRef.current.style.userSelect = 'auto'

      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)

      setTimeout(() => {
        hasMovedMeiosPagamentoRef.current = false
      }, 100)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [])

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

  const gruposComProdutosQueries = useQueries({
    queries: gruposOrdenados.map(grupo => ({
      queryKey: ['grupo-produtos-tem-produto-ativo', grupo.getId()],
      queryFn: async () => {
        const token = auth?.getAccessToken()
        if (!token) return false

        const response = await fetch(
          `/api/grupos-produtos/${grupo.getId()}/produtos?limit=100&offset=0`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) return false

        const data = await response.json()
        const items = Array.isArray(data.items) ? data.items : []
        return items.some((item: any) => Produto.fromJSON(item).isAtivo())
      },
      enabled:
        open &&
        !modoVisualizacao &&
        !!auth?.getAccessToken() &&
        (currentStep >= 2 || (tipoInicioPedido === 'entrega' && currentStep === 1)),
      staleTime: 1000 * 60 * 3,
      refetchOnWindowFocus: false,
      retry: 1,
    })),
  })

  const grupos = useMemo(() => {
    return gruposOrdenados.filter((grupo, index) => gruposComProdutosQueries[index]?.data === true)
  }, [gruposOrdenados, gruposComProdutosQueries])

  const isLoadingGruposVenda =
    isLoadingGrupos || gruposComProdutosQueries.some(query => query.isPending)

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

  // Função para formatar número com separadores de milhar
  const formatarNumeroComMilhar = (valor: number): string => {
    if (valor === 0) return '0,00'
    const partes = valor.toFixed(2).split('.')
    const parteInteira = partes[0]
    const parteDecimal = partes[1]

    // Adiciona separadores de milhar
    const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    return `${parteInteiraFormatada},${parteDecimal}`
  }

  // Função para formatar valor do complemento conforme tipoImpactoPreco (para o modal)
  const formatarValorComplemento = (
    valor: number,
    tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
  ): string => {
    const valorFormatado = formatarNumeroComMilhar(valor)
    const tipo = tipoImpactoPreco || 'nenhum'

    switch (tipo) {
      case 'aumenta':
        return `+ ${valorFormatado}`
      case 'diminui':
        return `- ${valorFormatado}`
      case 'nenhum':
      default:
        return `( ${valorFormatado} )`
    }
  }

  // Função para obter total do complemento a exibir na lista (0,00 se nenhum)
  const obterTotalComplemento = (complemento: ComplementoSelecionado): number => {
    const tipo = complemento.tipoImpactoPreco || 'nenhum'
    if (tipo === 'nenhum') {
      return 0
    }
    return complemento.valor * complemento.quantidade
  }

  // Função para calcular o total de um produto (sem complementos) com desconto e acréscimo
  const calcularTotalProduto = (produto: ProdutoSelecionado): number => {
    const valorProduto = produto.valorUnitario * produto.quantidade

    // Calcular total dos complementos primeiro
    const valorComplementos = produto.complementos.reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      const valorTotal = comp.valor * comp.quantidade * produto.quantidade
      if (tipo === 'aumenta') {
        return sum + valorTotal
      } else if (tipo === 'diminui') {
        return sum - valorTotal
      }
      return sum
    }, 0)

    // Subtotal = produto + complementos (igual ao modal)
    const subtotal = valorProduto + valorComplementos

    // Calcular desconto sobre o subtotal (produto + complementos)
    let valorDesconto = 0
    if (produto.tipoDesconto && produto.valorDesconto) {
      if (produto.tipoDesconto === 'porcentagem') {
        valorDesconto = subtotal * (produto.valorDesconto / 100)
      } else {
        valorDesconto = produto.valorDesconto
      }
    }

    // Calcular acréscimo sobre o subtotal (produto + complementos)
    let valorAcrescimo = 0
    if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      if (produto.tipoAcrescimo === 'porcentagem') {
        valorAcrescimo = subtotal * (produto.valorAcrescimo / 100)
      } else {
        valorAcrescimo = produto.valorAcrescimo
      }
    }

    return subtotal - valorDesconto + valorAcrescimo
  }

  // Função para calcular o total dos complementos de um produto
  const calcularTotalComplementos = (produto: ProdutoSelecionado): number => {
    return produto.complementos.reduce((sum, comp) => {
      const tipo = comp.tipoImpactoPreco || 'nenhum'
      // Multiplicar o valor do complemento pela quantidade do complemento E pela quantidade do produto
      const valorTotal = comp.valor * comp.quantidade * produto.quantidade

      if (tipo === 'aumenta') {
        return sum + valorTotal
      } else if (tipo === 'diminui') {
        return sum - valorTotal
      }
      return sum
    }, 0)
  }

  // Função para formatar desconto/acréscimo para exibição
  // Em tipo porcentagem exibe "Desc. X%" ou "Acres. X%"; em tipo fixo exibe o valor em R$
  const formatarDescontoAcrescimo = (produto: ProdutoSelecionado): string => {
    const valorProduto = produto.valorUnitario * produto.quantidade
    const valorComplementos = calcularTotalComplementos(produto)
    const subtotal = valorProduto + valorComplementos

    // Verificar desconto
    if (produto.tipoDesconto && produto.valorDesconto) {
      if (produto.tipoDesconto === 'porcentagem') {
        const pct = produto.valorDesconto
        return `Desc. ${Number.isInteger(pct) ? pct : formatarNumeroComMilhar(pct)}%`
      }
      const valorDesconto = produto.valorDesconto
      if (valorDesconto > 0) {
        return `Desc. -${formatarNumeroComMilhar(valorDesconto)}`
      }
    }

    // Verificar acréscimo
    if (produto.tipoAcrescimo && produto.valorAcrescimo) {
      if (produto.tipoAcrescimo === 'porcentagem') {
        const pct = produto.valorAcrescimo
        return `Acres. ${Number.isInteger(pct) ? pct : formatarNumeroComMilhar(pct)}%`
      }
      const valorAcrescimo = produto.valorAcrescimo
      if (valorAcrescimo > 0) {
        return `Acres. +${formatarNumeroComMilhar(valorAcrescimo)}`
      }
    }

    return ''
  }

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

  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((sum, p) => {
      return sum + (pagamentoContaComoEfetivo(p) ? p.valor : 0)
    }, 0)
  }, [pagamentos])

  const totalPagamentosLancados = useMemo(() => {
    return pagamentos.reduce((sum, p) => {
      return sum + (!pagamentoEstaCancelado(p) ? p.valor : 0)
    }, 0)
  }, [pagamentos])

  // Calcular valor a pagar (restante)
  const valorAPagar = useMemo(() => {
    return Math.max(0, totalProdutos - totalPagamentos)
  }, [totalProdutos, totalPagamentos])

  const valorAPagarLancamento = useMemo(() => {
    if (pagamentoModoCobranca) {
      return Math.max(0, totalProdutos - totalPagamentosLancados)
    }
    return valorAPagar
  }, [pagamentoModoCobranca, totalProdutos, totalPagamentosLancados, valorAPagar])

  const statusPagamentoPedido = useMemo<'pendente' | 'parcial' | 'pago'>(() => {
    if (totalPagamentos <= 0) return 'pendente'
    if (valorAPagar > 0.01) return 'parcial'
    return 'pago'
  }, [totalPagamentos, valorAPagar])

  const rotuloStatusPagamento = useMemo(() => {
    if (statusPagamentoPedido === 'pago') return 'Pago'
    if (statusPagamentoPedido === 'parcial') return 'Parcial'
    return 'Pendente'
  }, [statusPagamentoPedido])

  const statusPagamentoExibicao = pagamentoModoCobranca
    ? 'pendente'
    : statusPagamentoPedido
  const rotuloStatusPagamentoExibicao = pagamentoModoCobranca
    ? 'Pendente'
    : rotuloStatusPagamento

  // Troco: só pagamentos efetivos entram; procura o último dinheiro efetivo na ordem original
  const troco = useMemo(() => {
    if (pagamentos.length === 0) return 0

    for (let i = pagamentos.length - 1; i >= 0; i--) {
      const p = pagamentos[i]
      if (!pagamentoContaComoEfetivo(p)) continue

      const meioUltimoPagamento = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
      if (!meioUltimoPagamento) continue

      const nomeMeio = meioUltimoPagamento.getNome().toLowerCase()
      const isDinheiro = nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
      if (!isDinheiro) continue

      const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => {
        return acc + (pagamentoContaComoEfetivo(x) ? x.valor : 0)
      }, 0)
      const valorFaltavaPagar = totalProdutos - totalAntes

      if (p.valor > valorFaltavaPagar) {
        return p.valor - valorFaltavaPagar
      }
      return 0
    }

    return 0
  }, [totalProdutos, pagamentos, meiosPagamento])

  const trocoLancamento = useMemo(() => {
    if (!pagamentoModoCobranca) return troco
    if (pagamentos.length === 0) return 0

    for (let i = pagamentos.length - 1; i >= 0; i--) {
      const p = pagamentos[i]
      if (pagamentoEstaCancelado(p)) continue

      const meioUltimoPagamento = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
      if (!meioUltimoPagamento) continue

      const nomeMeio = meioUltimoPagamento.getNome().toLowerCase()
      const isDinheiro = nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
      if (!isDinheiro) continue

      const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => {
        return acc + (!pagamentoEstaCancelado(x) ? x.valor : 0)
      }, 0)
      const valorFaltavaPagar = totalProdutos - totalAntes

      if (p.valor > valorFaltavaPagar) {
        return p.valor - valorFaltavaPagar
      }
      return 0
    }

    return 0
  }, [pagamentoModoCobranca, troco, pagamentos, meiosPagamento, totalProdutos])

  /** Lista do passo 4 (aba Pagamentos): igual ao filtro de exibição em DetalhesVendas */
  const pagamentosVisiveisNaAbaDetalhes = useMemo(
    () => pagamentos.filter(pagamentoDeveAparecerNosDetalhesPedido),
    [pagamentos]
  )

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
        cobrarNaEntrega: fluxoPagamentoEntrega === 'cobrar_entregador',
        naoEfetivo: fluxoPagamentoEntrega === 'cobrar_entregador',
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
      catalogoProdutosPorIdRef.current[produtoId] ??
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
      catalogoProdutosPorIdRef.current[produtoAtual.produtoId] ??
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
    if (criacaoVendaGestorEmAndamentoRef.current || createVendaGestor.isPending) {
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

        // Backend cria a venda pendente; balcão finalizado exige transição operacional (BFF → …/transicoes acao finalizar).
        if (status === 'FINALIZADA' || status === 'PENDENTE_EMISSAO') {
          try {
            await finalizarVendaGestor.mutateAsync({ id: idCriado })
          } catch {
            // Falha silenciosa: a venda foi criada; o detalhe mostrará o statusOperacional
            // correto ao carregar, e o usuário pode tentar novamente se necessário.
          }
        }

        if (
          tipoInicioPedido === 'entrega' &&
          status === 'ABERTA' &&
          preferenciasImpressaoDelivery.autoIniciarPreparoNovosPedidos
        ) {
          await processarAposTransicaoVendaGestorId(idCriado, 'iniciar_preparo')
        }

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
    // balcão: step 1 = Informações → sempre pode avançar
    return validarInformacoesPedido(false)
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
      setCurrentStep(2)
    } else if (currentStep === 1 && !canGoToStep2()) {
      if (tipoInicioPedido === 'entrega') {
        showToast.error('Adicione pelo menos um produto antes de continuar')
      } else {
        validarInformacoesPedido(true)
      }
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
          <div className="px-4 py-2">
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
              <div className="mt-2 flex items-center justify-center gap-2">
                {/* Step 1 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep >= 1
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {currentStep > 1 ? (
                      <MdCheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">1</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${currentStep >= 1 ? 'text-primary' : 'text-gray-400'}`}
                  >
                    {tipoInicioPedido === 'entrega' ? 'Produtos' : 'Informações'}
                  </span>
                </div>

                {/* Linha */}
                <div className={`h-0.5 w-12 ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />

                {/* Step 2 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep >= 2
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {currentStep > 2 ? (
                      <MdCheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">2</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${currentStep >= 2 ? 'text-primary' : 'text-gray-400'}`}
                  >
                    {tipoInicioPedido === 'entrega' ? 'Informações' : 'Produtos'}
                  </span>
                </div>

                {/* Linha */}
                <div className={`h-0.5 w-12 ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />

                {/* Step 3 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep >= 3
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    {currentStep > 3 ? (
                      <MdCheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">3</span>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium ${currentStep >= 3 ? 'text-primary' : 'text-gray-400'}`}
                  >
                    Pagamento
                  </span>
                </div>

                {/* Linha */}
                <div className={`h-0.5 w-12 ${currentStep >= 4 ? 'bg-primary' : 'bg-gray-300'}`} />

                {/* Step 4 */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep >= 4
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}
                  >
                    <span className="text-sm font-semibold">4</span>
                  </div>
                  <span
                    className={`text-sm font-medium ${currentStep >= 4 ? 'text-primary' : 'text-gray-400'}`}
                  >
                    Detalhes
                  </span>
                </div>
              </div>
            )}
          </div>

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

            {/* STEP 1: Informações do Pedido (balcão) | Seleção de Produtos (entrega) */}
            {!modoVisualizacao &&
              ((tipoInicioPedido !== 'entrega' && currentStep === 1) ||
                (tipoInicioPedido === 'entrega' && currentStep === 2)) && (
              <div className="space-y-3 py-2">
                {pedidoDeliveryGestor && (
                  <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MdStore className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        Tipo de atendimento
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTipoAtendimentoDeliveryChange('entrega')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          pedidoComEntrega
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-primary-text hover:border-primary/50'
                        }`}
                      >
                        Entrega
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTipoAtendimentoDeliveryChange('retirada')}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          pedidoComRetirada
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 bg-white text-primary-text hover:border-primary/50'
                        }`}
                      >
                        Retirada
                      </button>
                    </div>
                  </div>
                )}

                {/* Fluxo entrega: campo de telefone + seleção de morada */}
                {tipoInicioPedido === 'entrega' ? (
                  <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MdPersonOutline className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-primary">
                        {pedidoComEntrega ? 'Cliente e endereço de entrega' : 'Cliente da retirada'}
                      </span>
                    </div>
                    <EntregaClienteSelector
                      moradaSelecionada={moradaEntregaSelecionada}
                      onMoradaSelecionada={setMoradaEntregaSelecionada}
                      clienteVinculado={clienteEntregaVinculado}
                      onClienteVinculado={setClienteEntregaVinculado}
                      onEditarClientePorDuploClique={handleAbrirEdicaoClienteEntrega}
                      onAbrirSeletorCliente={() => setSeletorClienteOpen(true)}
                      telefoneExibicaoExterno={telefoneBuscaEntrega}
                      onTelefoneExibicaoExternoChange={setTelefoneBuscaEntrega}
                      digitosUltimaBuscaExterno={telefoneBuscadoEntrega}
                      onDigitosUltimaBuscaExternoChange={setTelefoneBuscadoEntrega}
                      enderecoPadrao={{
                        cidade: empresa?.cidade,
                        estado: empresa?.estado,
                      }}
                      mostrarEnderecos={pedidoComEntrega}
                    />
                    {pedidoComRetirada ? (
                      <div className="mt-3 rounded-lg border border-primary/15 bg-white p-3 text-sm text-secondary-text">
                        Pedido configurado para retirada no balcão. Entregador e taxa de entrega não
                        são necessários.
                      </div>
                    ) : null}
                    {pedidoComEntrega && (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdAccessTime className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Tempo previsto
                          </Label>
                        </div>
                        <Select
                          value={String(tempoPrevistoMinutos)}
                          onValueChange={value => setTempoPrevistoMinutos(Number(value) || 30)}
                        >
                          <SelectTrigger className="border-primary/30 bg-white">
                            <SelectValue placeholder="Selecione o tempo" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPOS_PREVISTOS_ENTREGA.map(minutos => (
                              <SelectItem key={minutos} value={String(minutos)}>
                                {minutos} minutos
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          Enviado como <code>tempoPrevistoMinutos</code>; o backend calcula a previsão.
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdDeliveryDining className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Entregador
                          </Label>
                        </div>
                        <Select
                          value={entregadorId || SEM_ENTREGADOR_VALUE}
                          onValueChange={value => {
                            const novoEntregadorId = value === SEM_ENTREGADOR_VALUE ? '' : value
                            setEntregadorId(novoEntregadorId)
                            setUltimoEntregadorSelecionado(novoEntregadorId)
                          }}
                          disabled={entregadoresQuery.isLoading}
                        >
                          <SelectTrigger className="border-primary/30 bg-white">
                            <SelectValue
                              placeholder={
                                entregadoresQuery.isLoading
                                  ? 'Carregando entregadores...'
                                  : 'Selecionar entregador'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_ENTREGADOR_VALUE}>
                              Sem entregador definido
                            </SelectItem>
                            {entregadores.map(entregador => (
                              <SelectItem key={entregador.id} value={entregador.id}>
                                {entregador.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          Somente usuários PDV ativos do tipo entregador.
                        </p>
                      </div>

                      <div className="rounded-lg border border-primary/15 bg-white p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <MdAttachMoney className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-semibold text-primary-text">
                            Taxa de entrega
                          </Label>
                        </div>
                        <Select
                          value={taxaEntregaId || SEM_TAXA_ENTREGA_VALUE}
                          onValueChange={value =>
                            setTaxaEntregaId(value === SEM_TAXA_ENTREGA_VALUE ? '' : value)
                          }
                          disabled={taxasEntregaQuery.isLoading}
                        >
                          <SelectTrigger className="border-primary/30 bg-white">
                            <SelectValue
                              placeholder={
                                taxasEntregaQuery.isLoading
                                  ? 'Carregando taxas...'
                                  : 'Selecionar taxa'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SEM_TAXA_ENTREGA_VALUE}>
                              Sem taxa de entrega
                            </SelectItem>
                            {taxasEntrega.map(taxa => (
                              <SelectItem key={taxa.getId()} value={taxa.getId()}>
                                {taxa.getNome()} - {transformarParaReal(taxa.getValor())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-secondary-text">
                          {taxaEntregaSelecionada
                            ? `Produtos ${transformarParaReal(subtotalProdutos)} + taxa ${transformarParaReal(valorTaxaEntrega)} = ${transformarParaReal(totalProdutos)}.`
                            : 'Selecione uma taxa cadastrada do tipo entrega.'}
                        </p>
                      </div>
                    </div>
                    )}
                  </div>
                ) : (
                  /* Fluxo balcão: seletor de cliente convencional */
                  <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <MdPersonOutline className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-lg font-semibold text-primary">Cliente (Opcional)</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={clienteNome}
                        placeholder="Nenhum cliente selecionado"
                        inputProps={{ readOnly: true }}
                        className="flex-1 cursor-pointer border-primary/30 bg-white"
                        onClick={() => setSeletorClienteOpen(true)}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            padding: '4px 8px',
                            '& input': {
                              padding: '4px 8px',
                            },
                          },
                        }}
                      />
                      {clienteNome && (
                        <Button
                          type="button"
                          variant="outlined"
                          size="sm"
                          onClick={handleRemoveCliente}
                          className="flex-shrink-0 border-primary/30 hover:border-red-300 hover:bg-red-50"
                        >
                          <MdDelete className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setSeletorClienteOpen(true)}
                        className="flex-shrink-0 border-primary/30 hover:bg-primary/10"
                      >
                        <MdSearch className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Origem e Status: apenas no fluxo balcão (entrega usa apenas cliente nesta etapa) */}
                {tipoInicioPedido !== 'entrega' && (
                  <>
                    {/* Origem */}
                    <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <MdStore className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg font-semibold text-primary">Origem do Pedido</span>
                      </div>
                      <Select value={origem} onValueChange={value => setOrigem(value as OrigemVenda)}>
                        <SelectTrigger className="border-primary/30 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GESTOR">Gestor (Manual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status */}
                    <div className="rounded-lg border-2 border-primary/20 bg-gray-50 p-2">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <MdInfo className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-lg font-semibold text-primary">Status do Pedido</span>
                      </div>
                      <Select value={status} onValueChange={value => setStatus(value as StatusVenda)}>
                        <SelectTrigger className="border-primary/30 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusDisponiveis.map(st => (
                            <SelectItem
                              key={st.value}
                              value={st.value}
                              disabled={st.value === 'ABERTA'}
                            >
                              {st.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Seleção de Produtos (balcão) | Informações do Pedido (entrega) */}
            {/* Conteúdo Produtos: step 2 no balcão, step 1 na entrega */}
            {!modoVisualizacao &&
              ((tipoInicioPedido !== 'entrega' && currentStep === 2) ||
                (tipoInicioPedido === 'entrega' && currentStep === 1)) && (
              <div className="flex min-h-0 flex-1 flex-col gap-2 py-2">
                {/* Campo de pesquisa de produtos */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto pelo nome..."
                      value={buscaProdutoTexto}
                      onChange={(e) => setBuscaProdutoTexto(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {buscaProdutoTexto.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setBuscaProdutoTexto('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <MdClear className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Área de Edição de Produtos Selecionados: altura fixa quando grupos visíveis, cresce quando grupos ocultos */}
                <div
                  className={`scrollbar-thin overflow-y-auto rounded-lg border bg-gray-50 ${
                    gruposExpandido ? 'h-48 flex-shrink-0' : 'min-h-64 flex-1'
                  }`}
                >
                  {produtos.length > 0 ? (
                    <div className="p-2">
                      {/* Cabeçalho da tabela */}
                      <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2">
                        <div className="flex w-[60px] flex-shrink-0 items-center justify-center">
                          <span className="text-center text-xs font-semibold text-gray-700">
                            Qtd
                          </span>
                        </div>
                        <div className="flex-[4]">
                          <span className="text-xs font-semibold text-gray-700">Produto</span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Desc./Acres.
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Val Unit.
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="text-right text-xs font-semibold text-gray-700">
                            Total
                          </span>
                        </div>
                        <div className="flex flex-1 justify-end">
                          <span className="mr-2 text-xs font-semibold text-gray-700">Ações</span>
                        </div>
                      </div>
                      {/* Linhas de produtos */}
                      <div className="space-y-1">
                        {produtos.map((produto, index) => {
                          // calcularTotalProduto já inclui complementos e desconto/acréscimo
                          const totalProdutoComComplementos = calcularTotalProduto(produto)

                          return (
                            <div key={index} className="space-y-0">
                              {/* Linha do Produto Principal */}
                              <div
                                className={`flex items-center gap-1 rounded ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } cursor-pointer hover:bg-gray-100`}
                                onMouseDown={e => {
                                  // Iniciar long press apenas se não for em um input ou button
                                  const target = e.target as HTMLElement
                                  if (
                                    target.tagName === 'INPUT' ||
                                    target.tagName === 'BUTTON' ||
                                    target.closest('button') ||
                                    target.closest('input')
                                  ) {
                                    return
                                  }

                                  longPressIndexRef.current = index
                                  longPressTimeoutRef.current = setTimeout(() => {
                                    if (longPressIndexRef.current === index) {
                                      void abrirModalEdicaoProduto(index)
                                    }
                                  }, 800) // 800ms para long press
                                }}
                                onMouseUp={() => {
                                  // Limpar timeout se soltar antes do tempo
                                  if (longPressTimeoutRef.current) {
                                    clearTimeout(longPressTimeoutRef.current)
                                    longPressTimeoutRef.current = null
                                  }
                                  longPressIndexRef.current = null
                                }}
                                onMouseLeave={() => {
                                  // Limpar timeout se sair da área
                                  if (longPressTimeoutRef.current) {
                                    clearTimeout(longPressTimeoutRef.current)
                                    longPressTimeoutRef.current = null
                                  }
                                  longPressIndexRef.current = null
                                }}
                              >
                                {/* Quantidade */}
                                <div className="w-[60px] flex-shrink-0">
                                  <input
                                    type="number"
                                    min={1}
                                    value={Math.floor(produto.quantidade)}
                                    onChange={e => {
                                      const valor = parseInt(e.target.value) || 1
                                      atualizarProduto(index, 'quantidade', Math.max(1, valor))
                                    }}
                                    style={{
                                      MozAppearance: 'textfield',
                                      WebkitAppearance: 'none',
                                      appearance: 'none',
                                    }}
                                    className="h-7 w-full border-0 bg-transparent p-1 text-center text-xs focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </div>
                                {/* Nome do Produto */}
                                <div className="min-w-0 flex-[4]">
                                  <span className="block truncate text-xs text-gray-900">
                                    {produto.nome}
                                  </span>
                                </div>
                                {/* Desconto/Acréscimo */}
                                <div className="flex-1">
                                  <span className="block text-right text-xs text-gray-600">
                                    {formatarDescontoAcrescimo(produto)}
                                  </span>
                                </div>
                                {/* Valor Unitário */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={
                                      valoresEmEdicao[index] !== undefined
                                        ? valoresEmEdicao[index]
                                        : produto.valorUnitario > 0
                                          ? formatarNumeroComMilhar(produto.valorUnitario)
                                          : ''
                                    }
                                    onChange={e => {
                                      let valorStr = e.target.value

                                      // Se vazio, limpa o campo
                                      if (valorStr === '') {
                                        setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                        atualizarProduto(index, 'valorUnitario', 0)
                                        return
                                      }

                                      // Remove pontos (separadores de milhar) e vírgula, mantém apenas números
                                      valorStr = valorStr
                                        .replace(/\./g, '')
                                        .replace(',', '')
                                        .replace(/\D/g, '')

                                      // Se vazio após limpeza, limpa o campo
                                      if (valorStr === '') {
                                        setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                        atualizarProduto(index, 'valorUnitario', 0)
                                        return
                                      }

                                      // Converte para número (centavos) e divide por 100 para obter reais
                                      const valorCentavos = parseInt(valorStr, 10)
                                      const valorReais = valorCentavos / 100

                                      // Formata com separadores de milhar
                                      const valorFormatado = formatarNumeroComMilhar(valorReais)

                                      // Atualiza o estado de edição com o valor formatado
                                      setValoresEmEdicao(prev => ({
                                        ...prev,
                                        [index]: valorFormatado,
                                      }))

                                      // Atualiza o valor do produto
                                      atualizarProduto(index, 'valorUnitario', valorReais)
                                    }}
                                    onFocus={e => {
                                      // Ao focar, mantém o valor formatado (ex: "8,00" ou "1.000.000,00")
                                      const valorAtual = produto.valorUnitario
                                      if (valorAtual > 0) {
                                        const valorFormatado = formatarNumeroComMilhar(valorAtual)
                                        setValoresEmEdicao(prev => ({
                                          ...prev,
                                          [index]: valorFormatado,
                                        }))
                                      } else {
                                        setValoresEmEdicao(prev => ({ ...prev, [index]: '' }))
                                      }
                                      // Seleciona todo o texto para facilitar substituição
                                      setTimeout(() => e.target.select(), 0)
                                    }}
                                    onBlur={e => {
                                      // Garante formatação correta ao perder o foco
                                      const valor = produto.valorUnitario
                                      if (valor > 0) {
                                        const valorFormatado = formatarNumeroComMilhar(valor)
                                        setValoresEmEdicao(prev => ({
                                          ...prev,
                                          [index]: valorFormatado,
                                        }))
                                        // Remove do estado após um pequeno delay para mostrar formato final
                                        setTimeout(() => {
                                          setValoresEmEdicao(prev => {
                                            const novo = { ...prev }
                                            delete novo[index]
                                            return novo
                                          })
                                        }, 100)
                                      } else {
                                        // Remove do estado se vazio
                                        setValoresEmEdicao(prev => {
                                          const novo = { ...prev }
                                          delete novo[index]
                                          return novo
                                        })
                                      }
                                    }}
                                    placeholder="0,00"
                                    style={{
                                      MozAppearance: 'textfield',
                                      WebkitAppearance: 'none',
                                      appearance: 'none',
                                    }}
                                    className="h-7 w-full border-0 bg-transparent p-1 text-right text-xs focus:bg-white focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                {/* Total */}
                                <div className="flex-1">
                                  <span className="block text-right text-xs font-semibold text-gray-900">
                                    R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                                  </span>
                                </div>
                                {/* Ações: colunas fixas (editar | complementos | excluir) */}
                                <div
                                  className="flex w-[76px] flex-shrink-0 items-center justify-end gap-0"
                                  role="group"
                                  aria-label="Ações do produto"
                                >
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() => void abrirModalEdicaoProduto(index)}
                                      type="button"
                                      title="Editar produto"
                                      className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                                    >
                                      <MdEdit className="h-4 w-4 text-primary" />
                                    </button>
                                  </div>
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() =>
                                        void abrirModalComplementosProdutoExistente(index)
                                      }
                                      type="button"
                                      className="flex h-5 w-5 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-gray-200"
                                      title="Complementos (editar ou vincular)"
                                    >
                                      <MdLaunch className="h-4 w-4 text-primary" />
                                    </button>
                                  </div>
                                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                                    <button
                                      onClick={() => removerProduto(index)}
                                      type="button"
                                      title="Remover produto"
                                      className="flex h-6 w-6 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-100"
                                    >
                                      <MdDelete className="h-4 w-4 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Linhas dos Complementos */}
                              {produto.complementos.map((complemento, compIndex) => {
                                const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                                const valorEmEdicao = valoresEmEdicao[compKey]

                                return (
                                  <div
                                    key={compKey}
                                    className={`-mt-0.5 flex items-center gap-1 rounded ${
                                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    } cursor-pointer hover:bg-gray-100`}
                                    style={{ minHeight: '24px' }}
                                    onMouseDown={e => {
                                      // Iniciar long press apenas se não for em um input ou button
                                      const target = e.target as HTMLElement
                                      if (
                                        target.tagName === 'INPUT' ||
                                        target.tagName === 'BUTTON' ||
                                        target.closest('button') ||
                                        target.closest('input')
                                      ) {
                                        return
                                      }

                                      longPressComplementoIndexRef.current = index
                                      longPressComplementoTimeoutRef.current = setTimeout(() => {
                                        if (longPressComplementoIndexRef.current === index) {
                                          void abrirModalComplementosProdutoExistente(index)
                                        }
                                      }, 800) // 800ms para long press
                                    }}
                                    onMouseUp={() => {
                                      // Limpar timeout se soltar antes do tempo
                                      if (longPressComplementoTimeoutRef.current) {
                                        clearTimeout(longPressComplementoTimeoutRef.current)
                                        longPressComplementoTimeoutRef.current = null
                                      }
                                      longPressComplementoIndexRef.current = null
                                    }}
                                    onMouseLeave={() => {
                                      // Limpar timeout se sair da área
                                      if (longPressComplementoTimeoutRef.current) {
                                        clearTimeout(longPressComplementoTimeoutRef.current)
                                        longPressComplementoTimeoutRef.current = null
                                      }
                                      longPressComplementoIndexRef.current = null
                                    }}
                                  >
                                    {/* Quantidade do Complemento */}
                                    <div className="w-[60px] flex-shrink-0 pl-4">
                                      <input
                                        type="number"
                                        min={1}
                                        value={complemento.quantidade}
                                        onChange={e => {
                                          const valor = parseInt(e.target.value) || 1
                                          atualizarComplemento(
                                            index,
                                            compIndex,
                                            'quantidade',
                                            Math.max(1, valor)
                                          )
                                        }}
                                        style={{
                                          MozAppearance: 'textfield',
                                          WebkitAppearance: 'none',
                                          appearance: 'none',
                                        }}
                                        className="h-5 w-full border-0 bg-transparent px-1 text-right text-xs focus:bg-white focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                      />
                                    </div>
                                    {/* Nome do Complemento com indentação */}
                                    <div className="min-w-0 flex-[4] pl-4">
                                      <span className="block truncate text-xs leading-tight text-gray-600">
                                        {complemento.nome}
                                      </span>
                                    </div>
                                    {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                                    <div className="flex-1"></div>
                                    {/* Valor Unitário do Complemento - Apenas exibição */}
                                    <div className="flex-1">
                                      <span className="block text-right text-xs leading-tight text-gray-600">
                                        {formatarValorComplemento(
                                          complemento.valor,
                                          complemento.tipoImpactoPreco
                                        )}
                                      </span>
                                    </div>
                                    {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                                    <div className="flex-1"></div>
                                    {/* Mesma grade de ações da linha do produto: remove alinhado à coluna Exc. */}
                                    <div className="flex w-[76px] flex-shrink-0 items-center justify-end gap-0.5">
                                      <span className="block h-6 w-6 shrink-0" aria-hidden />
                                      <span className="block h-6 w-6 shrink-0" aria-hidden />
                                      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                                        <button
                                          onClick={() => removerComplemento(index, compIndex)}
                                          type="button"
                                          title="Remover complemento"
                                          className="flex h-6 w-6 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-50"
                                        >
                                          <MdClear className="h-3.5 w-3.5 text-red-500" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
                    </div>
                  )}
                </div>

                {/* Total do Pedido */}
                <div className="flex flex-shrink-0 items-center justify-end gap-2">
                  <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
                  <span className="text-lg font-semibold text-primary">
                    {transformarParaReal(totalProdutos)}
                  </span>
                </div>

                {/* Seção recolhível: Grupos de produtos — ao ocultar, a área de produtos selecionados acima ganha mais altura */}
                <div className="flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setGruposExpandido(!gruposExpandido)}
                    className="flex w-full items-center justify-between gap-2 border-b border-gray-200/50 px-3 py-2 text-left transition-colors hover:bg-gray-100/80"
                    aria-expanded={gruposExpandido}
                  >
                    <span className="text-sm font-semibold text-gray-700">Grupos de produtos</span>
                    <span className="ml-auto flex items-center gap-2">
                      {gruposExpandido ? (
                        <>
                          <span className="text-xs text-gray-500">Ocultar</span>
                          <MdExpandLess className="h-5 w-5 flex-shrink-0 text-gray-600" />
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-500">Mostrar grupos</span>
                          <MdExpandMore className="h-5 w-5 flex-shrink-0 text-gray-600" />
                        </>
                      )}
                    </span>
                  </button>
                  {gruposExpandido && (
                    <div className="space-y-2 px-3 pb-3 pt-1">
                      {/* Grid ou Lista Horizontal de Grupos - Ocultar durante busca */}
                      {buscaProdutoTexto.length < 2 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {!grupoSelecionadoId ? (
                              <Label className="text-sm text-gray-600">Selecione um grupo:</Label>
                            ) : (
                              <Button
                                variant="outlined"
                                size="sm"
                                onClick={() => setGrupoSelecionadoId(null)}
                                type="button"
                                className="flex h-7 min-h-[28px] min-w-[28px] items-center justify-center p-0"
                              >
                                <MdArrowBack className="h-4 w-4" /> Voltar aos grupos
                              </Button>
                            )}
                          </div>
                          {isLoadingGruposVenda ? (
                            <div className="py-4 text-center text-gray-500">
                              <JiffyLoading />
                            </div>
                          ) : grupos.length === 0 ? (
                            <div className="py-4 text-center text-gray-500">
                              Nenhum grupo encontrado
                            </div>
                          ) : !grupoSelecionadoId ? (
                            // Grid de Grupos (quando nenhum grupo está selecionado)
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                              {grupos.map(grupo => {
                                const corHex = grupo.getCorHex()
                                const iconName = grupo.getIconName()
                                return (
                                  <div key={grupo.getId()} className="relative">
                                    <button
                                      onClick={() => setGrupoSelecionadoId(grupo.getId())}
                                      className="flex aspect-square w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 p-2 text-center transition-all hover:opacity-80"
                                      style={{
                                        borderColor: corHex,
                                        backgroundColor: `${corHex}15`,
                                      }}
                                    >
                                      <div
                                        className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center"
                                        style={{
                                          borderColor: corHex,
                                        }}
                                      >
                                        <DinamicIcon iconName={iconName} color={corHex} size={34} />
                                      </div>
                                      <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium text-gray-900">
                                        {grupo.getNome()}
                                      </div>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            // Lista Horizontal de Grupos (quando um grupo está selecionado)
                            <div
                              ref={gruposScrollRef}
                              className="scrollbar-thin flex cursor-grab select-none gap-3 overflow-x-auto pb-2 active:cursor-grabbing"
                              style={{ scrollbarWidth: 'thin' }}
                              onMouseDown={handleMouseDown}
                              onMouseMove={handleMouseMove}
                              onMouseUp={handleMouseUp}
                              onMouseLeave={handleMouseLeave}
                            >
                              {grupos.map(grupo => {
                                const corHex = grupo.getCorHex()
                                const iconName = grupo.getIconName()
                                const isSelected = grupoSelecionadoId === grupo.getId()
                                return (
                                  <div
                                    key={grupo.getId()}
                                    className="relative flex-shrink-0"
                                    style={{ width: '100px' }}
                                  >
                                    <button
                                      onClick={e => {
                                        // Só executar o clique se não houve movimento significativo durante o arraste
                                        if (!hasMovedRef.current && !isDragging) {
                                          setGrupoSelecionadoId(grupo.getId())
                                        }
                                      }}
                                      onMouseDown={e => {
                                        // Permitir que o evento propague para o container para iniciar o arraste
                                        // O onClick só será executado se não houver movimento
                                      }}
                                      className="pointer-events-auto flex aspect-square h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 p-2 text-center transition-all"
                                      style={{
                                        borderColor: corHex,
                                        backgroundColor: isSelected ? corHex : `${corHex}15`,
                                        color: isSelected ? '#ffffff' : '#1f2937',
                                      }}
                                    >
                                      <div className="flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center">
                                        <DinamicIcon
                                          iconName={iconName}
                                          color={isSelected ? '#ffffff' : corHex}
                                          size={34}
                                        />
                                      </div>
                                      <div className="line-clamp-2 w-full overflow-hidden text-ellipsis px-1 text-[10px] font-medium">
                                        {grupo.getNome()}
                                      </div>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Grid de Produtos do Grupo Selecionado ou Resultado da Busca */}
                      {(grupoSelecionadoId || buscaProdutoTexto.length >= 2) &&
                        (() => {
                          const grupoSelecionado = grupos.find(
                            g => g.getId() === grupoSelecionadoId
                          )
                          const corHexGrupo = grupoSelecionado?.getCorHex() || '#6b7280'
                          const tituloGrade =
                            buscaProdutoTexto.length >= 2
                              ? `Resultados para "${buscaProdutoTexto}"`
                              : `Produtos do grupo: `
                          const isLoadingAtual =
                            buscaProdutoTexto.length >= 2
                              ? isLoadingBuscaProdutos
                              : isLoadingProdutos

                          return (
                            <div className="space-y-2">
                              <Label className="text-sm text-gray-600">
                                {tituloGrade}
                                {buscaProdutoTexto.length < 2 && (
                                  <span className="font-semibold">{grupoSelecionado?.getNome()}</span>
                                )}
                              </Label>
                              {isLoadingAtual ? (
                                <div className="py-4 text-center text-gray-500">
                                  <JiffyLoading />
                                </div>
                              ) : buscaProdutoTexto.length < 2 && produtosError ? (
                                <div className="py-4 text-center text-red-500">
                                  Erro ao carregar produtos:{' '}
                                  {produtosError instanceof Error
                                    ? produtosError.message
                                    : 'Erro desconhecido'}
                                </div>
                              ) : produtosList.length === 0 ? (
                                <div className="py-4 text-center text-gray-500">
                                  Nenhum produto encontrado neste grupo
                                </div>
                              ) : (
                                <div
                                  className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4 md:grid-cols-7"
                                  style={{
                                    backgroundColor: `${corHexGrupo}15`,
                                  }}
                                >
                                  {produtosList.map(produto => {
                                    return (
                                      <div key={produto.getId()} className="relative">
                                        <button
                                          onClick={() => adicionarProduto(produto.getId())}
                                          onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = corHexGrupo
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                          onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = corHexGrupo
                                            e.currentTarget.style.backgroundColor = '#ffffff'
                                          }}
                                          className="relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 text-center transition-all"
                                          style={{
                                            borderColor: corHexGrupo,
                                            backgroundColor: '#ffffff',
                                          }}
                                        >
                                          <div className="mb-1 break-words text-[10px] font-medium text-gray-900">
                                            {produto.getNome()}
                                          </div>
                                          <div className="text-[10px] font-semibold text-primary-text">
                                            {transformarParaReal(produto.getValor())}
                                          </div>
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Pagamento */}
            {!modoVisualizacao && currentStep === 3 && (
              <div className="space-y-2">
                {/* Informações do Pedido */}
                <div className="rounded-lg border bg-gray-50 px-4">
                  <h3 className="text-lg font-semibold">Informações do Pedido</h3>
                  <div className="text-sm">
                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Data:</span>
                      <span className="font-medium">
                        {new Date().toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-gray-600">Origem:</span>
                      <span className="font-medium">{origem}</span>
                    </div>
                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">{rotuloStatusResumoModal}</span>
                    </div>
                    {clienteNome && (
                      <div className="flex justify-between px-1">
                        <span className="text-gray-600">Cliente:</span>
                        <span className="font-medium">{clienteNome}</span>
                      </div>
                    )}

                    <div className="flex justify-between rounded-lg bg-white px-1">
                      <span className="text-gray-600">Total de Itens:</span>
                      <span className="font-medium">
                        {totalItensPedido} {totalItensPedido === 1 ? 'produto' : 'produtos'}
                      </span>
                    </div>
                    {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
                      <div className="flex justify-between rounded-lg bg-white px-1">
                        <span className="text-gray-600">Taxa de entrega:</span>
                        <span className="font-medium text-primary">
                          + {transformarParaReal(valorTaxaEntrega)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagamento: balcão finalizado/NFe ou entrega em triagem (ABERTA) */}
                {pedidoGestorComPagamentoNoPasso3 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-white px-4">
                      <h3 className="text-lg font-semibold">Pagamento</h3>

                      {/* Total do Pedido e A pagar */}
                      <div className="mb-2 space-y-2 text-sm">
                        {pedidoEntregaAceitaPagamentoPendente && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFluxoPagamentoEntrega('cobrar_entregador')
                                setPagamentos(prev =>
                                  prev.map(pagamento => ({ ...pagamento, cobrarNaEntrega: true }))
                                )
                              }}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                fluxoPagamentoEntrega === 'cobrar_entregador'
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-200 bg-white text-primary-text'
                              }`}
                            >
                              {rotuloCobrancaPendente}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFluxoPagamentoEntrega('ja_pago')
                                setPagamentos(prev =>
                                  prev.map(pagamento => ({ ...pagamento, cobrarNaEntrega: false }))
                                )
                              }}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                                fluxoPagamentoEntrega === 'ja_pago'
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-200 bg-white text-primary-text'
                              }`}
                            >
                              Já foi pago
                            </button>
                          </div>
                        )}
                        {pedidoEntregaAceitaPagamentoPendente && valorTaxaEntrega > 0 && (
                          <>
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                              <span className="font-medium text-gray-700">Produtos:</span>
                              <span className="text-base font-semibold text-gray-900">
                                {transformarParaReal(subtotalProdutos)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                              <span className="font-medium text-gray-700">Taxa de entrega:</span>
                              <span className="text-base font-semibold text-gray-900">
                                + {transformarParaReal(valorTaxaEntrega)}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-medium text-gray-700">Total do Pedido:</span>
                          <span className="text-base font-semibold text-primary">
                            {transformarParaReal(totalProdutos)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-medium text-gray-700">A pagar:</span>
                          <span
                            className={`text-base font-semibold ${
                              valorAPagar > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {transformarParaReal(valorAPagar)}
                          </span>
                        </div>
                        {pedidoEntregaAceitaPagamentoPendente && (
                          <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                            <span className="font-medium text-gray-700">Status pagamento:</span>
                            <span
                              className={`text-base font-semibold ${
                                statusPagamentoExibicao === 'pago'
                                  ? 'text-green-600'
                                  : statusPagamentoExibicao === 'parcial'
                                    ? 'text-amber-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {rotuloStatusPagamentoExibicao}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary-text">
                            {pagamentoModoCobranca ? 'Valor a receber:' : 'Valor Recebido:'}
                          </span>
                          <input
                            type="text"
                            value={valorRecebido}
                            onChange={e => {
                              const valorFormatado = formatarValorRecebido(e.target.value)
                              setValorRecebido(valorFormatado)
                            }}
                            placeholder="0,00"
                            className="rounded-lg border-2 p-1 text-right font-semibold transition-colors hover:border-primary-text"
                          />
                        </div>
                      </div>

                      {/* Formas de Pagamento - Cards */}
                      <div className="mb-2">
                        <Label className="mb-2 block text-base font-semibold">
                          Forma de Pagamento
                        </Label>
                        <div
                          ref={meiosPagamentoScrollRef}
                          className={`scrollbar-thin flex gap-3 overflow-x-auto pb-2 ${mostrarLoadingFormasPagamento ? 'min-h-[120px] cursor-default' : 'cursor-grab select-none active:cursor-grabbing'}`}
                          style={{ scrollbarWidth: 'thin' }}
                          onMouseDown={
                            mostrarLoadingFormasPagamento
                              ? undefined
                              : handleMouseDownMeiosPagamento
                          }
                        >
                          {mostrarLoadingFormasPagamento ? (
                            <div className="flex w-full flex-1 items-center justify-center py-2">
                              <JiffyLoading />
                            </div>
                          ) : (
                            meiosPagamento.map(meio => {
                              const Icone = obterIconeMeioPagamento(meio.getNome())

                              return (
                                <button
                                  key={meio.getId()}
                                  type="button"
                                  onClick={e => {
                                    // Só executar o clique se não houve movimento significativo durante o arraste
                                    if (
                                      !hasMovedMeiosPagamentoRef.current &&
                                      !isDraggingMeiosPagamento
                                    ) {
                                      adicionarPagamentoPorCard(meio.getId())
                                    }
                                  }}
                                  onMouseDown={e => {
                                    // Permitir que o evento propague para o container para iniciar o arraste
                                  }}
                                  disabled={valorAPagarLancamento <= 0 && !valorRecebido.trim()}
                                  className={`flex min-w-[100px] flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-white p-2 transition-all hover:bg-primary hover:text-white ${valorAPagarLancamento <= 0 && !valorRecebido.trim() ? 'cursor-not-allowed opacity-50' : ''} `}
                                >
                                  <Icone className="h-8 w-8" />
                                  <span className="text-center text-xs font-medium">
                                    {meio.getNome()}
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>

                      {/* Totais de Pagamento */}
                      <div className="border-t pt-2 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                          <span className="font-semibold text-gray-700">
                            Total Recebido (Efetivo):
                          </span>
                          <span className="text-base font-semibold text-green-700">
                            {transformarParaReal(totalPagamentos)}
                          </span>
                        </div>
                        {(totalPagamentosLancados - totalPagamentos) > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 p-1">
                            <span className="font-semibold text-gray-700">
                              A receber na entrega:
                            </span>
                            <span className="text-base font-semibold text-amber-700">
                              {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                            </span>
                          </div>
                        )}
                        {trocoLancamento > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-gray-50 p-1">
                            <span className="font-semibold text-gray-700">Troco previsto:</span>
                            <span className="text-base font-semibold text-green-600">
                              {transformarParaReal(trocoLancamento)}
                            </span>
                          </div>
                        )}
                        {valorAPagarLancamento > 0 && (
                          <div className="mt-1 flex items-center justify-between rounded-lg bg-red-50 p-1">
                            <span className="font-semibold text-gray-700">
                              Restante a lançar:
                            </span>
                            <span className="text-base font-semibold text-red-600">
                              {transformarParaReal(valorAPagarLancamento)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Detalhes dos Pagamentos Aplicados */}
                      {pagamentos.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <Label className="mb-2 block text-sm font-semibold">Detalhes:</Label>
                          <div className="flex flex-wrap gap-2">
                            {pagamentos.map((pagamento, index) => {
                              const meio = meiosPagamento.find(
                                m => m.getId() === pagamento.meioPagamentoId
                              )
                              const Icone = meio
                                ? obterIconeMeioPagamento(meio.getNome())
                                : MdCreditCard

                              return (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-100 p-2"
                                >
                                  <Icone className="h-6 w-6 text-green-700" />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium text-green-900">
                                      {meio?.getNome() || 'Meio de pagamento'}
                                    </span>
                                    <span className="text-xs font-semibold text-green-900">
                                      {transformarParaReal(pagamento.valor)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => removerPagamento(index)}
                                    type="button"
                                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 p-0 hover:bg-green-200"
                                  >
                                    <MdDelete className="h-4 w-4 text-green-700" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Detalhes da Venda (visualização ou após criar pedido) */}
            {currentStep === 4 && !isLoadingVenda && (
              <div className="space-y-4 py-2">
                {abaDetalhesPedido === 'notaFiscal' && podeExibirAbaNotaFiscal ? (
                  <div
                    className="space-y-3"
                    role="tabpanel"
                    aria-labelledby="tab-detalhes-nota-fiscal"
                  >
                    <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/20 bg-gray-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-nunito text-lg font-semibold text-primary">
                        Resumo da Nota Fiscal modelo: {rotuloModeloNfe(resumoFiscal?.modelo)}
                      </h3>
                      {resumoFiscal?.documentoFiscalId &&
                        statusFiscalEhEmitida(resumoFiscal.status, statusFiscalUnificado) && (
                          <Button
                            type="button"
                            variant="outlined"
                            className="shrink-0 !border-primary !text-primary hover:!bg-primary/5"
                            onClick={() => {
                              void abrirDocumentoFiscalPdf(
                                resumoFiscal.documentoFiscalId!,
                                tipoDocFiscalFromModelo(resumoFiscal.modelo)
                              )
                            }}
                          >
                            Ver{' '}
                            {tipoDocFiscalFromModelo(resumoFiscal.modelo) === 'NFE'
                              ? 'NFe'
                              : 'NFCe'}
                          </Button>
                        )}
                    </div>

                    {!resumoFiscal ? (
                      <div className="rounded-lg border border-dashed border-amber-300/80 bg-amber-50/90 px-6 py-10 text-center">
                        <p className="font-nunito text-sm leading-relaxed text-amber-950/90">
                          Nenhum resumo fiscal disponível para esta venda. Isso pode ocorrer se
                          ainda não houver nota emitida ou se o backend não retornou o objeto{' '}
                          <span className="font-semibold">resumoFiscal</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="divide-y divide-gray-100">
                          {(
                            [
                              {
                                label: 'Status',
                                value: resumoFiscal.status ?? '—',
                              },
                              {
                                label: 'Retorno SEFAZ',
                                value: resumoFiscal.retornoSefaz ?? '—',
                                multiline: true,
                              },
                              {
                                label: 'Código retorno',
                                value: (resumoFiscal as any).codigoRetorno ?? '—',
                              },
                              {
                                label: 'Número ' + rotuloModeloNfe(resumoFiscal.modelo ?? null),
                                value:
                                  resumoFiscal.numero != null ? String(resumoFiscal.numero) : '—',
                              },
                              {
                                label: 'Série',
                                value: resumoFiscal.serie ?? '—',
                              },
                              {
                                label: 'Data de emissão',
                                value: formatarDataHoraResumoFiscal(resumoFiscal.dataEmissao),
                              },
                              {
                                label: 'Modelo',
                                value: rotuloModeloNfe(resumoFiscal.modelo ?? null),
                              },
                              {
                                label: 'Chave fiscal',
                                value: resumoFiscal.chaveFiscal ?? '—',
                                monospace: true,
                              },
                              {
                                label: 'Data de criação',
                                value: formatarDataHoraResumoFiscal(resumoFiscal.dataCriacao),
                              },
                              {
                                label: 'Última modificação',
                                value: formatarDataHoraResumoFiscal(
                                  resumoFiscal.dataUltimaModificacao
                                ),
                              },
                            ] as const
                          ).map((row, idx) => (
                            <div
                              key={row.label}
                              className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'
                              }`}
                            >
                              <span className="shrink-0 text-xs font-semibold text-gray-600 sm:text-sm">
                                {row.label}
                              </span>
                              <span
                                className={`font-nunito break-words text-right text-sm text-gray-900 sm:max-w-[min(100%,28rem)] sm:text-left ${
                                  'monospace' in row && row.monospace ? 'font-mono text-sm' : ''
                                } ${
                                  'multiline' in row && row.multiline ? 'whitespace-pre-wrap' : ''
                                }`}
                              >
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {abaDetalhesPedido === 'infoPedido' && (
                      <div
                        className="rounded-lg border bg-gray-50 px-4"
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-info-pedido"
                      >
                        <h3 className="text-lg font-semibold">Informações do Pedido</h3>
                        <div className="flex flex-col gap-3 text-sm">
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Data:</span>
                            <span className="font-medium">
                              {(dataVenda ? new Date(dataVenda) : new Date()).toLocaleString(
                                'pt-BR',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-gray-600">Origem:</span>
                            <span className="font-medium">
                              {rotuloOrigemParaExibicao(origemTextoApiDetalhe)}
                            </span>
                          </div>
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{rotuloStatusResumoModal}</span>
                          </div>
                          {clienteNome && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Cliente:</span>
                              <span className="font-medium">{clienteNome}</span>
                            </div>
                          )}

                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Total de Itens:</span>
                            <span className="font-medium">
                              {totalItensPedido} {totalItensPedido === 1 ? 'produto' : 'produtos'}
                            </span>
                          </div>
                          <div className="flex justify-between px-1">
                            <span className="text-gray-600">Aberto por:</span>
                            <span className="font-medium">
                              {formatarUsuarioPorId(detalhesPedidoMeta?.abertoPorId)}
                            </span>
                          </div>
                          {detalhesPedidoMeta?.ultimoResponsavelId && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Última alteração por:</span>
                              <span className="font-medium">
                                {formatarUsuarioPorId(detalhesPedidoMeta.ultimoResponsavelId)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.canceladoPorId && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Cancelado por:</span>
                              <span className="font-medium text-red-600">
                                {formatarUsuarioPorId(detalhesPedidoMeta.canceladoPorId)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.codigoTerminal && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Código do terminal:</span>
                              <span className="font-medium">
                                {detalhesPedidoMeta.codigoTerminal}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.identificacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Identificação:</span>
                              <span className="font-medium">
                                {detalhesPedidoMeta.identificacao}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between rounded-lg bg-white px-1">
                            <span className="text-gray-600">Solicitar emissão fiscal:</span>
                            <span className="font-medium">
                              {detalhesPedidoMeta?.solicitarEmissaoFiscal ? 'Sim' : 'Não'}
                            </span>
                          </div>
                          {detalhesPedidoMeta?.dataUltimaModificacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Última modificação:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(
                                  detalhesPedidoMeta.dataUltimaModificacao
                                )}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataUltimoProdutoLancado && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Último produto lançado:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(
                                  detalhesPedidoMeta.dataUltimoProdutoLancado
                                )}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataFinalizacao && (
                            <div className="flex justify-between px-1">
                              <span className="text-gray-600">Data finalização:</span>
                              <span className="font-medium">
                                {formatarDataDetalhePedido(detalhesPedidoMeta.dataFinalizacao)}
                              </span>
                            </div>
                          )}
                          {detalhesPedidoMeta?.dataCancelamento && (
                            <div className="flex justify-between rounded-lg bg-white px-1">
                              <span className="text-gray-600">Data cancelamento:</span>
                              <span className="font-medium text-red-600">
                                {formatarDataDetalhePedido(detalhesPedidoMeta.dataCancelamento)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lista de Produtos (Visualização) */}
                    {abaDetalhesPedido === 'listaProdutos' && (
                      <div
                        className="overflow-hidden rounded-lg border bg-gray-50"
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-lista-produtos"
                      >
                        <div className="p-2">
                          <h3 className="mb-2 text-lg font-semibold">Produtos do Pedido</h3>
                          {produtos.length > 0 ? (
                            <div className="space-y-1">
                              {/* Cabeçalho da tabela */}
                              <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2">
                                <div className="flex w-[60px] flex-shrink-0 items-center justify-center">
                                  <span className="text-center text-xs font-semibold text-gray-700">
                                    Qtd
                                  </span>
                                </div>
                                <div className="flex-[4]">
                                  <span className="text-xs font-semibold text-gray-700">
                                    Produto
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Desc./Acres.
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Val Unit.
                                  </span>
                                </div>
                                <div className="flex flex-1 justify-end">
                                  <span className="text-right text-xs font-semibold text-gray-700">
                                    Total
                                  </span>
                                </div>
                              </div>
                              {/* Linhas de produtos */}
                              <div className="space-y-1">
                                {produtos.map((produto, index) => {
                                  // Total do produto: usar valorFinal vindo do backend (já calculado com desconto/acréscimo)
                                  const totalProdutoComComplementos =
                                    produto.valorFinal !== null && produto.valorFinal !== undefined
                                      ? produto.valorFinal
                                      : calcularTotalProduto(produto)

                                  return (
                                    <div key={index} className="space-y-0">
                                      {/* Linha do Produto Principal */}
                                      <div
                                        className={`flex items-center gap-1 rounded ${
                                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        } cursor-pointer`}
                                        onDoubleClick={() =>
                                          handleAbrirEdicaoProdutoDetalhes(produto.produtoId)
                                        }
                                        title="Duplo clique para editar este produto"
                                      >
                                        {/* Quantidade */}
                                        <div className="w-[60px] flex-shrink-0">
                                          <span className="block text-center text-xs text-gray-900">
                                            {Math.floor(produto.quantidade)}
                                          </span>
                                        </div>
                                        {/* Nome do Produto */}
                                        <div className="min-w-0 flex-[4]">
                                          <span className="block truncate text-xs text-gray-900">
                                            {produto.nome}
                                          </span>
                                        </div>
                                        {/* Desconto/Acréscimo */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs text-gray-600">
                                            {formatarDescontoAcrescimo(produto)}
                                          </span>
                                        </div>
                                        {/* Valor Unitário */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs text-gray-900">
                                            {formatarNumeroComMilhar(produto.valorUnitario)}
                                          </span>
                                        </div>
                                        {/* Total */}
                                        <div className="flex-1">
                                          <span className="block text-right text-xs font-semibold text-gray-900">
                                            R${' '}
                                            {formatarNumeroComMilhar(totalProdutoComComplementos)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Linhas dos Complementos */}
                                      {produto.complementos.map((complemento, compIndex) => {
                                        const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`

                                        return (
                                          <div
                                            key={compKey}
                                            className={`-mt-0.5 flex items-center gap-1 rounded ${
                                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            }`}
                                            style={{ minHeight: '24px' }}
                                          >
                                            {/* Quantidade do Complemento */}
                                            <div className="w-[60px] flex-shrink-0 pl-4">
                                              <span className="block text-right text-xs text-gray-600">
                                                {complemento.quantidade}
                                              </span>
                                            </div>
                                            {/* Nome do Complemento com indentação */}
                                            <div className="min-w-0 flex-[4] pl-4">
                                              <span className="block truncate text-xs leading-tight text-gray-600">
                                                {complemento.nome}
                                              </span>
                                            </div>
                                            {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                                            <div className="flex-1"></div>
                                            {/* Valor Unitário do Complemento - Apenas exibição */}
                                            <div className="flex-1">
                                              <span className="block text-right text-xs leading-tight text-gray-600">
                                                {formatarValorComplemento(
                                                  complemento.valor,
                                                  complemento.tipoImpactoPreco
                                                )}
                                              </span>
                                            </div>
                                            {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                                            <div className="flex-1"></div>
                                          </div>
                                        )
                                      })}
                                      <div className="flex justify-start px-6 pb-1 text-[11px] text-gray-500">
                                        <span>
                                          Por: {formatarUsuarioPorId(produto.lancadoPorId)} -{' '}
                                          {formatarDataDetalhePedido(
                                            produto.dataLancamento || null
                                          )}
                                        </span>
                                      </div>
                                      {produto.removido && (
                                        <div className="flex justify-between px-1 pb-1 text-[11px] text-red-600">
                                          <span>
                                            Removido por:{' '}
                                            {formatarUsuarioPorId(produto.removidoPorId)}
                                          </span>
                                          <span>
                                            {formatarDataDetalhePedido(produto.dataRemocao || null)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-4">
                              <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total do Pedido */}
                    {abaDetalhesPedido === 'listaProdutos' && (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                          Total do Pedido:
                        </span>
                        <span className="text-lg font-semibold text-primary">
                          {transformarParaReal(totalProdutos)}
                        </span>
                      </div>
                    )}

                    {abaDetalhesPedido === 'listaProdutos' && resumoFinanceiroDetalhes && (
                      <div className="rounded-lg border bg-white px-4 py-3">
                        <h3 className="mb-2 text-lg font-semibold">Resumo Financeiro</h3>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-700">A - Total de itens lançados (+)</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(resumoFinanceiroDetalhes.totalItensLancados)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">B - Total de itens cancelados (-)</span>
                            <span className="font-semibold text-gray-900 line-through">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalItensCancelados
                              )}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between border-t pt-1.5">
                            <span className="text-gray-700">C - Total dos itens (A - B)</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(resumoFinanceiroDetalhes.totalDosItens)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-between">
                            <span className="text-gray-700">Total de descontos na conta</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalDescontosConta
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Total de acréscimos na conta</span>
                            <span className="font-semibold text-gray-900">
                              {formatarNumeroComMilhar(
                                resumoFinanceiroDetalhes.totalAcrescimosConta
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pagamentos (se status finalizada ou pendente emissão) */}
                    {abaDetalhesPedido === 'pagamentos' && (
                      <div
                        className="rounded-lg border bg-white px-4"
                        role="tabpanel"
                        aria-labelledby="tab-detalhes-pagamentos"
                      >
                        <h3 className="mb-2 text-lg font-semibold">Pagamentos</h3>

                        {/* Total Pago e Troco */}
                        <div className="mb-2 border-t pt-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-700">
                              Total do Pedido:
                            </span>
                            <span className="text-lg font-semibold text-primary">
                              {transformarParaReal(totalProdutos)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-gray-100 p-1">
                            <span className="font-semibold text-gray-700">
                              Total Recebido (Efetivo):
                            </span>
                            <span className="text-base font-semibold text-green-700">
                              {transformarParaReal(totalPagamentos)}
                            </span>
                          </div>
                          {(totalPagamentosLancados - totalPagamentos) > 0 && (
                            <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 p-1">
                              <span className="font-semibold text-gray-700">
                                A receber na entrega:
                              </span>
                              <span className="text-base font-semibold text-amber-700">
                                {transformarParaReal(totalPagamentosLancados - totalPagamentos)}
                              </span>
                            </div>
                          )}
                          {trocoLancamento > 0 && (
                            <div className="mt-2 flex items-center justify-between">
                              <span className="font-semibold text-gray-700">Troco:</span>
                              <span className="text-base font-semibold text-green-600">
                                {transformarParaReal(trocoLancamento)}
                              </span>
                            </div>
                          )}
                        </div>

                        {podeEditarPagamentoEntregaEmAberto && (
                          <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="mb-2">
                              <div>
                                <p className="text-sm font-semibold text-primary-text">
                                  Ajustar cobrança do entregador
                                </p>
                                <p className="text-xs text-secondary-text">
                                  Altere a forma, o valor a receber ou o troco antes de finalizar o pedido.
                                </p>
                              </div>
                            </div>

                            <div className="mb-2 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  showToast.warning(
                                    'Tipo de cobrança bloqueado em venda já criada. Edite apenas forma, valor ou troco.'
                                  )
                                }}
                                aria-disabled="true"
                                className={`cursor-not-allowed rounded-lg border px-3 py-2 text-sm font-semibold opacity-80 ${
                                  fluxoPagamentoEntrega === 'cobrar_entregador'
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-gray-200 bg-white text-primary-text'
                                }`}
                              >
                                Cobrar na entrega
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  showToast.warning(
                                    'Tipo de cobrança bloqueado em venda já criada. Edite apenas forma, valor ou troco.'
                                  )
                                }}
                                aria-disabled="true"
                                className={`cursor-not-allowed rounded-lg border px-3 py-2 text-sm font-semibold opacity-80 ${
                                  fluxoPagamentoEntrega === 'ja_pago'
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-gray-200 bg-white text-primary-text'
                                }`}
                              >
                                Recebido pelo entregador
                              </button>
                            </div>

                            <div className="mb-2 flex items-center gap-2">
                              <span className="font-medium text-primary-text">Valor a receber:</span>
                              <input
                                type="text"
                                value={valorRecebido}
                                onChange={e => {
                                  const valorFormatado = formatarValorRecebido(e.target.value)
                                  setValorRecebido(valorFormatado)
                                }}
                                placeholder="0,00"
                                className="rounded-lg border-2 bg-white p-1 text-right font-semibold transition-colors hover:border-primary-text"
                              />
                            </div>

                            <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
                              {meiosPagamento.map(meio => {
                                const Icone = obterIconeMeioPagamento(meio.getNome())
                                const semSaldoParaAdicionar =
                                  valorAPagarLancamento <= 0 && !valorRecebido.trim()
                                return (
                                  <button
                                    key={meio.getId()}
                                    type="button"
                                    onClick={() => adicionarPagamentoPorCard(meio.getId())}
                                    disabled={semSaldoParaAdicionar}
                                    className={`flex min-w-[100px] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-white p-2 transition-all hover:bg-primary hover:text-white ${
                                      semSaldoParaAdicionar ? 'cursor-not-allowed opacity-50' : ''
                                    }`}
                                  >
                                    <Icone className="h-8 w-8" />
                                    <span className="text-center text-xs font-medium">
                                      {meio.getNome()}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Cards das Formas de Pagamento */}
                        <div className="mb-2">
                          <Label className="mb-2 block text-base font-semibold">
                            {pagamentoModoCobranca
                              ? 'Formas previstas para cobrança'
                              : 'Formas de Pagamento Utilizadas'}
                          </Label>
                          <div className="flex flex-wrap gap-3">
                            {pagamentosVisiveisNaAbaDetalhes.map((pagamento, index) => {
                              const meio = meiosPagamento.find(
                                m => m.getId() === pagamento.meioPagamentoId
                              )
                              const nomeMeio =
                                meio?.getNome() ||
                                nomesMeiosPagamentoPedido[pagamento.meioPagamentoId] ||
                                'Meio de pagamento'
                              const Icone = meio
                                ? obterIconeMeioPagamento(meio.getNome())
                                : MdCreditCard
                              const emCancelado = pagamentoComDestaqueCanceladoDetalhes(pagamento)
                              const usuarioPagamento = emCancelado
                                ? pagamento.canceladoPorId || pagamento.realizadoPorId
                                : pagamento.realizadoPorId
                              const dataPagamento = emCancelado
                                ? pagamento.dataCancelamento || pagamento.dataCriacao
                                : pagamento.dataCriacao

                              return (
                                <div
                                  key={index}
                                  className={`flex min-w-[120px] flex-col items-center justify-center gap-1 rounded-lg border-2 p-3 ${
                                    emCancelado
                                      ? 'border-red-400 bg-red-50'
                                      : 'border-primary bg-white'
                                  }`}
                                >
                                  <Icone
                                    className={`h-8 w-8 ${emCancelado ? 'text-red-600' : 'text-primary'}`}
                                  />
                                  <span
                                    className={`text-center text-xs font-medium ${emCancelado ? 'text-red-900' : ''}`}
                                  >
                                    {nomeMeio}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${emCancelado ? 'text-red-700' : 'text-primary'}`}
                                  >
                                    {transformarParaReal(pagamento.valor)}
                                  </span>
                                  {podeEditarPagamentoEntregaEmAberto && (
                                    <button
                                      type="button"
                                      onClick={() => removerPagamento(index, pagamento.id)}
                                      className="mt-1 inline-flex items-center gap-1 rounded border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      <MdDelete className="h-3.5 w-3.5" />
                                      Remover
                                    </button>
                                  )}
                                  {emCancelado && (
                                    <span className="text-center text-[11px] font-semibold text-red-600">
                                      Pagamento Cancelado
                                    </span>
                                  )}
                                  {!emCancelado && (pagamento.cobrarNaEntrega || pagamento.naoEfetivo) && (
                                    <span className="text-center text-[11px] font-semibold text-amber-600">
                                      A cobrar na entrega
                                    </span>
                                  )}
                                  {!emCancelado && !pagamento.cobrarNaEntrega && !pagamento.naoEfetivo && (
                                    <span className="text-center text-[11px] font-semibold text-green-600">
                                      Efetivo / Pago
                                    </span>
                                  )}
                                  <span
                                    className={`text-center text-[11px] ${emCancelado ? 'text-red-800/80' : 'text-gray-500'}`}
                                  >
                                    {emCancelado ? 'Cancelado por' : 'Por'}:{' '}
                                    {formatarUsuarioPorId(usuarioPagamento)}
                                  </span>
                                  {dataPagamento && (
                                    <span
                                      className={`text-center text-[11px] ${emCancelado ? 'text-red-800/80' : 'text-gray-500'}`}
                                    >
                                      {formatarDataDetalhePedido(dataPagamento)}
                                    </span>
                                  )}
                                  {pagamento.isTefUsed && (
                                    <span
                                      className={`text-center text-[11px] ${emCancelado ? 'text-red-700' : 'text-gray-500'}`}
                                    >
                                      TEF:{' '}
                                      {pagamento.isTefConfirmed === true
                                        ? 'Confirmado'
                                        : pagamento.isTefConfirmed === false
                                          ? 'Não confirmado'
                                          : '—'}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {pagamentos.length === 0 && (
                            <p className="py-4 text-sm text-gray-500">
                              Nenhum pagamento registrado.
                            </p>
                          )}
                          {pagamentos.length > 0 && pagamentosVisiveisNaAbaDetalhes.length === 0 && (
                            <p className="py-4 text-sm text-gray-500">
                              Nenhum pagamento efetivo para exibir (ex.: tentativas TEF pendentes de
                              confirmação).
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
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
          </DialogFooter>
        </DialogContent>

        {seletorClienteOpen && (
          <SeletorClienteModal
            open={seletorClienteOpen}
            onClose={() => setSeletorClienteOpen(false)}
            onSelect={handleSelectCliente}
            title={tipoInicioPedido === 'entrega' ? 'Selecionar cliente da entrega' : undefined}
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
              indiceLinhaPainelProduto !== null
                ? 'Ajustar produto no pedido'
                : 'Lançar na venda'
            }
            valorUnitarioInicial={
              indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.valorUnitario
                : undefined
            }
            chavesComplementosIniciais={
              indiceLinhaPainelProduto !== null
                ? produtos[indiceLinhaPainelProduto]?.complementos?.map(
                    c => `${c.grupoId}-${c.id}`
                  )
                : undefined
            }
            onConfirm={confirmarLancamentoProdutoPainel}
          />
        ) : null}

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
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find(p => p.getId() === id)
                )?.permiteAlterarPrecoAtivo() ?? false
              })()
            }
            valorUnitarioInput={valorUnitarioEdicaoPainel}
            onValorUnitarioInputChange={setValorUnitarioEdicaoPainel}
            permiteDesconto={
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find(p => p.getId() === id)
                )?.permiteDescontoAtivo() ?? false
              })()
            }
            permiteAcrescimo={
              (() => {
                const id = produtos[produtoIndexEdicao].produtoId
                return (
                  catalogoProdutosPorId[id] ??
                  produtosList.find(p => p.getId() === id)
                )?.permiteAcrescimoAtivo() ?? false
              })()
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
      <ClientesTabsModal
        state={clienteTabsModalEntregaState}
        onClose={handleFecharClienteTabsModalEntrega}
        onReload={handleReloadClienteEntregaAposEdicao}
        onTabChange={handleTabChangeClienteTabsModalEntrega}
        zIndex={1700}
      />
    </>
  )
}
