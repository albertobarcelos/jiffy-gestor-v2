'use client'

import { useState } from 'react'
import { useVendas, useMarcarEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { useVendasUnificadas, VendaUnificadaDTO } from '@/src/presentation/hooks/useVendasUnificadas'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdReceipt, MdAdd, MdVisibility, MdSchedule, MdRefresh, MdCheckCircle, MdError, MdCancel, MdMoreVert } from 'react-icons/md'
import { EmitirNfeModal } from './EmitirNfeModal'
import { Button } from '@/src/presentation/components/ui/button'
import { Badge } from '@/src/presentation/components/ui/badge'
import { StatusFiscalBadge } from './StatusFiscalBadge'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'
import { NovoPedidoModal } from './NovoPedidoModal'
import { useAuthStore } from '@/src/presentation/stores/authStore'

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

export function FiscalFlowKanban() {
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [vendaSelecionadaParaEmissao, setVendaSelecionadaParaEmissao] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
    numeroVenda?: number
  } | null>(null)
  const [emitirNfeModalOpen, setEmitirNfeModalOpen] = useState(false)
  const [detalhesVendaModalOpen, setDetalhesVendaModalOpen] = useState(false)
  const [vendaSelecionadaParaDetalhes, setVendaSelecionadaParaDetalhes] = useState<{
    id: string
    tabelaOrigem: 'venda' | 'venda_gestor'
  } | null>(null)
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
  
  // Obter empresaId do token decodificado
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  
  // Decodificar token JWT para obter empresaId (decodificação simples base64)
  let empresaId = ''
  if (token) {
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        empresaId = payload.empresaId || ''
      }
    } catch (e) {
      console.error('Erro ao decodificar token:', e)
    }
  }

  
  // Calcular período do mês atual (formato ISO para o backend)
  const agora = new Date()
  const periodoInicial = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()
  const periodoFinal = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()
  
  // Mapear filtros de tipo de venda para origem (sem "TODOS" — undefined = backend retorna tudo)
  const getOrigemFiltro = (): 'PDV' | 'GESTOR' | 'DELIVERY' | undefined => {
    if (todosFiltrosSelecionados || tipoVendaFiltros.length === 0) return undefined
    if (tipoVendaFiltros.includes('delivery')) return 'DELIVERY'
    if (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) return 'PDV'
    return undefined
  }
  
  // Buscar vendas unificadas (PDV + Gestor)
  const { data: vendasUnificadasData, isLoading, refetch } = useVendasUnificadas({
    origem: getOrigemFiltro(),
    periodoInicial,
    periodoFinal,
    offset: 0,
    limit: 100,
  })
  
  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  
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
      
      // Para delivery
      if (v.isDelivery()) {
        return tipoVendaFiltros.includes('delivery')
      }
      
      // Para vendas do PDV, usar tipoVenda
      if (v.isVendaPdv()) {
        const tipoVenda = v.tipoVenda?.toLowerCase()
        return tipoVenda && tipoVendaFiltros.some(filtro => filtro.toLowerCase() === tipoVenda)
      }
      
      return false
    })
  }
  
  // Filtrar vendas por tipo (Mesa, Balcão, Delivery) - aplica filtros do frontend
  const vendasFiltradasPorTipo: Venda[] = filtrarPorTipo(todasVendas)

  // Função para obter colunas baseadas no filtro de tipo de venda
  const getColumns = (): KanbanColumn[] => {
    // Se nenhum filtro está selecionado, mostrar todas as colunas (incluindo delivery)
    if (tipoVendaFiltros.length === 0) {
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
    
    // Se todos os filtros estão selecionados, mostrar todas as colunas
    if (todosFiltrosSelecionados) {
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
    
    // Verificar se delivery está selecionado
    const isDelivery = tipoVendaFiltros.includes('delivery')
    
    // Verificar se balcão ou mesa estão selecionados (mas não delivery)
    const isBalcaoOuMesa = (tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')) && !isDelivery

    // Colunas para Delivery (com etapas adicionais) - quando delivery está selecionado
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

    // Se chegou aqui, deve ser delivery (já tratado acima) ou combinação delivery + balcão/mesa
    // Nesse caso, mostrar todas as colunas
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



  const handleMarcarEmissaoFiscal = async (vendaId: string, tabelaOrigem: 'venda' | 'venda_gestor') => {
    try {
      await marcarEmissaoFiscal.mutateAsync({ id: vendaId, tabelaOrigem })
    } catch (error) {
      console.error('Erro ao marcar emissão fiscal:', error)
    }
  }

  const handleEmitirNfe = (venda: Venda) => {
    setVendaSelecionadaParaEmissao({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
      numeroVenda: venda.numeroVenda,
    })
    setSelectedVendaId(venda.id) // Mantém para compatibilidade
    setEmitirNfeModalOpen(true)
  }

  const handleViewDetails = (venda: Venda) => {
    setVendaSelecionadaParaDetalhes({
      id: venda.id,
      tabelaOrigem: venda.tabelaOrigem,
    })
    setDetalhesVendaModalOpen(true)
  }

  // Filtrar vendas por tipo (se filtro ativo)
  const filtrarPorTipo = (vendas: Venda[]): Venda[] => {
    // Se todos os filtros estão selecionados ou nenhum, não filtrar
    if (todosFiltrosSelecionados || tipoVendaFiltros.length === 0) return vendas
    
    // Filtrar por tipos selecionados
    return vendas.filter(v => {
      // Para vendas do gestor, não temos tipoVenda, usar origem
      if (v.isVendaGestor && v.isVendaGestor() && !v.isDelivery()) {
        // Vendas do gestor aparecem quando filtro inclui balcão ou mesa
        return tipoVendaFiltros.includes('balcao') || tipoVendaFiltros.includes('mesa')
      }
      
      // Para delivery
      if (v.isDelivery && v.isDelivery()) {
        return tipoVendaFiltros.includes('delivery')
      }
      
      // Para vendas do PDV, usar tipoVenda
      if (v.isVendaPdv && v.isVendaPdv()) {
        const tipoVenda = v.tipoVenda?.toLowerCase()
        return tipoVenda && tipoVendaFiltros.some(filtro => filtro.toLowerCase() === tipoVenda)
      }
      
      return false
    })
  }

  // Obter vendas de delivery por status
  // NOTA: Para delivery, o backend retorna vendas finalizadas OU com status '4' sem dataFinalizacao (COM_ENTREGADOR)
  const getVendasDeliveryPorStatus = (status: string | number): Venda[] => {
    // Usar todas as vendas unificadas
    const todasVendasUnificadas = todasVendas
    
    // Se delivery está selecionado ou todos estão selecionados, filtrar delivery
    const mostrarDelivery = todosFiltrosSelecionados || tipoVendaFiltros.length === 0 || tipoVendaFiltros.includes('delivery')
    
    const vendasFiltradas = mostrarDelivery
      ? todasVendasUnificadas.filter((v: Venda) => v.isDelivery())
      : []
    
    return vendasFiltradas.filter((venda: Venda) => {
      // Delivery: verificar origem
      if (!venda.isDelivery()) return false
      
      // Para delivery, as etapas são controladas por resumo_fiscal e dataFinalizacao
      // Por enquanto, vamos usar a lógica baseada em dataFinalizacao e statusFiscal
      // TODO: Implementar status_venda quando necessário
      
      const statusProcurado = status.toString()
      
      // Mapear status para etapas
      if (statusProcurado === '1') {
        // EM_ANALISE - vendas delivery sem dataFinalizacao e sem resumo fiscal
        return !venda.dataFinalizacao && !venda.statusFiscal
      }
      if (statusProcurado === '2') {
        // EM_PRODUCAO - similar
        return !venda.dataFinalizacao && !venda.statusFiscal
      }
      if (statusProcurado === '3') {
        // PRONTOS_ENTREGA
        return !venda.dataFinalizacao && !venda.statusFiscal
      }
      if (statusProcurado === '4') {
        // COM_ENTREGADOR - status 4 sem dataFinalizacao
        return !venda.dataFinalizacao
      }
      
      return false
    })
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
      // Colunas de Delivery - apenas se delivery estiver selecionado
      case 'EM_ANALISE':
        if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
          vendas = vendasParaFiltrar.filter((v: Venda) => {
            if (!v.isDelivery()) return false
            // Delivery sem dataFinalizacao e sem status fiscal = em análise
            return !v.dataFinalizacao && !v.statusFiscal
          })
        }
        break
      case 'EM_PRODUCAO':
        if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
          vendas = vendasParaFiltrar.filter((v: Venda) => {
            if (!v.isDelivery()) return false
            // Similar - por enquanto usar mesma lógica
            return !v.dataFinalizacao && !v.statusFiscal
          })
        }
        break
      case 'PRONTOS_ENTREGA':
        if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
          vendas = vendasParaFiltrar.filter((v: Venda) => {
            if (!v.isDelivery()) return false
            return !v.dataFinalizacao && !v.statusFiscal
          })
        }
        break
      case 'COM_ENTREGADOR':
        if (isDelivery || tipoVendaFiltros.length === 0 || todosFiltrosSelecionados) {
          // Delivery com dataFinalizacao mas sem status fiscal emitido
          vendas = vendasParaFiltrar.filter((v: Venda) => {
            if (!v.isDelivery()) return false
            return v.dataFinalizacao && v.statusFiscal !== 'EMITIDA'
          })
        }
        break
      
      // Colunas comuns (FINALIZADAS, PENDENTE_EMISSAO, COM_NFE)
      case 'FINALIZADAS':
        // Vendas finalizadas sem solicitação fiscal e sem NFe emitida
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'FINALIZADAS'
        })
        break
      case 'PENDENTE_EMISSAO':
        vendas = vendasParaFiltrar.filter((v: Venda) => {
          const etapa = v.getEtapaKanban()
          return etapa === 'PENDENTE_EMISSAO'
        })
        break
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

                          {/* Status Fiscal e Número da Nota */}
                          {venda.statusFiscal && (
                            <div className="mb-1">
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

                            {/* Botão "Marcar para Emissão" aparece apenas para vendas PDV finalizadas */}
                            {column.id === 'FINALIZADAS' && venda.tabelaOrigem === 'venda' && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1"
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
                                className="flex-1"
                                onClick={() => handleEmitirNfe(venda)}
                                disabled={
                                  venda.statusFiscal === 'EMITINDO' || 
                                  venda.statusFiscal === 'PENDENTE_AUTORIZACAO' ||
                                  venda.statusFiscal === 'EMITIDA'
                                }
                              >
                                {venda.statusFiscal === 'REJEITADA' ? 'Reemitir NFe' : 'Emitir NFe'}
                              </Button>
                            )}

                            {column.id === 'COM_NFE' && venda.documentoFiscalId && (
                              <Button
                                size="sm"
                                variant="outlined"
                                className="flex-1"
                                onClick={async () => {
                                  const url = `/api/nfe/${venda.documentoFiscalId}`
                                  
                                  // Verificar se o DANFE está disponível antes de abrir
                                  try {
                                    const response = await fetch(url)
                                    
                                    if (response.ok) {
                                      // Verificar se é realmente um PDF
                                      const contentType = response.headers.get('content-type')
                                      if (contentType?.includes('application/pdf')) {
                                        // DANFE disponível, abrir normalmente
                                        window.open(url, '_blank')
                                      } else {
                                        // Resposta inesperada
                                        const errorData = await response.json().catch(() => ({}))
                                        alert(errorData.error || 'Erro ao buscar DANFE. Tente novamente mais tarde.')
                                      }
                                    } else if (response.status === 404) {
                                      // DANFE ainda não foi gerado
                                      const errorData = await response.json().catch(() => ({}))
                                      const errorMessage = errorData.error || 'O DANFE ainda não foi gerado.'
                                      
                                      // Oferecer opção de regenerar ou aguardar
                                      const opcao = confirm(
                                        `${errorMessage}\n\n` +
                                        `Escolha uma opção:\n` +
                                        `OK = Regenerar DANFE agora\n` +
                                        `Cancelar = Aguardar e tentar novamente automaticamente`
                                      )
                                      
                                      if (opcao) {
                                        // Regenerar DANFE via Next.js API route (proxy)
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
                                            alert(`✅ ${regenerarData.mensagem || 'Geração de DANFE iniciada. Aguarde alguns segundos e tente novamente.'}`)
                                            
                                            // Aguardar 5 segundos e tentar abrir
                                            setTimeout(async () => {
                                              let tentativas = 0
                                              const maxTentativas = 6 // 30 segundos no total (6 x 5s)
                                              
                                              const verificarDanfe = async () => {
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
                                                    setTimeout(verificarDanfe, 5000) // Tentar novamente em 5 segundos
                                                  } else {
                                                    alert('O DANFE ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.')
                                                  }
                                                } catch {
                                                  if (tentativas < maxTentativas) {
                                                    setTimeout(verificarDanfe, 5000)
                                                  }
                                                }
                                              }
                                              
                                              setTimeout(verificarDanfe, 5000)
                                            }, 5000)
                                          } else {
                                            const errorRegenerar = await regenerarResponse.json().catch(() => ({}))
                                            alert(`Erro ao regenerar DANFE: ${errorRegenerar.error || errorRegenerar.message || 'Erro desconhecido'}`)
                                          }
                                        } catch (error) {
                                          console.error('Erro ao regenerar DANFE:', error)
                                          alert('Erro ao regenerar DANFE. Tente novamente mais tarde.')
                                        }
                                      } else {
                                        // Aguardar e tentar novamente automaticamente
                                        let tentativas = 0
                                        const maxTentativas = 6 // 30 segundos no total (6 x 5s)
                                        
                                        const verificarDanfe = async () => {
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
                                              setTimeout(verificarDanfe, 5000) // Tentar novamente em 5 segundos
                                            } else {
                                              alert('O DANFE ainda não foi gerado após 30 segundos. Por favor, tente novamente mais tarde.')
                                            }
                                          } catch {
                                            if (tentativas < maxTentativas) {
                                              setTimeout(verificarDanfe, 5000)
                                            }
                                          }
                                        }
                                        
                                        setTimeout(verificarDanfe, 5000)
                                      }
                                    } else {
                                      // Outro erro
                                      const errorData = await response.json().catch(() => ({}))
                                      alert(errorData.error || 'Erro ao buscar DANFE. Tente novamente mais tarde.')
                                    }
                                  } catch (error) {
                                    // Erro de rede, tentar abrir mesmo assim
                                    console.error('Erro ao verificar DANFE:', error)
                                    window.open(url, '_blank')
                                  }
                                }}
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
    </div>
  )
}

