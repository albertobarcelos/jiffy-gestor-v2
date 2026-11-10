'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CarrinhoCompleto from '@/src/presentation/components/features/cardapio-mesa/CarrinhoCompleto'
import { sessaoValidaParaMesa } from '@/src/presentation/components/features/cardapio-mesa/mesaQrSession'

/**
 * Rota direta do carrinho: abre o painel lateral sobre a home da mesa.
 * O fluxo principal no catálogo/home já abre o painel sem navegar.
 */
export default function CarrinhoPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!sessaoValidaParaMesa(mesaId)) {
      router.replace('/cardapio-mesa/instrucoes')
      return
    }
    setReady(true)
  }, [mesaId, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}>
      <CarrinhoCompleto
        mesaId={mesaId}
        variant="panel"
        open
        onClose={() => router.replace(`/cardapio-mesa/mesa/${mesaId}`)}
        onContinueShopping={() => router.replace(`/cardapio-mesa/mesa/${mesaId}/cardapio`)}
        onAfterEnviar={() => router.replace(`/cardapio-mesa/mesa/${mesaId}`)}
      />
    </div>
  )
}
