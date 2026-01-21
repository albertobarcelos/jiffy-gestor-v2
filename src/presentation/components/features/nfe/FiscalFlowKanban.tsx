'use client'

import { useState } from 'react'
import { useVendas, useMarcarEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdReceipt, MdAdd, MdVisibility, MdSchedule, MdRefresh, MdCheckCircle, MdError, MdCancel, MdMoreVert } from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { Button } from '@/src/presentation/components/ui/button'
import { Badge } from '@/src/presentation/components/ui/badge'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'
import { NovoPedidoModal } from './NovoPedidoModal'

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

interface Venda {
  id: string
  numeroVenda: number
  codigoVenda: string
  cliente?: {
    nome: string
    cpfCnpj?: string
  }
  valorFinal: number
  statusFiscal?: string | null
  solicitarEmissaoFiscal?: boolean | null
  documentoFiscalId?: string | null
  dataFinalizacao?: string | null
  origem?: string
  tipoVenda?: string
  numeroMesa?: number | null
  statusMesa?: string | null
  statusVenda?: string | null // Status específico da venda (para delivery: PENDENTE, EM_PRODUCAO, etc.)
}

/**
 * Componente Kanban para gerenciamento de pedidos e emissão fiscal
 * Baseado no modelo de Kanban moderno e limpo
 */
type TipoVendaFiltro = 'balcao' | 'mesa' | 'delivery'

