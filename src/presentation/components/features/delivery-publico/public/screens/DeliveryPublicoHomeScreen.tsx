'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type {
  CatalogoPublicoProdutoDTO,
  EmpresaPublicaDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  flattenCatalogoGrupos,
  useAutoFetchCatalogoGrupos,
  usePublicDeliveryCatalogInfinite,
  usePublicDeliveryHorarioFuncionamento,
} from '@/src/presentation/hooks/usePublicDeliveryCatalog'
import { resolverExibicaoHorarioHome } from '../../shared/utils/formatarHorarioFuncionamentoPublico'
import { isPublicDeliverySlugNotFound } from '@/src/infrastructure/api/publicDeliveryApi'
import {
  DeliveryThemeScope,
  useDeliveryThemeContext,
} from '../../shared/components/DeliveryThemeScope'
import {
  useDeliveryCarrinhoItens,
  useDeliveryCarrinhoStore,
  useDeliveryCarrinhoTotal,
  useDeliveryCarrinhoTotalItens,
} from '../../shared/stores/deliveryCarrinhoStore'
import { buildCatalogViewModel } from '../../shared/mappers/buildCatalogViewModel'
import { applySugestoesDaCasaVisibility } from '../../shared/utils/applySugestoesDaCasaVisibility'
import { findCatalogoProdutoById, findCatalogoGrupoIdByProdutoId } from '../../shared/utils/findCatalogoProdutoById'
import { formatEmpresaPublicaEndereco } from '../../shared/utils/formatEmpresaPublicaEndereco'
import { produtoTemComplementosAtivos } from '../../shared/utils/produtoComplementosUtils'
import { resolveDeliveryLayoutHome } from '../layouts/DeliveryPublicoLayoutRegistry'
import type { DeliveryPublicoViewModel } from '../../shared/types/deliveryPublicoViewModel'
import { DeliveryProdutoModal } from '../components/DeliveryProdutoModal'
import { DeliveryAdicionadoCarrinhoDialog } from '../components/DeliveryAdicionadoCarrinhoDialog'
import { DeliveryPublicoCarrinhoScreen } from './DeliveryPublicoCarrinhoScreen'
import { useFlyToCart } from '../../shared/hooks/useFlyToCart'
import { useDeliveryBodyScrollLock } from '../../shared/hooks/useDeliveryBodyScrollLock'
import type { DeliveryCarrinhoThumb } from '../../shared/components/DeliveryPedidoFooter'
import { buildCarrinhoThumbsFromItens } from '../../shared/utils/buildCarrinhoThumbsFromItens'
import {
  deliveryPublicoCarrinhoPath,
  deliveryPublicoHomePath,
  deliveryPublicoInstrucoesPath,
} from '../../shared/utils/deliveryPublicoRoutes'

type DeliveryPublicoHomeScreenProps = {
  slug: string
  /** Abre o carrinho como overlay (ex.: acesso direto em /carrinho). */
  carrinhoInicialAberto?: boolean
}

type ProdutoAdicionadoPayload = {
  produtoId: string
  nome: string
  imagemUrl: string | null
  /** Se false, só anima o fly-to-cart (atalho "+"); padrão true abre o modal. */
  abrirDialogo?: boolean
}

