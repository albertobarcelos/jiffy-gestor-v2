'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState } from 'react'
import { Skeleton, FormControl, Select, MenuItem } from '@mui/material'

// Função para obter o label do período
const getPeriodoLabel = (periodo: string): string => {
  switch (periodo) {
    case 'todos':
      return 'Todos os Períodos';
    case 'hoje':
      return 'Hoje';
    case 'mes':
      return 'Mês Atual';
    case 'semana':
      return 'Últimos 7 Dias';
    case '30dias':
      return 'Últimos 30 Dias';
    case '60dias':
      return 'Últimos 60 Dias';
    case '90dias':
      return 'Últimos 90 Dias';
    default:
      return 'Período Desconhecido';
  }
};

// Dynamic imports para code-splitting
const MetricCards = dynamic(
  () => import('@/src/presentation/components/features/dashboard/MetricCards').then((mod) => ({ default: mod.MetricCards })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
        ))}
      </div>
    ),
  }
)

const GraficoVendasLinha = dynamic(
  () => import('@/src/presentation/components/features/dashboard/GraficoVendasLinha').then((mod) => ({ default: mod.GraficoVendasLinha })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={300} />,
  }
)

const TabelaTopProdutos = dynamic(
  () => import('@/src/presentation/components/features/dashboard/TabelaTopProdutos').then((mod) => ({ default: mod.TabelaTopProdutos })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={400} />,
  }
)

const UltimasVendas = dynamic(
  () => import('@/src/presentation/components/features/dashboard/UltimasVendas').then((mod) => ({ default: mod.UltimasVendas })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={600} className="rounded-xl" />,
  }
)

/**
 * Página do dashboard
 * Otimizada com code-splitting e Suspense
 */
export default function DashboardPage() {
  const [periodo, setPeriodo] = useState('hoje'); // Estado para o período

  return (
    <div className="space-y-2">
      {/* Barra de seleção de período */}
      <div className="flex items-center justify-start gap-2 mt-2">
        <span className="text-primary text-sm font-exo">Período:</span>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            sx={{
              height: '20px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--color-primary)',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              },
            }}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="hoje">Hoje</MenuItem>
            <MenuItem value="mes">Mês Atual</MenuItem>
            <MenuItem value="semana">Últimos 7 Dias</MenuItem>
            <MenuItem value="30dias">Últimos 30 Dias</MenuItem>
            <MenuItem value="60dias">Últimos 60 Dias</MenuItem>
            <MenuItem value="90dias">Últimos 90 Dias</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Cards de métricas */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
          ))}
        </div>
      }>
        <MetricCards periodo={periodo} />
      </Suspense>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - 2 colunas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico de evolução */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Evolução de Vendas</h3>
              <p className="text-sm text-gray-500">{getPeriodoLabel(periodo)}</p>
            </div>
            <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
              <GraficoVendasLinha periodo={periodo} />
            </Suspense>
          </div>

          {/* Tabela de top produtos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Produtos</h3>
              <p className="text-sm text-gray-500">Mais vendidos</p>
            </div>
            <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
              <TabelaTopProdutos periodo={periodo} />
            </Suspense>
          </div>
        </div>

        {/* Coluna direita - Últimas Vendas */}
        <div className="lg:col-span-1">
          <Suspense fallback={<Skeleton variant="rectangular" height={600} className="rounded-xl" />}>
            <UltimasVendas />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
