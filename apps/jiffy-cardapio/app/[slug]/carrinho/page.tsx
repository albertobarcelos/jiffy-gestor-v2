'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { DeliveryPublicoHomeScreen } from '@/src/presentation/components/features/delivery-publico/public/screens/DeliveryPublicoHomeScreen'

function DeliveryPublicoCarrinhoPageContent() {
  const params = useParams()
  const slug = (params.slug as string)?.trim() ?? ''

  return <DeliveryPublicoHomeScreen slug={slug} carrinhoInicialAberto />
}

export default function CardapioCarrinhoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: 'var(--delivery-primary, #333)' }}
          />
        </div>
      }
    >
      <DeliveryPublicoCarrinhoPageContent />
    </Suspense>
  )
}
