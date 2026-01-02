'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton } from '@mui/material'

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
  return (
    <div className="space-y-2">
      {/* Cards de métricas */}
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={120} className="rounded-xl" />
          ))}
        </div>
      }>
        <MetricCards />
      </Suspense>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda - 2 colunas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gráfico de evolução */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Evolução de Vendas</h3>
              <p className="text-sm text-gray-500">Últimos três meses</p>
            </div>
            <Suspense fallback={<Skeleton variant="rectangular" height={300} />}>
              <GraficoVendasLinha periodo="mes" />
            </Suspense>
          </div>

          {/* Tabela de top produtos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Produtos</h3>
              <p className="text-sm text-gray-500">Mais vendidos</p>
            </div>
            <Suspense fallback={<Skeleton variant="rectangular" height={400} />}>
              <TabelaTopProdutos periodo="mes" />
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
