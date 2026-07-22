'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  useDeliveryCarrinhoItens,
  useDeliveryCarrinhoTotal,
  useDeliveryCarrinhoTotalItens,
} from '../../shared/stores/deliveryCarrinhoStore'
import {
  useDeliveryPreferenciaEntregaStore,
  useDeliveryTipoEntrega,
  type DeliveryTipoEntrega,
} from '../../shared/stores/deliveryPreferenciaEntregaStore'
import { buildCatalogViewModel } from '../../shared/mappers/buildCatalogViewModel'
import { findCatalogoProdutoById } from '../../shared/utils/findCatalogoProdutoById'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { resolveDeliveryLayoutHome } from '../layouts/DeliveryPublicoLayoutRegistry'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryAdicionadoCarrinhoDialog } from '../components/DeliveryAdicionadoCarrinhoDialog'
import { useFlyToCart } from '../../shared/hooks/useFlyToCart'
import type { DeliveryCarrinhoThumb } from '../../shared/components/DeliveryPedidoFooter'
import {
  deliveryPublicoCarrinhoPath,
  deliveryPublicoInstrucoesPath,
} from '../../shared/utils/deliveryPublicoRoutes'

type DeliveryPublicoHomeScreenProps = {
  slug: string
}

type ProdutoAdicionadoPayload = {
  produtoId: string
  nome: string
  imagemUrl: string | null
}

const MAX_FOOTER_THUMBS = 5

function buildCarrinhoThumbsFromItens(
  itens: { produtoId: string; produtoImagemUrl: string | null; adicionadoEm: string }[]
): DeliveryCarrinhoThumb[] {
  const thumbs: DeliveryCarrinhoThumb[] = []
  const seen = new Set<string>()

  for (let i = itens.length - 1; i >= 0 && thumbs.length < MAX_FOOTER_THUMBS; i -= 1) {
    const item = itens[i]
    const imagemUrl = item.produtoImagemUrl?.trim()
    if (!imagemUrl || seen.has(item.produtoId)) continue
    seen.add(item.produtoId)
    thumbs.unshift({ produtoId: item.produtoId, imagemUrl })
  }

  return thumbs
}

