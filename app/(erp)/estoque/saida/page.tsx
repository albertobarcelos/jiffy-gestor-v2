'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const SaidaEstoque = dynamic(
  () => import('@/src/presentation/components/features/estoque/SaidaEstoque').then((mod) => ({ default: mod.SaidaEstoque })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function SaidaEstoquePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <SaidaEstoque />
      </Suspense>
    </div>
  )
}

