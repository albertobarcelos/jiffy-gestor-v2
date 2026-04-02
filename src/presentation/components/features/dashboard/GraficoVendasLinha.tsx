'use client'

import { useMemo } from 'react'
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
import { calculatePeriodo } from '@/src/shared/utils/dateFilters'
import { useDashboardEvolucaoQuery } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

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
  const { inicio, fim } = useMemo(() => {
    if (periodoInicial && periodoFinal) {
      return { inicio: periodoInicial, fim: periodoFinal }
    }
    if (periodo === 'Todos') {
      return { inicio: null, fim: null }
    }
    const { inicio: calcInicio, fim: calcFim } = calculatePeriodo(periodo)
    return { inicio: calcInicio, fim: calcFim }
  }, [periodo, periodoInicial, periodoFinal])

  // Intervalo por hora: hoje ou intervalo escolhido em "Por datas"
  const useIntervaloHora =
    periodo === 'Hoje' || (!!(periodoInicial && periodoFinal))
  const { data, isLoading, error, refetch } = useDashboardEvolucaoQuery({
    periodoInicial: inicio,
    periodoFinal: fim,
    selectedStatuses,
    intervaloHora: useIntervaloHora ? intervaloHora : undefined,
  })

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (isLoading) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Erro ao carregar dados'}</p>
          <button
            onClick={() => void refetch()}
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
      <div className="h-full min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Nenhum dado disponível</p>
      </div>
    )
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    data: item.data,
    label: item.label,
    valorFinalizadas: item.valorFinalizadas,
    valorCanceladas: item.valorCanceladas,
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
    <div className="w-full min-w-0 h-full" style={{ minHeight: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{
          top: 5, right: 10, left: -25, bottom: 5, // Aumenta a margem esquerda para o eixo Y
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: '10px', fill: '#6B7280' }}
            height={40}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: '10px', fill: '#6B7280' }}
            tickMargin={4}
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
