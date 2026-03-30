'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  useMarcarEmissaoFiscal,
  useDesmarcarEmissaoFiscal,
  useReemitirNfe,
  useReemitirNfeGestor,
} from '@/src/presentation/hooks/useVendas'
import {
  useVendasUnificadas,
  VendaUnificadaDTO,
} from '@/src/presentation/hooks/useVendasUnificadas'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters'
import {
  MdReceipt,
  MdSchedule,
  MdRefresh,
  MdCheckCircle,
  MdFilterList,
  MdFilterAltOff,
  MdSearch,
  MdCalendarToday,
  MdEdit,
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
} from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { StatusFiscalBadge } from './StatusFiscalBadge'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import { NovoPedidoModal } from './NovoPedidoModal'
import { EscolheDatasModal } from '@/src/presentation/components/features/vendas/EscolheDatasModal'
import { showToast } from '@/src/shared/utils/toast'
import { abrirDocumentoFiscalPdf } from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { FormControl, Select, MenuItem } from '@mui/material'
import { Dialog, DialogContent } from '@/src/presentation/components/ui/dialog'
import { NovoCliente } from '@/src/presentation/components/features/clientes/NovoCliente'

type Priority = 'high' | 'medium' | 'low'

interface KanbanColumn {
  id: string
  title: string
  color: string
  borderColor: string
  icon: React.ReactNode
  placeholder: string
}

// Usar VendaUnificadaDTO do hook
type Venda = VendaUnificadaDTO

type ColunaKanbanId = 'FINALIZADAS' | 'PENDENTE_EMISSAO' | 'COM_NFE'

/** Status em que a UI trata como aguardando resposta da SEFAZ (até o backend refletir rejeição/códigos). */
const STATUS_FISCAL_AGUARDANDO_SEFAZ = new Set([
  'PENDENTE',
  'PENDENTE_AUTORIZACAO',
  'EMITINDO',
  'CONTINGENCIA',
])

function statusFiscalAguardandoSefaz(v: VendaUnificadaDTO): boolean {
  const sf = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()
  return STATUS_FISCAL_AGUARDANDO_SEFAZ.has(sf)
}

/**
 * Borda esquerda e fundo do card conforme coluna e statusFiscal.
 * Finalizadas: primary. Pendente/Com nota: fiscal (emitida/cancelada/rejeitada), sem status na pendente → amarelo,
 * reemitindo ou aguardando SEFAZ → custom-2.
 */
function getCardBorderEFundoKanban(
  columnId: ColunaKanbanId,
  v: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): { borderClass: string; cardBgClass: string } {
  if (columnId === 'FINALIZADAS') {
    return { borderClass: 'border-l-primary', cardBgClass: 'bg-white' }
  }

  if (acaoFiscalEmAndamentoPorVenda[v.id] === 'reemitindo') {
    return { borderClass: 'border-l-custom-2', cardBgClass: 'bg-white' }
  }

  const sf = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()

  if (sf === 'EMITIDA') {
    return { borderClass: 'border-l-green-500', cardBgClass: 'bg-white' }
  }
  if (sf === 'CANCELADA') {
    return { borderClass: 'border-l-gray-400', cardBgClass: 'bg-gray-50' }
  }
  if (sf === 'REJEITADA') {
    return { borderClass: 'border-l-red-500', cardBgClass: 'bg-white' }
  }

  // Aguardando SEFAZ
  if (statusFiscalAguardandoSefaz(v)) {
    return { borderClass: 'border-l-custom-2', cardBgClass: 'bg-white' }
  }

  // Coluna Pendente emissão sem statusFiscal na API → mantém amarelo (identidade da coluna)
  if (columnId === 'PENDENTE_EMISSAO' && !sf) {
    return { borderClass: 'border-l-yellow-400', cardBgClass: 'bg-white' }
  }

  if (columnId === 'PENDENTE_EMISSAO') {
    return { borderClass: 'border-l-yellow-400', cardBgClass: 'bg-white' }
  }

  if (columnId === 'COM_NFE') {
    return { borderClass: 'border-l-green-400', cardBgClass: 'bg-white' }
  }

  return { borderClass: 'border-l-gray-300', cardBgClass: 'bg-white' }
}

/** Exibido quando o nome do cliente está vazio (Kanban e arraste) */
const LABEL_SEM_CLIENTE = 'SEM CLIENTE'

/** Colunas de onde o card pode ser arrastado (Com Nota Solicitada não arrasta para trás) */
const COLUNAS_KANBAN_ORIGEM_DRAG = new Set(['FINALIZADAS', 'PENDENTE_EMISSAO'])

/** Colunas onde o “primeiro da lista” é persistido no localStorage ao soltar */
const COLUNAS_KANBAN_DESTINO_PIN = new Set(['FINALIZADAS', 'PENDENTE_EMISSAO', 'COM_NFE'])

/** Mesma regra de desabilitar o botão “Emitir nota” — usada no drop em Com nota solicitada */
function vendaBloqueadaParaEmissaoInterativa(
  v: VendaUnificadaDTO,
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
): boolean {
  if (acaoFiscalEmAndamentoPorVenda[v.id]) return true
  const s = String(v.statusFiscal ?? '')
    .trim()
    .toUpperCase()
  if (s === 'EMITIDA' || s === 'PENDENTE_EMISSAO') return true
  if (statusFiscalAguardandoSefaz(v)) return true
  return false
}

const KANBAN_PRIMEIRO_POR_COLUNA_KEY = 'jiffy-gestor-v2:kanban-primeiro-por-coluna'

/** Lê mapa colunaId → vendaId que deve aparecer primeiro (localStorage). */
function lerPrimeiroPorColunaDoStorage(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KANBAN_PRIMEIRO_POR_COLUNA_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    /* formato inválido ou storage indisponível */
  }
  return {}
}

function gravarPrimeiroPorColunaNoStorage(map: Record<string, string>) {
  try {
    window.localStorage.setItem(KANBAN_PRIMEIRO_POR_COLUNA_KEY, JSON.stringify(map))
  } catch {
    /* quota, modo privado, etc. */
  }
}

/** Critério de ordenação por coluna (mantido apenas em memória). */
type CriterioOrdenacaoKanban = 'data' | 'numero' | 'cliente'
type DirecaoOrdenacaoKanban = 'asc' | 'desc'

/** Venda sem nome de cliente preenchido (nome vazio ou só espaços) */
function vendaSemNomeCliente(v: Venda): boolean {
  return !v.cliente?.nome?.trim()
}

/**
 * Componente Kanban para gerenciamento de pedidos e emissão fiscal
 * Baseado no modelo de Kanban moderno e limpo
 */
type OrigemFiltro = '' | 'PDV' | 'GESTOR' | 'DELIVERY'
type PeriodoOpcao =
  | 'Todos'
  | 'Hoje'
  | 'Ontem'
  | 'Últimos 7 Dias'
  | 'Mês Atual'
  | 'Mês Passado'
  | 'Últimos 30 Dias'
  | 'Últimos 60 Dias'
  | 'Últimos 90 Dias'
  | 'Datas Personalizadas'

