'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CardapioMesaHomeScreen from '@/src/presentation/components/features/cardapio-mesa/CardapioMesaHomeScreen'
import { sessaoValidaParaMesa } from '@/src/presentation/components/features/cardapio-mesa/mesaQrSession'

export default function CardapioMesaHomePage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    if (!sessaoValidaParaMesa(mesaId)) {
      router.push('/cardapio-mesa/instrucoes')
      return
    }
    setIsValid(true)
  }, [mesaId, router])

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-b-2"
          style={{ borderColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
        />
      </div>
    )
  }

  return <CardapioMesaHomeScreen mesaId={mesaId} />
}
