'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdArrowBack, MdShoppingCart, MdExpandMore, MdExpandLess } from 'react-icons/md'
import type {
  CatalogoPublicoProdutoDTO,
  EmpresaPublicaDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  flattenCatalogoGrupos,
  listarProdutosFavoritos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { useCardapioCarrinhoStore } from '@/src/presentation/stores/cardapioCarrinhoStore'
import ProdutoConfiguracaoModalPublico from './ProdutoConfiguracaoModalPublico'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import ThemeSelector from './ThemeSelector'
import BannerPromocoesVertical from './BannerPromocoesVertical'
import { isPublicDeliverySlugNotFound, PublicDeliveryApiError } from '@/src/infrastructure/api/publicDeliveryApi'

interface CardapioCatalogoScreenProps {
  slug: string
}

export default function CardapioCatalogoScreen({ slug }: CardapioCatalogoScreenProps) {
  const router = useRouter()
  const carrinhoCount = useCardapioCarrinhoStore(s => s.getResumo(slug).totalItens)
  const [isMobile, setIsMobile] = useState(false)
  const [mostrarDestaques, setMostrarDestaques] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  )
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [produtoSelecionado, setProdutoSelecionado] =
    useState<CatalogoPublicoProdutoDTO | null>(null)
  const [descricoesExpandidas, setDescricoesExpandidas] = useState<Set<string>>(new Set())

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePublicDeliveryCatalogInfinite(slug)

  useEffect(() => {
    if (isError && isPublicDeliverySlugNotFound(error)) {
      router.replace('/cardapio/instrucoes')
    }
  }, [isError, error, router])

  const empresa: EmpresaPublicaDTO | null = data?.pages[0]?.empresa ?? null
  const grupos = useMemo(
    () => (data?.pages ? flattenCatalogoGrupos(data.pages) : []),
    [data?.pages]
  )
  const produtosDestaque = useMemo(() => listarProdutosFavoritos(grupos), [grupos])

  const produtos = useMemo(() => {
    if (!grupoSelecionadoId) return []
    const grupo = grupos.find(g => g.id === grupoSelecionadoId)
    return grupo?.produtos ?? []
  }, [grupos, grupoSelecionadoId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile && mostrarDestaques) setMostrarDestaques(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mostrarDestaques])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mobile = window.innerWidth < 768
    if (!mobile && grupos.length > 0 && !grupoSelecionadoId && !mostrarDestaques) {
      setGrupoSelecionadoId(grupos[0].id)
    }
  }, [grupos, grupoSelecionadoId, mostrarDestaques])

  const formatarPreco = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const toggleDescricao = (produtoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDescricoesExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(produtoId)) next.delete(produtoId)
      else next.add(produtoId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--cardapio-accent-primary)' }}
        />
      </div>
    )
  }

  if (!empresa) return null

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <div
        className="border-b shadow-sm flex-shrink-0 z-20"
        style={{
          backgroundColor: 'var(--cardapio-bg-secondary)',
          borderColor: 'var(--cardapio-border)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}`)}
              className="text-sm font-medium flex items-center gap-1"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              <MdArrowBack className="w-4 h-4" />
              <span>VOLTAR</span>
            </button>
            <div className="h-6 w-px" style={{ backgroundColor: 'var(--cardapio-divider)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
              {empresa.nomeFantasia}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSelector />
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}/carrinho`)}
              className="relative px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
              style={{ color: 'var(--cardapio-text-primary)' }}
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

      <div className="flex-1 flex overflow-hidden">
        <div
          className="lg:w-64 md:w-44 w-32 border-r flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--cardapio-menu-bg)',
            borderColor: 'var(--cardapio-border)',
          }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide lg:p-4 p-2">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarDestaques(true)
                  setGrupoSelecionadoId(null)
                }}
                className="hidden md:block w-full text-left px-3 lg:py-3 py-2 rounded-lg font-semibold"
                style={{ backgroundColor: 'var(--cardapio-accent-primary)' }}
              >
                DESTAQUES
              </button>

              {grupos.map(grupo => {
                const isSelected = grupo.id === grupoSelecionadoId && !mostrarDestaques
                return (
                  <button
                    key={grupo.id}
                    type="button"
                    onClick={() => {
                      setMostrarDestaques(false)
                      setGrupoSelecionadoId(grupo.id)
                    }}
                    className={`w-full lg:px-3 px-1 lg:py-2 py-1 rounded-lg text-center ${isSelected ? 'font-semibold' : ''}`}
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--cardapio-menu-item-active)'
                        : 'var(--cardapio-menu-item)',
                      color: 'var(--cardapio-text-primary)',
                    }}
                  >
                    {grupo.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={grupo.imagemUrl}
                        alt=""
                        className="w-full h-16 object-cover rounded-lg mb-1"
                      />
                    ) : null}
                    <p className="lg:text-sm text-xs line-clamp-2">{grupo.nome}</p>
                  </button>
                )
              })}

              {hasNextPage && (
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="w-full py-2 text-xs rounded-lg border"
                  style={{ borderColor: 'var(--cardapio-border)' }}
                >
                  {isFetchingNextPage ? 'Carregando...' : 'Mais categorias'}
                </button>
              )}
            </div>
          </div>
        </div>

        {(!isMobile || !grupoSelecionadoId) && (
          <div
            className="lg:w-56 w-48 border-r flex-shrink-0 hidden sm:block"
            style={{
              backgroundColor: 'var(--cardapio-bg-secondary)',
              borderColor: 'var(--cardapio-border)',
            }}
          >
            <BannerPromocoesVertical promocoes={[]} />
          </div>
        )}

        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {mostrarDestaques && !isMobile ? (
              <div className="h-full p-4" style={{ background: 'var(--cardapio-gradient-secondary)' }}>
                <CarrosselProdutosDestaque
                  produtos={produtosDestaque.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    imagemUrl: p.imagemUrl,
                    descricao: p.descricao,
                    valor: p.valor,
                  }))}
                />
              </div>
            ) : produtos.length === 0 || !grupoSelecionadoId ? (
              <div className="flex items-center justify-center h-full px-4 text-center">
                <p style={{ color: 'var(--cardapio-text-tertiary)' }}>
                  {grupoSelecionadoId
                    ? 'Nenhum produto nesta categoria'
                    : 'Selecione uma categoria'}
                </p>
              </div>
            ) : (
              <div className="lg:p-4 p-2 space-y-2">
                {produtos.map(produto => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => setProdutoSelecionado(produto)}
                    className="w-full rounded-lg lg:p-3 p-2 text-left flex flex-col md:flex-row gap-4 border"
                    style={{
                      backgroundColor: 'var(--cardapio-card-bg)',
                      borderColor: 'var(--cardapio-card-border)',
                    }}
                  >
                    <div className="relative w-full md:w-40 h-32 md:h-40 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {produto.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={produto.imagemUrl}
                          alt={produto.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <h3
                          className="font-bold text-lg"
                          style={{ color: 'var(--cardapio-text-primary)' }}
                        >
                          {produto.nome}
                        </h3>
                        <span
                          className="text-xl font-bold flex-shrink-0"
                          style={{ color: 'var(--cardapio-accent-primary)' }}
                        >
                          {formatarPreco(produto.valor)}
                        </span>
                      </div>
                      {produto.descricao && (
                        <div className="mt-2">
                          <p
                            className="hidden md:block text-sm line-clamp-3"
                            style={{ color: 'var(--cardapio-text-secondary)' }}
                          >
                            {produto.descricao}
                          </p>
                          <div className="md:hidden">
                            {descricoesExpandidas.has(produto.id) ? (
                              <>
                                <p className="text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
                                  {produto.descricao}
                                </p>
                                <button
                                  type="button"
                                  onClick={e => toggleDescricao(produto.id, e)}
                                  className="flex items-center gap-1 text-sm mt-1"
                                  style={{ color: 'var(--cardapio-accent-primary)' }}
                                >
                                  <MdExpandLess /> Ocultar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={e => toggleDescricao(produto.id, e)}
                                className="flex items-center gap-1 text-sm"
                                style={{ color: 'var(--cardapio-accent-primary)' }}
                              >
                                <MdExpandMore /> Ver descrição
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {produtoSelecionado && (
        <ProdutoConfiguracaoModalPublico
          slug={slug}
          produto={produtoSelecionado}
          onClose={() => setProdutoSelecionado(null)}
          onAdicionado={() => setProdutoSelecionado(null)}
        />
      )}
    </div>
  )
}
