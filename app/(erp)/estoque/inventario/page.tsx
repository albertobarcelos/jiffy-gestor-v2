'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const InventarioEstoque = dynamic(
  () => import('@/src/presentation/components/features/estoque/InventarioEstoque').then((mod) => ({ default: mod.InventarioEstoque })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function InventarioEstoquePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <InventarioEstoque />
      </Suspense>
    </div>
  )
}

