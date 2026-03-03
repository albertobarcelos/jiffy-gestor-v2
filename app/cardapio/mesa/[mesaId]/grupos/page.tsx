'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import GruposProdutosGrid from '@/src/presentation/components/features/cardapio-digital/GruposProdutosGrid'
import CarrinhoResumo from '@/src/presentation/components/features/cardapio-digital/CarrinhoResumo'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdArrowBack } from 'react-icons/md'

/**
 * Página de visualização de grupos de produtos do cardápio
 */
export default function GruposPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const { auth } = useAuthStore()
  const [isValid, setIsValid] = useState(false)

  // Buscar grupos ativos para local
  const { data: gruposData, isLoading, error } = useGruposProdutos({
    ativo: true,
    limit: 100,
  })

  useEffect(() => {
    // Verificar sessão
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (!sessionToken || storedMesaId !== mesaId) {
      router.push('/cardapio/instrucoes')
      return
    }

    setIsValid(true)
  }, [mesaId, router])

  // Filtrar apenas grupos ativos para local e ordenar
  const grupos = gruposData
    ?.filter((g) => g.isAtivoLocal())
    .sort((a, b) => {
      const ordemA = a.getOrdem() ?? 999
      const ordemB = b.getOrdem() ?? 999
      if (ordemA !== ordemB) return ordemA - ordemB
      return a.getNome().localeCompare(b.getNome())
    }) || []

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdArrowBack className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cardápio</h1>
              <p className="text-sm text-gray-600">Escolha uma categoria</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800">Erro ao carregar grupos. Tente novamente.</p>
          </div>
        )}

        {!isLoading && !error && grupos.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800">Nenhum grupo disponível no momento.</p>
          </div>
        )}

        {!isLoading && !error && grupos.length > 0 && (
          <GruposProdutosGrid grupos={grupos} mesaId={mesaId} />
        )}
      </div>

      {/* Resumo Flutuante do Carrinho */}
      <CarrinhoResumo mesaId={mesaId} />
    </div>
  )
}