/**
 * Ordena por data mais recente primeiro (igual em todas as colunas, sem depender de localStorage).
 * Prioridade: data de finalização → data de emissão fiscal → data de criação.
 */
function ordenarVendasKanbanPorDataDesc(vendas: Venda[]): Venda[] {
  const timestampOrdenacao = (v: Venda): number => {
    const raw =
      v.dataFinalizacao?.trim() || v.dataEmissaoFiscal?.trim() || v.dataCriacao?.trim() || ''
    if (!raw) return 0
    const ms = new Date(raw).getTime()
    return Number.isFinite(ms) ? ms : 0
  }
  return [...vendas].sort((a, b) => {
    const diff = timestampOrdenacao(b) - timestampOrdenacao(a)
    if (diff !== 0) return diff
    return b.id.localeCompare(a.id)
  })
}

function ordenarVendasKanbanPorCriterio(
  vendas: Venda[],
  criterio: CriterioOrdenacaoKanban,
  direcao: DirecaoOrdenacaoKanban
): Venda[] {
  if (criterio === 'data') {
    if (direcao === 'desc') return ordenarVendasKanbanPorDataDesc(vendas)
    return [...vendas].sort((a, b) => {
      const timestampOrdenacao = (v: Venda): number => {
        const raw =
          v.dataFinalizacao?.trim() || v.dataEmissaoFiscal?.trim() || v.dataCriacao?.trim() || ''
        if (!raw) return 0
        const ms = new Date(raw).getTime()
        return Number.isFinite(ms) ? ms : 0
      }
      const diff = timestampOrdenacao(a) - timestampOrdenacao(b) // asc
      if (diff !== 0) return diff
      return a.id.localeCompare(b.id)
    })
  }

  if (criterio === 'numero') {
    return [...vendas].sort((a, b) => {
      const diff =
        direcao === 'desc' ? b.numeroVenda - a.numeroVenda : a.numeroVenda - b.numeroVenda
      if (diff !== 0) return diff
      return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
    })
  }

  // criterio === 'cliente'
  return [...vendas].sort((a, b) => {
    const nomeA = a.cliente?.nome?.trim() ? a.cliente.nome.trim() : LABEL_SEM_CLIENTE
    const nomeB = b.cliente?.nome?.trim() ? b.cliente.nome.trim() : LABEL_SEM_CLIENTE
    const diff = nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
    const diffFinal = direcao === 'desc' ? -diff : diff
    if (diffFinal !== 0) return diffFinal
    return direcao === 'desc' ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
  })
}

/** Área droppable da coluna: slots visuais ao arrastar (Finalizadas, Pendente emissão, Com nota solicitada). */
function DroppableColumnContent({
  columnId,
  children,
  className,
}: {
  columnId: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const showDropSlotPendente = columnId === 'PENDENTE_EMISSAO' && isOver
  const showDropSlotFinalizadas = columnId === 'FINALIZADAS' && isOver
  const showDropSlotComNfe = columnId === 'COM_NFE' && isOver
  const isOverClass = showDropSlotPendente
    ? 'ring-2 ring-yellow-400 ring-inset bg-yellow-50/50'
    : showDropSlotFinalizadas
      ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
      : showDropSlotComNfe
        ? 'ring-2 ring-green-400 ring-inset bg-green-50/50'
        : ''
  return (
    <div ref={setNodeRef} className={`${className ?? ''} ${isOverClass}`}>
      {showDropSlotPendente && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50/90 text-sm font-medium text-yellow-700 transition-all">
          Solte aqui para marcar para emissão
        </div>
      )}
      {showDropSlotFinalizadas && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90 text-sm font-medium text-blue-700 transition-all">
          Solte aqui para voltar à coluna Finalizadas
        </div>
      )}
      {showDropSlotComNfe && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-green-500 bg-green-50/90 px-2 text-center text-sm font-medium text-green-800 transition-all">
          Solte aqui para emitir ou reemitir nota
        </div>
      )}
      {children}
    </div>
  )
}

/** Preview do card durante o arraste (DragOverlay): leve inclinação via classe global `.drag-preview-card` */
function VendaCardDragPreview({ venda }: { venda: VendaUnificadaDTO }) {
  const valorFormatado = transformarParaReal(venda.valorFinal)
  const clienteNome = venda.cliente?.nome?.trim() ? venda.cliente.nome : LABEL_SEM_CLIENTE
  return (
    <div className="drag-preview-card w-64 cursor-grabbing rounded-lg border-2 border-gray-300 bg-white p-2.5 opacity-95 shadow-lg">
      <p className="mb-0.5 text-xs text-gray-500">
        Venda {venda.numeroVenda}
        {venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}
      </p>
      <p className="mb-0.5 truncate text-sm font-semibold uppercase text-primary">{clienteNome}</p>
      <div className="mb-1.5 border-b border-gray-200 pb-1.5">
        <p className="text-xs text-gray-600">
          <span className="text-sm font-semibold text-gray-900">{valorFormatado}</span>
        </p>
      </div>
      {venda.origem && <p className="text-xs text-gray-500">Origem: {venda.origem}</p>}
    </div>
  )
}

/**
 * Card draggable em Finalizadas e Pendente Emissão (incl. arrastar para Com nota solicitada).
 * Coluna Com nota solicitada: cards não arrastam (não voltam às colunas anteriores via DnD).
 * PDV e Gestor.
 */
function DraggableVendaCard({
  venda,
  column,
  children,
}: {
  venda: VendaUnificadaDTO
  column: KanbanColumn
  children: React.ReactNode
}) {
  const isDraggable =
    COLUNAS_KANBAN_ORIGEM_DRAG.has(column.id) &&
    (venda.tabelaOrigem === 'venda' || venda.tabelaOrigem === 'venda_gestor')
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `venda-${venda.id}`,
    data: { venda },
    disabled: !isDraggable,
  })
  if (!isDraggable) return <>{children}</>
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none select-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

