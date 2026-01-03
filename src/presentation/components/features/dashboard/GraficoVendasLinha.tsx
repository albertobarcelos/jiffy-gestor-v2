'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
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
}

/**
 * Gráfico de coluna para evolução de vendas
 */
export function GraficoVendasLinha({ periodo }: GraficoVendasLinhaProps) {
  const [data, setData] = useState<DashboardEvolucao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarEvolucaoVendasUseCase()
        const evolucao = await useCase.execute(periodo)
        setData(evolucao)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo])

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

  const maxValorFinalizadas = Math.max(...chartData.map((d) => d.valorFinalizadas))
  const maxValorCanceladas = Math.max(...chartData.map((d) => d.valorCanceladas))
  const maxValor = Math.max(maxValorFinalizadas, maxValorCanceladas);
  const minValor = Math.min(
    Math.min(...chartData.map((d) => d.valorFinalizadas)),
    Math.min(...chartData.map((d) => d.valorCanceladas))
  );

  return (
    <div className="w-full min-w-0" style={{ height: '300px' }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{
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
            domain={[minValor * 0.9, maxValor * 1.1]}
          />
          <Tooltip
            formatter={(value: number | undefined, name?: string) => {
              if (typeof value === 'number') {
                return [formatCurrency(value), name];
              }
              return '';
            }}
            labelFormatter={(label) => {
              return `Dia: ${label}`;
            }}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          <Bar
            dataKey="valorFinalizadas"
            name="Finalizadas"
            fill="#3B82F6"
            barSize={20} // Largura da barra
          />
          <Bar
            dataKey="valorCanceladas"
            name="Canceladas"
            fill="#EF4444"
            barSize={20} // Largura da barra
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
