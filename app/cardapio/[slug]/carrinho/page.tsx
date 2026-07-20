'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { deliveryPublicoCarrinhoPath } from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

/**
 * Redirect legado: `/cardapio/{slug}/carrinho` → `/delivery/{slug}/carrinho`.
 */
export default function CardapioCarrinhoLegacyPage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params.slug as string)?.trim() ?? ''

  useEffect(() => {
    if (slug) {
      router.replace(deliveryPublicoCarrinhoPath(slug))
    }
  }, [slug, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400" />
    </div>
  )
}
