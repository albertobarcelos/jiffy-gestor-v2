'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CardapioMesaIndexPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/cardapio-mesa/instrucoes')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-b-2"
        style={{ borderColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
      />
    </div>
  )
}
