'use client'

import { useState } from 'react'
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
import { useMarcarEmissaoFiscal, useDesmarcarEmissaoFiscal, useDuplicateVenda, useExcluirVendaGestor, useEmitirNfe, useEmitirNfeGestor, useReemitirNfe, useReemitirNfeGestor } from '@/src/presentation/hooks/useVendas'
import { useVendasUnificadas, VendaUnificadaDTO } from '@/src/presentation/hooks/useVendasUnificadas'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdReceipt, MdAdd, MdVisibility, MdSchedule, MdRefresh, MdCheckCircle, MdError, MdCancel, MdMoreVert } from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { Button } from '@/src/presentation/components/ui/button'
import { Badge } from '@/src/presentation/components/ui/badge'
import { StatusFiscalBadge } from './StatusFiscalBadge'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'
import { NovoPedidoModal } from './NovoPedidoModal'
import { showToast } from '@/src/shared/utils/toast'

type Priority = 'high' | 'medium' | 'low'

interface KanbanColumn {
  id: string
  title: string
  color: string
  borderColor: string
  borderColorClass: string // Classe Tailwind para a cor da borda
  icon: React.ReactNode
  placeholder: string
}

// Usar VendaUnificadaDTO do hook
type Venda = VendaUnificadaDTO

/**
 * Componente Kanban para gerenciamento de pedidos e emissão fiscal
 * Baseado no modelo de Kanban moderno e limpo
 */
