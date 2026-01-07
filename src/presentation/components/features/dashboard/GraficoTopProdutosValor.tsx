'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto';

interface GraficoTopProdutosValorProps {
  data: DashboardTopProduto[];
}

// Reutilizando o componente de tick personalizado para quebrar o texto do eixo Y
const CustomizedYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  const CHAR_PER_LINE = 25; // Número aproximado de caracteres por linha antes de quebrar

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + words[i].length + 1 <= CHAR_PER_LINE) {
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  return (
    <text x={x} y={y} textAnchor="end" fill="#666" fontSize={10}> {/* Explicitly set textAnchor */}
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : 12}> {/* dy ajusta o espaçamento vertical */}
          {line}
        </tspan>
      ))}
    </text>
  );
};

export function GraficoTopProdutosValor({ data }: GraficoTopProdutosValorProps) {
  const chartData = data.map(item => ({
    name: item.getProduto(),
    valorTotal: item.getValorTotal(),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: 50,
          bottom: 5,
        }}
        layout="vertical" // Adicionado para layout vertical
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickFormatter={formatCurrency}
          domain={[0, 'auto']}
        />
        <YAxis
          type="category"
          dataKey="name"
          interval={0}
          tick={CustomizedYAxisTick} // Usar o componente de tick personalizado
        />
        <Tooltip cursor={false} formatter={(value: any) => (value !== undefined ? formatCurrency(value) : '')} />
        <Bar dataKey="valorTotal" fill="var(--color-primary)" activeBar={{ fill: '#014991' }}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
