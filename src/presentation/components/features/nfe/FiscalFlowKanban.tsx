'use client'

import { useState } from 'react'
import { NFe } from '@/src/domain/entities/NFe'
import { useNfes } from '@/src/presentation/hooks/useNfes'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdReceipt, MdAdd, MdVisibility, MdSchedule, MdRefresh, MdCheckCircle, MdError, MdCancel, MdMoreVert } from 'react-icons/md'

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

interface FiscalDocumentCard {
  id: string
  nfe: NFe
  priority: Priority
  assignee?: string
}

/**
 * Componente Kanban para gerenciamento de documentos fiscais
 * Baseado no modelo de Kanban moderno e limpo
 */
export function FiscalFlowKanban() {
  const { data: nfes, isLoading, refetch } = useNfes()
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)

  // Configuração das colunas do Kanban
  const columns: KanbanColumn[] = [
    {
      id: 'PENDENTE',
      title: 'Pendente',
      color: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      borderColorClass: 'border-l-yellow-400',
      icon: <MdSchedule className="w-4 h-4 text-yellow-600" />,
      placeholder: 'Documentos aguardando processamento',
    },
    {
      id: 'EM_PROCESSAMENTO',
      title: 'Em Processamento',
      color: 'bg-blue-50',
      borderColor: 'border-blue-400',
      borderColorClass: 'border-l-blue-400',
      icon: <MdRefresh className="w-4 h-4 text-blue-600" />,
      placeholder: 'Documentos sendo processados',
    },
    {
      id: 'AUTORIZADA',
      title: 'Autorizada',
      color: 'bg-green-50',
      borderColor: 'border-green-400',
      borderColorClass: 'border-l-green-400',
      icon: <MdCheckCircle className="w-4 h-4 text-green-600" />,
      placeholder: 'Documentos autorizados',
    },
    {
      id: 'REJEITADA',
      title: 'Rejeitada',
      color: 'bg-red-50',
      borderColor: 'border-red-400',
      borderColorClass: 'border-l-red-400',
      icon: <MdError className="w-4 h-4 text-red-600" />,
      placeholder: 'Documentos rejeitados',
    },
    {
      id: 'CANCELADA',
      title: 'Cancelada',
      color: 'bg-gray-50',
      borderColor: 'border-gray-400',
      borderColorClass: 'border-l-gray-400',
      icon: <MdCancel className="w-4 h-4 text-gray-600" />,
      placeholder: 'Documentos cancelados',
    },
  ]

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

  // Função para obter status em português
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'AUTORIZADA':
        return 'Faturado'
      case 'PENDENTE':
        return 'Pendente'
      case 'EM_PROCESSAMENTO':
        return 'Em Processamento'
      case 'REJEITADA':
        return 'Rejeitada'
      case 'CANCELADA':
        return 'Cancelada'
      default:
        return status
    }
  }

  // Função para obter número do pedido (usando ID ou número da NFe)
  const getPedidoNumber = (nfe: NFe): string => {
    // Se tiver número de pedido na observação ou usar o número da NFe
    return nfe.getNumero() || nfe.getId().slice(0, 8)
  }

  // Função para obter origem (mock por enquanto, depois virá da API)
  const getOrigem = (nfe: NFe): string => {
    // TODO: Buscar origem real da API
    return 'Omie' // Mock
  }

  // Função para obter método de pagamento (mock por enquanto)
  const getMetodoPagamento = (nfe: NFe): string => {
    // TODO: Buscar método de pagamento real da API
    return 'a vista' // Mock
  }

  // Função para gerar avatar do assignee
  const getAvatarInitials = (name?: string): string => {
    if (!name) return 'U'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const handleNewDocument = (columnId: string) => {
    setSelectedColumn(columnId)
    // TODO: Implementar modal de criação de novo documento
    console.log('Novo documento na coluna:', columnId)
  }

  const handleViewDetails = (nfe: NFe) => {
    // TODO: Implementar visualização de detalhes
    console.log('Ver detalhes da NFe:', nfe.getId())
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
        <div className="flex items-center justify-between">
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
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5">
              <MdAdd className="w-4 h-4" />
              Nova NFe
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4 pb-4 mb-[10px] min-h-0 scrollbar-thin">
        <div className="flex gap-3 min-w-max h-full">
          {columns.map((column) => {
            const columnNfes = nfes?.[column.id as keyof typeof nfes] || []
            const count = columnNfes.length

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
                  {columnNfes.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-gray-500">{column.placeholder}</p>
                    </div>
                  ) : (
                    columnNfes.map((nfe: NFe) => {
                      const pedidoNumber = getPedidoNumber(nfe)
                      const statusLabel = getStatusLabel(nfe.getStatus())
                      const origem = getOrigem(nfe)
                      const metodoPagamento = getMetodoPagamento(nfe)
                      const valorFormatado = transformarParaReal(nfe.getValorTotal())

                      return (
                        <div
                          key={nfe.getId()}
                          className={`bg-white rounded border-l-2 ${column.borderColorClass} border-t border-r border-b border-gray-200 p-2.5 hover:shadow-sm transition-shadow cursor-pointer relative`}
                          onClick={() => handleViewDetails(nfe)}
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

                          {/* Pedido N° */}
                          <p className="text-xs text-gray-600 mb-0.5">Pedido N° {pedidoNumber}</p>

                          {/* Nome do Cliente em destaque */}
                          <p className="text-sm font-semibold text-gray-900 mb-0.5 uppercase truncate">
                            {nfe.getClienteNome()}
                          </p>

                          {/* Status */}
                          <p className="text-xs text-gray-600 mb-0.5">{statusLabel}</p>

                          {/* Nota Fiscal */}
                          <p className="text-xs text-gray-600 mb-1.5">
                            Nota Fiscal: {String(nfe.getNumero()).padStart(9, '0')}
                          </p>

                          {/* Valor com método de pagamento */}
                          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
                            <p className="text-xs text-gray-600">
                              <span className="text-sm font-semibold text-gray-900">
                                {valorFormatado}
                              </span>{' '}
                              {metodoPagamento}
                            </p>
                          </div>

                          {/* Origem */}
                          <p className="text-xs text-gray-500">Origem: {origem}</p>
                        </div>
                      )
                    })
                  )}

                  {/* New Ticket Button */}
                  <button
                    onClick={() => handleNewDocument(column.id)}
                    className="w-full mt-1.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MdAdd className="w-3.5 h-3.5" />
                    Novo documento
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

