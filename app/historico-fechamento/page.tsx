'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const HistoricoFechamento = dynamic(
  () => import('@/src/presentation/components/features/operacao-caixa/HistoricoFechamento').then((mod) => ({ default: mod.HistoricoFechamento })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function HistoricoFechamentoPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <HistoricoFechamento />
      </Suspense>
    </div>
  )
}

