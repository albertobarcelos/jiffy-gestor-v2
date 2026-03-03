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
import ThemeSelector from '@/src/presentation/components/features/cardapio-digital/ThemeSelector'

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
  const [sessionId, setSessionId] = useState<string>(mesaId)
  const [numeroMesa, setNumeroMesa] = useState<string>('?')

  // Buscar grupos de produtos
  const { data: gruposData, isLoading: isLoadingGrupos } = useQuery({
    queryKey: ['cardapio-grupos', mesaId, sessionId],
    queryFn: async () => {
      // Priorizar token administrativo (API requer JWT administrativo)
      // sessionToken não funciona para esta API
      const token = auth?.getAccessToken()
      
      if (!token) {
        return []
      }

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

  // Carregar valores do sessionStorage e validar sessão
  useEffect(() => {
    if (typeof window === 'undefined') return

    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')
    const storedNumeroMesa = sessionStorage.getItem('cardapio_numero_mesa')

    // Atualizar estados com valores do sessionStorage
    setSessionId(sessionToken || mesaId)
    setNumeroMesa(storedNumeroMesa || '?')

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
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      {/* Barra Superior */}
      <div
        className="border-b shadow-sm flex-shrink-0 z-20"
        style={{
          backgroundColor: 'var(--cardapio-bg-secondary)',
          borderColor: 'var(--cardapio-border)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          {/* Esquerda: Voltar e Número da Mesa */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}`)}
              className="text-sm font-medium transition-colors flex items-center gap-1"
              style={{ color: 'var(--cardapio-text-primary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--cardapio-text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--cardapio-text-primary)'
              }}
            >
              <MdArrowBack className="w-4 h-4" />
              <span>VOLTAR</span>
            </button>
            <div
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--cardapio-divider)' }}
            />
            <div className="flex items-center gap-2">
              <MdTableRestaurant
                className="w-5 h-5"
                style={{ color: 'var(--cardapio-text-primary)' }}
              />
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                Mesa {numeroMesa}
              </span>
            </div>
          </div>

          {/* Direita: Carrinho e Seletor de Tema */}
          <div className="flex items-center gap-3">
            <ThemeSelector />
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}/carrinho`)}
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              style={{
                color: 'var(--cardapio-text-primary)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
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
        <div
          className="w-64 border-r flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--cardapio-menu-bg)',
            borderColor: 'var(--cardapio-border)',
          }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="p-4">
            {isLoadingGrupos ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: 'var(--cardapio-accent-primary)' }}
                />
              </div>
            ) : grupos.length === 0 ? (
              <p
                className="text-sm text-center py-8"
                style={{ color: 'var(--cardapio-text-tertiary)' }}
              >
                Nenhuma categoria disponível
              </p>
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
                      ? `linear-gradient(to right, var(--cardapio-accent-primary) 0%, var(--cardapio-accent-primary) 35%, rgba(99, 102, 241, 0.6) 40%, rgba(99, 102, 241, 0.3) 55%, transparent 80%)`
                      : `linear-gradient(to right, var(--cardapio-accent-primary) 0%, var(--cardapio-accent-primary) 50%, rgba(99, 102, 241, 0.3) 70%, transparent 90%)`,
                  }}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--cardapio-bg-elevated)' }}
                    >
                      <span
                        className="text-lg font-bold"
                        style={{ color: 'var(--cardapio-text-primary)' }}
                      >
                        ⭐
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm truncate font-semibold"
                        style={{ color: 'var(--cardapio-text-primary)' }}
                      >
                        DESTAQUES
                      </p>
                    </div>
                  </div>
                </button>

                {/* Grupos de Produtos */}
                {grupos.map((grupo: GrupoProduto) => {
                  const isSelected = grupo.getId() === grupoSelecionadoId && !mostrarDestaques
                  const corHex = grupo.getCorHex() || '#6366f1'
                  
                  return (
                    <button
                      key={grupo.getId()}
                      onClick={() => handleSelecionarGrupo(grupo.getId())}
                      className={`
                        w-full px-3 py-4 rounded-lg transition-all duration-200
                        ${isSelected ? 'font-semibold' : ''}
                      `}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--cardapio-menu-item-active)'
                          : 'var(--cardapio-menu-item)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--cardapio-menu-item-hover)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--cardapio-menu-item)'
                        }
                      }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {/* Ícone do grupo */}
                        <div
                          className="w-full h-24 rounded-lg flex items-center justify-center flex-shrink-0"
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
                          className="text-base text-center line-clamp-2"
                          style={{
                            color: isSelected
                              ? 'var(--cardapio-text-primary)'
                              : 'var(--cardapio-text-secondary)',
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
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
          {mostrarDestaques ? (
            /* Exibir Destaques */
            <div
              className="h-full flex flex-col"
              style={{ background: 'var(--cardapio-gradient-secondary)' }}
            >
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
              <div
                className="animate-spin rounded-full h-12 w-12 border-b-2"
                style={{ borderColor: 'var(--cardapio-accent-primary)' }}
              />
            </div>
          ) : produtos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p
                  className="text-lg mb-2"
                  style={{ color: 'var(--cardapio-text-tertiary)' }}
                >
                  {grupoSelecionadoId
                    ? 'Nenhum produto disponível nesta categoria'
                    : 'Selecione uma categoria'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {produtos.map((produto: Produto) => {
                  const nome = produto.getNome()
                  const valor = produto.getValor()
                  const descricao = produto.getDescricao()
                  const imagemUrl = undefined // Será implementado quando backend tiver

                  return (
                    <button
                      key={produto.getId()}
                      onClick={() => setProdutoSelecionado(produto)}
                      className="w-full rounded-lg p-4 hover:shadow-md transition-all duration-200 text-left group flex gap-4"
                      style={{
                        backgroundColor: 'var(--cardapio-card-bg)',
                        borderColor: 'var(--cardapio-card-border)',
                        borderWidth: '1px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cardapio-accent-primary)'
                        e.currentTarget.style.backgroundColor = 'var(--cardapio-card-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--cardapio-card-border)'
                        e.currentTarget.style.backgroundColor = 'var(--cardapio-card-bg)'
                      }}
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
                            <h3
                              className="font-bold text-lg md:text-xl flex-1"
                              style={{ color: 'var(--cardapio-text-primary)' }}
                            >
                              {nome.toUpperCase()}
                            </h3>
                            <span
                              className="text-xl md:text-2xl font-bold flex-shrink-0"
                              style={{ color: 'var(--cardapio-accent-primary)' }}
                            >
                              {formatarPreco(valor)}
                            </span>
                          </div>

                          {/* Descrição */}
                          {descricao ? (
                            <p
                              className="text-sm md:text-base mb-3 line-clamp-2 leading-relaxed"
                              style={{ color: 'var(--cardapio-text-secondary)' }}
                            >
                              {descricao}
                            </p>
                          ) : (
                            <p
                              className="text-sm mb-3 italic line-clamp-2"
                              style={{ color: 'var(--cardapio-text-tertiary)' }}
                            >
                              Produto disponível no cardápio
                            </p>
                          )}
                        </div>

                        {/* Botão Selecionar - Alinhado à direita */}
                        <div className="mt-auto flex justify-end">
                          <button
                            className="px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                            style={{
                              backgroundColor: 'var(--cardapio-btn-primary)',
                              color: 'var(--cardapio-btn-primary-text)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
                            }}
                          >
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
