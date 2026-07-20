'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'

function DeliveryPublicoSlugContent() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''

  return <DeliveryPublicoHomeScreen slug={slug} />
}

export default function DeliveryPublicoSlugPage() {
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
      <DeliveryPublicoSlugContent />
    </Suspense>
  )
}
