'use client'

import { useState, useEffect } from 'react'
import { MdAttachMoney, MdRestaurant } from 'react-icons/md'
import { BuscarVendasDashboardUseCase } from '@/src/application/use-cases/dashboard/BuscarVendasDashboardUseCase'
import { DashboardVendas } from '@/src/domain/entities/DashboardVendas'
import { ModalMetodosPagamento } from './ModalMetodosPagamento'

interface MetricCardsProps {
  periodo: string;
}

/**
 * Cards de métricas do dashboard
 * Design clean e minimalista com cantos arredondados
 */
export function MetricCards({ periodo }: MetricCardsProps) {
  const [data, setData] = useState<DashboardVendas | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarVendasDashboardUseCase()
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
        {/* Total Faturado */}
        <MetricCard
          title="Total Faturado"
          value={formatCurrency(data?.getTotalFaturado())}
          icon={<MdAttachMoney size={20} />}
          bgColorClass="bg-accent1"
          iconColorClass="text-info"
          isPositive={true}
          onClick={() => setIsModalOpen(true)}
        />

        {/* Vendas Finalizadas */}
        <MetricCard
          title="Vendas Finalizadas"
          value={formatNumber(data?.getCountVendasEfetivadas())}
          icon={<span>🛒</span>}
          bgColorClass="bg-alternate"
          iconColorClass="text-info"
          isPositive={true}
        />

        {/* Vendas Canceladas */}
        <MetricCard
          title="Vendas Canceladas"
          value={formatNumber(data?.getCountVendasCanceladas())}
          icon={<span>✕</span>}
          bgColorClass="bg-error"
          iconColorClass="text-info"
          isPositive={false}
        />

        {/* Produtos Vendidos */}
        <MetricCard
          title="Produtos Vendidos"
          value={formatNumber(data?.getCountProdutosVendidos())}
          icon={<MdRestaurant size={20} />}
          bgColorClass="bg-warning"
          iconColorClass="text-info"
          isPositive={true}
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
  title: string;
  value: string;
  isPositive: boolean;
  icon: React.ReactNode;
  bgColorClass: string; // Adicionado para cor de fundo do ícone
  iconColorClass: string; // Adicionado para cor do ícone
  onClick?: () => void;
}

function MetricCard({
  title,
  value,
  isPositive,
  icon,
  bgColorClass,
  iconColorClass,
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={`
        bg-white flex items-center justify-between rounded-lg border border-gray-200 p-2
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex flex-col items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`w-12 h-12 rounded-full ${bgColorClass} flex items-center justify-center flex-shrink-0`}>
          <span className={`${iconColorClass} text-xl`}>{icon}</span>
      </div>
    </div>
  );
}
