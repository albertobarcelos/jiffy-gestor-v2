'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation' // Importar useRouter
import { MdAttachMoney, MdRestaurant, MdShoppingCart } from 'react-icons/md'
import { LuDoorOpen } from "react-icons/lu";
import { ModalMetodosPagamento } from './ModalMetodosPagamento'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo
import { useDashboardResumoQuery } from '@/src/presentation/hooks/useDashboardResumoQuery'

interface MetricCardsProps {
  periodo: string;
  periodoInicial?: Date | null;
  periodoFinal?: Date | null;
}

/**
 * Cards de métricas do dashboard
 * Design clean e minimalista com cantos arredondados
 */
export function MetricCards({ periodo, periodoInicial, periodoFinal }: MetricCardsProps) {
  const router = useRouter() // Obter instância do router
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para mapear o período do frontend para o formato esperado pelo caso de uso
  const mapPeriodoToUseCaseFormat = (frontendPeriodo: string): string => {
    switch (frontendPeriodo) {
      case 'Hoje': return 'hoje';
      case 'Últimos 7 Dias': return 'semana';
      case 'Mês Atual': return 'mes';
      case 'Últimos 30 Dias': return '30dias';
      case 'Últimos 60 Dias': return '60dias';
      case 'Últimos 90 Dias': return '90dias';
      case 'Todos': return 'todos'; // O caso de uso lida com 'todos' retornando datas vazias
      default: return 'todos'; // Valor padrão seguro
    }
  };

  /**
   * Calcula o período para as datas personalizadas ou usa a função calculatePeriodo.
   * `null` indica que não deve aplicar filtro de data ("Todos").
   */
  const getPeriodoDates = (): { inicio: Date | null; fim: Date | null } => {
    if (periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal) {
      return { inicio: periodoInicial, fim: periodoFinal }
    }
    
    if (periodo === 'Todos') {
      return { inicio: null, fim: null }
    }
    
    const mappedPeriodo = mapPeriodoToUseCaseFormat(periodo)
    const { inicio, fim } = calculatePeriodo(periodo)
    return { inicio, fim }
  }

  const { inicio, fim } = getPeriodoDates()
  const { data, isLoading, error, refetch } = useDashboardResumoQuery({
    periodoInicial: inicio,
    periodoFinal: fim,
  })

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-white rounded-lg border border-gray-200 animate-pulse"
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
          onClick={() => void refetch()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const metricas = data?.metricas

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
       
        {/* Total Faturado */}
        <MetricCard className=" border hover:border-primary/50"
          title="Total Faturado"
          value={formatCurrency(metricas?.total.totalFaturado)}
          icon={<MdAttachMoney size={20} color="var(--color-primary)" />}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true}
          onClick={() => setIsModalOpen(true)}
        />

        {/* Vendas Finalizadas */}
        <MetricCard className=" border hover:border-primary/50"
          title="Vendas Finalizadas"
          value={formatNumber(metricas?.finalizadas.countVendasEfetivadas)}
          icon={<span className="text-primary"><MdShoppingCart size={20} /></span>}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true}
          onClick={() => {
            router.push(`/relatorios?periodo=${periodo}&status=Finalizada`)
          }}
        />

         {/* Total Cancelado */}
         <MetricCard className=" border hover:border-error/50"
          title="Total Cancelado"
          value={formatCurrency(data?.totalCancelado)}
          icon={<MdAttachMoney size={20} color="var(--color-error)" />}
          bgColorClass="bg-error/15 border-2 border-error"
          iconColorClass="text-primary"
          isPositive={false}
          onClick={() => {
            router.push(`/relatorios?periodo=${periodo}&status=Cancelada`)
          }}
        />

        {/* Vendas Canceladas */}
        <MetricCard className=" border hover:border-error/50"
          title="Vendas Canceladas"
          value={formatNumber(metricas?.canceladas.countVendasCanceladas)}
          icon={<span className="text-error">✕</span>}
          bgColorClass="bg-error/15 border-2 border-error"
          iconColorClass="text-info"
          isPositive={false}
          onClick={() => {
            router.push(`/relatorios?periodo=${periodo}&status=Cancelada`)
          }}
        />

        {/* Vendas em Aberto */}
        <MetricCard className=" border hover:border-primary/50"
          title="Mesas Abertas"
          value={formatNumber(data?.mesasAbertas)}
          icon={<LuDoorOpen size={20} color="var(--color-primary)" />}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true} // Consideramos vendas em aberto como um ponto positivo para o fluxo
          onClick={() => {
            router.push('/vendas/abertas')
          }}
        />

        {/* Produtos Vendidos */}
        <MetricCard className=" border hover:border-primary/50"
          title="Produtos Vendidos"
          value={formatNumber(metricas?.total.countProdutosVendidos)}
          icon={<MdRestaurant size={20} color="var(--color-primary)"/>}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true}
        />
      </div>

      <ModalMetodosPagamento
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        periodo={periodo}
        periodoInicial={periodoInicial}
        periodoFinal={periodoFinal}
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
  className?: string; // Adicionado para permitir customização de classes CSS
}

function MetricCard({
  title,
  value,
  isPositive,
  icon,
  bgColorClass,
  iconColorClass,
  onClick,
  className,
}: MetricCardProps) {
  return (
    <div
      className={`
        bg-white flex items-center justify-between rounded-lg py-2 px-1
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className || ''}
      `}
      onClick={onClick}
    >
      <div className="flex flex-col items-start justify-between mb-2">
        <h3 className="md:text-sm text-xs font-medium text-gray-600">{title}</h3>
        <p className="md:text-xl text-sm font-bold text-gray-900">{value}</p>
      </div>
      <div className={`md:w-12 md:h-12 w-8 h-8 rounded-full ${bgColorClass} flex items-center justify-center flex-shrink-0`}>
          <span className={`${iconColorClass} md:text-xl text-sm`}>{icon}</span>
      </div>
    </div>
  );
}
