'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Entrada do cardápio público — redireciona para instruções.
 * O acesso válido é via /cardapio/{slug} compartilhado pela loja.
 */
export default function CardapioPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/cardapio/instrucoes')
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
