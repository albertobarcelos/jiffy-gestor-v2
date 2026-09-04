'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'
import { CanalComandaBootstrap } from '@/src/presentation/components/features/delivery-publico/public/components/CanalComandaBootstrap'

function ComandaContent() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''
  const codigo = (params.codigo as string)?.trim() ?? ''

  return (
    <CanalComandaBootstrap codigo={codigo}>
      <DeliveryPublicoHomeScreen slug={slug} />
    </CanalComandaBootstrap>
  )
}

/**
 * Comanda: mesmo cardápio, canal `comanda`.
 * Path: `/{slug}/comanda/{codigo}`
 */
export default function CardapioComandaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div
            className="h-12 w-12 animate-spin rounded-full border-b-2"
            style={{ borderColor: 'var(--delivery-primary, #333)' }}
          />
        </div>
      }
    >
      <ComandaContent />
    </Suspense>
  )
}
