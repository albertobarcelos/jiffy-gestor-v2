'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const ConfiguracoesView = dynamic(
  () => import('@/src/presentation/components/features/configuracoes/ConfiguracoesView').then((mod) => ({ default: mod.ConfiguracoesView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function ConfiguracoesPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConfiguracoesView />
      </Suspense>
    </div>
  )
}

