'use client'

import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProdutosInfinite } from '@/src/presentation/hooks/useProdutos'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import Link from 'next/link'
import { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ProdutosTabsModal, ProdutosTabsModalState } from './ProdutosTabsModal'
import {
  MdKeyboardArrowDown,
  MdImage,
  MdSearch,
  MdModeEdit,
  MdContentCopy,
  MdStarBorder,
  MdPrint,
  MdExtension,
  MdAddCircleOutline,
  MdRemoveCircleOutline,
  MdLaunch,
} from 'react-icons/md'

// Lazy load do menu de ações para reduzir bundle inicial
const ProdutoActionsMenu = lazy(() => import('./ProdutoActionsMenu').then(module => ({ default: module.ProdutoActionsMenu })))

interface ProdutosListProps {
  onReload?: () => void
}

type ToggleField = 'favorito' | 'permiteAcrescimo' | 'permiteDesconto' | 'abreComplementos'
const toggleFieldConfig: Record<
  ToggleField,
  { bodyKey: string; successTrue: string; successFalse: string }
> = {
  favorito: {
    bodyKey: 'favorito',
    successTrue: 'Produto marcado como favorito!',
    successFalse: 'Produto removido dos favoritos!',
  },
  permiteAcrescimo: {
    bodyKey: 'permiteAcrescimo',
    successTrue: 'Acréscimo habilitado para o produto!',
    successFalse: 'Acréscimo desabilitado para o produto!',
  },
  permiteDesconto: {
    bodyKey: 'permiteDesconto',
    successTrue: 'Desconto habilitado para o produto!',
    successFalse: 'Desconto desabilitado para o produto!',
  },
  abreComplementos: {
    bodyKey: 'abreComplementos',
    successTrue: 'Complementos habilitados!',
    successFalse: 'Complementos desabilitados!',
  },
}

const buildToggleChange = (field: ToggleField, value: boolean) => {
  switch (field) {
    case 'favorito':
      return { favorito: value }
    case 'permiteAcrescimo':
      return { permiteAcrescimo: value }
    case 'permiteDesconto':
      return { permiteDesconto: value }
    case 'abreComplementos':
      return { abreComplementos: value }
    default:
      return {}
  }
}

