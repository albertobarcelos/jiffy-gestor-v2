'use client'

import { useState, useEffect } from 'react'
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md'
import { BuscarVendasDashboardUseCase } from '@/src/application/use-cases/dashboard/BuscarVendasDashboardUseCase'
import { DashboardVendas } from '@/src/domain/entities/DashboardVendas'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { ModalMetodosPagamento } from './ModalMetodosPagamento'

/**
 * Cards de métricas do dashboard
 * Design clean e minimalista com cantos arredondados
 */
export function MetricCards() {
  const [data, setData] = useState<DashboardVendas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [periodo, setPeriodo] = useState('hoje')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarVendasDashboardUseCase(new ApiClient())
        const vendas = await useCase.execute(periodo)
        setData(vendas)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo])

  const formatCurrency = (value?: number) => {
    if (!value) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatNumber = (value?: number) => {
    if (!value) return '0'
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-32 flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200">
        <p className="text-red-600 mb-4">Erro ao carregar dados</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vendas Efetivadas */}
        <MetricCard
          title="Vendas Efetivadas"
          value={formatCurrency(data?.getTotalVendas())}
          variation={data?.getVariacaoPercentual()}
          variationLabel="vs mês anterior"
          isPositive={true}
          onClick={() => setIsModalOpen(true)}
        />

        {/* Ticket Médio */}
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(data?.getTicketMedio())}
          variation={data?.getVariacaoPercentual()}
          variationLabel="vs mês anterior"
          isPositive={true}
        />

        {/* Vendas Canceladas */}
        <MetricCard
          title="Vendas Canceladas"
          value={formatNumber(data?.getVendasCanceladas())}
          isPositive={false}
        />

        {/* Vendas Estornadas */}
        <MetricCard
          title="Vendas Estornadas"
          value={formatNumber(data?.getVendasEstornadas())}
          isPositive={false}
        />
      </div>

      <ModalMetodosPagamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        periodo={periodo}
      />
    </>
  )
}

interface MetricCardProps {
  title: string
  value: string
  variation?: number
  variationLabel?: string
  isPositive: boolean
  onClick?: () => void
}

function MetricCard({
  title,
  value,
  variation,
  variationLabel,
  isPositive,
  onClick,
}: MetricCardProps) {
  const variationValue = variation !== undefined ? variation : (isPositive ? 12 : -10)
  const variationAmount = isPositive ? '+$18K' : '-$10K'

  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 p-6
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {variation !== undefined && (
          <div
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
              ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
            `}
          >
            {isPositive ? (
              <MdTrendingUp className="w-3 h-3" />
            ) : (
              <MdTrendingDown className="w-3 h-3" />
            )}
            <span>{variationValue}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>

      {variationLabel && (
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {variationAmount}
          </span>
          <span className="text-xs text-gray-500">{variationLabel}</span>
        </div>
      )}
    </div>
  )
}
