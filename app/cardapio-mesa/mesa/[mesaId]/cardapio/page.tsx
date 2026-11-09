'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CardapioMesaCatalogScreen from '@/src/presentation/components/features/cardapio-mesa/CardapioMesaCatalogScreen'
import { sessaoValidaParaMesa } from '@/src/presentation/components/features/cardapio-mesa/mesaQrSession'

export default function CardapioMesaCatalogoPage() {
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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
      </div>
    )
  }

  return <CardapioMesaCatalogScreen mesaId={mesaId} />
}
