'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BuscarEvolucaoVendasUseCase } from '@/src/application/use-cases/dashboard/BuscarEvolucaoVendasUseCase'
import { DashboardEvolucao } from '@/src/domain/entities/DashboardEvolucao'

interface GraficoVendasLinhaProps {
  periodo: string;
  selectedStatuses: string[];
  periodoInicial?: Date | null;
  periodoFinal?: Date | null;
  intervaloHora?: number; // Intervalo em minutos (15, 30 ou 60)
}

/**
 * Gráfico de coluna para evolução de vendas
 */
export function GraficoVendasLinha({ periodo, selectedStatuses, periodoInicial, periodoFinal, intervaloHora = 30 }: GraficoVendasLinhaProps) {
  const [data, setData] = useState<DashboardEvolucao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarEvolucaoVendasUseCase()
        const mappedPeriodo = mapPeriodoToUseCaseFormat(periodo);
        // Se período for "Datas Personalizadas", usa as datas fornecidas
        const useCustomDates = periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal;
        const evolucao = await useCase.execute(
          mappedPeriodo, 
          selectedStatuses, 
          useCustomDates ? periodoInicial : undefined, 
          useCustomDates ? periodoFinal : undefined,
          useCustomDates ? intervaloHora : undefined
        )
        setData(evolucao)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo, selectedStatuses, periodoInicial, periodoFinal, intervaloHora])

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Nenhum dado disponível</p>
      </div>
    )
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    data: item.getData(),
    label: item.getLabel(),
    valorFinalizadas: item.getValorFinalizadas(),
    valorCanceladas: item.getValorCanceladas(),
  }))

  // Calcula min/max apenas para os valores que serão exibidos
  let currentMax = 0;
  let currentMin = 0;

  if (selectedStatuses.includes('FINALIZADA')) {
    currentMax = Math.max(currentMax, ...chartData.map(d => d.valorFinalizadas));
    currentMin = Math.min(currentMin, ...chartData.map(d => d.valorFinalizadas));
  }
  if (selectedStatuses.includes('CANCELADA')) {
    currentMax = Math.max(currentMax, ...chartData.map(d => d.valorCanceladas));
    currentMin = Math.min(currentMin, ...chartData.map(d => d.valorCanceladas));
  }

  // Ajusta o domínio para incluir zero se todos os valores forem positivos
  const finalMinDomain = currentMin < 0 ? currentMin * 1.1 : 0; // Se houver valores negativos, ajusta para baixo
  const finalMaxDomain = currentMax * 1.1;

  return (
    <div className="w-full min-w-0" style={{ height: '300px' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{
          top: 5, right: 30, left: 30, bottom: 5, // Aumenta a margem esquerda para o eixo Y
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: '12px', fill: '#6B7280' }}
            height={40}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: '12px', fill: '#6B7280' }}
            tickMargin={10}
            width={100} // Aumenta a largura do eixo Y
            domain={[finalMinDomain, finalMaxDomain]}
          />
          <Tooltip
            cursor={false} // Remove o background cinza do hover
            formatter={(value: any, name?: any) => {
              if (typeof value === 'number') {
                return [formatCurrency(value), name];
              }
              return '';
            }}
            labelFormatter={(label) => {
              // Detecta se o label contém hora (formato "DD/MM HH:00")
              const hasHour = /^\d{2}\/\d{2} \d{2}:\d{2}$/.test(label);
              return hasHour ? `Hora: ${label}` : `Dia: ${label}`;
            }}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #3B82F6',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          {selectedStatuses.includes('FINALIZADA') && (
            <Line
              type="monotone"
              dataKey="valorFinalizadas"
              name="Finalizadas"
              stroke="var(--color-primary)"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          )}
          {selectedStatuses.includes('CANCELADA') && (
            <Line
              type="monotone"
              dataKey="valorCanceladas"
              name="Canceladas"
              stroke="#EF4444"
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
