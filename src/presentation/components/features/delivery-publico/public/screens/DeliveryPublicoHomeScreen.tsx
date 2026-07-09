'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CatalogoPublicoProdutoDTO,
  EmpresaPublicaDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  flattenCatalogoGrupos,
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { isPublicDeliverySlugNotFound } from '@/src/infrastructure/api/publicDeliveryApi'
import {
  DeliveryThemeScope,
  useDeliveryThemeContext,
} from '../../shared/components/DeliveryThemeScope'
import {
  useDeliveryCarrinhoTotal,
  useDeliveryCarrinhoTotalItens,
} from '../../shared/stores/deliveryCarrinhoStore'
import { buildCatalogViewModel } from '../../shared/mappers/buildCatalogViewModel'
import { findCatalogoProdutoById } from '../../shared/utils/findCatalogoProdutoById'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { resolveDeliveryLayoutHome } from '../layouts/DeliveryPublicoLayoutRegistry'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'

type DeliveryPublicoHomeScreenProps = {
  slug: string
}

export function DeliveryPublicoHomeScreen({ slug }: DeliveryPublicoHomeScreenProps) {
  const router = useRouter()
  const [termoBusca, setTermoBusca] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('entrega')
  const [produtoSelecionado, setProdutoSelecionado] = useState<CatalogoPublicoProdutoDTO | null>(
    null
  )

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)

  const { data, isLoading, isError, error, isFetchingNextPage } = catalogQuery
  const empresa: EmpresaPublicaDTO | null = data?.pages[0]?.empresa ?? null

  const carrinhoTotal = useDeliveryCarrinhoTotal(slug)
  const carrinhoQuantidade = useDeliveryCarrinhoTotalItens(slug)

  useEffect(() => {
    if (isError && isPublicDeliverySlugNotFound(error)) {
      router.replace('/cardapio/instrucoes')
    }
  }, [isError, error, router])

  const grupos = useMemo(
    () => (data?.pages ? flattenCatalogoGrupos(data.pages) : []),
    [data?.pages]
  )

  const handleTipoEntregaChange = useCallback((tipo: 'entrega' | 'retirada') => {
    setTipoEntrega(tipo)
  }, [])

  const handleBuscaChange = useCallback((termo: string) => {
    setTermoBusca(termo)
  }, [])

  const handleGrupoClick = useCallback((grupoId: string) => {
    document.getElementById(`grupo-${grupoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleProdutoClick = useCallback(
    (produtoId: string) => {
      const produto = findCatalogoProdutoById(grupos, produtoId)
      if (produto) setProdutoSelecionado(produto)
    },
    [grupos]
  )

  const handlePedidoClick = useCallback(() => {
    router.push(`/cardapio/${encodeURIComponent(slug)}/carrinho`)
  }, [router, slug])

  const isCatalogLoading = isLoading && !data

  if (isError && !isPublicDeliverySlugNotFound(error)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">Não foi possível carregar o cardápio</p>
        <p className="mt-2 text-sm text-gray-500">
          {error instanceof Error ? error.message : 'Tente novamente em instantes.'}
        </p>
      </div>
    )
  }

  return (
    <DeliveryThemeScope
      slug={slug}
      nomeExibicaoFallback={empresa?.nomeFantasia ?? ''}
      empresa={empresa}
    >
      <DeliveryPublicoHomeContent
        slug={slug}
        grupos={grupos}
        empresa={empresa}
        termoBusca={termoBusca}
        tipoEntrega={tipoEntrega}
        carrinhoTotal={carrinhoTotal}
        carrinhoQuantidade={carrinhoQuantidade}
        isCatalogLoading={isCatalogLoading}
        isFetchingNextPage={isFetchingNextPage}
        produtoSelecionado={produtoSelecionado}
        onTipoEntregaChange={handleTipoEntregaChange}
        onBuscaChange={handleBuscaChange}
        onGrupoClick={handleGrupoClick}
        onProdutoClick={handleProdutoClick}
        onPedidoClick={handlePedidoClick}
        onCloseProduto={() => setProdutoSelecionado(null)}
        onProdutoAdicionado={() => setProdutoSelecionado(null)}
      />
    </DeliveryThemeScope>
  )
}

type DeliveryPublicoHomeContentProps = {
  slug: string
  grupos: ReturnType<typeof flattenCatalogoGrupos>
  empresa: EmpresaPublicaDTO | null
  termoBusca: string
  tipoEntrega: 'entrega' | 'retirada'
  carrinhoTotal: number
  carrinhoQuantidade: number
  isCatalogLoading: boolean
  isFetchingNextPage: boolean
  produtoSelecionado: CatalogoPublicoProdutoDTO | null
  onTipoEntregaChange: (tipo: 'entrega' | 'retirada') => void
  onBuscaChange: (termo: string) => void
  onGrupoClick: (grupoId: string) => void
  onProdutoClick: (produtoId: string) => void
  onPedidoClick: () => void
  onCloseProduto: () => void
  onProdutoAdicionado: () => void
}

function DeliveryPublicoHomeContent({
  slug,
  grupos,
  empresa,
  termoBusca,
  tipoEntrega,
  carrinhoTotal,
  carrinhoQuantidade,
  isCatalogLoading,
  isFetchingNextPage,
  produtoSelecionado,
  onTipoEntregaChange,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onPedidoClick,
  onCloseProduto,
  onProdutoAdicionado,
}: DeliveryPublicoHomeContentProps) {
  const { config } = useDeliveryThemeContext()

  const viewModel: DeliveryPublicoViewModel = useMemo(
    () =>
      buildCatalogViewModel(grupos, {
        termoBusca,
        tipoEntrega,
        carrinho: { total: carrinhoTotal, quantidadeItens: carrinhoQuantidade },
      }),
    [grupos, termoBusca, tipoEntrega, carrinhoTotal, carrinhoQuantidade]
  )

  const LayoutHome = resolveDeliveryLayoutHome(config.layoutId)
  const enderecoTexto = formatEmpresaPublicaEndereco(empresa?.endereco ?? null)

  if (isCatalogLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-b-2"
          style={{ borderColor: 'var(--delivery-primary)' }}
        />
      </div>
    )
  }

  return (
    <>
      <LayoutHome
        config={config}
        viewModel={viewModel}
        enderecoTexto={enderecoTexto}
        interactive
        onTipoEntregaChange={onTipoEntregaChange}
        onBuscaChange={onBuscaChange}
        onGrupoClick={onGrupoClick}
        onProdutoClick={onProdutoClick}
        onPedidoClick={onPedidoClick}
      />
      {produtoSelecionado ? (
        <DeliveryProdutoModal
          slug={slug}
          produto={produtoSelecionado}
          onClose={onCloseProduto}
          onAdicionado={onProdutoAdicionado}
        />
      ) : null}
      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-b-2"
            style={{ borderColor: 'var(--delivery-primary)' }}
          />
        </div>
      ) : null}
    </>
  )
}
