'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para carregar o componente apenas quando necessário
const EstoqueProdutosList = dynamic(
  () => import('@/src/presentation/components/features/estoque/EstoqueProdutosList').then((mod) => ({ default: mod.EstoqueProdutosList })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function EstoqueProdutosPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <EstoqueProdutosList />
      </Suspense>
    </div>
  )
}

