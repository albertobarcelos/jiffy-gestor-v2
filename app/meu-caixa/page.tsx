'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const MeuCaixaView = dynamic(
  () => import('@/src/presentation/components/features/meu-caixa/MeuCaixaView').then((mod) => ({ default: mod.MeuCaixaView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function MeuCaixaPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <MeuCaixaView />
      </Suspense>
    </div>
  )
}

