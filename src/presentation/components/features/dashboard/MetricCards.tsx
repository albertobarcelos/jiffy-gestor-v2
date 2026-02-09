'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation' // Importar useRouter
import { MdAttachMoney, MdRestaurant, MdShoppingCart } from 'react-icons/md'
import { LuDoorOpen } from "react-icons/lu";
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { BuscarVendasDashboardUseCase } from '@/src/application/use-cases/dashboard/BuscarVendasDashboardUseCase'
import { DashboardVendas } from '@/src/domain/entities/DashboardVendas'
import { ModalMetodosPagamento } from './ModalMetodosPagamento'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo

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
  const { auth } = useAuthStore()
  const [dataTotal, setDataTotal] = useState<DashboardVendas | null>(null);
  const [dataFinalizadas, setDataFinalizadas] = useState<DashboardVendas | null>(null);
  const [dataCanceladas, setDataCanceladas] = useState<DashboardVendas | null>(null);
  const [dataAbertas, setDataAbertas] = useState<DashboardVendas | null>(null);
  const [totalCancelado, setTotalCancelado] = useState<number>(0); // Estado para armazenar a soma das vendas canceladas
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

  /**
   * Calcula o período para as datas personalizadas ou usa a função calculatePeriodo
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

  /**
   * Busca todas as vendas canceladas e calcula a soma dos valores
   */
  const calcularTotalCancelado = useCallback(async (): Promise<number> => {
    const token = auth?.getAccessToken()
    if (!token) return 0

    try {
      const { inicio, fim } = getPeriodoDates()
      const baseParams = new URLSearchParams()
      
      // Adiciona filtro de status CANCELADA
      baseParams.append('status', 'CANCELADA')
      
      // Adiciona filtros de período se disponíveis
      if (inicio) {
        baseParams.append('periodoInicial', inicio.toISOString())
      }
      if (fim) {
        baseParams.append('periodoFinal', fim.toISOString())
      }

      let total = 0
      let currentPage = 0
      let totalPages = 1
      const pageSize = 100

      while (currentPage < totalPages) {
        const params = new URLSearchParams(baseParams.toString())
        params.append('limit', pageSize.toString())
        params.append('offset', (currentPage * pageSize).toString())

        const response = await fetch(`/api/vendas?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.error('Erro ao buscar vendas canceladas:', response.status)
          break
        }

        const data = await response.json()
        const items = data.items || []

        // Soma os valores de valorFinal de todas as vendas canceladas
        const somaPagina = items.reduce((acc: number, venda: any) => {
          const valorFinal = venda.valorFinal || venda.valorTotal || venda.valor || 0
          return acc + (typeof valorFinal === 'number' ? valorFinal : 0)
        }, 0)

        total += somaPagina

        // Calcula total de páginas na primeira requisição
        if (currentPage === 0) {
          if (data.totalPages) {
            totalPages = data.totalPages
          } else if (data.count && data.limit) {
            totalPages = Math.ceil(data.count / data.limit)
          } else if (items.length < pageSize) {
            totalPages = 1
          }
        }

        currentPage++
      }

      return total
    } catch (error) {
      console.error('Erro ao calcular total cancelado:', error)
      return 0
    }
  }, [auth, periodo, periodoInicial, periodoFinal])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const useCase = new BuscarVendasDashboardUseCase();
        const mappedPeriodo = mapPeriodoToUseCaseFormat(periodo);
        // Se período for "Datas Personalizadas", usa as datas fornecidas
        const useCustomDates = periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal;
        const total = await useCase.execute(mappedPeriodo, ['FINALIZADA', 'CANCELADA'], useCustomDates ? periodoInicial : undefined, useCustomDates ? periodoFinal : undefined);
        const finalizadas = await useCase.execute(mappedPeriodo, ['FINALIZADA'], useCustomDates ? periodoInicial : undefined, useCustomDates ? periodoFinal : undefined);
        const canceladas = await useCase.execute(mappedPeriodo, ['CANCELADA'], useCustomDates ? periodoInicial : undefined, useCustomDates ? periodoFinal : undefined);
        const abertas = await useCase.execute(mappedPeriodo, ['ABERTA'], useCustomDates ? periodoInicial : undefined, useCustomDates ? periodoFinal : undefined);
        
        setDataTotal(total);
        setDataFinalizadas(finalizadas);
        setDataCanceladas(canceladas);
        setDataAbertas(abertas);

        // Calcula o total cancelado somando os valores das vendas canceladas
        const totalCanceladoCalculado = await calcularTotalCancelado();
        setTotalCancelado(totalCanceladoCalculado);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [periodo, periodoInicial, periodoFinal, auth, calcularTotalCancelado]);

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
       
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
          onClick={() => {
            router.push(`/relatorios?periodo=${periodo}&status=Finalizada`)
          }}
        />

         {/* Total Cancelado */}
         <MetricCard className=" border hover:border-error/50"
          title="Total Cancelado"
          value={formatCurrency(totalCancelado)}
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
          value={formatNumber(dataCanceladas?.getCountVendasCanceladas())}
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
          title="Vendas em Aberto"
          value={formatNumber(dataAbertas?.getCountVendasEfetivadas())}
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