const cloneProdutoWithChanges = (
  produto: Produto,
  changes: {
    valor?: number
    ativo?: boolean
    favorito?: boolean
    permiteAcrescimo?: boolean
    permiteDesconto?: boolean
    abreComplementos?: boolean
  }
) => {
  return Produto.create(
    produto.getId(),
    produto.getCodigoProduto(),
    produto.getNome(),
    changes.valor ?? produto.getValor(),
    changes.ativo ?? produto.isAtivo(),
    produto.getNomeGrupo(),
    produto.getEstoque(),
    changes.favorito ?? produto.isFavorito(),
    changes.abreComplementos ?? produto.abreComplementosAtivo(),
    changes.permiteAcrescimo ?? produto.permiteAcrescimoAtivo(),
    changes.permiteDesconto ?? produto.permiteDescontoAtivo()
  )
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent', numeric: false })

const normalizeGroupName = (nome?: string) => (nome && nome.trim().length > 0 ? nome : 'Sem grupo')

const sortProdutosAlphabetically = (lista: Produto[]): Produto[] => {
  return [...lista].sort((a, b) => {
    const grupoCompare = collator.compare(
      normalizeGroupName(a.getNomeGrupo()),
      normalizeGroupName(b.getNomeGrupo())
    )
    if (grupoCompare !== 0) {
      return grupoCompare
    }
    return collator.compare(a.getNome(), b.getNome())
  })
}

/**
 * Item individual da lista de produtos
 */
interface ProdutoListItemProps {
  produto: Produto
  onValorChange?: (valor: number) => void
  onSwitchToggle?: (status: boolean) => void
  onMenuStatusChanged?: () => void
  onToggleBoolean?: (field: ToggleField, value: boolean) => void
  savingToggleState?: Partial<Record<ToggleField, boolean>>
  onOpenComplementosModal?: () => void
  onOpenImpressorasModal?: () => void
  isSavingValor?: boolean
  isSavingStatus?: boolean
  onEditProduto?: (produtoId: string) => void
  onCopyProduto?: (produtoId: string) => void
}

const ProdutoListItem = function ProdutoListItem({
  produto,
  onValorChange,
  onSwitchToggle,
  onMenuStatusChanged,
  onToggleBoolean,
  savingToggleState,
  onOpenComplementosModal,
  onOpenImpressorasModal,
  onEditProduto,
  isSavingValor,
  isSavingStatus,
  onCopyProduto,
}: ProdutoListItemProps) {
  const valorFormatado = useMemo(() => transformarParaReal(produto.getValor()), [produto])
  const isAtivo = useMemo(() => produto.isAtivo(), [produto])
  const toggleStates = useMemo(
    () => ({
      favorito: produto.isFavorito(),
      permiteAcrescimo: produto.permiteAcrescimoAtivo(),
      permiteDesconto: produto.permiteDescontoAtivo(),
      abreComplementos: produto.abreComplementosAtivo(),
    }),
    [produto]
  )
  const [valorInput, setValorInput] = useState(produto.getValor().toFixed(2))

  useEffect(() => {
    setValorInput(produto.getValor().toFixed(2))
  }, [produto])

  const normalizeValor = useCallback((valor: string) => {
    const trimmed = valor.replace(/\s/g, '').replace(/[^\d.,-]/g, '')
    const hasComma = trimmed.includes(',')
    const withoutSeparators = hasComma ? trimmed.replace(/\./g, '') : trimmed
    const normalized = withoutSeparators.replace(',', '.')
    const parsed = Number(normalized)
    return Number.isNaN(parsed) ? null : parsed
  }, [])

  const handleValorSubmit = useCallback(() => {
    if (!onValorChange) return
    const parsed = normalizeValor(valorInput)
    if (parsed === null) {
      setValorInput(produto.getValor().toFixed(2))
      return
    }
    if (parsed === produto.getValor()) {
      return
    }
    onValorChange(parsed)
  }, [onValorChange, normalizeValor, valorInput, produto])

  const actionIcons = useMemo(
    () => [
      { key: 'copiar', label: 'Copiar produto', Icon: MdContentCopy, action: 'copy' },
      {
        key: 'complementos',
        label: 'Complementos vinculados',
        Icon: MdExtension,
        modal: 'complementos' as const,
      },
      {
        key: 'impressora',
        label: 'Impressoras vinculadas',
        Icon: MdPrint,
        modal: 'impressoras' as const,
      },
      {
        key: 'favorito',
        label: 'Favoritar produto',
        Icon: MdStarBorder,
        field: 'favorito' as ToggleField,
      },
      {
        key: 'acrescentar',
        label: 'Permitir acréscimo',
        Icon: MdAddCircleOutline,
        field: 'permiteAcrescimo' as ToggleField,
      },
      {
        key: 'diminuir',
        label: 'Permitir desconto',
        Icon: MdRemoveCircleOutline,
        field: 'permiteDesconto' as ToggleField,
      },
      {
        key: 'abrir',
        label: 'Permitir abrir complementos',
        Icon: MdLaunch,
        field: 'abreComplementos' as ToggleField,
      },
    ],
    []
  )

  return (
    <div className="bg-white border border-gray-100 hover:bg-secondary-text/10 rounded-2xl px-4 py-2 mb-2 shadow-sm flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-2xl">
        <MdImage />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-primary-text font-semibold font-nunito text-base flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEditProduto?.(produto.getId())}
              title="Editar produto"
              className="rounded-full bg-primary/10 border border-primary p-1 text-[var(--color-primary)] hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Editar ${produto.getNome()}`}
            >
              <MdModeEdit className="text-xl" />
            </button>
            {produto.getNome()}
            <span className="text-sm text-secondary-text ml-2 inline-flex items-center gap-1">
              <span className="text-xs">Cód. </span>
              <span className="font-semibold">{produto.getCodigoProduto()}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {actionIcons.map(({ key, label, Icon, field, modal }) => {
            if (field) {
              const isActive = toggleStates[field]
              const isLoading = Boolean(savingToggleState?.[field])
              const iconColor = isActive ? 'text-primary' : 'text-white'
              const bgColor = isActive
                ? 'bg-primary text-white border border-primary'
                : 'bg-gray-300 border border-transparent'

              return (
                <button
                  key={`${produto.getId()}-${key}`}
                  type="button"
                  title={label}
                  disabled={isLoading}
                  onClick={() => onToggleBoolean?.(field, !isActive)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${bgColor} ${iconColor} ${isLoading
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-primary/80 hover:text-white  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80'
                    }`}
                >
                  <Icon />
                </button>
              )
            }

            if (modal) {
              const handleModalClick =
                modal === 'complementos'
                  ? onOpenComplementosModal
                  : modal === 'impressoras'
                    ? onOpenImpressorasModal
                    : undefined

              return (
                <button
                  key={`${produto.getId()}-${key}`}
                  type="button"
                  title={label}
                  disabled={!handleModalClick}
                  onClick={() => handleModalClick?.()}
                  className={`w-8 h-8 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!handleModalClick ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/10'}`}
                >
                  <Icon />
                </button>
              )
            }

            if (key === 'copiar') {
              return (
                <button
                  key={`${produto.getId()}-${key}`}
                  type="button"
                  title={label}
                  onClick={() => onCopyProduto?.(produto.getId())}
                  className="w-8 h-8 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-lg hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon />
                </button>
              )
            }

            return (
              <span
                key={`${produto.getId()}-${key}`}
                title={label}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-lg"
              >
                <Icon />
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap justify-end">
        <div className="flex flex-col">
          <label className="text-xs text-secondary-text font-nunito mb-1">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text text-sm">
              R$
            </span>
            <input
              type="text"
              value={valorInput}
              onChange={(event) => setValorInput(event.target.value)}
              onBlur={handleValorSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              disabled={isSavingValor}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none text-sm font-semibold text-primary-text w-32 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-[11px] text-secondary-text mt-1">{valorFormatado}</span>
        </div>
        <div className="flex items-center">
          <label
            title="Ativar/Desativar produto"
            className={`relative inline-flex h-7 w-12 items-center ${isSavingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAtivo}
              onChange={(event) => onSwitchToggle?.(event.target.checked)}
              disabled={isSavingStatus}
            />
            <div
              className="h-full w-full rounded-full bg-gray-300 transition-colors peer-focus:ring-2 peer-focus:ring-primary peer-checked:bg-accent1"
            />
            <span
              className="absolute left-1 top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-5"
            />
          </label>
        </div>
        <Suspense fallback={<div className="h-10 w-10" />}>
          <ProdutoActionsMenu
            produtoId={produto.getId()}
            produtoAtivo={isAtivo}
            onStatusChanged={onMenuStatusChanged}
            onEdit={onEditProduto}
            onCopy={onCopyProduto}
          />
        </Suspense>
      </div>
    </div>
  )
}

/**
 * Lista de produtos com scroll infinito
 * Usa React Query para cache automático e deduplicação de requisições
 */
export function ProdutosList({ onReload }: ProdutosListProps) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [limitFilter, setLimitFilter] = useState(10)
  const [ativoLocalFilter, setAtivoLocalFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [ativoDeliveryFilter, setAtivoDeliveryFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [grupoProdutoFilter, setGrupoProdutoFilter] = useState('')
  const [grupoComplementoFilter, setGrupoComplementoFilter] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [localProdutos, setLocalProdutos] = useState<Produto[]>([])
  const [savingValorMap, setSavingValorMap] = useState<Record<string, boolean>>({})
  const [savingStatusMap, setSavingStatusMap] = useState<Record<string, boolean>>({})
  const [savingToggleMap, setSavingToggleMap] = useState<
    Record<string, Partial<Record<ToggleField, boolean>>>
  >({})
  const pendingUpdatesRef = useRef<
    Map<
      string,
      {
        valor?: number
        ativo?: boolean
        favorito?: boolean
        permiteAcrescimo?: boolean
        permiteDesconto?: boolean
        abreComplementos?: boolean
      }
    >
  >(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<ProdutosTabsModalState>({
    open: false,
    tab: 'produto',
    mode: 'create',
    prefillGrupoProdutoId: undefined,
  })

  const {
    data: gruposProdutos = [],
    isLoading: isLoadingGruposProdutos,
  } = useGruposProdutos({
    limit: 100,
    ativo: null,
  })

  const {
    data: gruposComplementos = [],
    isLoading: isLoadingGruposComplementos,
  } = useGruposComplementos({
    limit: 100,
    ativo: null,
  })
  const token = auth?.getAccessToken()
  const invalidateProdutosQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['produtos', 'infinite'],
      exact: false,
    })
  }, [queryClient])

  const openTabsModal = useCallback(
    (config: Partial<ProdutosTabsModalState>) => {
      setTabsModalState(() => ({
        open: true,
        tab: config.tab ?? 'produto',
        mode: config.mode ?? 'create',
        produto: config.produto,
        prefillGrupoProdutoId: config.prefillGrupoProdutoId ?? undefined,
      }))
    },
    []
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      produto: undefined,
      prefillGrupoProdutoId: undefined,
    }))
  }, [])

  const handleTabsModalReload = useCallback(() => {
    invalidateProdutosQueries()
    onReload?.()
  }, [invalidateProdutosQueries, onReload])

  const handleTabsModalTabChange = useCallback((tab: 'produto' | 'complementos' | 'impressoras') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleCreateProduto = useCallback(() => {
    openTabsModal({
      tab: 'produto',
      mode: 'create',
      produto: undefined,
      prefillGrupoProdutoId: undefined,
    })
  }, [openTabsModal])

  const handleCreateProdutoForGroup = useCallback(
    (grupoNome: string) => {
      if (!grupoNome || grupoNome.toLowerCase() === 'sem grupo') {
        handleCreateProduto()
        return
      }

      const normalized = grupoNome.trim().toLowerCase()
      const matchedGroup = gruposProdutos.find(
        (grupo) => grupo.getNome().trim().toLowerCase() === normalized
      )

      openTabsModal({
        tab: 'produto',
        mode: 'create',
        produto: undefined,
        prefillGrupoProdutoId: matchedGroup?.getId(),
      })
    },
    [gruposProdutos, handleCreateProduto, openTabsModal]
  )
  const setPendingUpdate = useCallback(
    (
      produtoId: string,
      changes: {
        valor?: number
        ativo?: boolean
        favorito?: boolean
        permiteAcrescimo?: boolean
        permiteDesconto?: boolean
        abreComplementos?: boolean
      }
    ) => {
      const current = pendingUpdatesRef.current.get(produtoId) || {}
      pendingUpdatesRef.current.set(produtoId, { ...current, ...changes })
    },
    []
  )
  const clearPendingUpdateField = useCallback(
    (
      produtoId: string,
      field:
        | 'valor'
        | 'ativo'
        | 'favorito'
        | 'permiteAcrescimo'
        | 'permiteDesconto'
        | 'abreComplementos'
    ) => {
      const current = pendingUpdatesRef.current.get(produtoId)
      if (!current) return
      const updated = { ...current }
      delete updated[field]
      if (Object.keys(updated).length === 0) {
        pendingUpdatesRef.current.delete(produtoId)
      } else {
        pendingUpdatesRef.current.set(produtoId, updated)
      }
    },
    []
  )
  const setSavingToggleState = useCallback((produtoId: string, field: ToggleField, value: boolean) => {
    setSavingToggleMap((prev) => {
      const current = prev[produtoId] || {}
      if (value) {
        return {
          ...prev,
          [produtoId]: { ...current, [field]: true },
        }
      }

      const { [field]: _, ...restFields } = current
      if (Object.keys(restFields).length === 0) {
        const { [produtoId]: __, ...restProducts } = prev
        return restProducts
      }

      return {
        ...prev,
        [produtoId]: restFields,
      }
    })
  }, [])

  // Debounce da busca (500ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  // Determina o filtro ativo (memoizado)
  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Desativado' ? false : null
  }, [filterStatus])

  const ativoLocalBoolean = useMemo<boolean | null>(() => {
    if (ativoLocalFilter === 'Sim') return true
    if (ativoLocalFilter === 'Não') return false
    return null
  }, [ativoLocalFilter])

  const ativoDeliveryBoolean = useMemo<boolean | null>(() => {
    if (ativoDeliveryFilter === 'Sim') return true
    if (ativoDeliveryFilter === 'Não') return false
    return null
  }, [ativoDeliveryFilter])

  const queryParams = useMemo(
    () => ({
      name: debouncedSearch || undefined,
      ativo: ativoFilter,
      ativoLocal: ativoLocalBoolean,
      ativoDelivery: ativoDeliveryBoolean,
      grupoProdutoId: grupoProdutoFilter || undefined,
      grupoComplementosId: grupoComplementoFilter || undefined,
      limit: limitFilter,
    }),
    [
      debouncedSearch,
      ativoFilter,
      ativoLocalBoolean,
      ativoDeliveryBoolean,
      grupoProdutoFilter,
      grupoComplementoFilter,
      limitFilter,
    ]
  )

  // Hook otimizado com React Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
  } = useProdutosInfinite(queryParams)

  // Achatando todas as páginas em uma única lista (memoizado)
  const produtos = useMemo(() => {
    return data?.pages.flatMap((page) => page.produtos) || []
  }, [data])

  useEffect(() => {
    if (produtos.length === 0) {
      setLocalProdutos([])
      return
    }

    const merged = produtos.map((produto) => {
      const pending = pendingUpdatesRef.current.get(produto.getId())
      if (!pending) {
        return produto
      }
      return cloneProdutoWithChanges(produto, pending)
    })

    const sorted = sortProdutosAlphabetically(merged)
    setLocalProdutos(sorted)

    produtos.forEach((produto) => {
      const pending = pendingUpdatesRef.current.get(produto.getId())
      if (!pending) return
      const valorOk =
        pending.valor === undefined || produto.getValor() === Number(pending.valor)
      const ativoOk = pending.ativo === undefined || produto.isAtivo() === pending.ativo
      const favoritoOk =
        pending.favorito === undefined || produto.isFavorito() === pending.favorito
      const acrescimoOk =
        pending.permiteAcrescimo === undefined ||
        produto.permiteAcrescimoAtivo() === pending.permiteAcrescimo
      const descontoOk =
        pending.permiteDesconto === undefined ||
        produto.permiteDescontoAtivo() === pending.permiteDesconto
      const abreComplementosOk =
        pending.abreComplementos === undefined ||
        produto.abreComplementosAtivo() === pending.abreComplementos

      if (valorOk && ativoOk && favoritoOk && acrescimoOk && descontoOk && abreComplementosOk) {
        pendingUpdatesRef.current.delete(produto.getId())
      }
    })
  }, [produtos])

  const produtosAgrupados = useMemo(() => {
    const gruposMap = new Map<string, Produto[]>()
    localProdutos.forEach((produto) => {
      const grupo = normalizeGroupName(produto.getNomeGrupo())
      if (!gruposMap.has(grupo)) {
        gruposMap.set(grupo, [])
      }
      gruposMap.get(grupo)?.push(produto)
    })
    return Array.from(gruposMap.entries())
  }, [localProdutos])

  useEffect(() => {
    setExpandedGroups((prev) => {
      const gruposAtuais = new Set(produtosAgrupados.map(([grupo]) => grupo))
      let changed = false
      const novoEstado: Record<string, boolean> = {}

      produtosAgrupados.forEach(([grupo]) => {
        if (typeof prev[grupo] === 'undefined') {
          changed = true
          novoEstado[grupo] = true
        } else {
          novoEstado[grupo] = prev[grupo]
        }
      })

      Object.keys(prev).forEach((grupo) => {
        if (!gruposAtuais.has(grupo)) {
          changed = true
        }
      })

      return changed ? novoEstado : prev
    })
  }, [produtosAgrupados])

  // Intersection Observer para carregar 10 em 10
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage || isFetching) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
            fetchNextPage()
          }
        })
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '10px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, produtos.length])

  // Notificar erro
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }, [error])

  const handleValorUpdate = useCallback(
    async (produtoId: string, novoValor: number) => {
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      if (Number.isNaN(novoValor) || novoValor < 0) {
        showToast.error('Informe um valor válido para o produto.')
        return
      }

      const currentIndex = localProdutos.findIndex((produto) => produto.getId() === produtoId)
      if (currentIndex === -1) {
        showToast.error('Produto não encontrado na lista.')
        return
      }

      const previousProduto = localProdutos[currentIndex]
      let previousIndex = currentIndex

      setSavingValorMap((prev) => ({ ...prev, [produtoId]: true }))
      setPendingUpdate(produtoId, { valor: novoValor })
      setLocalProdutos((prev) => {
        const index = prev.findIndex((produto) => produto.getId() === produtoId)
        if (index === -1) {
          return prev
        }
        const updated = cloneProdutoWithChanges(prev[index], { valor: novoValor })
        const clone = [...prev]
        clone[index] = updated
        return sortProdutosAlphabetically(clone)
      })

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ valor: novoValor }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar valor')
        }

        showToast.success('Valor atualizado com sucesso!')
        onReload?.()
        await invalidateProdutosQueries()
      } catch (error: any) {
        console.error('Erro ao atualizar valor do produto:', error)
        setLocalProdutos((prev) => {
          if (!previousProduto) {
            return prev
          }
          const clone = [...prev]
          const index = clone.findIndex((produto) => produto.getId() === produtoId)
          if (index === -1) {
            const insertIndex =
              previousIndex >= 0 ? Math.min(previousIndex, clone.length) : clone.length
            clone.splice(insertIndex, 0, previousProduto)
          } else {
            clone[index] = previousProduto
          }
          return sortProdutosAlphabetically(clone)
        })
        clearPendingUpdateField(produtoId, 'valor')
        showToast.error(error.message || 'Erro ao atualizar valor do produto')
      } finally {
        setSavingValorMap((prev) => {
          const { [produtoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [token, onReload, localProdutos, setPendingUpdate, clearPendingUpdateField, invalidateProdutosQueries]
  )

  const handleStatusToggle = useCallback(
    async (produtoId: string, novoStatus: boolean) => {
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const currentIndex = localProdutos.findIndex((produto) => produto.getId() === produtoId)
      if (currentIndex === -1) {
        showToast.error('Produto não encontrado na lista.')
        return
      }

      const previousProduto = localProdutos[currentIndex]
      let previousIndex = currentIndex

      setSavingStatusMap((prev) => ({ ...prev, [produtoId]: true }))
      setPendingUpdate(produtoId, { ativo: novoStatus })
      setLocalProdutos((prev) => {
        const index = prev.findIndex((produto) => produto.getId() === produtoId)
        if (index === -1) {
          return prev
        }
        const updated = cloneProdutoWithChanges(prev[index], { ativo: novoStatus })
        const clone = [...prev]
        clone[index] = updated

        if (
          (filterStatus === 'Ativo' && !novoStatus) ||
          (filterStatus === 'Desativado' && novoStatus)
        ) {
          clone.splice(index, 1)
        }

        return sortProdutosAlphabetically(clone)
      })

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar status')
        }

        showToast.success(
          novoStatus ? 'Produto ativado com sucesso!' : 'Produto desativado com sucesso!'
        )
        onReload?.()
        await invalidateProdutosQueries()
      } catch (error: any) {
        console.error('Erro ao atualizar status do produto:', error)
        setLocalProdutos((prev) => {
          if (!previousProduto) {
            return prev
          }
          const clone = [...prev]
          const index = clone.findIndex((produto) => produto.getId() === produtoId)
          if (index >= 0) {
            clone[index] = previousProduto
          } else {
            const insertIndex =
              previousIndex >= 0 ? Math.min(previousIndex, clone.length) : clone.length
            clone.splice(insertIndex, 0, previousProduto)
          }
          return sortProdutosAlphabetically(clone)
        })
        clearPendingUpdateField(produtoId, 'ativo')
        showToast.error(error.message || 'Erro ao atualizar status do produto')
      } finally {
        setSavingStatusMap((prev) => {
          const { [produtoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [token, filterStatus, onReload, localProdutos, setPendingUpdate, clearPendingUpdateField, invalidateProdutosQueries]
  )

  const handleToggleBooleanField = useCallback(
    async (produtoId: string, field: ToggleField, novoValor: boolean) => {
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const currentIndex = localProdutos.findIndex((produto) => produto.getId() === produtoId)
      if (currentIndex === -1) {
        showToast.error('Produto não encontrado na lista.')
        return
      }

      const previousProduto = localProdutos[currentIndex]
      let previousIndex = currentIndex

      const config = toggleFieldConfig[field]
      const change = buildToggleChange(field, novoValor)

      setSavingToggleState(produtoId, field, true)
      setPendingUpdate(produtoId, change)
      setLocalProdutos((prev) => {
        const index = prev.findIndex((produto) => produto.getId() === produtoId)
        if (index === -1) {
          return prev
        }
        const updated = cloneProdutoWithChanges(prev[index], change)
        const clone = [...prev]
        clone[index] = updated
        return sortProdutosAlphabetically(clone)
      })

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ [config.bodyKey]: novoValor }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar produto')
        }

        showToast.success(novoValor ? config.successTrue : config.successFalse)
        onReload?.()
        await invalidateProdutosQueries()
      } catch (error: any) {
        console.error('Erro ao atualizar produto:', error)
        setLocalProdutos((prev) => {
          if (!previousProduto) {
            return prev
          }
          const clone = [...prev]
          const index = clone.findIndex((produto) => produto.getId() === produtoId)
          if (index === -1) {
            const insertIndex =
              previousIndex >= 0 ? Math.min(previousIndex, clone.length) : clone.length
            clone.splice(insertIndex, 0, previousProduto)
          } else {
            clone[index] = previousProduto
          }
          return sortProdutosAlphabetically(clone)
        })
        clearPendingUpdateField(produtoId, field)
        showToast.error(error.message || 'Erro ao atualizar produto')
      } finally {
        setSavingToggleState(produtoId, field, false)
      }
    },
    [
      token,
      onReload,
      localProdutos,
      setPendingUpdate,
      clearPendingUpdateField,
      invalidateProdutosQueries,
      setSavingToggleState,
    ]
  )

  const handleMenuStatusChanged = useCallback(() => {
    onReload?.()
    invalidateProdutosQueries()
  }, [invalidateProdutosQueries, onReload])

  const handleClearFilters = useCallback(() => {
    setSearchText('')
    setFilterStatus('Ativo')
    setAtivoLocalFilter('Todos')
    setAtivoDeliveryFilter('Todos')
    setGrupoProdutoFilter('')
    setGrupoComplementoFilter('')
    setLimitFilter(10)
  }, [])

  const handleOpenComplementosModal = useCallback(
    (produto: Produto) => {
      openTabsModal({ tab: 'complementos', mode: 'edit', produto })
    },
    [openTabsModal]
  )

  const handleOpenImpressorasModal = useCallback(
    (produto: Produto) => {
      openTabsModal({ tab: 'impressoras', mode: 'edit', produto })
    },
    [openTabsModal]
  )

  const handleEditProduto = useCallback(
    (produtoId: string) => {
      const produto = localProdutos.find((item) => item.getId() === produtoId)
      if (!produto) return
      openTabsModal({ tab: 'produto', mode: 'edit', produto })
    },
    [localProdutos, openTabsModal]
  )

  const handleCopyProduto = useCallback(
    (produtoId: string) => {
      const produto = localProdutos.find((item) => item.getId() === produtoId)
      if (!produto) return
      openTabsModal({ tab: 'produto', mode: 'copy', produto })
    },
    [localProdutos, openTabsModal]
  )

  const handleToggleGroup = useCallback((grupo: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [grupo]: !prev[grupo],
    }))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] py-[4px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="pl-5">
              <p className="text-primary text-sm font-semibold font-nunito">
                Produtos Cadastrados
              </p>
              <p className="text-tertiary text-[22px] font-medium font-nunito">
                Total {localProdutos.length}
              </p>
            </div>
            <div className="flex items-center justify-end flex-1">
              <button
                onClick={() =>
                  openTabsModal({
                    tab: 'produto',
                    mode: 'create',
                    produto: undefined,
                  })
                }
                className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                Novo
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[4px] border-t-2 border-alternate"></div>
      <div className="bg-white px-[20px] py-2 border-b border-gray-100">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="produtos-search" className="text-xs font-semibold text-secondary-text mb-1 block">
               Buscar produto...
            </label>
            <div className="relative h-8">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
              <input
                id="produtos-search"
                type="text"
                placeholder="Pesquisar produto..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-[24px] border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')}
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no local</label>
            <select
              value={ativoLocalFilter}
              onChange={(e) => setAtivoLocalFilter(e.target.value as 'Todos' | 'Sim' | 'Não')}
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Ativo no delivery</label>
            <select
              value={ativoDeliveryFilter}
              onChange={(e) => setAtivoDeliveryFilter(e.target.value as 'Todos' | 'Sim' | 'Não')}
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Sim">Sim</option>
              <option value="Não">Não</option>
            </select>
          </div>

          <div className="w-full sm:w-[220px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Grupo de produtos</label>
            <select
              value={grupoProdutoFilter}
              onChange={(e) => setGrupoProdutoFilter(e.target.value)}
              disabled={isLoadingGruposProdutos}
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{isLoadingGruposProdutos ? 'Carregando...' : 'Todos'}</option>
              {!isLoadingGruposProdutos &&
                gruposProdutos.map((grupo) => (
                  <option key={grupo.getId()} value={grupo.getId()}>
                    {grupo.getNome()}
                  </option>
                ))}
            </select>
          </div>

          <div className="w-full sm:w-[220px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Grupo de complementos</label>
            <select
              value={grupoComplementoFilter}
              onChange={(e) => setGrupoComplementoFilter(e.target.value)}
              disabled={isLoadingGruposComplementos}
              className="w-full h-8 px-5 rounded-[24px] border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{isLoadingGruposComplementos ? 'Carregando...' : 'Todos'}</option>
              {!isLoadingGruposComplementos &&
                gruposComplementos.map((grupo) => (
                  <option key={grupo.getId()} value={grupo.getId()}>
                    {grupo.getNome()}
                  </option>
                ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClearFilters}
              className="h-8 px-5 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text bg-white hover:bg-gray-50 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de produtos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-4 space-y-6"
      >
        {(isLoading || (produtos.length === 0 && isFetching)) && (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={`grupo-skeleton-${index}`} className="space-y-3">
                <div className="h-5 w-40 rounded-full bg-gray-200 animate-pulse" />
                {[...Array(3)].map((__, i) => (
                  <div key={`grupo-skeleton-${index}-${i}`} className="h-[90px] bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        )}

        {localProdutos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {produtosAgrupados.map(([grupo, items]) => (
          <div key={grupo} className="space-y-3">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-primary-text uppercase tracking-wide">
                  {grupo}
                </p>
                <p className="text-xs text-secondary-text">{items.length} produtos</p>
              </div>
            
             <div className="flex items-center justify-end flex-1">
               <button
                 onClick={() => handleCreateProdutoForGroup(grupo)}
                 className="h-6 px-[20px] bg-info border border-primary text-primary rounded-[10px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors"
               >
                 Adicionar produto
                 <span className="text-sm">+</span>
               </button>
             </div>
              <button
                type="button"
                onClick={() => handleToggleGroup(grupo)}
                className="flex items-center gap-1 text-primary text-sm font-semibold hover:text-primary/80 transition-colors"
                aria-expanded={expandedGroups[grupo] !== false}
              >
                <span>{expandedGroups[grupo] === false ? 'Exibir' : 'Ocultar'}</span>
                <MdKeyboardArrowDown
                  className={`text-lg transition-transform ${expandedGroups[grupo] === false ? '-rotate-90' : 'rotate-0'}`}
                />
              </button>
            </div>

            {expandedGroups[grupo] === false ? (
              <div className="rounded-xl border border-dashed border-secondary/40 px-4 py-3 text-sm text-secondary-text">
                Produtos ocultos. Clique em "Exibir" para visualizar.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((produto) => (
                  <ProdutoListItem
                    key={produto.getId()}
                    produto={produto}
                    onValorChange={(valor) => handleValorUpdate(produto.getId(), valor)}
                    onSwitchToggle={(status) => handleStatusToggle(produto.getId(), status)}
                    onMenuStatusChanged={handleMenuStatusChanged}
                    onToggleBoolean={(field, value) => handleToggleBooleanField(produto.getId(), field, value)}
                    savingToggleState={savingToggleMap[produto.getId()]}
                    onOpenComplementosModal={() => handleOpenComplementosModal(produto)}
                    onOpenImpressorasModal={() => handleOpenImpressorasModal(produto)}
                    isSavingValor={Boolean(savingValorMap[produto.getId()])}
                    isSavingStatus={Boolean(savingStatusMap[produto.getId()])}
                    onEditProduto={handleEditProduto}
                    onCopyProduto={handleCopyProduto}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {hasNextPage && !isFetchingNextPage && (
          <div ref={loadMoreRef} className="h-10" />
        )}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <ProdutosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
    </div>
  )
}
