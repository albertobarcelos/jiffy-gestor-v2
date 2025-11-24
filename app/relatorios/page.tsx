'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const RelatoriosView = dynamic(
  () => import('@/src/presentation/components/features/relatorios/RelatoriosView').then((mod) => ({ default: mod.RelatoriosView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function RelatoriosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <RelatoriosView />
      </Suspense>
    </div>
  )
}

