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
} from 'recharts'
import { BuscarVendasPorTerminalUseCase } from '@/src/application/use-cases/dashboard/BuscarVendasPorTerminalUseCase'
import { DashboardVendasTerminal } from '@/src/domain/entities/DashboardVendasTerminal'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

interface GraficoVendasTerminalProps {
  periodo?: string
}

/**
 * Gráfico de barras para vendas por terminal
 * Replica o design do Flutter
 */
export function GraficoVendasTerminal({ periodo = 'mes' }: GraficoVendasTerminalProps) {
  const [data, setData] = useState<DashboardVendasTerminal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarVendasPorTerminalUseCase(new ApiClient())
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

  const formatCurrency = (value: number) => {
    return `R$${Math.round(value).toLocaleString('pt-BR')}`
  }

  if (isLoading) {
    return (
      <div className="h-[300px] bg-info rounded-xl flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[300px] bg-info rounded-xl flex items-center justify-center">
        <div className="text-center">
          <p className="text-error mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-info rounded-lg hover:bg-primary/90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] bg-info rounded-xl flex items-center justify-center">
        <p className="text-secondary-text">Nenhum dado disponível</p>
      </div>
    )
  }

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    terminal: item.getTerminal(),
    valor: item.getValor(),
    quantidade: item.getQuantidade(),
  }))

  const maxValor = Math.max(...chartData.map((d) => d.valor))

  return (
    <div className="p-5 bg-info rounded-xl shadow-sm">
      <h3 className="text-lg font-exo font-semibold text-primary-text mb-4">
        Vendas por Terminal
      </h3>
      <div className="w-full min-w-0" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#530CA3" opacity={0.3} />
            <XAxis
              dataKey="terminal"
              tick={{ fontSize: '10px', fill: '#57636C' }}
              tickMargin={10}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: '10px', fill: '#57636C' }}
              tickMargin={10}
              domain={[0, maxValor * 1.2]}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #530CA3',
                borderRadius: '8px',
              }}
            />
            <Bar
              dataKey="valor"
              fill="#003366"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

