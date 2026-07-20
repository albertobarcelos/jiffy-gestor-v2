'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  deliveryPublicoHomePath,
  deliveryPublicoInstrucoesPath,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

/**
 * Rota legada — redireciona para a home pública do slug.
 */
export default function DeliveryCatalogoRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params.slug as string)?.trim() ?? ''

  useEffect(() => {
    if (slug) {
      router.replace(deliveryPublicoHomePath(slug))
      return
    }
    router.replace(deliveryPublicoInstrucoesPath())
  }, [slug, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2"
        style={{ borderColor: 'var(--delivery-primary, #333)' }}
      />
    </div>
  )
}
