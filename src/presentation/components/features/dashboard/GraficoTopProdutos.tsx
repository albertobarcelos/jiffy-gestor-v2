'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto';

interface GraficoTopProdutosProps {
  data: DashboardTopProduto[];
}


export function GraficoTopProdutos({ data }: GraficoTopProdutosProps) {
  const chartData = data.map(item => ({
    name: item.getProduto(),
    value: item.getQuantidade(),
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#83a6ed'];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
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
            <span style={{ color: '#666', fontSize: '12px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

