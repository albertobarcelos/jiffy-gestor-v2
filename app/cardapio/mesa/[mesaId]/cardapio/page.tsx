'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdArrowBack, MdShoppingCart, MdRoomService, MdTableRestaurant } from 'react-icons/md'
import Image from 'next/image'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import ProdutoConfiguracaoModal from '@/src/presentation/components/features/cardapio-digital/ProdutoConfiguracaoModal'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import BannerDestaques from '@/src/presentation/components/features/cardapio-digital/BannerDestaques'
import CarrosselProdutosDestaque from '@/src/presentation/components/features/cardapio-digital/CarrosselProdutosDestaque'

/**
 * Página principal do cardápio
 * Layout: barra superior + menu lateral (grupos) + área principal (produtos)
 */
export default function CardapioPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const { auth } = useAuthStore()
  const [isValid, setIsValid] = useState(false)
  const [mostrarDestaques, setMostrarDestaques] = useState(true) // Inicia mostrando destaques
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const numeroMesa = sessionStorage.getItem('cardapio_numero_mesa') || '?'

  // Buscar grupos de produtos
  const { data: gruposData, isLoading: isLoadingGrupos } = useQuery({
    queryKey: ['cardapio-grupos', mesaId],
    queryFn: async () => {
      if (!auth?.getAccessToken()) {
        return []
      }

      const token = auth.getAccessToken()
      const response = await fetch('/api/grupos-produtos?ativo=true&limit=100&offset=0', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar grupos')
      }

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      const grupos = items
        .map((item: any) => GrupoProduto.fromJSON(item))
        .filter((g: GrupoProduto) => g.isAtivoLocal())
        .sort((a: GrupoProduto, b: GrupoProduto) => {
          const ordemA = a.getOrdem() ?? 999
          const ordemB = b.getOrdem() ?? 999
          if (ordemA !== ordemB) return ordemA - ordemB
          return a.getNome().localeCompare(b.getNome())
        })

      return grupos
    },
    enabled: !!auth?.getAccessToken(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Buscar produtos do grupo selecionado
  const { data: produtosData, isLoading: isLoadingProdutos } = useQuery({
    queryKey: ['cardapio-produtos', grupoSelecionadoId],
    queryFn: async () => {
      if (!grupoSelecionadoId || !auth?.getAccessToken()) {
        return { produtos: [], count: 0 }
      }

      const token = auth.getAccessToken()
      const response = await fetch(
        `/api/grupos-produtos/${grupoSelecionadoId}/produtos?limit=100&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items
        .map((item: any) => Produto.fromJSON(item))
        .filter((p: Produto) => p.isAtivo())
        .sort((a: Produto, b: Produto) => a.getNome().localeCompare(b.getNome()))

      return {
        produtos,
        count: produtos.length,
      }
    },
    enabled: !!grupoSelecionadoId && !!auth?.getAccessToken() && !mostrarDestaques,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })

  // Não selecionar grupo automaticamente se destaques estiver ativo
  useEffect(() => {
    if (gruposData && gruposData.length > 0 && !grupoSelecionadoId && !mostrarDestaques) {
      setGrupoSelecionadoId(gruposData[0].getId())
    }
  }, [gruposData, grupoSelecionadoId, mostrarDestaques])

  // Handler para selecionar destaques
  const handleSelecionarDestaques = () => {
    setMostrarDestaques(true)
    setGrupoSelecionadoId(null)
  }

  // Handler para selecionar grupo
  const handleSelecionarGrupo = (grupoId: string) => {
    setMostrarDestaques(false)
    setGrupoSelecionadoId(grupoId)
  }

  // Carregar contador do carrinho
  useEffect(() => {
    const carregarCarrinho = async () => {
      try {
        const carrinho = await obterCarrinho(sessionId)
        setCarrinhoCount(carrinho.totalItens)
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error)
      }
    }

    carregarCarrinho()
    const interval = setInterval(carregarCarrinho, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  // Validar sessão
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')

    if (!sessionToken || storedMesaId !== mesaId) {
      router.push('/cardapio/instrucoes')
      return
    }

    setIsValid(true)
  }, [mesaId, router])

  const grupos = gruposData || []
  const produtos = produtosData?.produtos || []

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const handleProdutoAdicionado = async () => {
    // Atualizar contador do carrinho
    const carrinho = await obterCarrinho(sessionId)
    setCarrinhoCount(carrinho.totalItens)
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Barra Superior */}
      <div className="bg-black border-b border-gray-800 shadow-sm flex-shrink-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Esquerda: Voltar e Número da Mesa */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}`)}
              className="text-sm text-white hover:text-white/80 font-medium transition-colors flex items-center gap-1"
            >
              <MdArrowBack className="w-4 h-4" />
              <span>VOLTAR</span>
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <MdTableRestaurant className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">Mesa {numeroMesa}</span>
            </div>
          </div>

          {/* Direita: Carrinho */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}/carrinho`)}
              className="relative px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <MdShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">
                {carrinhoCount > 0 ? `PEDIDO (${carrinhoCount})` : 'PEDIDO VAZIO'}
              </span>
              {carrinhoCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Lateral - Grupos */}
        <div className="w-64 bg-black border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4">
            {isLoadingGrupos ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : grupos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhuma categoria disponível</p>
            ) : (
              <div className="space-y-2">
                {/* Opção Destaques */}
                <button
                  onClick={handleSelecionarDestaques}
                  className={`
                    w-full text-left px-3 py-3 rounded-lg transition-all duration-200 relative overflow-hidden
                    ${
                      mostrarDestaques
                        ? 'font-semibold'
                        : 'hover:opacity-90'
                    }
                  `}
                  style={{
                    background: mostrarDestaques
                      ? 'linear-gradient(to right, rgb(220, 38, 38) 0%, rgb(220, 38, 38) 35%, rgba(220, 38, 38, 0.6) 40%, rgba(220, 38, 38, 0.3) 55%, transparent 80%)'
                      : 'linear-gradient(to right, rgb(220, 38, 38) 0%, rgb(220, 38, 38) 50%, rgba(220, 38, 38, 0.3) 70%, transparent 90%)',
                  }}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-white/20">
                      <span className="text-white text-lg font-bold">⭐</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-white font-semibold">
                        DESTAQUES
                      </p>
                    </div>
                  </div>
                </button>

                {/* Grupos de Produtos */}
                {grupos.map((grupo) => {
                  const isSelected = grupo.getId() === grupoSelecionadoId && !mostrarDestaques
                  const corHex = grupo.getCorHex() || '#6366f1'
                  
                  return (
                    <button
                      key={grupo.getId()}
                      onClick={() => handleSelecionarGrupo(grupo.getId())}
                      className={`
                        w-full px-3 py-4 rounded-lg transition-all duration-200
                        ${
                          isSelected
                            ? 'bg-white/10 font-semibold'
                            : 'bg-transparent hover:bg-white/5'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {/* Ícone do grupo */}
                        <div
                          className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: isSelected ? corHex : `${corHex}20`,
                          }}
                        >
                          <DinamicIcon 
                            iconName={grupo.getIconName()} 
                            color={isSelected ? 'white' : corHex} 
                            size={60} 
                          />
                        </div>
                        {/* Nome do grupo */}
                        <p
                          className={`text-base text-center line-clamp-2 ${
                            isSelected ? 'text-white font-semibold' : 'text-white/80'
                          }`}
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {grupo.getNome()}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Área Principal - Produtos */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-800">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
          {mostrarDestaques ? (
            /* Exibir Destaques */
            <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-black">
              {/* Banner Destaques */}
              <div className="flex-shrink-0">
                <BannerDestaques />
              </div>
              
              {/* Carrossel de Produtos em Destaque */}
              <div className="flex-1 overflow-hidden relative min-h-0">
                <CarrosselProdutosDestaque produtos={[]} />
              </div>
            </div>
          ) : isLoadingProdutos ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : produtos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400 text-lg mb-2">
                  {grupoSelecionadoId
                    ? 'Nenhum produto disponível nesta categoria'
                    : 'Selecione uma categoria'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {produtos.map((produto) => {
                  const nome = produto.getNome()
                  const valor = produto.getValor()
                  const descricao = produto.getDescricao()
                  const imagemUrl = undefined // Será implementado quando backend tiver

                  return (
                    <button
                      key={produto.getId()}
                      onClick={() => setProdutoSelecionado(produto)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:border-primary hover:shadow-md transition-all duration-200 text-left group flex gap-4"
                    >
                      {/* Imagem do Produto - Lado Esquerdo */}
                      <div className="relative w-64 h-64 md:w-80 md:h-80 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                        {imagemUrl ? (
                          <Image
                            src={imagemUrl}
                            alt={nome}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="160px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl text-gray-400">📦</span>
                          </div>
                        )}
                      </div>

                      {/* Informações - Lado Direito */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        {/* Nome do Produto e Preço na mesma linha */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <h3 className="font-bold text-lg md:text-xl text-gray-900 flex-1">
                              {nome.toUpperCase()}
                            </h3>
                            <span className="text-xl md:text-2xl font-bold text-primary flex-shrink-0">
                              {formatarPreco(valor)}
                            </span>
                          </div>

                          {/* Descrição */}
                          {descricao ? (
                            <p className="text-sm md:text-base text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                              {descricao}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mb-3 italic line-clamp-2">
                              Produto disponível no cardápio
                            </p>
                          )}
                        </div>

                        {/* Botão Selecionar - Alinhado à direita */}
                        <div className="mt-auto flex justify-end">
                          <button className="bg-primary text-white px-3 py-1.5 rounded-lg font-medium text-xs hover:bg-primary/90 transition-colors">
                            Selecionar Produto
                          </button>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Modal de Configuração do Produto */}
      {produtoSelecionado && (
        <ProdutoConfiguracaoModal
          produto={produtoSelecionado}
          mesaId={mesaId}
          onClose={() => setProdutoSelecionado(null)}
          onAdicionado={handleProdutoAdicionado}
        />
      )}
    </div>
  )
}
