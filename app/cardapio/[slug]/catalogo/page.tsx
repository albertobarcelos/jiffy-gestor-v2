'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

/**
 * Rota legada — redireciona para a home pública do slug.
 */
export default function CardapioCatalogoRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params.slug as string)?.trim() ?? ''

  useEffect(() => {
    if (slug) {
      router.replace(`/cardapio/${encodeURIComponent(slug)}`)
      return
    }
    router.replace('/cardapio/instrucoes')
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
