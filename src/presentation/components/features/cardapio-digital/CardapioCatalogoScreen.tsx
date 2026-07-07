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
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { useCardapioCarrinhoStore } from '@/src/presentation/stores/cardapioCarrinhoStore'
import ProdutoConfiguracaoModalPublico from './ProdutoConfiguracaoModalPublico'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import ThemeSelector from './ThemeSelector'
import BannerPromocoesVertical from './BannerPromocoesVertical'
import { isPublicDeliverySlugNotFound } from '@/src/infrastructure/api/publicDeliveryApi'

interface CardapioCatalogoScreenProps {
  slug: string
}

export default function CardapioCatalogoScreen({ slug }: CardapioCatalogoScreenProps) {
  const router = useRouter()
  const carrinhoCount = useCardapioCarrinhoStore(s => s.getResumo(slug).totalItens)
  const [mostrarDestaques, setMostrarDestaques] = useState(false)
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<string | null>(null)
  const [produtoSelecionado, setProdutoSelecionado] =
    useState<CatalogoPublicoProdutoDTO | null>(null)
  const [descricoesExpandidas, setDescricoesExpandidas] = useState<Set<string>>(new Set())

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
  } = catalogQuery

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
    if (grupos.length > 0 && !grupoSelecionadoId && !mostrarDestaques) {
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
      <div className="min-h-[100dvh] flex items-center justify-center">
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
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <header
        className="border-b shadow-sm flex-shrink-0 z-20"
        style={{
          backgroundColor: 'var(--cardapio-bg-secondary)',
          borderColor: 'var(--cardapio-border)',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}`)}
              className="text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0 min-h-[44px] px-1"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              <MdArrowBack className="w-4 h-4" />
              <span className="hidden sm:inline">VOLTAR</span>
            </button>
            <div
              className="h-5 w-px flex-shrink-0 hidden sm:block"
              style={{ backgroundColor: 'var(--cardapio-divider)' }}
            />
            <span
              className="text-sm font-semibold truncate min-w-0"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              {empresa.nomeFantasia}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <ThemeSelector />
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}/carrinho`)}
              className="relative min-h-[44px] min-w-[44px] px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg flex items-center justify-center gap-1.5 sm:gap-2"
              style={{ color: 'var(--cardapio-text-primary)' }}
              aria-label={
                carrinhoCount > 0 ? `Pedido com ${carrinhoCount} itens` : 'Pedido vazio'
              }
            >
              <MdShoppingCart className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">
                {carrinhoCount > 0 ? `PEDIDO (${carrinhoCount})` : 'PEDIDO VAZIO'}
              </span>
              {carrinhoCount > 0 && (
                <span className="absolute top-0.5 right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[10px] sm:text-xs font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navegação de categorias — coluna estreita no mobile */}
        <nav
          className="w-[5.5rem] sm:w-32 md:w-44 lg:w-64 border-r flex flex-col overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--cardapio-menu-bg)',
            borderColor: 'var(--cardapio-border)',
          }}
          aria-label="Categorias"
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide p-1.5 sm:p-2 lg:p-4">
            <div className="space-y-1.5 sm:space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarDestaques(true)
                  setGrupoSelecionadoId(null)
                }}
                className="w-full text-center px-1 sm:px-3 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-semibold min-h-[44px]"
                style={{
                  backgroundColor: mostrarDestaques
                    ? 'var(--cardapio-menu-item-active)'
                    : 'var(--cardapio-accent-primary)',
                  color: 'var(--cardapio-text-primary)',
                }}
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
                    className={`w-full px-1 sm:px-3 py-1.5 sm:py-2 rounded-lg text-center min-h-[44px] ${isSelected ? 'font-semibold' : ''}`}
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
                        className="w-full h-10 sm:h-14 md:h-16 object-cover rounded-lg mb-0.5 sm:mb-1"
                      />
                    ) : null}
                    <p className="text-[10px] sm:text-xs lg:text-sm line-clamp-2 leading-tight">
                      {grupo.nome}
                    </p>
                  </button>
                )
              })}

              {isFetchingNextPage && (
                <p
                  className="w-full py-2 text-[10px] sm:text-xs text-center"
                  style={{ color: 'var(--cardapio-text-muted)' }}
                >
                  Carregando categorias...
                </p>
              )}
            </div>
          </div>
        </nav>

        {/* Banner promocional — oculto no mobile, visível a partir de md */}
        <div
          className="hidden md:block md:w-44 lg:w-56 border-r flex-shrink-0"
          style={{
            backgroundColor: 'var(--cardapio-bg-secondary)',
            borderColor: 'var(--cardapio-border)',
          }}
        >
          <BannerPromocoesVertical promocoes={[]} />
        </div>

        <main
          className="flex-1 flex flex-col overflow-hidden min-w-0"
          style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
        >
          <div className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain">
            {mostrarDestaques ? (
              <div
                className="h-[min(55vh,28rem)] md:h-full md:min-h-0 p-2 sm:p-4"
                style={{ background: 'var(--cardapio-gradient-secondary)' }}
              >
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
              <div className="flex items-center justify-center h-full min-h-[12rem] px-4 text-center">
                <p className="text-sm" style={{ color: 'var(--cardapio-text-tertiary)' }}>
                  {grupoSelecionadoId
                    ? 'Nenhum produto nesta categoria'
                    : 'Selecione uma categoria'}
                </p>
              </div>
            ) : (
              <div className="p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3 pb-4">
                {produtos.map(produto => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => setProdutoSelecionado(produto)}
                    className="w-full rounded-xl p-3 sm:p-4 text-left flex flex-col sm:flex-row gap-3 sm:gap-4 border active:scale-[0.99] transition-transform"
                    style={{
                      backgroundColor: 'var(--cardapio-card-bg)',
                      borderColor: 'var(--cardapio-card-border)',
                    }}
                  >
                    <div className="relative w-full sm:w-28 md:w-36 lg:w-40 h-36 sm:h-28 md:h-36 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
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
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                        <h3
                          className="font-bold text-base sm:text-lg leading-snug"
                          style={{ color: 'var(--cardapio-text-primary)' }}
                        >
                          {produto.nome}
                        </h3>
                        <span
                          className="text-lg sm:text-xl font-bold flex-shrink-0"
                          style={{ color: 'var(--cardapio-accent-primary)' }}
                        >
                          {formatarPreco(produto.valor)}
                        </span>
                      </div>
                      {produto.descricao && (
                        <div className="mt-0.5 sm:mt-1">
                          <p
                            className="hidden sm:block text-sm line-clamp-2 md:line-clamp-3"
                            style={{ color: 'var(--cardapio-text-secondary)' }}
                          >
                            {produto.descricao}
                          </p>
                          <div className="sm:hidden">
                            {descricoesExpandidas.has(produto.id) ? (
                              <>
                                <p
                                  className="text-sm"
                                  style={{ color: 'var(--cardapio-text-secondary)' }}
                                >
                                  {produto.descricao}
                                </p>
                                <button
                                  type="button"
                                  onClick={e => toggleDescricao(produto.id, e)}
                                  className="flex items-center gap-1 text-sm mt-1 min-h-[44px]"
                                  style={{ color: 'var(--cardapio-accent-primary)' }}
                                >
                                  <MdExpandLess /> Ocultar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={e => toggleDescricao(produto.id, e)}
                                className="flex items-center gap-1 text-sm min-h-[44px]"
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
        </main>
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
