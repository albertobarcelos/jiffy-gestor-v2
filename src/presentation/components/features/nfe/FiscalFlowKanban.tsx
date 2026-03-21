'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  useMarcarEmissaoFiscal,
  useDesmarcarEmissaoFiscal,
  useEmitirNfe,
  useEmitirNfeGestor,
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
  MdAdd,
  MdVisibility,
  MdSchedule,
  MdRefresh,
  MdCheckCircle,
  MdFilterList,
  MdFilterAltOff,
  MdSearch,
  MdCalendarToday,
  MdMoreVert,
  MdEdit,
} from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { SeletorClienteModal } from './SeletorClienteModal'
import { Cliente } from '@/src/domain/entities/Cliente'
import { Button } from '@/src/presentation/components/ui/button'
import { Badge } from '@/src/presentation/components/ui/badge'
import { StatusFiscalBadge } from './StatusFiscalBadge'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import { NovoPedidoModal } from './NovoPedidoModal'
import { EscolheDatasModal } from '@/src/presentation/components/features/vendas/EscolheDatasModal'
import { showToast } from '@/src/shared/utils/toast'
import { abrirDocumentoFiscalPdf } from '@/src/presentation/utils/abrirDocumentoFiscalPdf'
import { FormControl, Select, MenuItem } from '@mui/material'

type Priority = 'high' | 'medium' | 'low'

interface KanbanColumn {
  id: string
  title: string
  color: string
  borderColor: string
  borderColorClass: string // Classe Tailwind para a cor da borda
  /** Fundo do card: mesma família de cor da coluna, mais suave que o header */
  cardBackgroundClass: string
  icon: React.ReactNode
  placeholder: string
}

// Usar VendaUnificadaDTO do hook
type Venda = VendaUnificadaDTO

/** Exibido quando o nome do cliente está vazio (Kanban e arraste) */
const LABEL_SEM_CLIENTE = 'SEM CLIENTE'

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

const KANBAN_ORDEM_STORAGE_KEY = 'kanban-ordem-colunas'

/** Ordem preferida dos IDs por coluna (persistida no localStorage para sobreviver ao refresh) */
type OrdemColunasStorage = Record<string, string[]>

function getOrdemFromStorage(): OrdemColunasStorage {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KANBAN_ORDEM_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as OrdemColunasStorage
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function setOrdemInStorage(columnId: string, orderedIds: string[]) {
  if (typeof window === 'undefined') return
  try {
    const current = getOrdemFromStorage()
    const next = { ...current, [columnId]: orderedIds }
    window.localStorage.setItem(KANBAN_ORDEM_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage cheio ou indisponível
  }
}

/** Coloca no topo da ordem da coluna o id movido e remove da outra coluna */
function persistirOrdemAoMover(movedId: string, colunaDestino: 'PENDENTE_EMISSAO' | 'FINALIZADAS') {
  const current = getOrdemFromStorage()
  const outraColuna = colunaDestino === 'PENDENTE_EMISSAO' ? 'FINALIZADAS' : 'PENDENTE_EMISSAO'
  const listaDestino = current[colunaDestino] ?? []
  const listaOutra = (current[outraColuna] ?? []).filter(id => id !== movedId)
  const novaListaDestino = [movedId, ...listaDestino.filter(id => id !== movedId)]
  setOrdemInStorage(colunaDestino, novaListaDestino)
  setOrdemInStorage(outraColuna, listaOutra)
}

/** Reordena a lista de vendas conforme a ordem preferida (IDs que estão no topo no storage ficam primeiro) */
function aplicarOrdemPreferida(vendas: Venda[], orderedIds: string[]): Venda[] {
  if (orderedIds.length === 0) return vendas
  const byId = new Map(vendas.map(v => [v.id, v]))
  const result: Venda[] = []
  for (const id of orderedIds) {
    const v = byId.get(id)
    if (v) result.push(v)
  }
  for (const v of vendas) {
    if (!orderedIds.includes(v.id)) result.push(v)
  }
  return result
}

/** Coluna droppable: Pendente Emissão = "marcar para emissão"; Finalizadas = "desmarcar da emissão" */
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
  const isOverClass = showDropSlotPendente
    ? 'ring-2 ring-yellow-400 ring-inset bg-yellow-50/50'
    : showDropSlotFinalizadas
      ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
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
      {children}
    </div>
  )
}

