'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'
import { CanalMesaBootstrap } from '@/src/presentation/components/features/delivery-publico/public/components/CanalMesaBootstrap'

function MesaContent() {
  const params = useParams()
  const search = useSearchParams()
  const slug = (params.slug as string)?.trim() ?? ''
  const mesaId = (params.mesaId as string)?.trim() ?? ''
  const tablet = search.get('tablet') === '1'

  return (
    <CanalMesaBootstrap mesaId={mesaId} tablet={tablet}>
      <DeliveryPublicoHomeScreen slug={slug} />
    </CanalMesaBootstrap>
  )
}

/**
 * QR / tablet na mesa: mesmo cardápio da loja, canal `mesa`.
 * Path: `/{slug}/mesa/{mesaId}` — tablet: `?tablet=1`
 */
export default function CardapioMesaPage() {
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
      <MesaContent />
    </Suspense>
  )
}
