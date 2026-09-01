'use client'

import { useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { deliveryPublicoHomePath } from '@/src/presentation/components/features/delivery-publico/shared/utils/deliveryPublicoRoutes'

function CardapioSlugRedirectContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = (params.slug as string)?.trim() ?? ''

  useEffect(() => {
    if (!slug) return
    const query = searchParams.toString()
    const target = deliveryPublicoHomePath(slug)
    router.replace(query ? `${target}?${query}` : target)
  }, [slug, router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400" />
    </div>
  )
}

/**
 * Redirect legado: `/cardapio/{slug}` → `/delivery/{slug}` (preserva query).
 */
export default function CardapioSlugLegacyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400" />
        </div>
      }
    >
      <CardapioSlugRedirectContent />
    </Suspense>
  )
}