export function FiscalFlowKanban() {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  const [detalhesVendaModalOpen, setDetalhesVendaModalOpen] = useState(false)
  const [vendaSelecionadaParaDetalhes, setVendaSelecionadaParaDetalhes] = useState<string | null>(null)
  const [tipoVendaFiltros, setTipoVendaFiltros] = useState<TipoVendaFiltro[]>([])
  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)
  
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
  const todosFiltrosSelecionados = tipoVendaFiltros.length === 3
  
  // Obter filtro efetivo (null se todos selecionados ou nenhum selecionado = mostrar todos)
  const tipoVendaFiltroEfetivo: TipoVendaFiltro | null = 
    todosFiltrosSelecionados || tipoVendaFiltros.length === 0 
      ? null 
      : tipoVendaFiltros.length === 1 
        ? tipoVendaFiltros[0] 
        : null // Múltiplos selecionados mas não todos = usar array na filtragem
  
  // Buscar apenas vendas FINALIZADAS (com filtro de tipo se selecionado)
  // Usando status 'FINALIZADA' para buscar apenas vendas finalizadas
  const { data: vendasFinalizadasData, isLoading: isLoadingFinalizadas, refetch: refetchFinalizadas } = useVendas({
    status: ['FINALIZADA'],
    tipoVenda: tipoVendaFiltroEfetivo || undefined,
    limit: 100, // Limite máximo da API
  })
  
  // Buscar vendas pendentes de emissão fiscal (com filtro de tipo se selecionado)
  const { data: vendasPendentesData, isLoading: isLoadingPendentes, refetch: refetchPendentes } = useVendas({
    solicitarEmissaoFiscal: true,
    tipoVenda: tipoVendaFiltroEfetivo || undefined,
    limit: 100,
  })
  
  // Buscar vendas com NFe emitida (apenas finalizadas com statusFiscal = 'EMITIDA')
  // IMPORTANTE: Combinar status FINALIZADA + statusFiscal EMITIDA para garantir que são vendas finalizadas
  const { data: vendasComNfeData, isLoading: isLoadingComNfe, refetch: refetchComNfe } = useVendas({
    status: ['FINALIZADA'], // Garantir que está finalizada
    statusFiscal: 'EMITIDA', // E tem NFe emitida
    tipoVenda: tipoVendaFiltroEfetivo || undefined,
    limit: 100,
  })
  
  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  
  // Todas as vendas finalizadas (já filtradas pela API com status FINALIZADA)
  const todasVendasFinalizadas: Venda[] = vendasFinalizadasData?.vendas || []
  const vendasPendentes: Venda[] = vendasPendentesData?.vendas || []
  const vendasComNfe: Venda[] = vendasComNfeData?.vendas || []

  // Criar um Set com IDs de vendas que já estão em outras colunas para evitar duplicação
  const vendasPendentesIds = new Set(vendasPendentes.map(v => v.id))
  const vendasComNfeIds = new Set(vendasComNfe.map(v => v.id))

  // Filtrar vendas finalizadas que não estão pendentes nem têm NFe emitida
  // IMPORTANTE: Garantir que não há duplicação entre colunas
  // Para delivery: não incluir aqui (será tratado nas colunas específicas)
  const vendasFinalizadas: Venda[] = todasVendasFinalizadas.filter((venda: Venda) => {
    // Excluir delivery (será tratado separadamente)
    if (venda.tipoVenda?.toLowerCase() === 'delivery') return false
    
    // Não deve estar pendente de emissão fiscal (verificar tanto pela flag quanto pelo Set)
    if (venda.solicitarEmissaoFiscal || vendasPendentesIds.has(venda.id)) return false
    
    // Não deve ter NFe emitida (verificar tanto pelo status quanto pelo Set)
    if (venda.statusFiscal === 'EMITIDA' || vendasComNfeIds.has(venda.id)) return false
    
    return true
  })
  
  const isLoading = isLoadingPendentes || isLoadingComNfe || isLoadingFinalizadas
  
  const refetch = () => {
    refetchPendentes()
    refetchComNfe()
    refetchFinalizadas()
  }

  // Função para obter colunas baseadas no filtro de tipo de venda
  const getColumns = (): KanbanColumn[] => {
    // Se todos os filtros estão selecionados ou nenhum, mostrar todas as colunas
    const mostrarTodasColunas = todosFiltrosSelecionados || tipoVendaFiltros.length === 0
    
    // Verificar se delivery está selecionado (ou todos)
    const isDelivery = mostrarTodasColunas || tipoVendaFiltros.includes('delivery')
    
    // Verificar se balcão ou mesa estão selecionados (mas não delivery)
    const isBalcaoOuMesa = !mostrarTodasColunas && 
      (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) &&
      !tipoVendaFiltros.includes('delivery')

    // Colunas para Delivery (com etapas adicionais)
    if (isDelivery) {
      return [
        {
          id: 'EM_ANALISE',
          title: 'Em análise',
          color: 'bg-blue-50',
          borderColor: 'border-blue-400',
          borderColorClass: 'border-l-blue-400',
          icon: <MdSchedule className="w-4 h-4 text-blue-600" />,
          placeholder: 'Pedidos em análise',
        },
        {
          id: 'EM_PRODUCAO',
          title: 'Em Produção',
          color: 'bg-orange-50',
          borderColor: 'border-orange-400',
          borderColorClass: 'border-l-orange-400',
          icon: <MdSchedule className="w-4 h-4 text-orange-600" />,
          placeholder: 'Pedidos em produção',
        },
        {
          id: 'PRONTOS_ENTREGA',
          title: 'Prontos para Entrega',
          color: 'bg-purple-50',
          borderColor: 'border-purple-400',
          borderColorClass: 'border-l-purple-400',
          icon: <MdCheckCircle className="w-4 h-4 text-purple-600" />,
          placeholder: 'Pedidos prontos para entrega',
        },
        {
          id: 'COM_ENTREGADOR',
          title: 'Com entregador',
          color: 'bg-indigo-50',
          borderColor: 'border-indigo-400',
          borderColorClass: 'border-l-indigo-400',
          icon: <MdSchedule className="w-4 h-4 text-indigo-600" />,
          placeholder: 'Pedidos com entregador',
        },
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

    // Colunas para Balcão e Mesa (apenas as 3 finais)
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

    // Sem filtro: mostrar todas as colunas (delivery + finais)
    return [
      {
        id: 'EM_ANALISE',
        title: 'Em análise',
        color: 'bg-blue-50',
        borderColor: 'border-blue-400',
        borderColorClass: 'border-l-blue-400',
        icon: <MdSchedule className="w-4 h-4 text-blue-600" />,
        placeholder: 'Pedidos em análise',
      },
      {
        id: 'EM_PRODUCAO',
        title: 'Em Produção',
        color: 'bg-orange-50',
        borderColor: 'border-orange-400',
        borderColorClass: 'border-l-orange-400',
        icon: <MdSchedule className="w-4 h-4 text-orange-600" />,
        placeholder: 'Pedidos em produção',
      },
      {
        id: 'PRONTOS_ENTREGA',
        title: 'Prontos para Entrega',
        color: 'bg-purple-50',
        borderColor: 'border-purple-400',
        borderColorClass: 'border-l-purple-400',
        icon: <MdCheckCircle className="w-4 h-4 text-purple-600" />,
        placeholder: 'Pedidos prontos para entrega',
      },
      {
        id: 'COM_ENTREGADOR',
        title: 'Com entregador',
        color: 'bg-indigo-50',
        borderColor: 'border-indigo-400',
        borderColorClass: 'border-l-indigo-400',
        icon: <MdSchedule className="w-4 h-4 text-indigo-600" />,
        placeholder: 'Pedidos com entregador',
      },
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



  const handleMarcarEmissaoFiscal = async (vendaId: string) => {
    try {
      await marcarEmissaoFiscal.mutateAsync(vendaId)
    } catch (error) {
      console.error('Erro ao marcar emissão fiscal:', error)
    }
  }

  const handleEmitirNfe = (venda: Venda) => {
    setSelectedVendaId(venda.id)
    setEmitirNfeModalOpen(true)
  }

  const handleViewDetails = (venda: Venda) => {
    setVendaSelecionadaParaDetalhes(venda.id)
    setDetalhesVendaModalOpen(true)
  }

  // Filtrar vendas por tipo (se filtro ativo)
  const filtrarPorTipo = (vendas: Venda[]): Venda[] => {
    // Se todos os filtros estão selecionados ou nenhum, não filtrar
    if (todosFiltrosSelecionados || tipoVendaFiltros.length === 0) return vendas
    
    // Filtrar por tipos selecionados
    return vendas.filter(v => {
      const tipoVenda = v.tipoVenda?.toLowerCase()
      return tipoVenda && tipoVendaFiltros.some(filtro => filtro.toLowerCase() === tipoVenda)
    })
  }

  // Obter vendas de delivery por status (apenas finalizadas)
  const getVendasDeliveryPorStatus = (status: string | number): Venda[] => {
    // Usar apenas vendas finalizadas
    const todasVendas = todasVendasFinalizadas
    
    // Se delivery está selecionado ou todos estão selecionados, filtrar delivery
    const mostrarDelivery = todosFiltrosSelecionados || tipoVendaFiltros.length === 0 || tipoVendaFiltros.includes('delivery')
    
    const vendasFiltradas = mostrarDelivery
      ? todasVendas.filter((v: Venda) => v.tipoVenda?.toLowerCase() === 'delivery')
      : []
    
    return vendasFiltradas.filter((venda: Venda) => {
      // Delivery: verificar statusVenda
      if (venda.tipoVenda?.toLowerCase() !== 'delivery') return false
      
      // Converter status para string se necessário
      const statusVenda = venda.statusVenda?.toString() || ''
      const statusProcurado = status.toString()
      
      // Mapear status numérico para string se necessário
      const statusMap: Record<string, string[]> = {
        '1': ['1', 'PENDENTE', 'pendente'],
        '2': ['2', 'EM_PRODUCAO', 'em_producao', 'EM PRODUÇÃO'],
        '3': ['3', 'PRONTO', 'pronto'],
        '4': ['4', 'FINALIZADO', 'finalizado'],
      }
      
      const statusValidos = statusMap[statusProcurado] || [statusProcurado]
      return statusValidos.some(s => statusVenda.toUpperCase() === s.toUpperCase())
    })
  }

  const getVendasByColumn = (columnId: string): Venda[] => {
    let vendas: Venda[] = []
    
    // Se todos os filtros estão selecionados ou nenhum, mostrar todas as colunas
    const mostrarTodasColunas = todosFiltrosSelecionados || tipoVendaFiltros.length === 0
    
    // Verificar se delivery está selecionado (ou todos)
    const isDelivery = mostrarTodasColunas || tipoVendaFiltros.includes('delivery')
    
    // Verificar se balcão ou mesa estão selecionados (mas não delivery)
    const isBalcaoOuMesa = !mostrarTodasColunas && 
      (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) &&
      !tipoVendaFiltros.includes('delivery')
    
    switch (columnId) {
      // Colunas de Delivery
      case 'EM_ANALISE':
        // Mostrar apenas se filtro for delivery ou sem filtro (mostra todas)
        if (isDelivery) {
          vendas = getVendasDeliveryPorStatus('1') // PENDENTE
        }
        break
      case 'EM_PRODUCAO':
        if (isDelivery) {
          vendas = getVendasDeliveryPorStatus('2') // EM_PRODUCAO
        }
        break
      case 'PRONTOS_ENTREGA':
        if (isDelivery) {
          vendas = getVendasDeliveryPorStatus('3') // PRONTO
        }
        break
      case 'COM_ENTREGADOR':
        if (isDelivery) {
          // Status 4 (FINALIZADO) mas sem dataFinalizacao ainda (com entregador)
          vendas = getVendasDeliveryPorStatus('4').filter((v: Venda) => !v.dataFinalizacao)
        }
        break
      
      // Colunas comuns
      case 'FINALIZADAS':
        // Todas as vendas já são finalizadas (filtradas pela API)
        // Apenas filtrar por tipo e excluir pendentes/NFe emitida
        if (isDelivery) {
          // Para delivery: status 4 (FINALIZADO) com dataFinalizacao
          const deliveryFinalizadas = filtrarPorTipo(todasVendasFinalizadas).filter((v: Venda) => {
            if (v.tipoVenda?.toLowerCase() !== 'delivery') return false
            const statusVenda = v.statusVenda?.toString() || ''
            // Status 4 (FINALIZADO) e com dataFinalizacao
            return (statusVenda === '4' || statusVenda.toUpperCase() === 'FINALIZADO') && v.dataFinalizacao
          })
          vendas = deliveryFinalizadas.filter((v: Venda) => {
            if (v.solicitarEmissaoFiscal || vendasPendentesIds.has(v.id)) return false
            if (v.statusFiscal === 'EMITIDA' || vendasComNfeIds.has(v.id)) return false
            return true
          })
        } else if (isBalcaoOuMesa) {
          // Para balcão/mesa: apenas finalizadas sem solicitação e sem NFe
          vendas = filtrarPorTipo(vendasFinalizadas)
        } else {
          // Sem filtro: mostrar balcão/mesa finalizadas + delivery finalizadas
          const balcaoMesaFinalizadas = filtrarPorTipo(vendasFinalizadas)
          const deliveryFinalizadas = todasVendasFinalizadas.filter((v: Venda) => {
            if (v.tipoVenda?.toLowerCase() !== 'delivery') return false
            const statusVenda = v.statusVenda?.toString() || ''
            return (statusVenda === '4' || statusVenda.toUpperCase() === 'FINALIZADO') && v.dataFinalizacao
          }).filter((v: Venda) => {
            if (v.solicitarEmissaoFiscal || vendasPendentesIds.has(v.id)) return false
            if (v.statusFiscal === 'EMITIDA' || vendasComNfeIds.has(v.id)) return false
            return true
          })
          vendas = [...balcaoMesaFinalizadas, ...deliveryFinalizadas]
        }
        break
      case 'PENDENTE_EMISSAO':
        vendas = filtrarPorTipo(vendasPendentes)
        break
      case 'COM_NFE':
        vendas = filtrarPorTipo(vendasComNfe)
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
          <div>
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
          <button
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
          </button>
        </div>
      </div>

      {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-4 pb-4 mb-[10px] min-h-0 scrollbar-thin">
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

                {/* Column Content - Fundo branco com scroll interno */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-white min-h-0 scrollbar-thin">
                  {columnVendas.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-500">{column.placeholder}</p>
                    </div>
                  ) : (
                    columnVendas.map((venda: Venda) => {
                      const valorFormatado = transformarParaReal(venda.valorFinal)
                      const clienteNome = venda.cliente?.nome || 'Sem cliente'

                      return (
                        <div
                          key={venda.id}
                          className={`bg-white rounded border-l-2 ${column.borderColorClass} border-t border-r border-b border-gray-200 p-2.5 hover:shadow-sm transition-shadow relative cursor-pointer`}
                          onClick={() => handleViewDetails(venda)}
                        >
                          {/* Menu de três pontos no canto superior direito */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // TODO: Abrir menu de opções
                            }}
                            className="absolute top-1.5 right-1.5 p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Mais opções"
                          >
                            <MdMoreVert className="w-4 h-4" />
                          </button>

                          {/* Venda N° */}
                          <p className="text-xs text-gray-600 mb-0.5">Venda #{venda.numeroVenda}</p>

                          {/* Nome do Cliente em destaque */}
                          <p className="text-sm font-semibold text-gray-900 mb-0.5 uppercase truncate">
                            {clienteNome}
                          </p>

                          {/* Status Fiscal */}
                          {venda.statusFiscal && (
                            <p className="text-xs text-gray-600 mb-0.5">
                              Status: {venda.statusFiscal}
                            </p>
                          )}

                          {/* Valor */}
                          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="text-sm font-semibold text-gray-900">
                                {valorFormatado}
                              </span>
                            </p>
                          </div>

                          {/* Origem */}
                          {venda.origem && (
                            <p className="text-xs text-gray-500 mb-2">Origem: {venda.origem}</p>
                          )}

                          {/* Ações baseadas na coluna */}
                          <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                            {/* Ações para colunas de delivery (não mostram ações fiscais até finalizar) */}
                            {['EM_ANALISE', 'EM_PRODUCAO', 'PRONTOS_ENTREGA', 'COM_ENTREGADOR'].includes(column.id) && (
                              <div className="text-xs text-gray-500 italic w-full text-center py-1">
                                Em andamento
                              </div>
                            )}

                            {column.id === 'FINALIZADAS' && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1"
                                onClick={() => handleMarcarEmissaoFiscal(venda.id)}
                                isLoading={marcarEmissaoFiscal.isPending}
                              >
                                Marcar para Emissão
                              </Button>
                            )}

                            {column.id === 'PENDENTE_EMISSAO' && (
                              <Button
                                size="sm"
                                variant="contained"
                                className="flex-1"
                                onClick={() => handleEmitirNfe(venda)}
                              >
                                Emitir NFe
                              </Button>
                            )}

                            {column.id === 'COM_NFE' && venda.documentoFiscalId && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1"
                                onClick={() => window.open(`/nfe/${venda.documentoFiscalId}`, '_blank')}
                              >
                                Ver NFe
                              </Button>
                            )}
                            
                            {/* Botão de visualizar detalhes sempre visível */}
                            <Button
                              size="sm"
                              variant="text"
                              onClick={() => handleViewDetails(venda)}
                              className="px-2"
                              title="Ver detalhes"
                            >
                              <MdVisibility className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de Emissão de NFe */}
      {selectedVendaId && (
        <EmitirNfeModal
          open={emitirNfeModalOpen}
          onClose={() => {
            setEmitirNfeModalOpen(false)
            setSelectedVendaId(null)
          }}
          vendaId={selectedVendaId}
          vendaNumero={vendasPendentes.find(v => v.id === selectedVendaId)?.numeroVenda?.toString()}
        />
      )}

      {/* Modal de Detalhes da Venda */}
      {vendaSelecionadaParaDetalhes && (
        <DetalhesVendas
          vendaId={vendaSelecionadaParaDetalhes}
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
    </div>
  )
}

