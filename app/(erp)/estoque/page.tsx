'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para carregar o componente apenas quando necessário
const EstoqueView = dynamic(
  () => import('@/src/presentation/components/features/estoque/EstoqueView').then((mod) => ({ default: mod.EstoqueView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function EstoquePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <EstoqueView />
      </Suspense>
    </div>
  )
}

