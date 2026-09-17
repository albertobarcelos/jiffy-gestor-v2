'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useGestaoPath } from '@/src/presentation/hooks/useGestaoPath'
import { DELIVERY_HUB_PATH } from './deliveryHubEtapas'

/**
 * Rota legada `/config/delivery/loja` — redireciona ao hub único.
 */
export function DeliveryLojaConfigLobbyView() {
  const router = useRouter()
  const { toGestao } = useGestaoPath()

  useEffect(() => {
    router.replace(toGestao(DELIVERY_HUB_PATH))
  }, [router, toGestao])

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <JiffyLoading />
    </div>
  )
}