/** Preview do card durante o arraste: inclinado e com leve tremor (efeito de “arrastando na tela”) */
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

/** Card draggable em Finalizadas (→ Pendente Emissão) e em Pendente Emissão (→ Finalizadas); PDV e Gestor */
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
    (column.id === 'FINALIZADAS' || column.id === 'PENDENTE_EMISSAO') &&
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
      className="cursor-grab active:cursor-grabbing"
    >
      {isDragging ? (
        <div className="flex min-h-[100px] items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50/80">
          <span className="text-xs text-gray-400">Arrastando...</span>
        </div>
      ) : (
        children
      )}
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
  const [seletorClienteVendaOpen, setSeletorClienteVendaOpen] = useState(false)
  /** Contexto da venda ao abrir o seletor (para futuro PATCH de cliente na venda) */
  const vendaParaVincularClienteRef = useRef<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
  } | null>(null)

  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  /** Venda aberta no modal de detalhes (step 4): id, tabela e statusFiscal do unificado (PDV não repete no GET detalhe) */
  const [pedidoVisualizacaoContext, setPedidoVisualizacaoContext] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    statusFiscal: Venda['statusFiscal']
  } | null>(null)
  const [menuAcoesVendaIdAberto, setMenuAcoesVendaIdAberto] = useState<string | null>(null)
  const [acaoFiscalEmAndamentoPorVenda, setAcaoFiscalEmAndamentoPorVenda] = useState<
    Record<string, 'emitindo' | 'reemitindo'>
  >({})
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  const [vendaRecemMovidaParaPendenteId, setVendaRecemMovidaParaPendenteId] = useState<
    string | null
  >(null)
  const [vendaRecemMovidaParaFinalizadasId, setVendaRecemMovidaParaFinalizadasId] = useState<
    string | null
  >(null)

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
      offset: 0,
      limit: 100,
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

  // Buscar vendas unificadas (PDV + Gestor) com filtros da API
  const {
    data: vendasUnificadasData,
    isLoading,
    refetch,
  } = useVendasUnificadas(vendasUnificadasQueryParams)

  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()
  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()

  // Sensores para drag-and-drop: evita conflito com clique (abrir detalhes)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  )

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
      borderColorClass: 'border-l-primary',
      cardBackgroundClass: 'bg-primary/10',
      icon: <MdReceipt className="h-4 w-4 text-gray-600" />,
      placeholder: 'Vendas finalizadas aguardando ação',
    },
    {
      id: 'PENDENTE_EMISSAO',
      title: 'Pendente Emissão Fiscal',
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      borderColorClass: 'border-l-yellow-400',
      cardBackgroundClass: 'bg-yellow-400/10',
      icon: <MdSchedule className="h-4 w-4 text-yellow-600" />,
      placeholder: 'Vendas aguardando emissão de NFe',
    },
    {
      id: 'COM_NFE',
      title: 'Com Nota Solicitada',
      color: 'bg-green-50',
      borderColor: 'border-green-400',
      borderColorClass: 'border-l-green-400',
      cardBackgroundClass: 'bg-green-400/10',
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
  // - Só chama marcar se solicitarEmissaoFiscal ainda não é true (evita requisição ao reordenar em Pendente ou soltar de volta sem sair da coluna).
  // - Só chama desmarcar se solicitarEmissaoFiscal é true (evita requisição ao soltar em Finalizadas sem ter vindo de Pendente).
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingVenda(null)
    const { active, over } = event
    if (!over) return
    const venda = active.data.current?.venda as Venda | undefined
    if (!venda) return
    if (over.id === 'PENDENTE_EMISSAO') {
      setVendaRecemMovidaParaPendenteId(venda.id)
      persistirOrdemAoMover(venda.id, 'PENDENTE_EMISSAO')
      if (venda.solicitarEmissaoFiscal !== true) {
        handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
      }
    } else if (over.id === 'FINALIZADAS' && venda.solicitarEmissaoFiscal === true) {
      setVendaRecemMovidaParaFinalizadasId(venda.id)
      persistirOrdemAoMover(venda.id, 'FINALIZADAS')
      handleDesmarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
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
    const modeloInicial: 55 | 65 = venda.tipoDocFiscal === 'NFE' ? 55 : 65

    // Reemissão: rota explícita dedicada.
    if (venda.statusFiscal === 'REJEITADA' && venda.tipoDocFiscal) {
      setAcaoFiscalEmAndamento(venda.id, 'reemitindo')
      try {
        const serieReemissao = Number(venda.serieFiscal)
        if (!Number.isFinite(serieReemissao) || serieReemissao <= 0) {
          showToast.error(
            'Série fiscal da rejeição não encontrada. Não foi possível reemitir automaticamente.'
          )
          return
        }

        const payload = {
          id: venda.id,
          modelo: modeloInicial,
          tipoDocumento: venda.tipoDocFiscal,
          serie: serieReemissao,
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
    setMenuAcoesVendaIdAberto(null)

    setPedidoVisualizacaoContext({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      statusFiscal: venda.statusFiscal,
    })
    setNovoPedidoModalVisualizacaoOpen(true)
  }

  const toggleMenuAcoes = (vendaId: string) => {
    setMenuAcoesVendaIdAberto(prev => (prev === vendaId ? null : vendaId))
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

  const handleAbrirSeletorClienteVenda = useCallback((venda: Venda) => {
    vendaParaVincularClienteRef.current = { id: venda.id, tabelaOrigem: venda.tabelaOrigem }
    setSeletorClienteVendaOpen(true)
  }, [])

  const handleFecharSeletorClienteVenda = useCallback(() => {
    setSeletorClienteVendaOpen(false)
    vendaParaVincularClienteRef.current = null
  }, [])

  /** Seleção confirmada; vinculação na API quando o endpoint existir (ref ainda válido até o onClose do modal) */
  const handleClienteSelecionadoParaVenda = useCallback((cliente: Cliente) => {
    showToast.info(
      `Cliente "${cliente.getNome()}" vinculado à venda.`
    )
    // Futuro: PATCH com vendaParaVincularClienteRef.current e cliente.getId()
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
      case 'FINALIZADAS': {
        // Vendas finalizadas sem solicitação fiscal e sem NFe emitida
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'FINALIZADAS'
        })
        // Ordem preferida persistida (sobrevive ao refresh da página)
        const ordemFinalizadas = getOrdemFromStorage()['FINALIZADAS'] ?? []
        vendas = aplicarOrdemPreferida(vendas, ordemFinalizadas)
        // Colocar a venda recém solta (drag) no topo até o refetch atualizar (feedback imediato)
        if (vendaRecemMovidaParaFinalizadasId && vendas.length > 0) {
          const idx = vendas.findIndex((v: Venda) => v.id === vendaRecemMovidaParaFinalizadasId)
          if (idx > 0) {
            const recemMovida = vendas[idx]
            vendas = [
              recemMovida,
              ...vendas.filter((v: Venda) => v.id !== vendaRecemMovidaParaFinalizadasId),
            ]
          }
        }
        break
      }
      case 'PENDENTE_EMISSAO': {
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'PENDENTE_EMISSAO'
        })
        // Ordem preferida persistida (sobrevive ao refresh da página)
        const ordemPendente = getOrdemFromStorage()['PENDENTE_EMISSAO'] ?? []
        vendas = aplicarOrdemPreferida(vendas, ordemPendente)
        // Colocar a venda recém solta (drag) no topo até o refetch atualizar (feedback imediato)
        if (vendaRecemMovidaParaPendenteId && vendas.length > 0) {
          const idx = vendas.findIndex((v: Venda) => v.id === vendaRecemMovidaParaPendenteId)
          if (idx > 0) {
            const recemMovida = vendas[idx]
            vendas = [
              recemMovida,
              ...vendas.filter((v: Venda) => v.id !== vendaRecemMovidaParaPendenteId),
            ]
          }
        }
        break
      }
      case 'COM_NFE':
        vendas = vendasParaFiltrar.filter((v: Venda) => v.getEtapaKanban() === 'COM_NFE')
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

    return Array.from(vendasUnicas.values())
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
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

        {/* Filtros superiores: Busca, Período, Origem, Ações */}
        <div
          className={`flex flex-col items-center gap-3 py-2 sm:flex-row ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
        >
          <div className="relative w-full max-w-full flex-[2] px-4 lg:max-w-[550px]">
            <MdSearch
              className="absolute left-8 top-1/2 -translate-y-1/2 text-secondary-text"
              size={20}
            />
            <input
              type="text"
              placeholder="Pesquisar por código da venda ou cliente"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && refetch()}
              className="font-nunito h-8 w-full rounded-lg border bg-info pl-10 pr-4 text-sm shadow-sm"
            />
          </div>
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

        {/* Filtros avançados: Origem, Data finalização, Data Criação, Status fiscal, Limpar */}
        <div
          className={`flex flex-wrap items-end justify-center gap-x-2 gap-y-4 rounded-t-lg bg-custom-2 px-2 pb-2 pt-1.5 md:justify-start ${filtrosVisiveisMobile ? 'flex' : 'hidden sm:flex'}`}
        >
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
            className="font-nunito flex h-8 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm text-white transition-colors hover:bg-primary/90"
          >
            <MdFilterAltOff size={18} />
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="scrollbar-thin mb-[10px] min-h-0 flex-1 overflow-x-auto p-4 pb-4">
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
                  className="flex w-64 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white sm:w-60 md:w-64 lg:w-80"
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
                  </div>

                  {/* Column Content - Área droppable (Pendente Emissão aceita cards arrastados) */}
                  <DroppableColumnContent
                    columnId={column.id}
                    className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-white p-2.5"
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
                        const semNomeCliente = vendaSemNomeCliente(venda)
                        const podeEditarClienteNaVenda =
                          semNomeCliente &&
                          (column.id === 'FINALIZADAS' || column.id === 'PENDENTE_EMISSAO')
                        // Vendas do Gestor são sempre balcão; exibir "Balcão" quando a API não retorna tipoVenda
                        const tipoVendaExibicao =
                          venda.tabelaOrigem === 'venda_gestor'
                            ? venda.tipoVenda || 'balcao'
                            : venda.tipoVenda

                        return (
                          <DraggableVendaCard key={venda.id} venda={venda} column={column}>
                            <div
                              className={`rounded-lg border-l-4 ${column.borderColorClass} ${column.cardBackgroundClass} relative cursor-pointer border border-gray-200/80 p-3 transition-all hover:shadow-md`}
                              onClick={() => handleViewDetails(venda)}
                            >
                              {/* Menu de três pontos: apenas quando pode incluir cliente (mesmas colunas do lápis) */}
                              {podeEditarClienteNaVenda && (
                                <>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation()
                                      toggleMenuAcoes(venda.id)
                                    }}
                                    className="absolute right-2 top-2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                                    title="Mais opções"
                                  >
                                    <MdMoreVert className="h-4 w-4" />
                                  </button>

                                  {menuAcoesVendaIdAberto === venda.id && (
                                    <div
                                      className="absolute right-2 top-9 z-20 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMenuAcoesVendaIdAberto(null)
                                          handleAbrirSeletorClienteVenda(venda)
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                      >
                                        Incluir cliente
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Bloco número da venda até valor, com ícone ao lado */}
                              <div className="mb-2 flex gap-3 pr-6">
                                <div className="min-w-0 flex-1 border-b border-gray-100 pb-1.5">
                                  <p className="mb-0.5 text-xs text-gray-500">
                                    Venda {venda.numeroVenda}
                                    {venda.codigoVenda ? ` - #${venda.codigoVenda}` : ''}
                                  </p>
                                  <div className="mb-1 flex min-w-0 items-start gap-1">
                                    <p className="mb-0 min-w-0 flex-1 truncate text-sm font-semibold uppercase text-primary">
                                      {clienteNome}
                                    </p>
                                    {podeEditarClienteNaVenda && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleAbrirSeletorClienteVenda(venda)
                                        }}
                                        className="flex-shrink-0 rounded p-0.5 text-primary transition-colors hover:bg-primary/10"
                                        title="Incluir cliente na venda"
                                      >
                                        <MdEdit className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                  {venda.statusFiscal && (
                                    <div className="mb-1">
                                      <StatusFiscalBadge status={venda.statusFiscal} />
                                      {venda.numeroFiscal && venda.statusFiscal === 'EMITIDA' && (
                                        <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-0.5 text-green-800">
                                          <MdCheckCircle className="h-3.5 w-3.5" />
                                          <span className="text-xs font-semibold">
                                            {venda.tipoDocFiscal || 'NFe'} Nº {venda.numeroFiscal}
                                            {venda.serieFiscal && ` / Série ${venda.serieFiscal}`}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-600">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {valorFormatado}
                                    </span>
                                  </p>
                                </div>
                                {tipoVendaExibicao &&
                                  (tipoVendaExibicao === 'balcao' ||
                                    tipoVendaExibicao === 'mesa') && (
                                    <div className="flex flex-shrink-0 items-center justify-center">
                                      <TipoVendaIcon
                                        tipoVenda={tipoVendaExibicao as 'balcao' | 'mesa'}
                                        numeroMesa="M"
                                        size={64}
                                        containerScale={0.9}
                                        corPrincipal="var(--color-primary)"
                                        corTexto="var(--color-info)"
                                        corBalcao="var(--color-primary)"
                                        corBorda="var(--color-primary)"
                                      />
                                    </div>
                                  )}
                              </div>

                              {/* Novos campos: Data finalização, Aberto por; Origem */}
                              <div className="mb-2 space-y-0.5">
                                {venda.dataFinalizacao && (
                                  <p className="text-xs text-gray-500">
                                    Finalizada: {formatarDataCard(venda.dataFinalizacao)}
                                  </p>
                                )}
                                {venda.abertoPor?.nome && (
                                  <p className="text-xs text-gray-500">
                                    Aberto por: {venda.abertoPor.nome}
                                  </p>
                                )}
                                {venda.origem && (
                                  <p className="text-xs text-gray-500">Origem: {venda.origem}</p>
                                )}
                              </div>

                              {/* Ações baseadas na coluna */}
                              <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                                {/* Ações para colunas de delivery — COMENTADO: colunas não utilizadas por enquanto */}
                                {/* {['EM_ANALISE', 'EM_PRODUCAO', 'PRONTOS_ENTREGA', 'COM_ENTREGADOR'].includes(column.id) && (
                              <div className="text-xs text-gray-500 italic w-full text-center py-1">
                                Em andamento
                              </div>
                            )} */}

                                {/* Botão "Marcar para Emissão" (primary) */}
                                {column.id === 'FINALIZADAS' &&
                                  (venda.tabelaOrigem === 'venda' ||
                                    venda.tabelaOrigem === 'venda_gestor') && (
                                    <Button
                                      size="sm"
                                      variant="outlined"
                                      className="flex-1 !border-primary !text-primary hover:!bg-primary/5"
                                      sx={{ py: 0.375, px: 1, minHeight: 'auto' }}
                                      onClick={() =>
                                        handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
                                      }
                                      isLoading={marcarEmissaoFiscal.isPending}
                                    >
                                      Marcar para Emissão
                                    </Button>
                                  )}

                                {column.id === 'PENDENTE_EMISSAO' && (
                                  <Button
                                    size="sm"
                                    variant="contained"
                                    className="flex-1 !bg-primary hover:!bg-primary/90"
                                    sx={{ py: 0.375, px: 1, minHeight: 'auto' }}
                                    onClick={() => handleEmitirNfe(venda)}
                                    disabled={
                                      !!acaoFiscalEmAndamentoPorVenda[venda.id] ||
                                      emitirNfePdv.isPending ||
                                      emitirNfeGestor.isPending ||
                                      reemitirNfePdv.isPending ||
                                      reemitirNfeGestor.isPending ||
                                      venda.statusFiscal === 'PENDENTE' ||
                                      venda.statusFiscal === 'PENDENTE_EMISSAO' ||
                                      venda.statusFiscal === 'EMITINDO' ||
                                      venda.statusFiscal === 'PENDENTE_AUTORIZACAO' ||
                                      venda.statusFiscal === 'CONTINGENCIA' ||
                                      venda.statusFiscal === 'EMITIDA'
                                    }
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
                                      if (
                                        venda.statusFiscal === 'PENDENTE' ||
                                        venda.statusFiscal === 'PENDENTE_EMISSAO' ||
                                        venda.statusFiscal === 'EMITINDO' ||
                                        venda.statusFiscal === 'PENDENTE_AUTORIZACAO' ||
                                        venda.statusFiscal === 'CONTINGENCIA'
                                      ) {
                                        return 'Aguardando...'
                                      }
                                      return `Emitir Nota`
                                    })()}
                                  </Button>
                                )}

                                {column.id === 'COM_NFE' && venda.documentoFiscalId && (
                                  <Button
                                    size="sm"
                                    variant="outlined"
                                    disabled={venda.statusFiscal !== 'EMITIDA'}
                                    title={
                                      venda.statusFiscal !== 'EMITIDA'
                                        ? 'PDF disponível apenas com nota emitida (autorizada pela SEFAZ)'
                                        : undefined
                                    }
                                    className="flex-1 !border-primary !text-primary hover:!bg-primary/5 disabled:!cursor-not-allowed disabled:!border-gray-300 disabled:!text-gray-400 disabled:hover:!bg-transparent"
                                    onClick={() => {
                                      if (venda.statusFiscal !== 'EMITIDA') return
                                      void abrirDocumentoFiscalPdf(
                                        venda.documentoFiscalId!,
                                        venda.tipoDocFiscal
                                      )
                                    }}
                                  >
                                    Ver {venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'}
                                  </Button>
                                )}

                                {/* Botão de visualizar detalhes (primary) */}
                                <Button
                                  size="sm"
                                  variant="text"
                                  onClick={() => handleViewDetails(venda)}
                                  className="min-w-0 px-2 !text-primary hover:!bg-primary/10"
                                  title="Ver detalhes"
                                >
                                  <MdVisibility className="h-4 w-4" />
                                </Button>
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
        />
      )}

      {/* Modal de Novo Pedido */}
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
      <EscolheDatasModal
        open={isDatasModalOpen}
        onClose={() => setIsDatasModalOpen(false)}
        onConfirm={handleConfirmDatas}
        dataInicial={periodoInicial}
        dataFinal={periodoFinal}
      />

      <SeletorClienteModal
        open={seletorClienteVendaOpen}
        onClose={handleFecharSeletorClienteVenda}
        onSelect={handleClienteSelecionadoParaVenda}
        title="Vincular cliente à venda"
      />
    </div>
  )
}
