'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deliveryPublicoInstrucoesPath } from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

/**
 * Entrada do delivery público — redireciona para instruções.
 * O acesso válido é via /delivery/{slug} compartilhado pela loja.
 */
export default function DeliveryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(deliveryPublicoInstrucoesPath())
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2"
        style={{ borderColor: 'var(--delivery-primary, #333)' }}
      />
    </div>
  )
}