export function FiscalFlowKanban() {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [vendaSelecionadaParaEmissao, setVendaSelecionadaParaEmissao] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    numeroVenda?: number
    codigoVenda?: string
    origemVenda?: string
    clienteId?: string | null
    clienteNome?: string | null
  } | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  // Estados dos filtros (alinhados à API GET /vendas/unificado)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoOpcao>('Todos')
  const [periodoInicial, setPeriodoInicial] = useState<Date | null>(null)
  const [periodoFinal, setPeriodoFinal] = useState<Date | null>(null)
  const [dataFinalizacaoPeriodo, setDataFinalizacaoPeriodo] = useState<PeriodoOpcao>('Todos')
  const [dataFinalizacaoInicio, setDataFinalizacaoInicio] = useState<Date | null>(null)
  const [dataFinalizacaoFim, setDataFinalizacaoFim] = useState<Date | null>(null)
  const [origemFilter, setOrigemFilter] = useState<OrigemFiltro>('')
  const [statusFiscalFilter, setStatusFiscalFilter] = useState<string>('')
  const [filtrosVisiveisMobile, setFiltrosVisiveisMobile] = useState(false)
  const [isDatasModalOpen, setIsDatasModalOpen] = useState(false)
  const debounceSearchRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [editarClienteModalOpen, setEditarClienteModalOpen] = useState(false)
  const [editarClienteId, setEditarClienteId] = useState<string | null>(null)

  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  /** Venda aberta no modal de detalhes (step 4): id, tabela e statusFiscal do unificado (PDV não repete no GET detalhe) */
  const [pedidoVisualizacaoContext, setPedidoVisualizacaoContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
  } | null>(null)
  const [acaoFiscalEmAndamentoPorVenda, setAcaoFiscalEmAndamentoPorVenda] = useState<
    Record<string, 'emitindo' | 'reemitindo'>
  >({})
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  /** vendaId fixado no topo por coluna (Finalizadas / Pendente emissão), persistido em localStorage */
  const [primeiroPorColuna, setPrimeiroPorColuna] = useState<Record<string, string>>({})

  useEffect(() => {
    setPrimeiroPorColuna(lerPrimeiroPorColunaDoStorage())
  }, [])

  /** Evita PATCH duplicado ao reativar solicitarEmissaoFiscal para REJEITADA (Strict Mode / re-renders) */
  const rejeitadaReativacaoEmAndamentoRef = useRef(false)
  /** IDs já reativados com sucesso — evita loop infinito se o GET ainda vier inconsistente (base de testes). */
  const rejeitadaReativacaoJaTentadaIdsRef = useRef<Set<string>>(new Set())

  type ColunaId = 'FINALIZADAS' | 'PENDENTE_EMISSAO' | 'COM_NFE'
  /** Ordenação individual por coluna: padrão sempre por data (reset ao recarregar a página). */
  const [criterioOrdenacaoPorColuna, setCriterioOrdenacaoPorColuna] = useState<
    Record<ColunaId, CriterioOrdenacaoKanban>
  >({
    FINALIZADAS: 'data',
    PENDENTE_EMISSAO: 'data',
    COM_NFE: 'data',
  })
  /** Direção (crescente/decrescente) individual por coluna — reset ao recarregar. */
  const [direcaoOrdenacaoPorColuna, setDirecaoOrdenacaoPorColuna] = useState<
    Record<ColunaId, DirecaoOrdenacaoKanban>
  >({
    FINALIZADAS: 'desc',
    PENDENTE_EMISSAO: 'desc',
    COM_NFE: 'desc',
  })

  // Debounce da busca (q)
  useEffect(() => {
    if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current)
    debounceSearchRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 400)
    return () => {
      if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current)
    }
  }, [searchInput])

  // Sincronizar período com datas quando mudar o dropdown (exceto Datas Personalizadas)
  useEffect(() => {
    if (periodo === 'Datas Personalizadas') return
    if (periodo === 'Todos') {
      setPeriodoInicial(null)
      setPeriodoFinal(null)
    } else {
      const { inicio, fim } = calculatePeriodo(periodo)
      setPeriodoInicial(inicio)
      setPeriodoFinal(fim)
    }
  }, [periodo])

  // Sincronizar data finalização com dropdown
  useEffect(() => {
    if (dataFinalizacaoPeriodo === 'Todos' || dataFinalizacaoPeriodo === 'Datas Personalizadas') {
      setDataFinalizacaoInicio(null)
      setDataFinalizacaoFim(null)
    } else {
      const { inicio, fim } = calculatePeriodo(dataFinalizacaoPeriodo)
      setDataFinalizacaoInicio(inicio)
      setDataFinalizacaoFim(fim)
    }
  }, [dataFinalizacaoPeriodo])

  // Converter datas para ISO para a API
  const periodoInicialISO = periodoInicial?.toISOString() ?? undefined
  const periodoFinalISO = periodoFinal
    ? new Date(
        periodoFinal.getFullYear(),
        periodoFinal.getMonth(),
        periodoFinal.getDate(),
        23,
        59,
        59,
        999
      ).toISOString()
    : undefined
  const dataFinalizacaoInicioISO = dataFinalizacaoInicio?.toISOString() ?? undefined
  const dataFinalizacaoFimISO = dataFinalizacaoFim
    ? new Date(
        dataFinalizacaoFim.getFullYear(),
        dataFinalizacaoFim.getMonth(),
        dataFinalizacaoFim.getDate(),
        23,
        59,
        59,
        999
      ).toISOString()
    : undefined

  // Parâmetros estáveis para o React Query (evita churn desnecessário na queryKey)
  const vendasUnificadasQueryParams = useMemo(
    () => ({
      q: searchQuery || undefined,
      origem: origemFilter || undefined,
      statusFiscal: statusFiscalFilter || undefined,
      periodoInicial: periodoInicialISO,
      periodoFinal: periodoFinalISO,
      dataFinalizacaoInicio: dataFinalizacaoInicioISO,
      dataFinalizacaoFim: dataFinalizacaoFimISO,
    }),
    [
      searchQuery,
      origemFilter,
      statusFiscalFilter,
      periodoInicialISO,
      periodoFinalISO,
      dataFinalizacaoInicioISO,
      dataFinalizacaoFimISO,
    ]
  )

  const vendasUnificadasQueryKeyFingerprint = JSON.stringify(vendasUnificadasQueryParams)

  useEffect(() => {
    rejeitadaReativacaoJaTentadaIdsRef.current = new Set()
  }, [vendasUnificadasQueryKeyFingerprint])

  // Buscar vendas unificadas (PDV + Gestor) com filtros da API
  const {
    data: vendasUnificadasData,
    isLoading,
    refetch,
  } = useVendasUnificadas(vendasUnificadasQueryParams)

  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()
  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()

  // REJEITADA com solicitarEmissaoFiscal false: reativa com o mesmo PATCH de "marcar emissão" (useMarcarEmissaoFiscal)
  useEffect(() => {
    if (
      isLoading ||
      !vendasUnificadasData?.items?.length ||
      rejeitadaReativacaoEmAndamentoRef.current
    )
      return

    const pendentes = vendasUnificadasData.items.filter(v => {
      const rejeitada =
        String(v.statusFiscal ?? '')
          .trim()
          .toUpperCase() === 'REJEITADA'
      return (
        rejeitada &&
        !v.solicitarEmissaoFiscal &&
        !rejeitadaReativacaoJaTentadaIdsRef.current.has(v.id)
      )
    })
    if (pendentes.length === 0) return

    rejeitadaReativacaoEmAndamentoRef.current = true
    let cancelled = false
    void (async () => {
      try {
        let sucesso = 0
        for (const v of pendentes) {
          if (cancelled) break
          try {
            await marcarEmissaoFiscal.mutateAsync({
              id: v.id,
              tabelaOrigem: v.tabelaOrigem,
              silent: true,
            })
            rejeitadaReativacaoJaTentadaIdsRef.current.add(v.id)
            sucesso += 1
          } catch {
            // Erro por venda: não adiciona ao Set para permitir nova tentativa após novo carregamento
          }
        }
        if (!cancelled && sucesso > 0) {
          showToast.info(
            sucesso === 1
              ? 'Solicitação de emissão reativada para a venda com nota rejeitada.'
              : `Solicitação de emissão reativada para ${sucesso} vendas com nota rejeitada.`
          )
        }
      } finally {
        rejeitadaReativacaoEmAndamentoRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoading, vendasUnificadasData, marcarEmissaoFiscal])

  // Só PointerSensor: em touch, pointermove fica no document (melhor que TouchSensor no alvo + scroll).
  // TouchSensor junto com PointerSensor gerava gesto “travado” no mobile; distance evita arraste ao rolar.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const setAcaoFiscalEmAndamento = (vendaId: string, acao: 'emitindo' | 'reemitindo' | null) => {
    setAcaoFiscalEmAndamentoPorVenda(prev => {
      if (!acao) {
        const { [vendaId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [vendaId]: acao }
    })
  }

  /**
   * Etapa do card no Kanban. Durante reemissão (botão "Reemitindo..."), exibe em Com nota solicitada;
   * ao concluir, volta a usar `getEtapaKanban()` (emitida permanece na coluna; rejeitada retorna a Pendente emissão).
   */
  const getEtapaKanbanParaExibicao = (v: Venda): string => {
    if (acaoFiscalEmAndamentoPorVenda[v.id] === 'reemitindo') {
      return 'COM_NFE'
    }
    return v.getEtapaKanban()
  }

  const refetchAteMudarStatusFiscal = async (
    vendaId: string,
    statusAnterior: Venda['statusFiscal'],
    tentativasMaximas = 6,
    intervaloMs = 2000
  ) => {
    for (let tentativa = 0; tentativa < tentativasMaximas; tentativa++) {
      const result = await refetch()
      const vendaAtualizada = result.data?.items?.find((item: Venda) => item.id === vendaId)
      if (!vendaAtualizada) return

      if (vendaAtualizada.statusFiscal !== statusAnterior) {
        return
      }

      await sleep(intervaloMs)
    }
  }

  /**
   * Mesma regra do drag ao soltar em "Com nota solicitada": o card fica primeiro na coluna COM_NFE (localStorage).
   * Usado ao clicar Emitir/Reemitir na coluna Pendente emissão (sem arrastar).
   */
  const pinVendaComoPrimeiraEmComNotaSolicitada = (venda: Venda) => {
    if (getEtapaKanbanParaExibicao(venda) !== 'PENDENTE_EMISSAO') return
    const origemKanban = venda.getEtapaKanban()
    setPrimeiroPorColuna(prev => {
      const next = { ...prev }
      if (
        (origemKanban === 'FINALIZADAS' || origemKanban === 'PENDENTE_EMISSAO') &&
        prev[origemKanban] === venda.id
      ) {
        delete next[origemKanban]
      }
      next.COM_NFE = venda.id
      gravarPrimeiroPorColunaNoStorage(next)
      return next
    })
  }

  // Todas as vendas unificadas retornadas pela API (já filtradas por q, período, origem, statusFiscal no backend)
  const todasVendas: Venda[] = vendasUnificadasData?.items || []

  // Filtro client-side por termo de busca: codigoVenda, numeroVenda, cliente.nome, id
  const filtrarPorBusca = (vendas: Venda[], termo: string): Venda[] => {
    const t = termo.trim().toLowerCase()
    if (!t) return vendas
    return vendas.filter(v => {
      if (v.codigoVenda?.toLowerCase().includes(t)) return true
      if (String(v.numeroVenda).includes(t)) return true
      if (v.cliente?.nome?.toLowerCase().includes(t)) return true
      if (v.id?.toLowerCase().includes(t)) return true
      return false
    })
  }

  const vendasFiltradasPorTipo: Venda[] = filtrarPorBusca(todasVendas, searchQuery)

  // Colunas fixas do Kanban (Finalizadas, Pendente Emissão, Com NFe)
  const getColumns = (): KanbanColumn[] => [
    {
      id: 'FINALIZADAS',
      title: 'Finalizadas',
      color: 'bg-primary/15',
      borderColor: 'border-gray-400',
      icon: <MdReceipt className="h-4 w-4 text-gray-600" />,
      placeholder: 'Vendas finalizadas aguardando ação',
    },
    {
      id: 'PENDENTE_EMISSAO',
      title: 'Pendente Emissão Fiscal',
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      icon: <MdSchedule className="h-4 w-4 text-yellow-600" />,
      placeholder: 'Vendas aguardando emissão de NFe',
    },
    {
      id: 'COM_NFE',
      title: 'Com Nota Solicitada',
      color: 'bg-green-50',
      borderColor: 'border-green-400',
      icon: <MdCheckCircle className="h-4 w-4 text-green-600" />,
      placeholder: 'Vendas com nota fiscal solicitada',
    },
  ]

  const columns = getColumns()

  // Função para determinar prioridade baseada no valor
  const getPriority = (valor: number): Priority => {
    if (valor >= 5000) return 'high'
    if (valor >= 1000) return 'medium'
    return 'low'
  }

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500 text-white'
      case 'medium':
        return 'bg-yellow-500 text-white'
      case 'low':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  // Função para obter label da prioridade
  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'Alta'
      case 'medium':
        return 'Média'
      case 'low':
        return 'Baixa'
      default:
        return 'Normal'
    }
  }

  // Função para formatar data relativa
  const formatRelativeDate = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Hoje'
    if (days === 1) return '1d'
    if (days < 30) return `${days}d`
    if (days < 365) return `${Math.floor(days / 30)}m`
    return `${Math.floor(days / 365)}a`
  }

  // Formatar data ISO para exibição no card (dd/MM/yyyy HH:mm)
  const formatarDataCard = (dataISO: string | null | undefined): string => {
    if (!dataISO) return '—'
    try {
      const d = new Date(dataISO)
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

  // Capitalizar tipo de venda para exibição (balcao → Balcão, mesa → Mesa)
  const formatarTipoVenda = (tipo: string | null | undefined): string => {
    if (!tipo) return '—'
    const t = tipo.toLowerCase()
    if (t === 'balcao') return 'Balcão'
    if (t === 'mesa') return 'Mesa'
    if (t === 'gestor') return 'Gestor'
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase()
  }

  const handleMarcarEmissaoFiscal = async (
    vendaId: string,
    tabelaOrigem: 'venda' | 'venda_gestor'
  ) => {
    try {
      await marcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao marcar emissão fiscal:', error)
    }
  }

  // Ao soltar: Finalizadas → Pendente Emissão = marcar; Pendente Emissão → Finalizadas = desmarcar
  // - Só chama marcar se solicitarEmissaoFiscal ainda não é true (evita requisição ao soltar de volta na mesma coluna sem mudar de etapa).
  // - Só chama desmarcar se solicitarEmissaoFiscal é true (evita requisição ao soltar em Finalizadas sem ter vindo de Pendente).
  // - statusFiscal REJEITADA: não permite soltar em Finalizadas (toast sempre, mesmo com solicitarEmissaoFiscal false).
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingVenda(null)
    const { active, over } = event
    if (!over) return
    const venda = active.data.current?.venda as Venda | undefined
    if (!venda) return
    if (over.id === 'PENDENTE_EMISSAO') {
      if (venda.solicitarEmissaoFiscal !== true) {
        handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
      }
    } else if (over.id === 'FINALIZADAS') {
      // Rejeitada pode estar com solicitarEmissaoFiscal false — o bloqueio não pode depender só desse flag
      const fiscalRejeitada =
        String(venda.statusFiscal ?? '')
          .trim()
          .toUpperCase() === 'REJEITADA'
      if (fiscalRejeitada) {
        showToast.warning(
          'Vendas com nota rejeitada não podem ser movidas para Finalizadas. Use Reemitir na coluna Pendente Emissão.'
        )
        return
      }
      if (venda.solicitarEmissaoFiscal === true) {
        handleDesmarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
      }
    } else if (over.id === 'COM_NFE') {
      // Só a partir de Pendente emissão: mesmo fluxo do botão Emitir / Reemitir
      if (venda.getEtapaKanban() !== 'PENDENTE_EMISSAO') {
        showToast.info(
          'Arraste para esta coluna apenas vendas que estão em Pendente emissão fiscal.'
        )
        return
      }
      if (vendaBloqueadaParaEmissaoInterativa(venda, acaoFiscalEmAndamentoPorVenda)) {
        showToast.info(
          'Esta venda não pode ser emitida neste status. Use o botão quando estiver disponível.'
        )
        return
      }
      void handleEmitirNfe(venda)
    }

    // Card solto: mantém no topo na coluna de destino (localStorage)
    const colunaDestino = String(over.id)
    if (COLUNAS_KANBAN_DESTINO_PIN.has(colunaDestino)) {
      const origemKanban = venda.getEtapaKanban()
      setPrimeiroPorColuna(prev => {
        const next = { ...prev }
        if (
          (origemKanban === 'FINALIZADAS' || origemKanban === 'PENDENTE_EMISSAO') &&
          prev[origemKanban] === venda.id
        ) {
          delete next[origemKanban]
        }
        next[colunaDestino] = venda.id
        gravarPrimeiroPorColunaNoStorage(next)
        return next
      })
    }
  }

  const handleDesmarcarEmissaoFiscal = async (
    vendaId: string,
    tabelaOrigem: 'venda' | 'venda_gestor'
  ) => {
    try {
      await desmarcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao desmarcar emissão fiscal:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const venda = event.active.data.current?.venda as Venda | undefined
    if (venda) setDraggingVenda(venda)
  }

  const handleDragCancel = () => {
    setDraggingVenda(null)
  }

  const handleEmitirNfe = async (venda: Venda) => {
    const numeroNotaRejeitada =
      venda.numeroFiscal != null && Number.isFinite(Number(venda.numeroFiscal))
        ? Number(venda.numeroFiscal)
        : undefined

    // Reemissão: POST reemitir-nota com `documentId` + `numero` opcional (contrato validado no backend).
    if (venda.statusFiscal === 'REJEITADA') {
      const docId = venda.documentoFiscalId?.trim()
      if (!docId) {
        showToast.error('Documento fiscal não encontrado para esta venda. Não é possível reemitir.')
        return
      }

      pinVendaComoPrimeiraEmComNotaSolicitada(venda)

      setAcaoFiscalEmAndamento(venda.id, 'reemitindo')
      try {
        const payload = {
          id: venda.id,
          documentId: docId,
          ...(numeroNotaRejeitada != null ? { numero: numeroNotaRejeitada } : {}),
        }
        if (venda.tabelaOrigem === 'venda_gestor') {
          await reemitirNfeGestor.mutateAsync(payload)
        } else {
          await reemitirNfePdv.mutateAsync(payload)
        }
        await refetch()
        await refetchAteMudarStatusFiscal(venda.id, 'REJEITADA')
        return
      } catch (error) {
        console.error('Erro ao tentar reemitir:', error)
        return
      } finally {
        setAcaoFiscalEmAndamento(venda.id, null)
      }
    }

    pinVendaComoPrimeiraEmComNotaSolicitada(venda)

    setVendaSelecionadaParaEmissao({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      numeroVenda: venda.numeroVenda,
      codigoVenda: venda.codigoVenda,
      origemVenda: venda.origem,
      clienteId: venda.cliente?.id ?? null,
      clienteNome: venda.cliente?.nome ?? null,
    })
    setSelectedVendaId(venda.id) // Mantém para compatibilidade
    setEmitirNfeModalOpen(true)
  }

  const handleViewDetails = (venda: Venda) => {
    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }

  const handleClearFilters = useCallback(() => {
    setSearchInput('')
    setSearchQuery('')
    setPeriodo('Todos')
    setPeriodoInicial(null)
    setPeriodoFinal(null)
    setDataFinalizacaoPeriodo('Todos')
    setDataFinalizacaoInicio(null)
    setDataFinalizacaoFim(null)
    setOrigemFilter('')
    setStatusFiscalFilter('')
  }, [])

  const handleAbrirEdicaoCliente = useCallback((clienteId: string) => {
    setEditarClienteId(clienteId)
    setEditarClienteModalOpen(true)
  }, [])

  const handleFecharEdicaoCliente = useCallback(() => {
    setEditarClienteModalOpen(false)
    setEditarClienteId(null)
  }, [])

  const handleConfirmDatas = useCallback((dataInicial: Date | null, dataFinal: Date | null) => {
    setPeriodoInicial(dataInicial)
    setPeriodoFinal(dataFinal)
    setPeriodo(dataInicial || dataFinal ? 'Datas Personalizadas' : 'Todos')
    setIsDatasModalOpen(false)
  }, [])

  // Obter vendas de delivery por status — COMENTADO: delivery não utilizado por enquanto
  // NOTA: Para delivery, o backend retorna vendas finalizadas OU com status '4' sem dataFinalizacao (COM_ENTREGADOR)
  const getVendasDeliveryPorStatus = (_status: string | number): Venda[] => {
    // const todasVendasUnificadas = todasVendas
    // const mostrarDelivery = todosFiltrosSelecionados || tipoVendaFiltros.length === 0 || tipoVendaFiltros.includes('delivery')
    // const vendasFiltradas = mostrarDelivery ? todasVendasUnificadas.filter((v: Venda) => v.isDelivery()) : []
    // return vendasFiltradas.filter((venda: Venda) => { ... })
    return []
  }

  const getVendasByColumn = (columnId: string): Venda[] => {
    const vendasParaFiltrar = vendasFiltradasPorTipo
    let vendas: Venda[] = []

    switch (columnId) {
      case 'FINALIZADAS':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'FINALIZADAS'
        )
        break
      case 'PENDENTE_EMISSAO':
        vendas = vendasParaFiltrar.filter(
          (v: Venda) => getEtapaKanbanParaExibicao(v) === 'PENDENTE_EMISSAO'
        )
        break
      case 'COM_NFE':
        vendas = vendasParaFiltrar.filter((v: Venda) => getEtapaKanbanParaExibicao(v) === 'COM_NFE')
        break
      default:
        return []
    }

    // Garantir que não há duplicação por ID (usando Map para manter ordem)
    const vendasUnicas = new Map<string, Venda>()
    vendas.forEach(venda => {
      if (!vendasUnicas.has(venda.id)) {
        vendasUnicas.set(venda.id, venda)
      }
    })

    const criterio =
      criterioOrdenacaoPorColuna[columnId as ColunaId] ?? ('data' as CriterioOrdenacaoKanban)
    const direcao =
      direcaoOrdenacaoPorColuna[columnId as ColunaId] ?? ('desc' as DirecaoOrdenacaoKanban)
    let ordenadas = ordenarVendasKanbanPorCriterio(
      Array.from(vendasUnicas.values()),
      criterio,
      direcao
    )

    // Último card movido para esta coluna fica primeiro (persistido em localStorage)
    const pinId = primeiroPorColuna[columnId]
    if (pinId) {
      const idx = ordenadas.findIndex(v => v.id === pinId)
      if (idx > 0) {
        const [pinned] = ordenadas.splice(idx, 1)
        ordenadas = [pinned, ...ordenadas]
      }
    }

    return ordenadas
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Container de filtros (estilo VendasList) */}
      <div className="bg-primary-background flex-shrink-0 rounded-b-lg rounded-t-lg md:px-2">
        {/* Toggle filtros no mobile */}
        <div className="flex justify-end py-2 sm:hidden">
          <button
            type="button"
            onClick={() => setFiltrosVisiveisMobile(prev => !prev)}
            className="font-nunito flex items-center gap-2 rounded-md bg-primary px-3 py-1 text-sm text-white shadow-sm"
            aria-expanded={filtrosVisiveisMobile}
          >
            {filtrosVisiveisMobile ? <MdFilterAltOff size={18} /> : <MdFilterList size={18} />}
            <span>{filtrosVisiveisMobile ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
          </button>
        </div>
        {/* Filtros avançados: Origem, Data finalização, Data Criação, Status fiscal, Limpar */}
        <div
          className={`flex flex-wrap items-end justify-center gap-x-1 gap-y-4 rounded-t-lg bg-custom-2 px-1 pb-2 pt-1.5 md:justify-start ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
        >
          <div className="flex flex-col gap-1">
            <label className="font-nunito pl-2 text-xs text-secondary-text">Pesquisar</label>

            <div className="relative w-full max-w-full px-1 lg:max-w-[250px]">
              <MdSearch
                className="absolute left-2 top-1/2 -translate-y-1/2 text-secondary-text"
                size={20}
              />
              <input
                type="text"
                placeholder="Digite o código ou cliente"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && refetch()}
                className="font-nunito h-8 w-full rounded-lg border bg-info pl-6 pr-4 text-sm shadow-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs text-secondary-text">Origem</label>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={origemFilter}
                onChange={e => setOrigemFilter(e.target.value as OrigemFiltro)}
                displayEmpty
                sx={{
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-info)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PDV">PDV</MenuItem>
                <MenuItem value="GESTOR">Gestor</MenuItem>
                {/* <MenuItem value="DELIVERY">Delivery</MenuItem> */}
              </Select>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs text-secondary-text">Data finalização</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={dataFinalizacaoPeriodo}
                onChange={e => setDataFinalizacaoPeriodo(e.target.value as PeriodoOpcao)}
                sx={{
                  height: '32px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="Hoje">Hoje</MenuItem>
                <MenuItem value="Ontem">Ontem</MenuItem>
                <MenuItem value="Últimos 7 Dias">Últimos 7 Dias</MenuItem>
                <MenuItem value="Mês Atual">Mês Atual</MenuItem>
                <MenuItem value="Mês Passado">Mês Passado</MenuItem>
                <MenuItem value="Últimos 30 Dias">Últimos 30 Dias</MenuItem>
                <MenuItem value="Últimos 60 Dias">Últimos 60 Dias</MenuItem>
                <MenuItem value="Últimos 90 Dias">Últimos 90 Dias</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs text-secondary-text">Data criação</label>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={periodo}
                onChange={e => setPeriodo(e.target.value as PeriodoOpcao)}
                sx={{
                  height: '32px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="Hoje">Hoje</MenuItem>
                <MenuItem value="Ontem">Ontem</MenuItem>
                <MenuItem value="Últimos 7 Dias">Últimos 7 Dias</MenuItem>
                <MenuItem value="Mês Atual">Mês Atual</MenuItem>
                <MenuItem value="Mês Passado">Mês Passado</MenuItem>
                <MenuItem value="Últimos 30 Dias">Últimos 30 Dias</MenuItem>
                <MenuItem value="Últimos 60 Dias">Últimos 60 Dias</MenuItem>
                <MenuItem value="Últimos 90 Dias">Últimos 90 Dias</MenuItem>
                <MenuItem value="Datas Personalizadas">Datas personalizadas</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs text-secondary-text">Status fiscal</label>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={statusFiscalFilter}
                onChange={e => setStatusFiscalFilter(e.target.value)}
                displayEmpty
                sx={{
                  height: '32px',
                  backgroundColor: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDENTE">Pendente</MenuItem>
                <MenuItem value="PENDENTE_EMISSAO">Pendente emissão</MenuItem>
                <MenuItem value="EMITINDO">Emitindo</MenuItem>
                <MenuItem value="EMITIDA">Emitida</MenuItem>
                <MenuItem value="REJEITADA">Rejeitada</MenuItem>
                <MenuItem value="CANCELADA">Cancelada</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-nunito text-xs text-secondary-text">Período (criação)</label>
            <button
              type="button"
              onClick={() => setIsDatasModalOpen(true)}
              className="font-nunito flex h-8 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
            >
              <MdCalendarToday size={18} />
              Por datas
            </button>
          </div>
          <button
            onClick={handleClearFilters}
            className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg border border-primary px-4 text-sm text-primary transition-colors hover:bg-primary/10"
          >
            <MdFilterAltOff size={18} />
            Limpar filtros
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100"
              title="Atualizar"
            >
              <MdRefresh className="h-5 w-5" />
            </button>
            <button
              onClick={() => setNovoPedidoModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <MdAdd className="h-4 w-4" />
              Novo Pedido
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="scrollbar-thin mb-[10px] min-h-0 flex-1 overflow-x-auto p-2 pb-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex h-full min-w-max gap-3">
            {columns.map(column => {
              const columnVendas = getVendasByColumn(column.id)
              const count = columnVendas.length

              return (
                <div
                  key={column.id}
                  className="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50 sm:w-60 md:w-64 lg:w-96"
                  style={{ height: 'calc(100vh - 180px)' }}
                >
                  {/* Column Header - Apenas o header tem cor */}
                  <div
                    className={`px-3 py-2 ${column.color} border-b ${column.borderColor} flex flex-shrink-0 items-center justify-between`}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.icon}
                      <h3 className="text-xs font-medium text-gray-900">
                        {column.title} ({count})
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-medium text-gray-700">Ordem</span>
                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={criterioOrdenacaoPorColuna[column.id as ColunaId] ?? 'data'}
                          onChange={e => {
                            const next = e.target.value as CriterioOrdenacaoKanban
                            setCriterioOrdenacaoPorColuna(prev => ({
                              ...prev,
                              [column.id as ColunaId]: next,
                            }))
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                boxShadow:
                                  '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
                              },
                            },
                          }}
                          sx={{
                            height: 26,
                            fontSize: 12,
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#e5e7eb',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                              borderWidth: '1px',
                            },
                          }}
                        >
                          <MenuItem value="data">Data</MenuItem>
                          <MenuItem value="numero">Nº da venda</MenuItem>
                          <MenuItem value="cliente">Cliente</MenuItem>
                        </Select>
                      </FormControl>
                      <button
                        type="button"
                        className="flex h-6 w-5 items-center justify-center rounded bg-white/70 text-gray-700 hover:bg-white"
                        onClick={() => {
                          const colId = column.id as ColunaId
                          setDirecaoOrdenacaoPorColuna(prev => ({
                            ...prev,
                            [colId]: prev[colId] === 'asc' ? 'desc' : 'asc',
                          }))
                        }}
                        aria-label="Alternar direção da ordenação"
                        title="Alternar: crescente/decrescente"
                      >
                        {direcaoOrdenacaoPorColuna[column.id as ColunaId] === 'asc' ? (
                          <MdArrowUpward className="h-4 w-4" />
                        ) : (
                          <MdArrowDownward className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Column Content - área droppable (incl. soltar em Com nota = emitir/reemitir) */}
                  <DroppableColumnContent
                    columnId={column.id}
                    className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-200 p-2.5"
                  >
                    {columnVendas.length === 0 ? (
                      <div className="py-6 text-center">
                        <p className="text-xs text-gray-500">{column.placeholder}</p>
                      </div>
                    ) : (
                      columnVendas.map((venda: Venda) => {
                        const valorFormatado = transformarParaReal(venda.valorFinal)
                        const clienteNome = venda.cliente?.nome?.trim()
                          ? venda.cliente.nome
                          : LABEL_SEM_CLIENTE
                        // Durante reemissão o card vai para Com nota solicitada; mantém lápis como em Pendente emissão
                        const colunaPermiteEditarCliente =
                          column.id === 'FINALIZADAS' ||
                          column.id === 'PENDENTE_EMISSAO' ||
                          (column.id === 'COM_NFE' &&
                            acaoFiscalEmAndamentoPorVenda[venda.id] === 'reemitindo')
                        // Editar cliente global (lápis → NovoCliente): PDV e Gestor; mesmas colunas; cliente já vinculado com nome
                        const podeEditarClienteNaVenda =
                          colunaPermiteEditarCliente &&
                          !vendaSemNomeCliente(venda) &&
                          Boolean(venda.cliente?.id?.trim())
                        // Vendas da origem Gestor usam ícone/rótulo próprios (não confundir com balcão do PDV)
                        const tipoVendaExibicao =
                          venda.tabelaOrigem === 'venda_gestor' ? 'gestor' : venda.tipoVenda

                        const { borderClass: cardBorderClass, cardBgClass } =
                          getCardBorderEFundoKanban(
                            column.id as ColunaKanbanId,
                            venda,
                            acaoFiscalEmAndamentoPorVenda
                          )

                        return (
                          <DraggableVendaCard key={venda.id} venda={venda} column={column}>
                            <div
                              className={`relative rounded-lg border-l-4 ${cardBorderClass} ${cardBgClass} cursor-pointer border border-gray-200/80 p-3 transition-all hover:shadow-md`}
                              title="Duplo clique para ver os detalhes do pedido"
                              onDoubleClick={() => handleViewDetails(venda)}
                            >
                              {/* Bloco número da venda até valor, com ícone ao lado */}
                              <div
                                className={`mb-2 flex gap-2 ${podeEditarClienteNaVenda ? 'pr-1' : ''}`}
                              >
                                <div className="min-w-0 flex-1 border-b border-gray-100 pb-1.5">
                                  <p className="mb-0.5 text-xs text-gray-500">
                                    {venda.origem} | Venda {venda.numeroVenda}
                                    {venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}
                                  </p>
                                  <div className="flex min-w-0 items-start gap-1">
                                    <p className="mb-0 min-w-0 flex-1 truncate text-sm font-semibold uppercase text-primary-text">
                                      {clienteNome}
                                    </p>
                                    {podeEditarClienteNaVenda && venda.cliente?.id && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleAbrirEdicaoCliente(venda.cliente!.id)
                                        }}
                                        onDoubleClick={e => e.stopPropagation()}
                                        className="flex-shrink-0 rounded p-0.5 text-primary transition-colors hover:bg-primary/10"
                                        title="Editar dados do cliente"
                                        aria-label="Editar dados do cliente"
                                      >
                                        <MdEdit className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {valorFormatado}
                                    </span>
                                  </p>
                                  {venda.statusFiscal && (
                                    <>
                                      <div className="mt-1 flex items-center">
                                        <StatusFiscalBadge
                                          status={venda.statusFiscal}
                                          tone="neutral"
                                        />
                                      </div>
                                      {venda.numeroFiscal && venda.statusFiscal === 'EMITIDA' && (
                                        <div className="mt-0.5">
                                          <span className="text-xs font-semibold text-gray-900">
                                            {venda.tipoDocFiscal || 'NFe'} Nº {venda.numeroFiscal}
                                            {venda.serieFiscal && ` / Série ${venda.serieFiscal}`}
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {tipoVendaExibicao &&
                                  (tipoVendaExibicao === 'balcao' ||
                                    tipoVendaExibicao === 'mesa' ||
                                    tipoVendaExibicao === 'gestor') && (
                                    <div className="flex flex-shrink-0 items-center justify-center">
                                      <TipoVendaIcon
                                        tipoVenda={
                                          tipoVendaExibicao as 'balcao' | 'mesa' | 'gestor'
                                        }
                                        numeroMesa="M"
                                        size={56}
                                        containerScale={0.9}
                                        corPrincipal="var(--color-primary)"
                                        corTexto="var(--color-info)"
                                        corBalcao="var(--color-primary)"
                                        corGestor="var(--color-primary)"
                                        corBorda="var(--color-primary)"
                                      />
                                    </div>
                                  )}
                              </div>

                              {/* Novos campos: Data finalização, Aberto por; Origem */}
                              <div className="space-y-0.5">
                                {venda.dataFinalizacao && (
                                  <p className="text-xs text-gray-500">
                                    Finalizada: {formatarDataCard(venda.dataFinalizacao)}
                                  </p>
                                )}
                              </div>

                              {/* Ações baseadas na coluna */}
                              <div
                                className="mt-0.5 flex gap-2"
                                onClick={e => e.stopPropagation()}
                                onDoubleClick={e => e.stopPropagation()}
                              >
                                {/* Ações para colunas de delivery — COMENTADO: colunas não utilizadas por enquanto */}
                                {/* {['EM_ANALISE', 'EM_PRODUCAO', 'PRONTOS_ENTREGA', 'COM_ENTREGADOR'].includes(column.id) && (
                              <div className="text-xs text-gray-500 italic w-full text-center py-1">
                                Em andamento
                              </div>
                            )} */}

                                {/* Emitir / Reemitir: coluna Pendente ou card temporário em Com nota durante reemissão */}
                                {(column.id === 'PENDENTE_EMISSAO' ||
                                  acaoFiscalEmAndamentoPorVenda[venda.id] === 'reemitindo') && (
                                  <Button
                                    size="sm"
                                    variant="contained"
                                    className="flex-1 !bg-primary hover:!bg-primary/90"
                                    sx={{
                                      py: 0.375,
                                      px: 1,
                                      minHeight: 'auto',
                                      // Só esta venda usa acaoFiscalEmAndamentoPorVenda; não usar isPending global dos hooks (afetava todos os cards)
                                      '&.MuiButton-contained.Mui-disabled': {
                                        color: 'rgba(255,255,255,0.96)',
                                        WebkitTextFillColor: 'rgba(255,255,255,0.96)',
                                      },
                                    }}
                                    onClick={() => handleEmitirNfe(venda)}
                                    disabled={vendaBloqueadaParaEmissaoInterativa(
                                      venda,
                                      acaoFiscalEmAndamentoPorVenda
                                    )}
                                  >
                                    {(() => {
                                      const acaoEmAndamento =
                                        acaoFiscalEmAndamentoPorVenda[venda.id]
                                      if (acaoEmAndamento === 'reemitindo') return 'Reemitindo...'
                                      if (acaoEmAndamento === 'emitindo') return 'Emitindo...'
                                      const documentoLabel =
                                        venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'
                                      if (venda.statusFiscal === 'REJEITADA')
                                        return `Reemitir ${documentoLabel}`
                                      if (venda.statusFiscal === 'PENDENTE_EMISSAO') {
                                        return 'Aguardando...'
                                      }
                                      if (statusFiscalAguardandoSefaz(venda)) {
                                        return 'Aguardando...'
                                      }
                                      return `Emitir Nota`
                                    })()}
                                  </Button>
                                )}

                                {/* PDF só existe após autorização ou após cancelamento de nota já emitida; demais status ficam sem botão */}
                                {column.id === 'COM_NFE' &&
                                  venda.documentoFiscalId &&
                                  (venda.statusFiscal === 'EMITIDA' ||
                                    venda.statusFiscal === 'CANCELADA') && (
                                    <Button
                                      size="sm"
                                      sx={{ py: 0.375, px: 1, minHeight: 'auto' }}
                                      variant="outlined"
                                      title={
                                        venda.statusFiscal === 'CANCELADA'
                                          ? 'Abrir PDF da nota (cancelada na SEFAZ)'
                                          : undefined
                                      }
                                      className="flex-1 !border-primary !text-primary hover:!bg-primary/5"
                                      onClick={() => {
                                        void abrirDocumentoFiscalPdf(
                                          venda.documentoFiscalId!,
                                          venda.tipoDocFiscal
                                        )
                                      }}
                                    >
                                      Ver {venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'}
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </DraggableVendaCard>
                        )
                      })
                    )}
                  </DroppableColumnContent>
                </div>
              )
            })}
          </div>
          <DragOverlay dropAnimation={null}>
            {draggingVenda ? <VendaCardDragPreview venda={draggingVenda} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal de Emissão de NFe */}
      {vendaSelecionadaParaEmissao && (
        <EmitirNfeModal
          open={emitirNfeModalOpen}
          onClose={() => {
            setEmitirNfeModalOpen(false)
            setSelectedVendaId(null)
            setVendaSelecionadaParaEmissao(null)
          }}
          vendaId={vendaSelecionadaParaEmissao.id}
          vendaNumero={vendaSelecionadaParaEmissao.numeroVenda?.toString()}
          origemVenda={vendaSelecionadaParaEmissao.origemVenda}
          codigoVenda={vendaSelecionadaParaEmissao.codigoVenda}
          clienteId={vendaSelecionadaParaEmissao.clienteId}
          clienteNome={vendaSelecionadaParaEmissao.clienteNome}
          tabelaOrigem={vendaSelecionadaParaEmissao.tabelaOrigem}
          onClienteSalvo={() => void refetch()}
        />
      )}

      {/* Modal de Novo Pedido */}
      {novoPedidoModalOpen && (
        <NovoPedidoModal
          open={novoPedidoModalOpen}
          onClose={() => {
            setNovoPedidoModalOpen(false)
          }}
          onSuccess={() => {
            setNovoPedidoModalOpen(false)
            refetch()
          }}
        />
      )}

      {/* Modal de Novo Pedido em Modo Visualização (Step 4) */}
      {pedidoVisualizacaoContext && (
        <NovoPedidoModal
          open={novoPedidoModalVisualizacaoOpen}
          onClose={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
            setPedidoVisualizacaoContext(null)
          }}
          onSuccess={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
            setPedidoVisualizacaoContext(null)
            refetch()
          }}
          vendaId={pedidoVisualizacaoContext.id}
          tabelaOrigemVenda={pedidoVisualizacaoContext.tabelaOrigem}
          statusFiscalUnificado={pedidoVisualizacaoContext.statusFiscal}
          modoVisualizacao={true}
        />
      )}

      {/* Modal de datas personalizadas (período por data de criação) */}
      {isDatasModalOpen && (
        <EscolheDatasModal
          open={isDatasModalOpen}
          onClose={() => setIsDatasModalOpen(false)}
          onConfirm={handleConfirmDatas}
          dataInicial={periodoInicial}
          dataFinal={periodoFinal}
        />
      )}

      {editarClienteModalOpen && Boolean(editarClienteId) && (
        <Dialog
          open={editarClienteModalOpen && Boolean(editarClienteId)}
          onOpenChange={open => {
            if (!open) handleFecharEdicaoCliente()
          }}
          fullWidth
          maxWidth="xl"
          sx={{
            '& .MuiDialog-container': {
              zIndex: 1500,
              justifyContent: { xs: 'center', md: 'flex-end' },
              alignItems: 'stretch',
              margin: 0,
            },
            '& .MuiBackdrop-root': { zIndex: 1500 },
            '& .MuiDialog-paper': { zIndex: 1500 },
          }}
          PaperProps={{
            sx: {
              height: '100vh',
              maxHeight: '100vh',
              width: { xs: '95vw', sm: '90vw', md: 'min(900px, 60vw)' },
              margin: { xs: 'auto', md: 0 },
              borderRadius: 0,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {editarClienteId && (
              <div className="h-full overflow-y-auto">
                <NovoCliente
                  key={editarClienteId}
                  clienteId={editarClienteId}
                  isEmbedded
                  onClose={handleFecharEdicaoCliente}
                  onSaved={() => {
                    refetch()
                    handleFecharEdicaoCliente()
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