export function DeliveryPublicoHomeScreen({ slug }: DeliveryPublicoHomeScreenProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [termoBusca, setTermoBusca] = useState('')
  const tipoEntrega = useDeliveryTipoEntrega(slug)
  const setTipoEntregaPreferencia = useDeliveryPreferenciaEntregaStore(s => s.setTipoEntrega)
  /** Fecha o modal na hora, sem esperar o router.replace limpar ?produto= */
  const [fechandoProduto, setFechandoProduto] = useState(false)
  const [produtoAdicionadoNome, setProdutoAdicionadoNome] = useState<string | null>(null)
  const [pendingFly, setPendingFly] = useState<ProdutoAdicionadoPayload | null>(null)
  const [flyingProdutoId, setFlyingProdutoId] = useState<string | null>(null)
  const [carrinhoThumbsBounceKey, setCarrinhoThumbsBounceKey] = useState(0)
  const carrinhoThumbsTargetRef = useRef<HTMLDivElement>(null)
  const { flyToCart, flyingNode } = useFlyToCart()

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)

  const { data, isLoading, isError, error, isFetchingNextPage } = catalogQuery
  const empresa: EmpresaPublicaDTO | null = data?.pages[0]?.empresa ?? null

  const carrinhoItens = useDeliveryCarrinhoItens(slug)
  const carrinhoTotal = useDeliveryCarrinhoTotal(slug)
  const carrinhoQuantidade = useDeliveryCarrinhoTotalItens(slug)
  const carrinhoThumbs = useMemo(() => {
    const thumbs = buildCarrinhoThumbsFromItens(carrinhoItens)
    if (!flyingProdutoId) return thumbs
    // Evita miniatura duplicada enquanto a cópia ainda está voando.
    return thumbs.filter(thumb => thumb.produtoId !== flyingProdutoId)
  }, [carrinhoItens, flyingProdutoId])

  const syncProdutoQuery = useCallback(
    (produtoId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (produtoId) {
        params.set('produto', produtoId)
      } else {
        params.delete('produto')
      }
      const query = params.toString()
      const nextUrl = query ? `${pathname}?${query}` : pathname
      const currentQuery = searchParams.toString()
      const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname
      if (nextUrl === currentUrl) return
      router.replace(nextUrl, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    if (isError && isPublicDeliverySlugNotFound(error)) {
      router.replace(deliveryPublicoInstrucoesPath())
    }
  }, [isError, error, router])

  const grupos = useMemo(
    () => (data?.pages ? flattenCatalogoGrupos(data.pages) : []),
    [data?.pages]
  )

  const produtoIdQuery = searchParams.get('produto')

  useEffect(() => {
    if (!produtoIdQuery) setFechandoProduto(false)
  }, [produtoIdQuery])

  const produtoSelecionado = useMemo(() => {
    if (fechandoProduto || !produtoIdQuery || grupos.length === 0) return null
    return findCatalogoProdutoById(grupos, produtoIdQuery)
  }, [fechandoProduto, grupos, produtoIdQuery])

  const handleTipoEntregaChange = useCallback(
    (tipo: DeliveryTipoEntrega) => {
      setTipoEntregaPreferencia(slug, tipo)
    },
    [slug, setTipoEntregaPreferencia]
  )

  const handleBuscaChange = useCallback((termo: string) => {
    setTermoBusca(termo)
  }, [])

  const handleGrupoClick = useCallback((grupoId: string) => {
    document
      .getElementById(`grupo-${grupoId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleProdutoClick = useCallback(
    (produtoId: string) => {
      setFechandoProduto(false)
      syncProdutoQuery(produtoId)
    },
    [syncProdutoQuery]
  )

  const handleCloseProduto = useCallback(() => {
    setFechandoProduto(true)
    syncProdutoQuery(null)
  }, [syncProdutoQuery])

  const handleProdutoAdicionado = useCallback((payload: ProdutoAdicionadoPayload) => {
    if (payload.imagemUrl?.trim()) {
      setPendingFly(payload)
      return
    }
    setProdutoAdicionadoNome(payload.nome)
  }, [])

  useEffect(() => {
    if (!pendingFly) return

    let cancelled = false
    let attempts = 0

    const tryStart = () => {
      if (cancelled) return

      const target = carrinhoThumbsTargetRef.current
      if (!target && attempts < 30) {
        attempts += 1
        requestAnimationFrame(tryStart)
        return
      }

      const { nome, imagemUrl, produtoId } = pendingFly
      setPendingFly(null)

      if (!imagemUrl?.trim() || !target) {
        setProdutoAdicionadoNome(nome)
        return
      }

      setFlyingProdutoId(produtoId)
      flyToCart({
        imageUrl: imagemUrl,
        targetElement: target,
        onFinish: () => {
          setFlyingProdutoId(null)
          setCarrinhoThumbsBounceKey(key => key + 1)
          setProdutoAdicionadoNome(nome)
        },
      })
    }

    tryStart()

    return () => {
      cancelled = true
    }
  }, [pendingFly, flyToCart, carrinhoQuantidade])

  const handleContinuarComprando = useCallback(() => {
    setProdutoAdicionadoNome(null)
  }, [])

  const handlePedidoClick = useCallback(() => {
    router.push(deliveryPublicoCarrinhoPath(slug))
  }, [router, slug])

  const handleIrParaCarrinhoAposAdicionar = useCallback(() => {
    setProdutoAdicionadoNome(null)
    router.push(deliveryPublicoCarrinhoPath(slug))
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
        onCloseProduto={handleCloseProduto}
        onProdutoAdicionado={handleProdutoAdicionado}
        produtoAdicionadoNome={produtoAdicionadoNome}
        onContinuarComprando={handleContinuarComprando}
        onIrParaCarrinhoAposAdicionar={handleIrParaCarrinhoAposAdicionar}
        carrinhoThumbs={carrinhoThumbs}
        carrinhoThumbsBounceKey={carrinhoThumbsBounceKey}
        carrinhoThumbsTargetRef={carrinhoThumbsTargetRef}
        flyingNode={flyingNode}
      />
    </DeliveryThemeScope>
  )
}

type DeliveryPublicoHomeContentProps = {
  slug: string
  grupos: ReturnType<typeof flattenCatalogoGrupos>
  empresa: EmpresaPublicaDTO | null
  termoBusca: string
  tipoEntrega: DeliveryTipoEntrega
  carrinhoTotal: number
  carrinhoQuantidade: number
  isCatalogLoading: boolean
  isFetchingNextPage: boolean
  produtoSelecionado: CatalogoPublicoProdutoDTO | null
  onTipoEntregaChange: (tipo: DeliveryTipoEntrega) => void
  onBuscaChange: (termo: string) => void
  onGrupoClick: (grupoId: string) => void
  onProdutoClick: (produtoId: string) => void
  onPedidoClick: () => void
  onCloseProduto: () => void
  onProdutoAdicionado: (payload: ProdutoAdicionadoPayload) => void
  produtoAdicionadoNome: string | null
  onContinuarComprando: () => void
  onIrParaCarrinhoAposAdicionar: () => void
  carrinhoThumbs: DeliveryCarrinhoThumb[]
  carrinhoThumbsBounceKey: number
  carrinhoThumbsTargetRef: RefObject<HTMLDivElement | null>
  flyingNode: ReactNode
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
  produtoAdicionadoNome,
  onContinuarComprando,
  onIrParaCarrinhoAposAdicionar,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
  flyingNode,
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
        carrinhoThumbs={carrinhoThumbs}
        carrinhoThumbsBounceKey={carrinhoThumbsBounceKey}
        carrinhoThumbsTargetRef={carrinhoThumbsTargetRef}
      />
      {produtoSelecionado ? (
        <DeliveryProdutoModal
          slug={slug}
          produto={produtoSelecionado}
          onClose={onCloseProduto}
          onAdicionado={onProdutoAdicionado}
        />
      ) : null}
      {produtoAdicionadoNome ? (
        <DeliveryAdicionadoCarrinhoDialog
          produtoNome={produtoAdicionadoNome}
          onContinuarComprando={onContinuarComprando}
          onIrParaCarrinho={onIrParaCarrinhoAposAdicionar}
        />
      ) : null}
      {flyingNode}
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
