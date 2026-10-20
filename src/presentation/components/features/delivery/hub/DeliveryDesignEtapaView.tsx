'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'

const DeliveryDesignCustomizerScreen = dynamic(
  () =>
    import(
      '@/src/presentation/components/features/delivery-publico/admin/screens/DeliveryDesignCustomizerScreen'
    ).then(m => ({ default: m.DeliveryDesignCustomizerScreen })),
  { ssr: false, loading: () => <PageLoading /> }
)

/** Etapa Design aberta via hub Delivery (Personalizar loja). */
export function DeliveryDesignEtapaView() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense fallback={<PageLoading />}>
        <DeliveryDesignCustomizerScreen />
      </Suspense>
    </div>
  )
}
