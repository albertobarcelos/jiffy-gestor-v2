'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const VendasList = dynamic(
  () => import('@/src/presentation/components/features/vendas/VendasList').then((mod) => ({ default: mod.VendasList })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function VendasPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <VendasList />
      </Suspense>
    </div>
  )
}

