'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
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
import { useRouter, useSearchParams, usePathname } from 'next/navigation'


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
    produto.getGrupoId(),
    produto.getEstoque(),
    changes.favorito ?? produto.isFavorito(),
    changes.abreComplementos ?? produto.abreComplementosAtivo(),
    changes.permiteAcrescimo ?? produto.permiteAcrescimoAtivo(),
    changes.permiteDesconto ?? produto.permiteDescontoAtivo(),
    produto.getGruposComplementos()
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
  const formatCurrencyValue = useCallback((value: number | string) => {
    const numberValue =
      typeof value === 'number'
        ? value
        : Number(value.replace(/\D/g, '')) / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(Number.isNaN(numberValue) ? 0 : numberValue)
  }, [])

  const [valorInput, setValorInput] = useState(formatCurrencyValue(produto.getValor()))

  useEffect(() => {
    setValorInput(formatCurrencyValue(produto.getValor()))
  }, [produto, formatCurrencyValue])

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

  // Salva automaticamente após alguns segundos sem digitar (debounce)
  useEffect(() => {
    if (!onValorChange) return undefined
    const timeout = setTimeout(() => {
      handleValorSubmit()
    }, 1500)

    return () => clearTimeout(timeout)
  }, [valorInput, handleValorSubmit, onValorChange])

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

  const firstRowActions = useMemo(() => actionIcons.slice(0, 3), [actionIcons])
  const secondRowActions = useMemo(() => actionIcons.slice(3), [actionIcons])

  // Handler para abrir edição ao clicar na linha
  const handleRowClick = useCallback(() => {
    onEditProduto?.(produto.getId())
  }, [produto, onEditProduto])

  return (
    <div 
      onClick={handleRowClick}
      className="bg-white border border-gray-100 hover:bg-secondary-text/10 rounded-2xl md:px-4 px-2 md:py-2 py-1 mb-2 shadow-sm shadow-primary-text/50 flex items-center gap-4 cursor-pointer"
    >
      {/*<div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-2xl">
        <MdImage />
      </div>*/}

      <div className="flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-primary-text font-semibold font-nunito md:text-base text-sm flex flex-col-reverse md:flex-row md:items-center items-start md:gap-2">
            {produto.getNome()}
            <span className="text-sm text-secondary-text md:ml-2 inline-flex items-center gap-1">
              <span className="text-xs">Cód. </span>
              <span className="font-semibold">{produto.getCodigoProduto()}</span>
            </span>
          </p>
        </div>
        {/* Mobile: 3 ícones na primeira linha, 4 na segunda */}
        <div
          className="mt-2 inline-grid grid-cols-3 gap-2 w-fit md:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {firstRowActions.map(({ key, label, Icon, field, modal }) => {
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-sm transition-all ${bgColor} ${iconColor} ${isLoading
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
                  className={`w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!handleModalClick ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/10'}`}
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
                  className="w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon />
                </button>
              )
            }

            return (
              <span
                key={`${produto.getId()}-${key}`}
                title={label}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-sm"
              >
                <Icon />
              </span>
            )
          })}
        </div>
        <div
          className="mt-2 inline-grid grid-cols-4 gap-2 w-fit md:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {secondRowActions.map(({ key, label, Icon, field, modal }) => {
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-sm transition-all ${bgColor} ${iconColor} ${
                    isLoading
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
                  className={`w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    !handleModalClick ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
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
                  className="w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon />
                </button>
              )
            }

            return (
              <span
                key={`${produto.getId()}-${key}`}
                title={label}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-sm"
              >
                <Icon />
              </span>
            )
          })}
        </div>

        {/* Desktop: linha única */}
        <div className="hidden md:flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-sm transition-all ${bgColor} ${iconColor} ${
                    isLoading
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
                  className={`w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    !handleModalClick ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
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
                  className="w-5 h-5 rounded-full bg-gray-100 border border-primary flex items-center justify-center text-[var(--color-primary)] text-sm hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon />
                </button>
              )
            }

            return (
              <span
                key={`${produto.getId()}-${key}`}
                title={label}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[var(--color-primary)] text-sm"
              >
                <Icon />
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col-reverse md:flex-row md:mr-16 items-end gap-4 flex-wrap justify-end md:items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col">
          <label className="text-xs text-secondary-text font-nunito mb-1">Valor (R$)</label>
          <div className="relative">
            
            <input
              type="text"
              value={valorInput}
              onChange={(event) => {
                const raw = event.target.value
                setValorInput(formatCurrencyValue(raw))
              }}
              onFocus={(event) => {
                event.target.select()
              }}
              onClick={(event) => {
                // Seleciona tudo a cada clique para facilitar a edição rápida
                event.currentTarget.select()
                event.stopPropagation()
              }}
              onMouseUp={(event) => {
                // Evita que o mouseup remova a seleção aplicada no focus/click
                event.preventDefault()
              }}
              onBlur={handleValorSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              disabled={isSavingValor}
              className=" p-2 rounded-xl border border-gray-200 focus:border-primary focus:outline-none md:text-sm text-xs font-semibold text-primary-text w-32 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex items-center">
          <label
            title="Ativar/Desativar produto"
            className={`relative inline-flex h-5 w-12 items-center ${isSavingStatus ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isAtivo}
              onChange={(event) => {
                event.stopPropagation()
                onSwitchToggle?.(event.target.checked)
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={isSavingStatus}
            />
            <div
              className="h-full w-full rounded-full bg-gray-300 transition-colors peer-focus:ring-2 peer-focus:ring-primary peer-checked:bg-primary"
            />
            <span
              className="absolute left-1 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6"
            />
          </label>
        </div>
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  // Limite máximo permitido pela API externa é 100
  const [limitFilter, setLimitFilter] = useState(100)
  const [ativoLocalFilter, setAtivoLocalFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [ativoDeliveryFilter, setAtivoDeliveryFilter] = useState<'Todos' | 'Sim' | 'Não'>('Todos')
  const [grupoProdutoFilter, setGrupoProdutoFilter] = useState('')
  const [grupoComplementoFilter, setGrupoComplementoFilter] = useState('')
  // Inicializa isMobile e filtrosVisiveis corretamente para evitar flash de conteúdo
  // Filtros começam ocultos por padrão (assumindo mobile durante SSR)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    // Durante SSR, assume mobile para evitar flash
    return true
  })
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    if (typeof window !== 'undefined') {
      // Em desktop, filtros são visíveis; em mobile, ocultos
      return window.innerWidth >= 768
    }
    // Durante SSR, assume mobile (filtros ocultos)
    return false
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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
    grupoId: undefined,
  })

  const {
    data: gruposProdutos = [],
    isLoading: isLoadingGruposProdutos,
  } = useGruposProdutos({
    limit: 100,
    ativo: null,
  })
  const grupoProdutoMap = useMemo(() => {
    const map = new Map<
      string,
      {
        corHex: string
        iconName: string
      }
    >()
    gruposProdutos.forEach((grupo) => {
      map.set(grupo.getId(), { corHex: grupo.getCorHex(), iconName: grupo.getIconName() })
    })
    return map
  }, [gruposProdutos])

  const {
    data: gruposComplementos = [],
    isLoading: isLoadingGruposComplementos,
  } = useGruposComplementos({
    limit: 100,
    ativo: null,
  })
  const token = auth?.getAccessToken()

  // Exibe toggle de filtros apenas em telas menores
  useEffect(() => {
    const updateIsMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setFiltrosVisiveis(!mobile)
    }
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  const invalidateProdutosQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['produtos', 'infinite'],
      exact: false,
    })
  }, [queryClient])

  const invalidateGruposProdutosQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['grupos-produtos'],
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
        grupoId: config.grupoId,
      }))

      // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar
      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      produto: undefined,
      prefillGrupoProdutoId: undefined,
      grupoId: undefined,
    }))

    // Remover o parâmetro da URL
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    // Não fazer router.refresh() aqui para evitar recarregamento desnecessário
    // As invalidações e reloads devem ser feitas apenas quando há mudanças (via handleTabsModalReload)
  }, [router, searchParams, pathname])

  /**
   * Atualiza o cache do React Query diretamente ao invés de invalidar e refazer requisição
   * Isso evita requisições desnecessárias quando editamos um produto existente
   */
  const updateProdutoInCache = useCallback((produtoId: string, produtoData: any) => {
    // Atualizar todas as queries infinitas de produtos
    queryClient.setQueriesData(
      { queryKey: ['produtos', 'infinite'], exact: false },
      (oldData: any) => {
        if (!oldData?.pages) return oldData

        // Percorrer todas as páginas e atualizar o produto se encontrado
        const updatedPages = oldData.pages.map((page: any) => {
          const updatedProdutos = page.produtos.map((produto: Produto) => {
            if (produto.getId() === produtoId) {
              // Criar novo produto com dados atualizados
              try {
                return Produto.fromJSON(produtoData)
              } catch (error) {
                console.error('Erro ao atualizar produto no cache:', error)
                return produto // Retorna o produto original em caso de erro
              }
            }
            return produto
          })
          return {
            ...page,
            produtos: updatedProdutos,
          }
        })

        return {
          ...oldData,
          pages: updatedPages,
        }
      }
    )
  }, [queryClient])

  const handleTabsModalReload = useCallback((produtoId?: string, produtoData?: any) => {
    // Se temos dados do produto editado, atualizar o cache diretamente
    if (produtoId && produtoData) {
      updateProdutoInCache(produtoId, produtoData)
    } else {
      // Se for criação de novo produto, invalidar para buscar a lista atualizada
      queryClient.invalidateQueries({
        queryKey: ['produtos', 'infinite'],
        exact: false,
        refetchType: 'active',
      })
    }
  }, [queryClient, updateProdutoInCache])

  const handleTabsModalTabChange = useCallback((tab: 'produto' | 'complementos' | 'impressoras' | 'grupo') => {
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
      // Se for "__none__", não passa o parâmetro para a API (filtrará no frontend)
      grupoComplementosId: grupoComplementoFilter === '__none__' ? undefined : grupoComplementoFilter || undefined,
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
  // Usar Map para evitar duplicatas e garantir ordem consistente
  const produtos = useMemo(() => {
    if (!data?.pages) return []
    
    const produtosMap = new Map<string, Produto>()
    
    // Processar todas as páginas em ordem
    data.pages.forEach((page) => {
      page.produtos.forEach((produto) => {
        const id = produto.getId()
        // Se o produto já existe, manter o primeiro (mais antigo)
        // Isso garante que produtos não sejam substituídos por versões mais antigas
        if (!produtosMap.has(id)) {
          produtosMap.set(id, produto)
        }
      })
    })
    
    let produtosList = Array.from(produtosMap.values())
    
    // Filtrar produtos sem grupo de complementos se o filtro "Nenhum" estiver ativo
    if (grupoComplementoFilter === '__none__') {
      produtosList = produtosList.filter((produto) => {
        const gruposComplementos = produto.getGruposComplementos()
        return !gruposComplementos || gruposComplementos.length === 0
      })
    }
    
    return produtosList
  }, [data, grupoComplementoFilter])

  const totalProdutos = useMemo(() => {
    return data?.pages?.[0]?.count ?? 0
  }, [data])

  useEffect(() => {
    if (produtos.length === 0) {
      setLocalProdutos([])
      return
    }

    // Aplicar updates pendentes aos produtos
    const merged = produtos.map((produto) => {
      const pending = pendingUpdatesRef.current.get(produto.getId())
      if (!pending) {
        return produto
      }
      return cloneProdutoWithChanges(produto, pending)
    })

    // Remover duplicatas baseado no ID (pode acontecer se a mesma página for carregada múltiplas vezes)
    const produtosUnicos = new Map<string, Produto>()
    merged.forEach((produto) => {
      const id = produto.getId()
      // Manter o produto mais recente (com base na ordem de chegada)
      if (!produtosUnicos.has(id)) {
        produtosUnicos.set(id, produto)
      }
    })

    // Converter de volta para array e ordenar
    const produtosArray = Array.from(produtosUnicos.values())
    const sorted = sortProdutosAlphabetically(produtosArray)
    setLocalProdutos(sorted)

    // Limpar updates pendentes que já foram aplicados
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

  // Carregar automaticamente todas as páginas antes de exibir
  useEffect(() => {
    // Se ainda há páginas para carregar e não está carregando, carrega automaticamente
    if (hasNextPage && !isFetchingNextPage && !isFetching && data) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetching, fetchNextPage, data])

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
        // Não invalidar cache imediatamente - a atualização otimista já atualizou a UI
        // O cache será invalidado apenas quando necessário (ex: ao fechar modal, mudar filtros, etc)
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
    [token, localProdutos, setPendingUpdate, clearPendingUpdateField]
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
        // Não invalidar cache imediatamente - a atualização otimista já atualizou a UI
        // O cache será invalidado apenas quando necessário (ex: ao fechar modal, mudar filtros, etc)
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
    [token, filterStatus, localProdutos, setPendingUpdate, clearPendingUpdateField]
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
        // Não invalidar cache imediatamente - a atualização otimista já atualizou a UI
        // O cache será invalidado apenas quando necessário (ex: ao fechar modal, mudar filtros, etc)
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
      localProdutos,
      setPendingUpdate,
      clearPendingUpdateField,
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
    // Manter limit alto para carregar todos os produtos
    // setLimitFilter(1000) - já está no valor padrão
  }, [])

  const handleOpenComplementosModal = useCallback(
    (produto: Produto) => {
      openTabsModal({ tab: 'complementos', mode: 'edit', produto, grupoId: produto.getGrupoId() })
    },
    [openTabsModal]
  )

  const handleOpenImpressorasModal = useCallback(
    (produto: Produto) => {
      openTabsModal({ tab: 'impressoras', mode: 'edit', produto, grupoId: produto.getGrupoId() })
    },
    [openTabsModal]
  )

  const handleEditProduto = useCallback(
    (produtoId: string) => {
      const produto = localProdutos.find((item) => item.getId() === produtoId)
      if (!produto) return
      openTabsModal({ tab: 'produto', mode: 'edit', produto, grupoId: produto.getGrupoId() })
    },
    [localProdutos, openTabsModal]
  )

  const handleCopyProduto = useCallback(
    (produtoId: string) => {
      const produto = localProdutos.find((item) => item.getId() === produtoId)
      if (!produto) return
      openTabsModal({ tab: 'produto', mode: 'copy', produto, grupoId: produto.getGrupoId() })
    },
    [localProdutos, openTabsModal]
  )

  const handleEditGrupoProduto = useCallback(
    (grupoId?: string, produto?: Produto) => {
      if (!grupoId) return
      openTabsModal({
        tab: 'grupo',
        mode: 'edit',
        grupoId,
        produto,
      })
    },
    [openTabsModal]
  )

  const handleToggleGroupStatus = useCallback(
    async (grupoId?: string) => {
      if (!grupoId) return
      const token = auth?.getAccessToken()
      if (!token) return

      try {
        const response = await fetch(`/api/grupos-produtos/${grupoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ativo: !gruposProdutos.find((grupo) => grupo.getId() === grupoId)?.isAtivo(),
          }),
        })

        if (!response.ok) {
          throw new Error('Erro ao atualizar grupo')
        }

        await invalidateGruposProdutosQueries()
        await invalidateProdutosQueries()
      } catch (error) {
        console.error('Erro ao atualizar status do grupo:', error)
      }
    },
    [auth, gruposProdutos, invalidateGruposProdutosQueries, invalidateProdutosQueries]
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
      <div className="md:px-[30px] px-1 flex-shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="md:pl-5 mb-2">
              <p className="text-primary text-sm font-semibold font-nunito">
                Produtos Cadastrados
              </p>
              <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
                Total {localProdutos.length} de {totalProdutos}
              </p>
            </div>
            <div className="flex flex-col md:flex-row mb-2 items-center justify-end flex-1 md:gap-4 gap-1">
            <Link
              href="/produtos/atualizar-preco"
              className="md:h-8 h-6 md:px-4 px-2 bg-info text-primary-text border border-primary/50 rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center gap-2 hover:bg-primary/10 transition-colors"
            >
              Atualizar Preços
            </Link>
              <button
                onClick={() =>
                  openTabsModal({
                    tab: 'produto',
                    mode: 'create',
                    produto: undefined,
                  })
                }
                className="md:h-8 h-6 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                Novo
                <span className="text-lg">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[4px] border-t-2 border-primary/50 flex-shrink-0"></div>
      <div className="bg-white md:px-[20px] px-1 md:py-2 border-b border-gray-100 flex-shrink-0">
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
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>
        {/* Toggle de filtros apenas no mobile */}
        <div className="flex w-full sm:hidden justify-end items-center mt-2">
          <button
            type="button"
            onClick={() => setFiltrosVisiveis((prev) => !prev)}
            className="px-3 py-1 rounded-md bg-primary text-white text-xs font-nunito shadow-sm"
            aria-expanded={filtrosVisiveis}
          >
            {filtrosVisiveis ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        </div>

        <div
          className={`hidden sm:flex flex-wrap items-end gap-2 ${
            isMobile && filtrosVisiveis ? '!flex' : ''
          }`}
        >
          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')}
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
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
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
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
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">{isLoadingGruposComplementos ? 'Carregando...' : 'Todos'}</option>
              <option value="__none__">Nenhum</option>
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
              className="h-8 px-5 rounded-lg border border-primary/50 text-sm font-semibold text-primary-text bg-white hover:bg-primary/10 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de produtos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 md:mt-4 mt-2 space-y-6 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Mostrar loading quando está carregando e não há produtos ainda */}
        {(isLoading || isFetching || isFetchingNextPage || (localProdutos.length === 0 && !data)) && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <img
              src="/images/jiffy-loading.gif"
              alt="Carregando..."
              className="w-20 h-20"
            />
            <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
          </div>
        )}

        {/* Só exibir mensagem de "nenhum produto" quando realmente não há produtos e não está carregando */}
        {localProdutos.length === 0 && !isLoading && !isFetching && !isFetchingNextPage && data && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum produto encontrado.</p>
          </div>
        )}

        {/* Só renderizar grupos quando não estiver carregando mais páginas */}
        {!isLoading && !isFetching && !isFetchingNextPage && !hasNextPage && localProdutos.length > 0 && (
          <>
            {produtosAgrupados.map(([grupo, items]) => {
          const primeiroProduto = items[0]
          const grupoId = primeiroProduto?.getGrupoId()
          const grupoVisual = grupoId ? grupoProdutoMap.get(grupoId) : undefined
          return (
            <div key={grupo} className="space-y-3">
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-3">
                  {grupoVisual ? (
                    <span
                      className="w-9 h-9 rounded-[10px] border-2 flex items-center justify-center bg-white text-[var(--grupo-color)] transition-colors hover:bg-[var(--grupo-color)] hover:text-white"
                      style={{
                        borderColor: grupoVisual.corHex,
                        ['--grupo-color' as any]: grupoVisual.corHex,
                      }}
                    >
                      <DinamicIcon iconName={grupoVisual.iconName} color="currentColor" size={18} />
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-gray-200 border border-gray-300" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-text uppercase tracking-wide">
                        {grupo}
                      </p>
                      <button
                        type="button"
                        title="Editar grupo"
                        onClick={() => handleEditGrupoProduto(grupoId, primeiroProduto)}
                        disabled={!grupoId}
                        className={`w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-primary-text hover:bg-primary/10 transition-colors ${
                          !grupoId ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <MdModeEdit size={14} />
                      </button>
                      <label className="relative inline-flex items-center h-5 w-12">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={grupoVisual ? gruposProdutos.find((g) => g.getId() === grupoId)?.isAtivo() ?? true : true}
                          onChange={() => handleToggleGroupStatus(grupoId)}
                          disabled={!grupoId}
                        />
                        <div className="w-full h-full rounded-full bg-gray-300 peer-checked:bg-primary transition-colors" />
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow peer-checked:translate-x-6 transition-transform" />
                      </label>
                    </div>
                    <p className="text-xs text-secondary-text">{items.length} produtos</p>
                    {grupoVisual && !gruposProdutos.find((g) => g.getId() === grupoId)?.isAtivo() && (
                      <p className="text-[11px] text-error font-semibold uppercase">Grupo inativo</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row items-center justify-end flex-1 md:gap-4 gap-2">
                  <button
                    onClick={() => handleCreateProdutoForGroup(grupo)}
                    className="h-8 md:px-[20px] px-2 bg-info border border-primary/50 text-primary rounded-lg font-semibold font-exo md:text-sm text-xs flex items-center md:gap-2 hover:bg-primary/10 transition-colors"
                  >
                    Adicionar produto
                    <span className="text-sm">+</span>
                  </button>
                <button
                  type="button"
                  onClick={() => handleToggleGroup(grupo)}
                  className="flex items-center gap-1 text-primary md:text-sm text-xs font-semibold hover:text-primary/80 transition-colors"
                  aria-expanded={expandedGroups[grupo] !== false}
                >
                  <span>{expandedGroups[grupo] === false ? 'Exibir' : 'Ocultar'}</span>
                  <MdKeyboardArrowDown
                    className={`text-lg transition-transform ${expandedGroups[grupo] === false ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>
              </div>
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
          )
        })}
          </>
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
