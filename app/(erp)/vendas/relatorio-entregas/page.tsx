'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const RelatorioEntregasList = dynamic(
  () =>
    import('@/src/presentation/components/features/relatorios/RelatorioEntregasList').then(mod => ({
      default: mod.RelatorioEntregasList,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function RelatorioEntregasPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <RelatorioEntregasList />
      </Suspense>
    </div>
  )
}
