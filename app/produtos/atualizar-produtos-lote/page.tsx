'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const AtualizarPrecoLote = dynamic(
  () =>
    import('@/src/presentation/components/features/produtos/AtualizarProdutosLote').then(mod => ({
      default: mod.AtualizarPrecoLote,
    })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function AtualizarProdutosLotePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AtualizarPrecoLote />
    </Suspense>
  )
}
