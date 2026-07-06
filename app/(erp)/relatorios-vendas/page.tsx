'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const VendasList = dynamic(
  () =>
    import('@/src/presentation/components/features/vendas/VendasList').then(mod => ({
      default: mod.VendasList,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

function RelatoriosVendasPageContent() {
  const searchParams = useSearchParams()
  const initialPeriodo = searchParams.get('periodo') || undefined
  const initialStatus = searchParams.get('status') || null

  return (
    <div className="h-full">
      <VendasList initialPeriodo={initialPeriodo} initialStatus={initialStatus} />
    </div>
  )
}

export default function RelatoriosVendasPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <RelatoriosVendasPageContent />
    </Suspense>
  )
}

