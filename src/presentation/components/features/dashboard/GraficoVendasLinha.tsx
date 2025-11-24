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
  Area,
  AreaChart,
} from 'recharts'
import { BuscarEvolucaoVendasUseCase } from '@/src/application/use-cases/dashboard/BuscarEvolucaoVendasUseCase'
import { DashboardEvolucao } from '@/src/domain/entities/DashboardEvolucao'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

interface GraficoVendasLinhaProps {
  periodo?: string
}

/**
 * Gráfico de linha para evolução de vendas
 * Replica o design do Flutter
 */
export function GraficoVendasLinha({ periodo = 'mes' }: GraficoVendasLinhaProps) {
  const [data, setData] = useState<DashboardEvolucao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarEvolucaoVendasUseCase(new ApiClient())
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
    return `R$ ${Math.round(value).toLocaleString('pt-BR')}`
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
  const chartData = data.map((item, index) => ({
    index,
    valor: item.getValor(),
    label: item.getLabel(),
    data: item.getData().substring(5), // MM-DD
  }))

  const maxValor = Math.max(...chartData.map((d) => d.valor))
  const minValor = Math.min(...chartData.map((d) => d.valor))

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} />
          <XAxis
            dataKey="index"
            tickFormatter={(value) => {
              const item = chartData[value]
              return item ? item.data : ''
            }}
            tick={{ fontSize: '12px', fill: '#6B7280' }}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{ fontSize: '12px', fill: '#6B7280' }}
            tickMargin={10}
            domain={[minValor * 0.9, maxValor * 1.1]}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            labelFormatter={(label) => {
              const item = chartData[label as number]
              return item ? item.label : ''
            }}
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="#3B82F6"
            strokeWidth={2}
            fill="url(#colorVendas)"
            dot={{ fill: '#3B82F6', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

