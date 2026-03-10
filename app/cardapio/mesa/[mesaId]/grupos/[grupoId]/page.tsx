'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdArrowBack } from 'react-icons/md'
import ProdutosList from '@/src/presentation/components/features/cardapio-digital/ProdutosList'
import CarrinhoResumo from '@/src/presentation/components/features/cardapio-digital/CarrinhoResumo'

/**
 * Página de produtos por grupo
 */
export default function ProdutosPorGrupoPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const grupoId = params.grupoId as string
  const { auth } = useAuthStore()
  const [isValid, setIsValid] = useState(false)
  const [grupoNome, setGrupoNome] = useState('')

  // Buscar produtos do grupo
  const { data: produtosData, isLoading, error } = useQuery({
    queryKey: ['cardapio-produtos-grupo', grupoId],
    queryFn: async () => {
      if (!grupoId || !auth?.getAccessToken()) {
        return { produtos: [], count: 0 }
      }

      const token = auth.getAccessToken()
      const response = await fetch(`/api/grupos-produtos/${grupoId}/produtos?limit=100&offset=0`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items.map((item: any) => Produto.fromJSON(item))

      // Filtrar apenas produtos ativos
      // Nota: isAtivoLocal não existe na entidade, mas os produtos já vêm filtrados pela API
      const produtosAtivos = produtos.filter((p: Produto) => p.isAtivo())

      return {
        produtos: produtosAtivos.sort((a: Produto, b: Produto) =>
          a.getNome().localeCompare(b.getNome())
        ),
        count: produtosAtivos.length,
      }
    },
    enabled: !!grupoId && !!auth?.getAccessToken(),
  })

  // Buscar informações do grupo para exibir nome
  useEffect(() => {
    const buscarGrupo = async () => {
      if (!grupoId || !auth?.getAccessToken()) return

      try {
        const token = auth.getAccessToken()
        const response = await fetch(`/api/grupos-produtos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setGrupoNome(data.nome || 'Produtos')
        }
      } catch (error) {
        console.error('Erro ao buscar grupo:', error)
      }
    }

    buscarGrupo()
  }, [grupoId, auth])

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (!sessionToken || storedMesaId !== mesaId) {
      router.push('/cardapio/instrucoes')
      return
    }

    setIsValid(true)
  }, [mesaId, router])

  const produtos = produtosData?.produtos || []

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
              onClick={() => router.push(`/cardapio/mesa/${mesaId}/cardapio`)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MdArrowBack className="w-6 h-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{grupoNome || 'Produtos'}</h1>
              <p className="text-sm text-gray-600">
                {produtos.length} {produtos.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
              </p>
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
            <p className="text-red-800">Erro ao carregar produtos. Tente novamente.</p>
          </div>
        )}

        {!isLoading && !error && produtos.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-800">Nenhum produto disponível neste grupo.</p>
          </div>
        )}

        {!isLoading && !error && produtos.length > 0 && (
          <ProdutosList produtos={produtos} mesaId={mesaId} />
        )}
      </div>

      {/* Resumo Flutuante do Carrinho */}
      <CarrinhoResumo mesaId={mesaId} />
    </div>
  )
}
