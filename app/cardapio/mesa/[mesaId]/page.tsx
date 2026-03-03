'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import CardapioHomeScreen from '@/src/presentation/components/features/cardapio-digital/CardapioHomeScreen'

/**
 * Página principal do cardápio da mesa
 * Exibe tela inicial com botões principais
 */
export default function MesaCardapioPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [isValid, setIsValid] = useState(false)

  useEffect(() => {
    // Verificar se há sessão válida
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (!sessionToken || storedMesaId !== mesaId) {
      // Redirecionar para instruções se não houver sessão válida
      router.push('/cardapio/instrucoes')
      return
    }

    setIsValid(true)
  }, [mesaId, router])

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <CardapioHomeScreen mesaId={mesaId} />
}
