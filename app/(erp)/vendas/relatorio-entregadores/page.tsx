'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const RelatorioEntregadoresList = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/relatorio-entregadores/RelatorioEntregadoresList'
    ).then(mod => ({
      default: mod.RelatorioEntregadoresList,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function RelatorioEntregadoresPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <RelatorioEntregadoresList />
      </Suspense>
    </div>
  )
}
