'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

interface GraficoTopProdutosProps {
  data: DashboardTopProduto[];
}


export function GraficoTopProdutos({ data }: GraficoTopProdutosProps) {
  const [isMobile, setIsMobile] = useState(false)

  const chartData = data.map(item => ({
    name: item.getProduto(),
    value: item.getQuantidade(),
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#83a6ed'];
  const RADIAN = Math.PI / 180;

  // Breakpoint simples para ajustar a posição das labels
  useEffect(() => {
    const updateViewport = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // Label customizada para aproximar os valores do gráfico
  const renderLabel = (props: PieLabelRenderProps) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, value = 0, index = 0, payload } = props;
    const radiusFactor = isMobile ? 0.83 : 1.2
    const radius = Number(outerRadius) * radiusFactor;
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);
    const sliceColor = isMobile
      ? '#000'
      : (payload && (payload.fill as string)) || COLORS[index % COLORS.length];

    return (
      <text
        x={x}
        y={y}
        fill={sliceColor}
        fontSize={10}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {`${value} Qtde`}
      </text>
    );
  };

  const chartHeight = 340

  return (
    <div className="w-full min-w-0">
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              fontSize={10}
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda em grid 2 colunas (fora do SVG, igual ao modal de métodos de pagamento) */}
      {chartData.length > 0 && (
        <div className="mt-3 w-full border border-gray-200 p-2">
          <h3
            id="grafico-top-produtos-legenda-titulo"
            className="mb-2 font-exo text-sm font-semibold text-primary-text"
          >
            Legenda
          </h3>
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-2 text-left"
            role="list"
            aria-labelledby="grafico-top-produtos-legenda-titulo"
          >
            {chartData.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="flex min-w-0 items-start gap-2"
                role="listitem"
              >
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden
                />
                <span className="break-words font-nunito text-[11px] leading-snug text-primary-text sm:text-xs">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

