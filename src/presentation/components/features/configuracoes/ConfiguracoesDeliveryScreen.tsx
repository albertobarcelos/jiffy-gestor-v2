'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import type { DeliveryEtapaId } from '@/src/shared/constants/configuracoesRoutes'

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

export function ConfiguracoesDeliveryScreen({
  etapaId = null,
}: {
  etapaId?: DeliveryEtapaId | null
}) {
  return (
    <div className="h-full">
      <Suspense fallback={<PageLoading />}>
        <ConfiguracoesView activeTab="empresa-delivery" deliveryEtapaId={etapaId} />
      </Suspense>
    </div>
  )
}
