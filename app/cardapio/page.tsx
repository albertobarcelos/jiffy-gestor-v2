'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Página inicial do cardápio
 * Redireciona para validação de QR Code ou tela inicial
 */
export default function CardapioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    // Se há token na URL, redireciona para validação
    if (token) {
      router.push(`/cardapio/qr/${token}`)
      return
    }

    // Se não há token, verifica se há sessão ativa
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const mesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (sessionToken && mesaId) {
      // Redireciona para cardápio da mesa
      router.push(`/cardapio/mesa/${mesaId}`)
    } else {
      // Mostra tela de erro ou instruções
      // Por enquanto, redireciona para uma página de instruções
      router.push('/cardapio/instrucoes')
    }
  }, [token, router])

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando cardápio...</p>
      </div>
    </div>
  )
}
