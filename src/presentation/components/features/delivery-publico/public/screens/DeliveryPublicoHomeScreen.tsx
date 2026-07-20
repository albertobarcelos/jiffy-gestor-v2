'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  deliveryPublicoCarrinhoPath,
  deliveryPublicoInstrucoesPath,
} from '../../shared/utils/deliveryPublicoRoutes'

type DeliveryPublicoHomeScreenProps = {
  slug: string
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

  const catalogQuery = usePublicDeliveryCatalogInfinite(slug)
  useAutoFetchCatalogoGrupos(catalogQuery)
  const horarioQuery = usePublicDeliveryHorarioFuncionamento(slug)

  const { data, isLoading, isError, error, isFetchingNextPage } = catalogQuery
  const empresa: EmpresaPublicaDTO | null = data?.pages[0]?.empresa ?? null
  const exibicaoHorario = useMemo(
    () => resolverExibicaoHorarioHome(horarioQuery.data),
    [horarioQuery.data]
  )

  const carrinhoTotal = useDeliveryCarrinhoTotal(slug)
  const carrinhoQuantidade = useDeliveryCarrinhoTotalItens(slug)

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
    document.getElementById(`grupo-${grupoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const handleProdutoAdicionado = useCallback((produtoNome: string) => {
    setProdutoAdicionadoNome(produtoNome)
  }, [])

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
        disponivel={exibicaoHorario.disponivel}
        horarioTexto={exibicaoHorario.horarioTexto}
        horarioSemanalTexto={exibicaoHorario.horarioSemanalTexto}
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
  disponivel: boolean
  horarioTexto: string
  horarioSemanalTexto: string
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
  onProdutoAdicionado: (produtoNome: string) => void
  produtoAdicionadoNome: string | null
  onContinuarComprando: () => void
  onIrParaCarrinhoAposAdicionar: () => void
}

function DeliveryPublicoHomeContent({
  slug,
  grupos,
  empresa,
  termoBusca,
  tipoEntrega,
  disponivel,
  horarioTexto,
  horarioSemanalTexto,
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
}: DeliveryPublicoHomeContentProps) {
  const { config } = useDeliveryThemeContext()

  const viewModel: DeliveryPublicoViewModel = useMemo(
    () =>
      buildCatalogViewModel(grupos, {
        termoBusca,
        tipoEntrega,
        disponivel,
        horarioTexto,
        horarioSemanalTexto,
        carrinho: { total: carrinhoTotal, quantidadeItens: carrinhoQuantidade },
      }),
    [
      grupos,
      termoBusca,
      tipoEntrega,
      disponivel,
      horarioTexto,
      horarioSemanalTexto,
      carrinhoTotal,
      carrinhoQuantidade,
    ]
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
      {produtoAdicionadoNome ? (
        <DeliveryAdicionadoCarrinhoDialog
          produtoNome={produtoAdicionadoNome}
          onContinuarComprando={onContinuarComprando}
          onIrParaCarrinho={onIrParaCarrinhoAposAdicionar}
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
