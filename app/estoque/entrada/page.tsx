'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const EntradaEstoque = dynamic(
  () => import('@/src/presentation/components/features/estoque/EntradaEstoque').then((mod) => ({ default: mod.EntradaEstoque })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function EntradaEstoquePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <EntradaEstoque />
      </Suspense>
    </div>
  )
}

