'use client'

import dynamic from 'next/dynamic'
import { notFound, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, use, useEffect } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import {
  configuracoesTabPath,
  DELIVERY_HUB_PATH,
  deliveryHubEtapaPath,
  isConfiguracoesTabSlug,
  isDeliveryEtapaId,
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
  const searchParams = useSearchParams()
  const { toGestao } = useGestaoPath()
  const { aba } = use(params)
  const legacyTab = resolveConfiguracoesTabFromPath(aba)
  const isValidTab = isConfiguracoesTabSlug(aba)
  const abrir = searchParams.get('abrir')

  useEffect(() => {
    if (aba === 'cobertura-delivery' || (abrir && isDeliveryEtapaId(abrir))) {
      router.replace(toGestao(deliveryHubEtapaPath('delivery-cobertura')))
      return
    }
    if (aba === 'empresa-delivery') {
      router.replace(toGestao(DELIVERY_HUB_PATH))
      return
    }
    if (!isValidTab && legacyTab) {
      router.replace(toGestao(configuracoesTabPath(legacyTab)))
    }
  }, [aba, abrir, isValidTab, legacyTab, router, toGestao])

  if (aba === 'empresa-delivery' || aba === 'cobertura-delivery') {
    return (
      <div className="h-full">
        <PageLoading />
      </div>
    )
  }

  if (!isValidTab) {
    if (legacyTab) {
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
