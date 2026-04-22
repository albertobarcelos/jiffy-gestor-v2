'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const ComissoesList = dynamic(
  () =>
    import('@/src/presentation/components/features/comissoes/ComissoesList').then(mod => ({
      default: mod.ComissoesList,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function ComissoesPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ComissoesList />
      </Suspense>
    </div>
  )
}