type TipoVendaFiltro = 'balcao' | 'mesa' | 'delivery'
type StatusVendaFiltro = 'TODAS' | 'ATIVAS' | 'CANCELADAS'

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
  const isOverClass =
    showDropSlotPendente
      ? 'ring-2 ring-yellow-400 ring-inset bg-yellow-50/50'
      : showDropSlotFinalizadas
        ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
        : ''
  return (
    <div ref={setNodeRef} className={`${className ?? ''} ${isOverClass}`}>
      {showDropSlotPendente && (
        <div className="min-h-[72px] border-2 border-dashed border-yellow-400 rounded-lg flex items-center justify-center bg-yellow-50/90 text-yellow-700 text-sm font-medium mb-2 transition-all">
          Solte aqui para marcar para emissão
        </div>
      )}
      {showDropSlotFinalizadas && (
        <div className="min-h-[72px] border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center bg-blue-50/90 text-blue-700 text-sm font-medium mb-2 transition-all">
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
  const clienteNome = venda.cliente?.nome || 'Sem cliente'
  return (
    <div className="drag-preview-card bg-white rounded-lg border-2 border-gray-300 p-2.5 cursor-grabbing w-64 opacity-95 shadow-lg">
      <p className="text-xs text-gray-500 mb-0.5">Venda #{venda.numeroVenda}</p>
      <p className="text-sm font-semibold text-primary mb-0.5 uppercase truncate">{clienteNome}</p>
      <div className="mb-1.5 pb-1.5 border-b border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="text-sm font-semibold text-gray-900">{valorFormatado}</span>
        </p>
      </div>
      {venda.origem && (
        <p className="text-xs text-gray-500">Origem: {venda.origem}</p>
      )}
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
        <div className="min-h-[100px] rounded border-2 border-dashed border-gray-300 bg-gray-50/80 flex items-center justify-center">
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
    modeloInicial?: 55 | 65
  } | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  const [detalhesVendaModalOpen, setDetalhesVendaModalOpen] = useState(false)
  const [vendaSelecionadaParaDetalhes, setVendaSelecionadaParaDetalhes] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
  } | null>(null)
  const [tipoVendaFiltros, setTipoVendaFiltros] = useState<TipoVendaFiltro[]>([])
  const [statusVendaFiltro, setStatusVendaFiltro] = useState<StatusVendaFiltro>('ATIVAS')
  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  const [novoPedidoModalVisualizacaoOpen, setNovoPedidoModalVisualizacaoOpen] = useState(false)
  const [vendaIdParaVisualizacao, setVendaIdParaVisualizacao] = useState<string | null>(null)
  const [menuAcoesVendaIdAberto, setMenuAcoesVendaIdAberto] = useState<string | null>(null)
  const [acaoFiscalEmAndamentoPorVenda, setAcaoFiscalEmAndamentoPorVenda] = useState<Record<string, 'emitindo' | 'reemitindo'>>({})
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  // ID da venda recém solta na coluna Pendente Emissão (para exibir no topo da lista)
  const [vendaRecemMovidaParaPendenteId, setVendaRecemMovidaParaPendenteId] = useState<string | null>(null)

  // Função para alternar filtro (seleção múltipla)
  const toggleFiltro = (tipo: TipoVendaFiltro) => {
    setTipoVendaFiltros(prev => {
      if (prev.includes(tipo)) {
        // Remove o filtro
        return prev.filter(t => t !== tipo)
      } else {
        // Adiciona o filtro
        return [...prev, tipo]
      }
    })
  }
  
  // Verificar se todos os filtros estão selecionados (equivalente a "todos")
  // Por enquanto sem Delivery: "todos" = Balcão + Mesa (2). Quando reativar delivery, usar === 3
  const todosFiltrosSelecionados = tipoVendaFiltros.length === 2
  
  // Calcular período do mês atual (formato ISO para o backend)
  const agora = new Date()
  const periodoInicial = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const periodoFinal = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
  
  // Mapear filtros de tipo de venda para origem (sem "TODOS" — undefined = backend retorna tudo)
  const getOrigemFiltro = (): 'PDV' | 'GESTOR' | 'DELIVERY' | undefined => {
    if (todosFiltrosSelecionados || tipoVendaFiltros.length === 0) return undefined
    // Por enquanto delivery não utilizado
    // if (tipoVendaFiltros.includes('delivery')) return 'DELIVERY'
    if (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) return 'PDV'
    return undefined
  }
  
  // Buscar vendas unificadas (PDV + Gestor)
  const { data: vendasUnificadasData, isLoading, refetch } = useVendasUnificadas({
    origem: getOrigemFiltro(),
    incluirCanceladas: true,
    periodoInicial,
    periodoFinal,
    offset: 0,
    limit: 100,
  })
  
  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()
  const duplicarVenda = useDuplicateVenda()
  const excluirVendaGestor = useExcluirVendaGestor()
  const emitirNfePdv = useEmitirNfe()
  const emitirNfeGestor = useEmitirNfeGestor()
  const reemitirNfePdv = useReemitirNfe()
  const reemitirNfeGestor = useReemitirNfeGestor()

  // Sensores para drag-and-drop: evita conflito com clique (abrir detalhes)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } })
  )

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const setAcaoFiscalEmAndamento = (
    vendaId: string,
    acao: 'emitindo' | 'reemitindo' | null
  ) => {
    setAcaoFiscalEmAndamentoPorVenda((prev) => {
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
  
  // Todas as vendas unificadas
  const todasVendas: Venda[] = vendasUnificadasData?.items || []
  
  // Filtrar vendas por tipo (se filtro ativo)
  const filtrarPorTipo = (vendas: Venda[]): Venda[] => {
    // Se todos os filtros estão selecionados ou nenhum, não filtrar
    if (todosFiltrosSelecionados || tipoVendaFiltros.length === 0) return vendas
    
    // Filtrar por tipos selecionados
    return vendas.filter(v => {
      // Para vendas do gestor, não temos tipoVenda, usar origem
      if (v.isVendaGestor() && !v.isDelivery()) {
        // Vendas do gestor aparecem quando filtro inclui balcão ou mesa
        return tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')
      }
      
      // Por enquanto delivery não utilizado
      // if (v.isDelivery()) {
      //   return tipoVendaFiltros.includes('delivery')
      // }
      //
      // Para vendas do PDV, usar tipoVenda
      if (v.isVendaPdv()) {
        const tipoVenda = v.tipoVenda?.toLowerCase()
        return tipoVenda && tipoVendaFiltros.some(filtro => filtro.toLowerCase() === tipoVenda)
      }
      
      return false
    })
  }

  const filtrarPorStatusVenda = (vendas: Venda[]): Venda[] => {
    if (statusVendaFiltro === 'TODAS') return vendas
    if (statusVendaFiltro === 'ATIVAS') {
      return vendas.filter((v) => !v.dataCancelamento)
    }
    return vendas.filter((v) => !!v.dataCancelamento)
  }
  
  // Filtrar vendas por tipo (Mesa, Balcão, Delivery) - aplica filtros do frontend
  const vendasFiltradasPorTipo: Venda[] = filtrarPorStatusVenda(filtrarPorTipo(todasVendas))

  // Função para obter colunas baseadas no filtro de tipo de venda
  const getColumns = (): KanbanColumn[] => {
    // Por enquanto sem colunas de delivery (Em análise, Em Produção, Prontos para Entrega, Com entregador)
    // Se nenhum filtro está selecionado, mostrar apenas as 3 colunas finais
    if (tipoVendaFiltros.length === 0) {
      return [
        {
          id: 'FINALIZADAS',
          title: 'Finalizadas',
          color: 'bg-gray-50',
          borderColor: 'border-gray-400',
          borderColorClass: 'border-l-gray-400',
          icon: <MdReceipt className="w-4 h-4 text-gray-600" />,
          placeholder: 'Vendas finalizadas aguardando ação',
        },
        {
          id: 'PENDENTE_EMISSAO',
          title: 'Pendente Emissão Fiscal',
          color: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          borderColorClass: 'border-l-yellow-400',
          icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
          placeholder: 'Vendas aguardando emissão de NFe',
        },
        {
          id: 'COM_NFE',
          title: 'Com NFe Emitida',
          color: 'bg-green-50',
          borderColor: 'border-green-400',
          borderColorClass: 'border-l-green-400',
          icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
          placeholder: 'Vendas com nota fiscal emitida',
        },
      ]
    }

    // Se todos os filtros estão selecionados (Balcão + Mesa), mostrar as 3 colunas finais
    if (todosFiltrosSelecionados) {
      return [
        {
          id: 'FINALIZADAS',
          title: 'Finalizadas',
          color: 'bg-gray-50',
          borderColor: 'border-gray-400',
          borderColorClass: 'border-l-gray-400',
          icon: <MdReceipt className="w-4 h-4 text-gray-600" />,
          placeholder: 'Pedidos finalizados',
        },
        {
          id: 'PENDENTE_EMISSAO',
          title: 'Pendente Emissão Fiscal',
          color: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          borderColorClass: 'border-l-yellow-400',
          icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
          placeholder: 'Pedidos aguardando emissão de NFe',
        },
        {
          id: 'COM_NFE',
          title: 'Com NFe Emitida',
          color: 'bg-green-50',
          borderColor: 'border-green-400',
          borderColorClass: 'border-l-green-400',
          icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
          placeholder: 'Pedidos com nota fiscal emitida',
        },
      ]
    }

    // Verificar se delivery está selecionado (código comentado: colunas de delivery não usadas por enquanto)
    const isDelivery = tipoVendaFiltros.includes('delivery')
    // Verificar se balcão ou mesa estão selecionados (mas não delivery)
    const isBalcaoOuMesa = (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) && !isDelivery

    // Colunas para Delivery (com etapas adicionais) - COMENTADO: não utilizado por enquanto
    // if (isDelivery) {
    //   return [
    //     { id: 'EM_ANALISE', title: 'Em análise', ... },
    //     { id: 'EM_PRODUCAO', title: 'Em Produção', ... },
    //     { id: 'PRONTOS_ENTREGA', title: 'Prontos para Entrega', ... },
    //     { id: 'COM_ENTREGADOR', title: 'Com entregador', ... },
    //     { id: 'FINALIZADAS', ... },
    //     { id: 'PENDENTE_EMISSAO', ... },
    //     { id: 'COM_NFE', ... },
    //   ]
    // }
    if (isDelivery) {
      // Quando reativar delivery, descomentar o bloco acima e remover este return
      return [
        {
          id: 'FINALIZADAS',
          title: 'Finalizadas',
          color: 'bg-gray-50',
          borderColor: 'border-gray-400',
          borderColorClass: 'border-l-gray-400',
          icon: <MdReceipt className="w-4 h-4 text-gray-600" />,
          placeholder: 'Pedidos finalizados',
        },
        {
          id: 'PENDENTE_EMISSAO',
          title: 'Pendente Emissão Fiscal',
          color: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          borderColorClass: 'border-l-yellow-400',
          icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
          placeholder: 'Pedidos aguardando emissão de NFe',
        },
        {
          id: 'COM_NFE',
          title: 'Com NFe Emitida',
          color: 'bg-green-50',
          borderColor: 'border-green-400',
          borderColorClass: 'border-l-green-400',
          icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
          placeholder: 'Pedidos com nota fiscal emitida',
        },
      ]
    }

    // Colunas para Balcão e Mesa (apenas as 3 finais) - quando Mesa ou Balcão estão selecionados (sem delivery)
    if (isBalcaoOuMesa) {
      return [
        {
          id: 'FINALIZADAS',
          title: 'Finalizadas',
          color: 'bg-gray-50',
          borderColor: 'border-gray-400',
          borderColorClass: 'border-l-gray-400',
          icon: <MdReceipt className="w-4 h-4 text-gray-600" />,
          placeholder: 'Vendas finalizadas aguardando ação',
        },
        {
          id: 'PENDENTE_EMISSAO',
          title: 'Pendente Emissão Fiscal',
          color: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          borderColorClass: 'border-l-yellow-400',
          icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
          placeholder: 'Vendas aguardando emissão de NFe',
        },
        {
          id: 'COM_NFE',
          title: 'Com NFe Emitida',
          color: 'bg-green-50',
          borderColor: 'border-green-400',
          borderColorClass: 'border-l-green-400',
          icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
          placeholder: 'Vendas com nota fiscal emitida',
        },
      ]
    }

    // Se chegou aqui (ex.: combinação delivery + balcão/mesa). Por enquanto sem colunas de delivery.
    // return [ EM_ANALISE, EM_PRODUCAO, PRONTOS_ENTREGA, COM_ENTREGADOR, FINALIZADAS, PENDENTE_EMISSAO, COM_NFE ]
    return [
      {
        id: 'FINALIZADAS',
        title: 'Finalizadas',
        color: 'bg-gray-50',
        borderColor: 'border-gray-400',
        borderColorClass: 'border-l-gray-400',
        icon: <MdReceipt className="w-4 h-4 text-gray-600" />,
        placeholder: 'Vendas finalizadas aguardando ação',
      },
      {
        id: 'PENDENTE_EMISSAO',
        title: 'Pendente Emissão Fiscal',
        color: 'bg-yellow-50',
        borderColor: 'border-yellow-400',
        borderColorClass: 'border-l-yellow-400',
        icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
        placeholder: 'Vendas aguardando emissão de NFe',
      },
      {
        id: 'COM_NFE',
        title: 'Com NFe Emitida',
        color: 'bg-green-50',
        borderColor: 'border-green-400',
        borderColorClass: 'border-l-green-400',
        icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
        placeholder: 'Vendas com nota fiscal emitida',
      },
    ]
  }

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



  const handleMarcarEmissaoFiscal = async (vendaId: string, tabelaOrigem: 'venda' | 'venda_gestor') => {
    try {
      await marcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao marcar emissão fiscal:', error)
    }
  }

  // Ao soltar: Finalizadas → Pendente Emissão = marcar para emissão; Pendente Emissão → Finalizadas = desmarcar
  // Só chama desmarcar se a venda estava marcada para emissão (solicitarEmissaoFiscal === true), evitando
  // chamar o endpoint quando o usuário apenas solta de volta na coluna Finalizadas sem ter mudado de coluna.
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingVenda(null)
    const { active, over } = event
    if (!over) return
    const venda = active.data.current?.venda as Venda | undefined
    if (!venda) return
    if (over.id === 'PENDENTE_EMISSAO') {
      setVendaRecemMovidaParaPendenteId(venda.id)
      handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
    } else if (over.id === 'FINALIZADAS' && venda.solicitarEmissaoFiscal === true) {
      handleDesmarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)
    }
  }

  const handleDesmarcarEmissaoFiscal = async (vendaId: string, tabelaOrigem: 'venda' | 'venda_gestor') => {
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
    if (
      venda.statusFiscal === 'REJEITADA' &&
      venda.tipoDocFiscal
    ) {
      setAcaoFiscalEmAndamento(venda.id, 'reemitindo')
      try {
        const serieReemissao = Number(venda.serieFiscal)
        if (!Number.isFinite(serieReemissao) || serieReemissao <= 0) {
          showToast.error('Série fiscal da rejeição não encontrada. Não foi possível reemitir automaticamente.')
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
      modeloInicial,
    })
    setSelectedVendaId(venda.id) // Mantém para compatibilidade
    setEmitirNfeModalOpen(true)
  }

  const handleViewDetails = (venda: Venda) => {
    setMenuAcoesVendaIdAberto(null)
    
    // Se for venda_gestor, abrir NovoPedidoModal na step 4
    if (venda.tabelaOrigem === 'venda_gestor') {
      setVendaIdParaVisualizacao(venda.id)
      setNovoPedidoModalVisualizacaoOpen(true)
    } else {
      // Para vendas do PDV, manter DetalhesVendas
      setVendaSelecionadaParaDetalhes({
        id: venda.id,
        tabelaOrigem: venda.tabelaOrigem,
      })
      setDetalhesVendaModalOpen(true)
    }
  }

  const toggleMenuAcoes = (vendaId: string) => {
    setMenuAcoesVendaIdAberto((prev) => (prev === vendaId ? null : vendaId))
  }

  const handleDuplicarVenda = async (venda: Venda) => {
    setMenuAcoesVendaIdAberto(null)

    try {
      await duplicarVenda.mutateAsync({
        id: venda.id,
        tabelaOrigem: venda.tabelaOrigem,
      })
      await refetch()
    } catch (error) {
      console.error('Erro ao duplicar venda:', error)
    }
  }

  const handleExcluirVenda = async (venda: Venda) => {
    setMenuAcoesVendaIdAberto(null)
    if (venda.tabelaOrigem !== 'venda_gestor') {
      showToast.error('Exclusão disponível apenas para vendas do Gestor.')
      return
    }

    if (venda.statusFiscal === 'EMITIDA' || venda.statusFiscal === 'CANCELADA') {
      showToast.error('Venda com documento fiscal autorizado/cancelado não pode ser excluída. Use cancelamento.')
      return
    }

    const confirmou = window.confirm('Deseja realmente excluir esta venda de forma definitiva?')
    if (!confirmou) return

    try {
      await excluirVendaGestor.mutateAsync({
        id: venda.id,
      })
      await refetch()
    } catch (error) {
      console.error('Erro ao excluir venda:', error)
    }
  }



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
    let vendas: Venda[] = []
    
    // Usar vendas já filtradas por tipo (Mesa, Balcão, Delivery)
    const vendasParaFiltrar = vendasFiltradasPorTipo
    
    // Verificar se delivery está selecionado
    const isDelivery = tipoVendaFiltros.includes('delivery')
    
    // Verificar se balcão ou mesa estão selecionados (mas não delivery)
    const isBalcaoOuMesa = (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) && !isDelivery
    
    switch (columnId) {
      // Colunas de Delivery — COMENTADO: não utilizado por enquanto
      // case 'EM_ANALISE':
      //   if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
      //     vendas = vendasParaFiltrar.filter((v: Venda) => {
      //       if (!v.isDelivery()) return false
      //       return !v.dataFinalizacao && !v.statusFiscal
      //     })
      //   }
      //   break
      // case 'EM_PRODUCAO':
      //   if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
      //     vendas = vendasParaFiltrar.filter((v: Venda) => {
      //       if (!v.isDelivery()) return false
      //       return !v.dataFinalizacao && !v.statusFiscal
      //     })
      //   }
      //   break
      // case 'PRONTOS_ENTREGA':
      //   if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
      //     vendas = vendasParaFiltrar.filter((v: Venda) => {
      //       if (!v.isDelivery()) return false
      //       return !v.dataFinalizacao && !v.statusFiscal
      //     })
      //   }
      //   break
      // case 'COM_ENTREGADOR':
      //   if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
      //     vendas = vendasParaFiltrar.filter((v: Venda) => {
      //       if (!v.isDelivery()) return false
      //       return v.dataFinalizacao && v.statusFiscal !== 'EMITIDA'
      //     })
      //   }
      //   break

      // Colunas comuns (FINALIZADAS, PENDENTE_EMISSAO, COM_NFE)
      case 'FINALIZADAS':
        // Vendas finalizadas sem solicitação fiscal e sem NFe emitida
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'FINALIZADAS'
        })
        break
      case 'PENDENTE_EMISSAO': {
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'PENDENTE_EMISSAO'
        })
        // Colocar a venda recém solta (drag) no topo da coluna
        if (vendaRecemMovidaParaPendenteId && vendas.length > 0) {
          const idx = vendas.findIndex((v: Venda) => v.id === vendaRecemMovidaParaPendenteId)
          if (idx > 0) {
            const recemMovida = vendas[idx]
            vendas = [recemMovida, ...vendas.filter((v: Venda) => v.id !== vendaRecemMovidaParaPendenteId)]
          }
        }
        break
      }
      case 'COM_NFE':
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'COM_NFE'
        })
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
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header - Design mais clean */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Pedidos e Clientes</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <MdRefresh className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setNovoPedidoModalOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <MdAdd className="w-4 h-4" />
              Novo Pedido
            </button>
          </div>
        </div>
        
        {/* Filtros de Tipo de Venda com pontinhos no contorno (seleção múltipla) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleFiltro('balcao')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tipoVendaFiltros.includes('balcao')
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            style={tipoVendaFiltros.includes('balcao') ? {} : { 
              border: '2px dotted #9ca3af',
              borderStyle: 'dotted',
            }}
          >
            Balcão
          </button>
          <button
            onClick={() => toggleFiltro('mesa')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tipoVendaFiltros.includes('mesa')
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            style={tipoVendaFiltros.includes('mesa') ? {} : { 
              border: '2px dotted #9ca3af',
              borderStyle: 'dotted',
            }}
          >
            Mesa
          </button>
          {/* Filtro Delivery — COMENTADO: não utilizado por enquanto */}
          {/* <button
            onClick={() => toggleFiltro('delivery')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tipoVendaFiltros.includes('delivery')
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            style={tipoVendaFiltros.includes('delivery') ? {} : {
              border: '2px dotted #9ca3af',
              borderStyle: 'dotted',
            }}
          >
            Delivery
          </button> */}
          <div className="ml-3">
            <select
              value={statusVendaFiltro}
              onChange={(e) => setStatusVendaFiltro(e.target.value as StatusVendaFiltro)}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-700 border border-gray-300"
            >
              <option value="TODAS">Todas</option>
              <option value="ATIVAS">Ativas</option>
              <option value="CANCELADAS">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-4 pb-4 mb-[10px] min-h-0 scrollbar-thin">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div className="flex gap-3 min-w-max h-full">
          {columns.map((column) => {
            const columnVendas = getVendasByColumn(column.id)
            const count = columnVendas.length

            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-64 sm:w-60 md:w-64 lg:w-72 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col"
                style={{ height: 'calc(100vh - 180px)' }}
              >
                {/* Column Header - Apenas o header tem cor */}
                <div className={`px-3 py-2 ${column.color} border-b ${column.borderColor} flex items-center justify-between flex-shrink-0`}>
                  <div className="flex items-center gap-1.5">
                    {column.icon}
                    <h3 className="font-medium text-gray-900 text-xs">
                      {column.title} ({count})
                    </h3>
                  </div>
                </div>

                {/* Column Content - Área droppable (Pendente Emissão aceita cards arrastados) */}
                <DroppableColumnContent
                  columnId={column.id}
                  className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-white min-h-0 scrollbar-thin"
                >
                  {columnVendas.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-500">{column.placeholder}</p>
                    </div>
                  ) : (
                    columnVendas.map((venda: Venda) => {
                      const valorFormatado = transformarParaReal(venda.valorFinal)
                      const clienteNome = venda.cliente?.nome || 'Sem cliente'

                      return (
                        <DraggableVendaCard key={venda.id} venda={venda} column={column}>
                        <div
                          className={`bg-white rounded-lg border-l-4 ${column.borderColorClass} border border-gray-200 p-3 hover:shadow-md transition-all relative cursor-pointer`}
                          onClick={() => handleViewDetails(venda)}
                        >
                          {/* Menu de três pontos no canto superior direito */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleMenuAcoes(venda.id)
                            }}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            title="Mais opções"
                          >
                            <MdMoreVert className="w-4 h-4" />
                          </button>

                          {menuAcoesVendaIdAberto === venda.id && (
                            <div
                              className="absolute top-9 right-2 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleDuplicarVenda(venda)}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={duplicarVenda.isPending || excluirVendaGestor.isPending}
                              >
                                Duplicar
                              </button>
                              <button
                                onClick={() => handleExcluirVenda(venda)}
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={
                                  duplicarVenda.isPending ||
                                  excluirVendaGestor.isPending ||
                                  venda.statusFiscal === 'EMITIDA' ||
                                  venda.statusFiscal === 'CANCELADA'
                                }
                              >
                                Excluir
                              </button>
                            </div>
                          )}

                          {/* Venda N° e Tipo */}
                          <div className="flex items-center justify-between gap-2 mb-1 pr-6">
                            <p className="text-xs text-gray-500">Venda #{venda.numeroVenda}</p>
                            {venda.tipoVenda && (
                              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                {formatarTipoVenda(venda.tipoVenda)}
                              </span>
                            )}
                          </div>

                          {/* Nome do Cliente em destaque (cor primary) */}
                          <p className="text-sm font-semibold text-primary mb-1 uppercase truncate pr-6">
                            {clienteNome}
                          </p>

                          {/* Status Fiscal e Número da Nota */}
                          {venda.statusFiscal && (
                            <div className="mb-1.5">
                              <StatusFiscalBadge status={venda.statusFiscal} />
                              {venda.numeroFiscal && venda.statusFiscal === 'EMITIDA' && (
                                <div className="mt-1 inline-flex items-center gap-1 bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                                  <MdCheckCircle className="w-3.5 h-3.5" />
                                  <span className="text-xs font-semibold">
                                    {venda.tipoDocFiscal || 'NFe'} Nº {venda.numeroFiscal}
                                    {venda.serieFiscal && ` / Série ${venda.serieFiscal}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Valor */}
                          <div className="mb-1.5 pb-1.5 border-b border-gray-100">
                            <p className="text-xs text-gray-600">
                              <span className="text-sm font-semibold text-gray-900">
                                {valorFormatado}
                              </span>
                            </p>
                          </div>

                          {/* Novos campos: Data finalização, Aberto por; Origem */}
                          <div className="space-y-0.5 mb-2">
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
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            {/* Ações para colunas de delivery — COMENTADO: colunas não utilizadas por enquanto */}
                            {/* {['EM_ANALISE', 'EM_PRODUCAO', 'PRONTOS_ENTREGA', 'COM_ENTREGADOR'].includes(column.id) && (
                              <div className="text-xs text-gray-500 italic w-full text-center py-1">
                                Em andamento
                              </div>
                            )} */}

                            {/* Botão "Marcar para Emissão" (primary) */}
                            {column.id === 'FINALIZADAS' && (venda.tabelaOrigem === 'venda' || venda.tabelaOrigem === 'venda_gestor') && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1 !border-primary !text-primary hover:!bg-primary/5"
                                onClick={() => handleMarcarEmissaoFiscal(venda.id, venda.tabelaOrigem)}
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
                                  const acaoEmAndamento = acaoFiscalEmAndamentoPorVenda[venda.id]
                                  if (acaoEmAndamento === 'reemitindo') return 'Reemitindo...'
                                  if (acaoEmAndamento === 'emitindo') return 'Emitindo...'
                                  const documentoLabel = venda.tipoDocFiscal === 'NFE' ? 'NFe' : 'NFCe'
                                  if (venda.statusFiscal === 'REJEITADA') return `Reemitir ${documentoLabel}`
                                  if (
                                    venda.statusFiscal === 'PENDENTE' ||
                                    venda.statusFiscal === 'PENDENTE_EMISSAO' ||
                                    venda.statusFiscal === 'EMITINDO' ||
                                    venda.statusFiscal === 'PENDENTE_AUTORIZACAO' ||
                                    venda.statusFiscal === 'CONTINGENCIA'
                                  ) {
                                    return 'Aguardando...'
                                  }
                                  return `Emitir ${documentoLabel}`
                                })()}
                              </Button>
                            )}

                            {column.id === 'COM_NFE' && venda.documentoFiscalId && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1 !border-primary !text-primary hover:!bg-primary/5"
                                onClick={async () => {
                                  const url = `/api/nfe/${venda.documentoFiscalId}`
                                  const documentoLabel = venda.tipoDocFiscal === 'NFE' ? 'DANFE' : 'DANFCE'
                                  
                                  // Verificar se o PDF fiscal está disponível antes de abrir
                                  try {
                                    const response = await fetch(url)
                                    
                                    if (response.ok) {
                                      // Verificar se é realmente um PDF
                                      const contentType = response.headers.get('content-type')
                                      if (contentType?.includes('application/pdf')) {
                                        // PDF fiscal disponível, abrir normalmente
                                        window.open(url, '_blank')
                                      } else {
                                        // Resposta inesperada
                                        const errorData = await response.json().catch(() => ({}))
                                        alert(errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`)
                                      }
                                    } else if (response.status === 404) {
                                      // PDF fiscal ainda não foi gerado
                                      const errorData = await response.json().catch(() => ({}))
                                      const errorMessage = errorData.error || `O ${documentoLabel} ainda não foi gerado.`
                                      
                                      // Oferecer opção de regenerar ou aguardar
                                      const opcao = confirm(
                                        `${errorMessage}\n\n` +
                                        `Escolha uma opção:\n` +
                                        `OK = Regenerar ${documentoLabel} agora\n` +
                                        `Cancelar = Aguardar e tentar novamente automaticamente`
                                      )
                                      
                                      if (opcao) {
                                        // Regenerar PDF fiscal via Next.js API route (proxy)
                                        try {
                                          const regenerarUrl = `/api/nfe/${venda.documentoFiscalId}/regenerar`
                                          
                                          const regenerarResponse = await fetch(regenerarUrl, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                          })
                                          
                                          if (regenerarResponse.ok) {
                                            const regenerarData = await regenerarResponse.json()
                                            alert(`✅ ${regenerarData.mensagem || `Geração de ${documentoLabel} iniciada. Aguarde alguns segundos e tente novamente.`}`)
                                            
                                            // Aguardar 5 segundos e tentar abrir
                                            setTimeout(async () => {
                                              let tentativas = 0
                                              const maxTentativas = 6 // 30 segundos no total (6 x 5s)
                                              
                                              const verificarPdfFiscal = async () => {
                                                tentativas++
                                                try {
                                                  const retryResponse = await fetch(url)
                                                  if (retryResponse.ok) {
                                                    const contentType = retryResponse.headers.get('content-type')
                                                    if (contentType?.includes('application/pdf')) {
                                                      window.open(url, '_blank')
                                                      return
                                                    }
                                                  }
                                                  
                                                  if (tentativas < maxTentativas) {
                                                    setTimeout(verificarPdfFiscal, 5000) // Tentar novamente em 5 segundos
                                                  } else {
                                                    alert(`O ${documentoLabel} ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.`)
                                                  }
                                                } catch {
                                                  if (tentativas < maxTentativas) {
                                                    setTimeout(verificarPdfFiscal, 5000)
                                                  }
                                                }
                                              }
                                              
                                              setTimeout(verificarPdfFiscal, 5000)
                                            }, 5000)
                                          } else {
                                            const errorRegenerar = await regenerarResponse.json().catch(() => ({}))
                                            alert(`Erro ao regenerar ${documentoLabel}: ${errorRegenerar.error || errorRegenerar.message || 'Erro desconhecido'}`)
                                          }
                                        } catch (error) {
                                          console.error(`Erro ao regenerar ${documentoLabel}:`, error)
                                          alert(`Erro ao regenerar ${documentoLabel}. Tente novamente mais tarde.`)
                                        }
                                      } else {
                                        // Aguardar e tentar novamente automaticamente
                                        let tentativas = 0
                                        const maxTentativas = 6 // 30 segundos no total (6 x 5s)
                                        
                                        const verificarPdfFiscal = async () => {
                                          tentativas++
                                          try {
                                            const retryResponse = await fetch(url)
                                            if (retryResponse.ok) {
                                              const contentType = retryResponse.headers.get('content-type')
                                              if (contentType?.includes('application/pdf')) {
                                                window.open(url, '_blank')
                                                return
                                              }
                                            }
                                            
                                            if (tentativas < maxTentativas) {
                                              setTimeout(verificarPdfFiscal, 5000) // Tentar novamente em 5 segundos
                                            } else {
                                              alert(`O ${documentoLabel} ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.`)
                                            }
                                          } catch {
                                            if (tentativas < maxTentativas) {
                                              setTimeout(verificarPdfFiscal, 5000)
                                            }
                                          }
                                        }
                                        
                                        setTimeout(verificarPdfFiscal, 5000)
                                      }
                                    } else {
                                      // Outro erro
                                      const errorData = await response.json().catch(() => ({}))
                                      alert(errorData.error || `Erro ao buscar ${documentoLabel}. Tente novamente mais tarde.`)
                                    }
                                  } catch (error) {
                                    // Erro de rede, tentar abrir mesmo assim
                                    console.error(`Erro ao verificar ${documentoLabel}:`, error)
                                    window.open(url, '_blank')
                                  }
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
                              className="px-2 !text-primary hover:!bg-primary/10 min-w-0"
                              title="Ver detalhes"
                            >
                              <MdVisibility className="w-4 h-4" />
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
          tabelaOrigem={vendaSelecionadaParaEmissao.tabelaOrigem}
          modeloInicial={vendaSelecionadaParaEmissao.modeloInicial ?? 65}
        />
      )}

      {/* Modal de Detalhes da Venda */}
      {vendaSelecionadaParaDetalhes && (
        <DetalhesVendas
          vendaId={vendaSelecionadaParaDetalhes.id}
          tabelaOrigem={vendaSelecionadaParaDetalhes.tabelaOrigem}
          open={detalhesVendaModalOpen}
          onClose={() => {
            setDetalhesVendaModalOpen(false)
            setVendaSelecionadaParaDetalhes(null)
          }}
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
      {vendaIdParaVisualizacao && (
        <NovoPedidoModal
          open={novoPedidoModalVisualizacaoOpen}
          onClose={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
            setVendaIdParaVisualizacao(null)
          }}
          onSuccess={() => {
            setNovoPedidoModalVisualizacaoOpen(false)
            setVendaIdParaVisualizacao(null)
            refetch()
          }}
          vendaId={vendaIdParaVisualizacao}
          modoVisualizacao={true}
        />
      )}
    </div>
  )
}

