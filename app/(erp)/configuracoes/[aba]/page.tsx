'use client'

import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'
import { Suspense, use } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { isConfiguracoesTabSlug } from '@/src/shared/constants/configuracoesRoutes'
import type { ConfiguracoesTabSlug } from '@/src/shared/constants/configuracoesRoutes'

const ConfiguracoesView = dynamic(
  () =>
    import('@/src/presentation/components/features/configuracoes/ConfiguracoesView').then(
      mod => ({ default: mod.ConfiguracoesView })
    ),
  {
    ssr: false,
    loading: () => <PageLoading />,
  }
)

export default function ConfiguracoesTabPage({
  params,
}: {
  params: Promise<{ aba: string }>
}) {
  const { aba } = use(params)

  if (!isConfiguracoesTabSlug(aba)) {
    notFound()
  }

  const activeTab = aba as ConfiguracoesTabSlug

  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConfiguracoesView activeTab={activeTab} />
      </Suspense>
    </div>
  )
}