export function DeliveryPublicoHomeScreen({
  slug,
  carrinhoInicialAberto = false,
}: DeliveryPublicoHomeScreenProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [termoBusca, setTermoBusca] = useState('')
  /** Fecha o modal na hora, sem esperar o router.replace limpar ?produto= */
  const [fechandoProduto, setFechandoProduto] = useState(false)
  const [produtoAdicionadoNome, setProdutoAdicionadoNome] = useState<string | null>(null)
  const [pendingFly, setPendingFly] = useState<ProdutoAdicionadoPayload | null>(null)
  /** 1ª aparição: oculta a thumb até a imagem chegar no footer. */
  const [flyingProdutoId, setFlyingProdutoId] = useState<string | null>(null)
  /**
   * Relançamento: congela ordem/quantidade antiga até onArrive
   * (evita sumir ou “pular” enquanto a cópia voa).
   */
  const [thumbsCongeladas, setThumbsCongeladas] = useState<DeliveryCarrinhoThumb[] | null>(null)
  const [carrinhoThumbsBounceKey, setCarrinhoThumbsBounceKey] = useState(0)
  const [carrinhoAberto, setCarrinhoAberto] = useState(carrinhoInicialAberto)
  const carrinhoThumbsTargetRef = useRef<HTMLDivElement>(null)
  /** Últimas thumbs já exibidas (antes do add atual). */
  const thumbsCommitadasRef = useRef<DeliveryCarrinhoThumb[]>([])
  const { flyToCart, flyingNode, isFlying } = useFlyToCart()
  /** Bloqueia UI desde o pending até o fim do fly (evita add/navegação no meio). */
  const bloquearUiFlyToCart = Boolean(pendingFly) || isFlying
  useDeliveryBodyScrollLock(bloquearUiFlyToCart)

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)
  const horarioQuery = usePublicDeliveryHorarioFuncionamento(slug)

  const { data, isLoading, isError, error, isFetchingNextPage } = catalogQuery
  const empresa: EmpresaPublicaDTO | null = data?.pages[0]?.empresa ?? null
  const exibicaoHorario = useMemo(
    () => resolverExibicaoHorarioHome(horarioQuery.data),
    [horarioQuery.data]
  )

  const carrinhoItens = useDeliveryCarrinhoItens(slug)
  const carrinhoTotal = useDeliveryCarrinhoTotal(slug)
  const carrinhoQuantidade = useDeliveryCarrinhoTotalItens(slug)
  const adicionarItem = useDeliveryCarrinhoStore(s => s.adicionarItem)
  const thumbsAoVivo = useMemo(
    () => buildCarrinhoThumbsFromItens(carrinhoItens),
    [carrinhoItens]
  )

  useLayoutEffect(() => {
    // Não sobrescreve o snapshot enquanto há fly pendente/em curso.
    if (pendingFly || flyingProdutoId || thumbsCongeladas) return
    thumbsCommitadasRef.current = thumbsAoVivo
  }, [thumbsAoVivo, pendingFly, flyingProdutoId, thumbsCongeladas])

  const carrinhoThumbs = useMemo(() => {
    if (thumbsCongeladas) return thumbsCongeladas
    if (!flyingProdutoId) return thumbsAoVivo
    return thumbsAoVivo.filter(thumb => thumb.produtoId !== flyingProdutoId)
  }, [thumbsAoVivo, flyingProdutoId, thumbsCongeladas])

  const quantidadePorProduto = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of carrinhoItens) {
      map[item.produtoId] = (map[item.produtoId] ?? 0) + item.quantidade
    }
    return map
  }, [carrinhoItens])

  const syncProdutoQuery = useCallback(
    (produtoId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (produtoId) {
        params.set('produto', produtoId)
      } else {
        params.delete('produto')
      }
      const query = params.toString()
      const homePath = deliveryPublicoHomePath(slug)
      const nextUrl = query ? `${homePath}?${query}` : homePath
      const currentQuery = searchParams.toString()
      const currentPath =
        typeof window !== 'undefined' && window.location.pathname.endsWith('/carrinho')
          ? deliveryPublicoHomePath(slug)
          : pathname.replace(/\/carrinho\/?$/, '') || homePath
      const currentUrl = currentQuery ? `${currentPath}?${currentQuery}` : currentPath
      if (nextUrl === currentUrl) return
      router.replace(nextUrl, { scroll: false })
    },
    [pathname, router, searchParams, slug]
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
    if (payload.abrirDialogo !== false) {
      setProdutoAdicionadoNome(payload.nome)
    }
  }, [])

  const handleProdutoAddRapido = useCallback(
    (produtoId: string) => {
      const produto = findCatalogoProdutoById(grupos, produtoId)
      if (!produto) return

      if (produtoTemComplementosAtivos(produto)) {
        handleProdutoClick(produtoId)
        return
      }

      adicionarItem(slug, {
        produtoId: produto.id,
        grupoId: findCatalogoGrupoIdByProdutoId(grupos, produto.id),
        produtoNome: produto.nome,
        produtoImagemUrl: produto.imagemUrl,
        quantidade: 1,
        valorUnitario: produto.valor,
        valorTotal: produto.valor,
        observacoes: [],
        complementos: [],
      })

      handleProdutoAdicionado({
        produtoId: produto.id,
        nome: produto.nome,
        imagemUrl: produto.imagemUrl,
        abrirDialogo: false,
      })
    },
    [adicionarItem, grupos, handleProdutoAdicionado, handleProdutoClick, slug]
  )

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

      const { nome, imagemUrl, produtoId, abrirDialogo = true } = pendingFly
      setPendingFly(null)

      if (!imagemUrl?.trim() || !target) {
        if (abrirDialogo) setProdutoAdicionadoNome(nome)
        return
      }

      const jaTinhaMiniatura = thumbsCommitadasRef.current.some(
        thumb => thumb.produtoId === produtoId
      )

      if (jaTinhaMiniatura) {
        // Mantém posição e badge antigos até a imagem chegar.
        setThumbsCongeladas(thumbsCommitadasRef.current)
      } else {
        // Produto novo: só aparece na barra no momento do arrive.
        setFlyingProdutoId(produtoId)
      }

      flyToCart({
        imageUrl: imagemUrl,
        targetElement: target,
        onArrive: () => {
          setFlyingProdutoId(null)
          setThumbsCongeladas(null)
          setCarrinhoThumbsBounceKey(key => key + 1)
        },
        onFinish: () => {
          if (abrirDialogo) setProdutoAdicionadoNome(nome)
        },
      })
    }

    tryStart()

    return () => {
      cancelled = true
    }
  }, [pendingFly, flyToCart])

  const handleContinuarComprando = useCallback(() => {
    setProdutoAdicionadoNome(null)
  }, [])

  const abrirCarrinho = useCallback(() => {
    setProdutoAdicionadoNome(null)
    setCarrinhoAberto(true)
    const cartPath = deliveryPublicoCarrinhoPath(slug)
    if (typeof window !== 'undefined' && window.location.pathname !== cartPath) {
      window.history.pushState({ deliveryCarrinho: true }, '', cartPath)
    }
  }, [slug])

  const fecharCarrinho = useCallback(() => {
    setCarrinhoAberto(false)
    const homePath = deliveryPublicoHomePath(slug)
    if (typeof window !== 'undefined' && window.location.pathname.endsWith('/carrinho')) {
      window.history.pushState({ deliveryCarrinho: false }, '', homePath)
    }
  }, [slug])

  useEffect(() => {
    const onPopState = () => {
      setCarrinhoAberto(window.location.pathname.endsWith('/carrinho'))
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handlePedidoClick = useCallback(() => {
    abrirCarrinho()
  }, [abrirCarrinho])

  const handleIrParaCarrinhoAposAdicionar = useCallback(() => {
    abrirCarrinho()
  }, [abrirCarrinho])

  const isCatalogLoading = isLoading && !data
  const designReady = Boolean(data) || (isError && !isLoading)

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
      designReady={designReady}
    >
      <DeliveryPublicoHomeContent
        slug={slug}
        grupos={grupos}
        empresa={empresa}
        termoBusca={termoBusca}
        disponivel={exibicaoHorario.disponivel}
        horarioTexto={exibicaoHorario.horarioTexto}
        horarioSemanalTexto={exibicaoHorario.horarioSemanalTexto}
        carrinhoTotal={carrinhoTotal}
        carrinhoQuantidade={carrinhoQuantidade}
        isCatalogLoading={isCatalogLoading}
        isFetchingNextPage={isFetchingNextPage}
        produtoSelecionado={produtoSelecionado}
        onBuscaChange={handleBuscaChange}
        onGrupoClick={handleGrupoClick}
        onProdutoClick={handleProdutoClick}
        onProdutoAddRapido={handleProdutoAddRapido}
        onPedidoClick={handlePedidoClick}
        onCloseProduto={handleCloseProduto}
        onProdutoAdicionado={handleProdutoAdicionado}
        produtoAdicionadoNome={produtoAdicionadoNome}
        onContinuarComprando={handleContinuarComprando}
        onIrParaCarrinhoAposAdicionar={handleIrParaCarrinhoAposAdicionar}
        quantidadePorProduto={quantidadePorProduto}
        carrinhoThumbs={carrinhoThumbs}
        carrinhoThumbsBounceKey={carrinhoThumbsBounceKey}
        carrinhoThumbsTargetRef={carrinhoThumbsTargetRef}
        flyingNode={flyingNode}
        bloquearUiFlyToCart={bloquearUiFlyToCart}
      />
      {carrinhoAberto ? (
        <DeliveryPublicoCarrinhoScreen slug={slug} onClose={fecharCarrinho} />
      ) : null}
    </DeliveryThemeScope>
  )
}

type DeliveryPublicoHomeContentProps = {
  slug: string
  grupos: ReturnType<typeof flattenCatalogoGrupos>
  empresa: EmpresaPublicaDTO | null
  termoBusca: string
  disponivel: boolean
  horarioTexto: string
  horarioSemanalTexto: string
  carrinhoTotal: number
  carrinhoQuantidade: number
  isCatalogLoading: boolean
  isFetchingNextPage: boolean
  produtoSelecionado: CatalogoPublicoProdutoDTO | null
  onBuscaChange: (termo: string) => void
  onGrupoClick: (grupoId: string) => void
  onProdutoClick: (produtoId: string) => void
  onProdutoAddRapido: (produtoId: string) => void
  onPedidoClick: () => void
  onCloseProduto: () => void
  onProdutoAdicionado: (payload: ProdutoAdicionadoPayload) => void
  produtoAdicionadoNome: string | null
  onContinuarComprando: () => void
  onIrParaCarrinhoAposAdicionar: () => void
  quantidadePorProduto: Record<string, number>
  carrinhoThumbs: DeliveryCarrinhoThumb[]
  carrinhoThumbsBounceKey: number
  carrinhoThumbsTargetRef: RefObject<HTMLDivElement | null>
  flyingNode: ReactNode
  bloquearUiFlyToCart: boolean
}

function DeliveryPublicoHomeContent({
  slug,
  grupos,
  empresa,
  termoBusca,
  disponivel,
  horarioTexto,
  horarioSemanalTexto,
  carrinhoTotal,
  carrinhoQuantidade,
  isCatalogLoading,
  isFetchingNextPage,
  produtoSelecionado,
  onBuscaChange,
  onGrupoClick,
  onProdutoClick,
  onProdutoAddRapido,
  onPedidoClick,
  onCloseProduto,
  onProdutoAdicionado,
  produtoAdicionadoNome,
  onContinuarComprando,
  onIrParaCarrinhoAposAdicionar,
  quantidadePorProduto,
  carrinhoThumbs,
  carrinhoThumbsBounceKey,
  carrinhoThumbsTargetRef,
  flyingNode,
  bloquearUiFlyToCart,
}: DeliveryPublicoHomeContentProps) {
  const { config } = useDeliveryThemeContext()

  const viewModel: DeliveryPublicoViewModel = useMemo(() => {
    const base = buildCatalogViewModel(grupos, {
      termoBusca,
      disponivel,
      horarioTexto,
      horarioSemanalTexto,
      carrinho: { total: carrinhoTotal, quantidadeItens: carrinhoQuantidade },
    })
    return applySugestoesDaCasaVisibility(base, config)
  }, [
    grupos,
    termoBusca,
    disponivel,
    horarioTexto,
    horarioSemanalTexto,
    carrinhoTotal,
    carrinhoQuantidade,
    config,
  ])

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
        interactive={!bloquearUiFlyToCart}
        onBuscaChange={onBuscaChange}
        onGrupoClick={onGrupoClick}
        onProdutoClick={onProdutoClick}
        onProdutoAddRapido={onProdutoAddRapido}
        onPedidoClick={onPedidoClick}
        quantidadePorProduto={quantidadePorProduto}
        carrinhoThumbs={carrinhoThumbs}
        carrinhoThumbsBounceKey={carrinhoThumbsBounceKey}
        carrinhoThumbsTargetRef={carrinhoThumbsTargetRef}
      />
      {produtoSelecionado ? (
        <DeliveryProdutoModal
          slug={slug}
          produto={produtoSelecionado}
          grupoId={
            viewModel.grupos
              .flatMap(g => g.produtos)
              .find(p => p.id === produtoSelecionado.id)?.grupoId ||
            findCatalogoGrupoIdByProdutoId(grupos, produtoSelecionado.id)
          }
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
      {bloquearUiFlyToCart && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[75] touch-none"
              role="presentation"
              aria-busy="true"
              aria-label="Adicionando item ao carrinho"
              onPointerDown={e => e.preventDefault()}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
            />,
            document.body
          )
        : null}
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
