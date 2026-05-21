'use client'

import dynamic from 'next/dynamic'
import { Suspense, use } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

// Dynamic import para code-splitting
const DetalhesCaixaView = dynamic(
  () => import('@/src/presentation/components/features/meu-caixa/DetalhesCaixaView').then((mod) => ({ default: mod.DetalhesCaixaView })),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

interface DetalhesCaixaPageProps {
  params: Promise<{ caixaRef: string }>
  searchParams: Promise<{ conferenciaCaixaRef?: string }>
}

export default function DetalhesCaixaPage({
  params,
  searchParams,
}: DetalhesCaixaPageProps) {
  // Usando React.use() para unwrap as promises no Client Component
  const { caixaRef } = use(params)
  const { conferenciaCaixaRef } = use(searchParams)

  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <DetalhesCaixaView
          caixaRef={caixaRef}
          conferenciaCaixaRef={conferenciaCaixaRef}
        />
      </Suspense>
    </div>
  )
}

