'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
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
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, value = 0 } = props;
    const radiusFactor = isMobile ? 0.83 : 1.2
    const radius = Number(outerRadius) * radiusFactor;
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#000"
        fontSize={10}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {`${value} Qtde`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
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
        <Legend
          wrapperStyle={{
            paddingTop: '20px',
          }}
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          formatter={(value, entry) => (
            <span style={{ color: '#666', fontSize: '10px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

