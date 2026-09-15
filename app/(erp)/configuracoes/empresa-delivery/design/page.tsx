'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/src/presentation/components/ui/PageLoading'
import { deliveryHubEtapaPath } from '@/src/shared/constants/configuracoesRoutes'

/** Rota legada → hub Delivery abrindo a etapa Design. */
export default function EmpresaDeliveryDesignPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(deliveryHubEtapaPath('delivery-design'))
  }, [router])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PageLoading />
    </div>
  )
}
