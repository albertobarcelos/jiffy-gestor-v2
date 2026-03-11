'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdArrowBack, MdShoppingCart, MdRoomService, MdTableRestaurant, MdExpandMore, MdExpandLess } from 'react-icons/md'
import Image from 'next/image'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import ProdutoConfiguracaoModal from '@/src/presentation/components/features/cardapio-digital/ProdutoConfiguracaoModal'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import CarrosselProdutosDestaque from '@/src/presentation/components/features/cardapio-digital/CarrosselProdutosDestaque'
import ThemeSelector from '@/src/presentation/components/features/cardapio-digital/ThemeSelector'
import BannerPromocoesVertical from '@/src/presentation/components/features/cardapio-digital/BannerPromocoesVertical'
import { getProdutoImagem } from '@/src/presentation/utils/produtoImagens'

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
  const [isMobile, setIsMobile] = useState(false)
  // Em mobile, inicia com false para não mostrar destaques; em desktop (md+), inicia com true
  const [mostrarDestaques, setMostrarDestaques] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 768 // md breakpoint do Tailwind
  })
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const [descricoesExpandidas, setDescricoesExpandidas] = useState<Set<string>>(new Set())
  const [sessionId, setSessionId] = useState<string>(mesaId)
  const [numeroMesa, setNumeroMesa] = useState<string>('?')
  const [accentColor, setAccentColor] = useState<string>('#FF7A00')
  const [accentTextColor, setAccentTextColor] = useState<string>('#FFFFFF')

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

  // Selecionar primeiro grupo automaticamente apenas em desktop (md+) quando destaques não estiver ativo
  // Em mobile, não seleciona automaticamente - usuário deve escolher
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isMobile = window.innerWidth < 768 // md breakpoint do Tailwind
    // Apenas em desktop (md+), seleciona automaticamente o primeiro grupo se destaques não estiver ativo
    if (!isMobile && gruposData && gruposData.length > 0 && !grupoSelecionadoId && !mostrarDestaques) {
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

  // Detectar se é mobile e ajustar estado inicial
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkMobile = () => {
      const mobile = window.innerWidth < 768 // md breakpoint do Tailwind
      setIsMobile(mobile)
      // Em mobile, garantir que destaques esteja desativado
      if (mobile && mostrarDestaques) {
        setMostrarDestaques(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mostrarDestaques])

  // Obter cores do tema em tempo de execução
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateThemeColors = () => {
      const root = document.documentElement
      const accent = getComputedStyle(root).getPropertyValue('--cardapio-accent-primary').trim()
      const text = getComputedStyle(root).getPropertyValue('--cardapio-btn-primary-text').trim()
      setAccentColor(accent || '#FF7A00')
      setAccentTextColor(text || '#FFFFFF')
    }

    updateThemeColors()

    // Observar mudanças no tema
    const observer = new MutationObserver(updateThemeColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-cardapio-theme'],
    })

    return () => observer.disconnect()
  }, [])

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

  const toggleDescricao = (produtoId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que o clique abra o modal do produto
    setDescricoesExpandidas((prev) => {
      const novo = new Set(prev)
      if (novo.has(produtoId)) {
        novo.delete(produtoId)
      } else {
        novo.add(produtoId)
      }
      return novo
    })
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
          <div className=" items-center gap-3 flex">
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
          className="lg:w-64 md:w-44 w-32 border-r flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--cardapio-menu-bg)',
            borderColor: 'var(--cardapio-border)',
          }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="lg:p-4 p-2">
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
              <div className="space-y-2 ">
                {/* Opção Destaques */}
                <button
                  onClick={handleSelecionarDestaques}
                  className={`
                    hidden md:block w-full text-left px-3 lg:py-3 py-2 rounded-lg transition-all duration-200 relative overflow-hidden 
                    ${
                      mostrarDestaques
                        ? 'font-semibold'
                        : 'hover:opacity-90'
                    }
                  `}
                  style={{
                    backgroundColor: 'var(--cardapio-accent-primary)',
                  }}
                >
                  <div className="flex items-center gap-3 relative z-10 ">
                    <div className="flex-1 min-w-0">
                      <p
                        className="lg:text-sm text-xs truncate font-semibold"
                        style={{ color: 'var(--cardapio-text-primary)' }}
                      >
                        DESTAQUES DO DIA
                      </p>
                    </div>
                  </div>
                </button>

                {/* Grupos de Produtos */}
                {grupos.map((grupo: GrupoProduto) => {
                  const isSelected = grupo.getId() === grupoSelecionadoId && !mostrarDestaques
                  
                  return (
                    <button
                      key={grupo.getId()}
                      onClick={() => handleSelecionarGrupo(grupo.getId())}
                      className={`
                        w-full lg:px-3 px-1 lg:py-2 py-1 rounded-lg transition-all duration-200 group
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
                          // Atualizar cor de fundo do container do ícone
                          const iconContainer = e.currentTarget.querySelector('[data-icon-container]') as HTMLElement
                          if (iconContainer) {
                            iconContainer.style.backgroundColor = 'var(--cardapio-menu-item-hover)'
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'var(--cardapio-menu-item)'
                          // Restaurar cor de fundo do container do ícone
                          const iconContainer = e.currentTarget.querySelector('[data-icon-container]') as HTMLElement
                          if (iconContainer) {
                            iconContainer.style.backgroundColor = 'var(--cardapio-bg-elevated)'
                          }
                        }
                      }}
                    >
                      <div className="flex flex-col items-center">
                        {/* Ícone do grupo - usando cores do tema */}
                        <div
                          data-icon-container
                          className="w-full h-20 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                          style={{
                            backgroundColor: isSelected 
                              ? 'var(--cardapio-accent-primary)' 
                              : 'var(--cardapio-bg-elevated)',
                          }}
                        >
                          <DinamicIcon
                            iconName={grupo.getIconName()}
                            color={isSelected ? accentTextColor : accentColor}
                            size={60}
                          />
                        </div>
                        {/* Nome do grupo */}
                        <p
                          className="lg:text-base text-sm text-center w-full mt-1"
                          style={{
                            color: isSelected
                              ? 'var(--cardapio-text-primary)'
                              : 'var(--cardapio-text-secondary)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            minHeight: '2.5em',
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

        {/* Banner Vertical de Promoções - Oculto em mobile quando grupo estiver selecionado */}
        {(!isMobile || !grupoSelecionadoId) && (
          <div
            className="lg:w-56 w-48 border-r flex flex-col overflow-hidden flex-shrink-0"
            style={{
              backgroundColor: 'var(--cardapio-bg-secondary)',
              borderColor: 'var(--cardapio-border)',
            }}
          >
            <div className="h-full p-1">
              <BannerPromocoesVertical promocoes={[]} />
            </div>
          </div>
        )}

        {/* Área Principal - Produtos */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
          {mostrarDestaques && !isMobile ? (
            /* Exibir Destaques - apenas em desktop (md e acima) */
            <div
              className="h-full flex flex-col"
              style={{ background: 'var(--cardapio-gradient-secondary)' }}
            >
              
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
          ) : produtos.length === 0 || !grupoSelecionadoId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <p
                  className="text-lg md:text-xl mb-2"
                  style={{ color: 'var(--cardapio-text-tertiary)' }}
                >
                  {grupoSelecionadoId
                    ? 'Nenhum produto disponível nesta categoria'
                    : 'Selecione uma categoria do menu'}
                </p>
                {!grupoSelecionadoId && (
                  <p
                    className="text-sm md:text-base"
                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                  >
                    Toque em uma categoria para ver os produtos
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:p-4 p-1">
              <div className="lg:space-y-2 space-y-1">
                {produtos.map((produto: Produto) => {
                  const nome = produto.getNome()
                  const valor = produto.getValor()
                  const descricao = produto.getDescricao()
                  // Busca a imagem do produto: primeiro tenta do backend, depois do mapeamento manual
                  const imagemUrlBackend = undefined // produto.getImagemUrl?.() || undefined (quando backend estiver pronto)
                  const imagemUrl = getProdutoImagem(produto.getId(), imagemUrlBackend)

                  return (
                    <button
                      key={produto.getId()}
                      onClick={() => setProdutoSelecionado(produto)}
                      className="w-full rounded-lg lg:p-2 p-1 hover:shadow-md transition-all duration-200 text-left group flex flex-col md:flex-row gap-4"
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
                      <div className="relative w-full h-32 lg:w-60 lg:h-60 md:w-40 md:h-40 flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
                        {imagemUrl ? (
                          <Image
                            src={imagemUrl}
                            alt={nome}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            
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
                        <div className="mb-2 flex flex-col items-center justify-between md:gap-4 gap-1">
                          <div className="flex w-full flex-col md:flex-row items-center justify-between md:gap-4 md:mb-2">
                            <h3
                              className="font-bold text-base lg:text-xl flex-1"
                              style={{ color: 'var(--cardapio-text-primary)' }}
                            >
                              {nome.toUpperCase()}
                            </h3>
                            <span
                              className="text-xl lg:text-2xl font-bold flex-shrink-0"
                              style={{ color: 'var(--cardapio-accent-primary)' }}
                            >
                              {formatarPreco(valor)}
                            </span>
                          </div>

                          {/* Descrição */}
                          {descricao ? (
                            <div className="w-full">
                              {/* Em desktop, sempre mostra a descrição */}
                              <p
                                className="hidden md:block text-xs lg:text-lg lg:mb-3 line-clamp-3 leading-relaxed"
                                style={{ color: 'var(--cardapio-text-secondary)' }}
                              >
                                {descricao}
                              </p>
                              
                              {/* Em mobile, mostra com opção de expandir/recolher */}
                              <div className="md:hidden w-full">
                                {descricoesExpandidas.has(produto.getId()) ? (
                                  <>
                                    <p
                                      className="text-sm mb-2 leading-relaxed"
                                      style={{ color: 'var(--cardapio-text-secondary)' }}
                                    >
                                      {descricao}
                                    </p>
                                    <button
                                      onClick={(e) => toggleDescricao(produto.getId(), e)}
                                      className="flex items-center gap-1 text-sm font-medium transition-colors"
                                      style={{ color: 'var(--cardapio-accent-primary)' }}
                                    >
                                      <MdExpandLess className="w-5 h-5" />
                                      <span>Ocultar descrição</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => toggleDescricao(produto.getId(), e)}
                                    className="flex items-center gap-1 text-sm font-medium transition-colors w-full justify-start"
                                    style={{ color: 'var(--cardapio-accent-primary)' }}
                                  >
                                    <MdExpandMore className="w-5 h-5" />
                                    <span>Ver descrição</span>
                                  </button>
                                )}
                              </div>
                            </div>
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
                            className="px-3 py-1.5 rounded-lg font-medium lg:text-lg text-base transition-colors"
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
