'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const FechamentosList = dynamic(
  () => import('@/src/presentation/components/features/meu-caixa/FechamentosList').then((mod) => ({ default: mod.FechamentosList })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function FechamentosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <FechamentosList />
      </Suspense>
    </div>
  )
}

