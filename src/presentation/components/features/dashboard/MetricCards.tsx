'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // Importar useRouter
import { MdAttachMoney, MdRestaurant, MdShoppingCart } from 'react-icons/md'
import { BuscarVendasDashboardUseCase } from '@/src/application/use-cases/dashboard/BuscarVendasDashboardUseCase'
import { DashboardVendas } from '@/src/domain/entities/DashboardVendas'
import { ModalMetodosPagamento } from './ModalMetodosPagamento'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo

interface MetricCardsProps {
  periodo: string;
}

/**
 * Cards de métricas do dashboard
 * Design clean e minimalista com cantos arredondados
 */
export function MetricCards({ periodo }: MetricCardsProps) {
  const router = useRouter() // Obter instância do router
  const [dataTotal, setDataTotal] = useState<DashboardVendas | null>(null);
  const [dataFinalizadas, setDataFinalizadas] = useState<DashboardVendas | null>(null);
  const [dataCanceladas, setDataCanceladas] = useState<DashboardVendas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const useCase = new BuscarVendasDashboardUseCase();
        const mappedPeriodo = mapPeriodoToUseCaseFormat(periodo);
        const total = await useCase.execute(mappedPeriodo, ['FINALIZADA', 'CANCELADA']);
        const finalizadas = await useCase.execute(mappedPeriodo, ['FINALIZADA']);
        const canceladas = await useCase.execute(mappedPeriodo, ['CANCELADA']);
        
        setDataTotal(total);
        setDataFinalizadas(finalizadas);
        setDataCanceladas(canceladas);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [periodo]);

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
        <MetricCard className=" border hover:border-primary/50"
          title="Total Faturado"
          value={formatCurrency(dataTotal?.getTotalFaturado())}
          icon={<MdAttachMoney size={20} color="var(--color-primary)" />}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true}
          onClick={() => setIsModalOpen(true)}
        />

        {/* Vendas Finalizadas */}
        <MetricCard className=" border hover:border-primary/50"
          title="Vendas Finalizadas"
          value={formatNumber(dataFinalizadas?.getCountVendasEfetivadas())}
          icon={<span className="text-primary"><MdShoppingCart size={20} /></span>}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={true}
        />

        {/* Vendas Canceladas */}
        <MetricCard className=" border hover:border-primary/50"
          title="Vendas Canceladas"
          value={formatNumber(dataCanceladas?.getCountVendasCanceladas())}
          icon={<span className="text-primary">✕</span>}
          bgColorClass="bg-info border-2 border-primary"
          iconColorClass="text-info"
          isPositive={false}
          onClick={() => {
            router.push(`/relatorios?periodo=${periodo}&status=Cancelada`)
          }}
        />

        {/* Produtos Vendidos */}
        <MetricCard className=" border hover:border-primary/50"
          title="Produtos Vendidos"
          value={formatNumber(dataTotal?.getCountProdutosVendidos())}
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
        bg-white flex items-center justify-between rounded-lg p-2
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
        ${className || ''}
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
