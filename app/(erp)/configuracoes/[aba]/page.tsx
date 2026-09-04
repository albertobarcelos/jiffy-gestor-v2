'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter } from 'next/navigation'
import { Suspense, use, useEffect } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import {
  configuracoesTabPath,
  deliveryHubEtapaPath,
  isConfiguracoesTabSlug,
  resolveConfiguracoesTabFromPath,
} from '@/src/shared/constants/configuracoesRoutes'
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
  const router = useRouter()
  const { aba } = use(params)
  const legacyTab = resolveConfiguracoesTabFromPath(aba)
  const isValidTab = isConfiguracoesTabSlug(aba)

  useEffect(() => {
    if (aba === 'cobertura-delivery') {
      router.replace(deliveryHubEtapaPath('delivery-cobertura'))
      return
    }
    if (!isValidTab && legacyTab) {
      router.replace(configuracoesTabPath(legacyTab))
    }
  }, [aba, isValidTab, legacyTab, router])

  if (!isValidTab) {
    if (legacyTab || aba === 'cobertura-delivery') {
      return (
        <div className="h-full">
          <PageLoading />
        </div>
      )
    }
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
