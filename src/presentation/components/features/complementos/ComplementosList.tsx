'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useComplementosInfinite } from '@/src/presentation/hooks/useComplementos'
import { useQueryClient } from '@tanstack/react-query'
import {
  ComplementosTabsModal,
  ComplementosTabsModalState,
} from './ComplementosTabsModal'

interface ComplementosListProps {
  onReload?: () => void
}

/**
 * Linha da tabela (memo) — mesmo padrão de GruposComplementosList / GrupoItem
 */
const ComplementoRow = memo(function ComplementoRow({
  complemento,
  index,
  valorDisplay,
  onValorChange,
  onValorSubmit,
  onValorKeyDown,
  onValorFocus,
  onTipoChange,
  onToggleStatus,
  onRowClick,
  savingValor,
  savingTipo,
  togglingStatus,
}: {
  complemento: Complemento
  index: number
  valorDisplay: string
  onValorChange: (id: string, value: string) => void
  onValorSubmit: (id: string) => void
  onValorKeyDown: (id: string, e: React.KeyboardEvent<HTMLInputElement>) => void
  onValorFocus: (e: React.FocusEvent<HTMLInputElement>) => void
  onTipoChange: (id: string, v: 'nenhum' | 'aumenta' | 'diminui') => void
  onToggleStatus: (c: Complemento, novo: boolean) => void
  onRowClick: (c: Complemento) => void
  savingValor: boolean
  savingTipo: boolean
  togglingStatus: boolean
}) {
  const isZebraEven = index % 2 === 0
  const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

  return (
    <div
      onClick={() => onRowClick(complemento)}
      className={`${bgClass} rounded-lg md:px-4 px-1 py-3 flex items-center md:gap-[10px] gap-1 hover:bg-secondary-bg/15 cursor-pointer`}
    >
      <div className="md:flex-[3] flex-[2] font-normal md:text-sm text-[10px] text-primary-text flex items-center gap-1">
        <span># {complemento.getNome()}</span>
      </div>
      <div className="flex-[3] text-sm text-secondary-text hidden md:flex">
        {complemento.getDescricao() || 'Nenhuma'}
      </div>

      <div className="flex-[2]" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center justify-end gap-2 px-3 py-1 rounded-lg border border-gray-300 bg-white max-w-[140px]">
            <input
              type="text"
              value={valorDisplay}
              onChange={e => onValorChange(complemento.getId(), e.target.value)}
              onFocus={onValorFocus}
              onBlur={() => onValorSubmit(complemento.getId())}
              onKeyDown={e => onValorKeyDown(complemento.getId(), e)}
              onClick={e => e.stopPropagation()}
              disabled={savingValor}
              className={`w-full bg-transparent text-left md:text-sm text-[10px] font-normal text-primary-text focus:outline-none ${
                savingValor ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>
      </div>

      <div
        className="flex-1 md:text-sm text-[10px] text-secondary-text text-center"
        onClick={e => e.stopPropagation()}
      >
        <select
          value={(complemento.getTipoImpactoPreco() || 'nenhum').toLowerCase()}
          onChange={e =>
            onTipoChange(complemento.getId(), e.target.value as 'nenhum' | 'aumenta' | 'diminui')
          }
          onClick={e => e.stopPropagation()}
          disabled={savingTipo}
          className={`w-full px-0 py-1 rounded-lg border border-gray-300 bg-white md:text-sm text-[10px] font-normal text-primary-text focus:outline-none focus:border-primary text-center ${
            savingTipo ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          <option value="nenhum">Nenhum</option>
          <option value="aumenta">Aumenta</option>
          <option value="diminui">Diminui</option>
        </select>
      </div>
      <div
        className="md:flex-[2] flex-[1] flex justify-end"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        title={complemento.isAtivo() ? 'Complemento Ativo' : 'Complemento Desativado'}
      >
        <JiffyIconSwitch
          checked={complemento.isAtivo()}
          onChange={event => {
            event.stopPropagation()
            onToggleStatus(complemento, event.target.checked)
          }}
          disabled={togglingStatus}
           label={complemento.isAtivo() ? 'Ativo' : 'Inativo'}
            labelPosition="start"
          bordered={false}
          size="sm"
          className="shrink-0"
          inputProps={{
            'aria-label': complemento.isAtivo() ? 'Desativar complemento' : 'Ativar complemento',
            onClick: e => e.stopPropagation(),
          }}
        />
      </div>
    </div>
  )
})

export function ComplementosList({ onReload }: ComplementosListProps) {
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos')
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [valorInputs, setValorInputs] = useState<Record<string, string>>({})
  const [savingValorMap, setSavingValorMap] = useState<Record<string, boolean>>({})
  const [savingTipoMap, setSavingTipoMap] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<ComplementosTabsModalState>({
    open: false,
    tab: 'complemento',
    mode: 'create',
    complementoId: undefined,
  })

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const valorDebounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const handleValorSubmitRef = useRef<((complementoId: string) => Promise<void>) | null>(null)

  const { auth } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const queryClient = useQueryClient()

  const ativoFilter = useMemo<boolean | null>(() => {
    return filterStatus === 'Ativo' ? true : filterStatus === 'Inativo' ? false : null
  }, [filterStatus])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useComplementosInfinite({
    q: debouncedSearch || undefined,
    ativo: ativoFilter,
    limit: 10,
  })

  useEffect(() => {
    if (!isLoading && !isFetching) {
      setHasLoadedOnce(true)
    }
  }, [isLoading, isFetching])

  const complementos = useMemo(() => {
    return data?.pages.flatMap(page => page.complementos) || []
  }, [data])

  const totalComplementos = useMemo(() => data?.pages[0]?.count ?? 0, [data])

  // Debounce da busca (500ms) — igual GruposComplementosList
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

  // Preenche inputs de valor quando novos itens entram (páginas infinitas)
  const formatValorFromNumber = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }, [])

  useEffect(() => {
    setValorInputs(prev => {
      let changed = false
      const next = { ...prev }
      for (const c of complementos) {
        if (next[c.getId()] === undefined) {
          next[c.getId()] = formatValorFromNumber(c.getValor())
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [complementos, formatValorFromNumber])

  const formatValorInput = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return 'R$ 0,00'
    const numberValue = parseInt(digits, 10)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue / 100)
  }, [])

  const parseValorToNumber = useCallback((value: string) => {
    const normalized = value.replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [])

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      return
    }
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current
      if (!container) {
        scrollTimeoutRef.current = null
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
      if (distanceFromBottom < 400) {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }
      scrollTimeoutRef.current = null
    }, 100)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [handleScroll])

  // Próximas páginas automáticas — mesmo efeito que GruposComplementosList
  useEffect(() => {
    if (!hasNextPage) return
    if (!isFetching && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetching, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar complementos:', error)
    }
  }, [error])

  useEffect(() => {
    return () => {
      valorDebounceTimersRef.current.forEach(t => clearTimeout(t))
      valorDebounceTimersRef.current.clear()
    }
  }, [])

  const handleActionsReload = useCallback(async () => {
    await refetch()
    onReload?.()
  }, [refetch, onReload])

  const clearValorDebounceTimer = useCallback((complementoId: string) => {
    const timer = valorDebounceTimersRef.current.get(complementoId)
    if (timer) {
      clearTimeout(timer)
      valorDebounceTimersRef.current.delete(complementoId)
    }
  }, [])

  const handleValorInputChange = useCallback(
    (complementoId: string, value: string) => {
      setValorInputs(prev => ({
        ...prev,
        [complementoId]: formatValorInput(value),
      }))
      clearValorDebounceTimer(complementoId)
      const timer = setTimeout(() => {
        if (handleValorSubmitRef.current) {
          handleValorSubmitRef.current(complementoId)
        }
        valorDebounceTimersRef.current.delete(complementoId)
      }, 2000)
      valorDebounceTimersRef.current.set(complementoId, timer)
    },
    [formatValorInput, clearValorDebounceTimer]
  )

  const handleValorSubmit = useCallback(
    async (complementoId: string) => {
      clearValorDebounceTimer(complementoId)
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const valorString = valorInputs[complementoId]
      const novoValor = parseValorToNumber(valorString ?? '')
      if (Number.isNaN(novoValor)) {
        showToast.error('Informe um valor válido.')
        return
      }

      const complementoAtual = complementos.find(item => item.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      if (novoValor === complementoAtual.getValor()) {
        return
      }

      setSavingValorMap(prev => ({ ...prev, [complementoId]: true }))

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
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
        await refetch()
        onReload?.()
      } catch (err: unknown) {
        console.error('Erro ao atualizar valor do complemento:', err)
        const message = err instanceof Error ? err.message : 'Erro ao atualizar valor do complemento'
        showToast.error(message)
        setValorInputs(prev => ({
          ...prev,
          [complementoId]: formatValorFromNumber(complementoAtual.getValor()),
        }))
      } finally {
        setSavingValorMap(prev => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [
      auth,
      valorInputs,
      parseValorToNumber,
      complementos,
      formatValorFromNumber,
      clearValorDebounceTimer,
      refetch,
      onReload,
    ]
  )

  useEffect(() => {
    handleValorSubmitRef.current = handleValorSubmit
  }, [handleValorSubmit])

  const handleTipoImpactoChange = useCallback(
    async (complementoId: string, novoTipo: 'nenhum' | 'aumenta' | 'diminui') => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoAtual = complementos.find(item => item.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const tipoAtual = (complementoAtual.getTipoImpactoPreco() || 'nenhum').toLowerCase()
      if (tipoAtual === novoTipo) {
        return
      }

      setSavingTipoMap(prev => ({ ...prev, [complementoId]: true }))

      try {
        const payloadTipo = novoTipo.toLowerCase()
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tipoImpactoPreco: payloadTipo }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar tipo de impacto')
        }

        showToast.success('Tipo de impacto atualizado com sucesso!')
        await refetch()
        onReload?.()
      } catch (err: unknown) {
        console.error('Erro ao atualizar tipo de impacto:', err)
        const message =
          err instanceof Error ? err.message : 'Erro ao atualizar tipo de impacto'
        showToast.error(message)
      } finally {
        setSavingTipoMap(prev => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, complementos, refetch, onReload]
  )

  const handleToggleComplementoStatus = useCallback(
    async (complemento: Complemento, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoId = complemento.getId()
      setTogglingStatus(prev => ({ ...prev, [complementoId]: true }))

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar complemento')
        }

        showToast.success(
          novoStatus ? 'Complemento ativado com sucesso!' : 'Complemento desativado com sucesso!'
        )
        await handleActionsReload()
      } catch (err: unknown) {
        console.error('Erro ao atualizar status do complemento:', err)
        const message =
          err instanceof Error ? err.message : 'Erro ao atualizar status do complemento'
        showToast.error(message)
      } finally {
        setTogglingStatus(prev => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, handleActionsReload]
  )

  const openTabsModal = useCallback(
    (config: Partial<ComplementosTabsModalState> = {}) => {
      setTabsModalState(() => ({
        open: true,
        tab: config.tab ?? 'complemento',
        mode: config.mode ?? 'create',
        complementoId: config.complementoId,
      }))
      const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
      currentSearchParams.set('modalComplementoOpen', 'true')
      router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    },
    [router, searchParams, pathname]
  )

  const closeTabsModal = useCallback(async () => {
    setTabsModalState(prev => ({
      ...prev,
      open: false,
      complementoId: undefined,
    }))
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalComplementoOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh()
    await queryClient.invalidateQueries({ queryKey: ['complementos'], exact: false })
  }, [router, searchParams, pathname, queryClient])

  const handleTabsModalReload = useCallback(async () => {
    await handleActionsReload()
  }, [handleActionsReload])

  const handleTabsModalTabChange = useCallback((tab: 'complemento') => {
    setTabsModalState(prev => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleRowOpenEdit = useCallback(
    (c: Complemento) => {
      openTabsModal({
        mode: 'edit',
        complementoId: c.getId(),
      })
    },
    [openTabsModal]
  )

  const handleValorKeyDown = useCallback(
    (id: string, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleValorSubmit(id)
      }
    },
    [handleValorSubmit]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="md:px-[30px] flex-shrink-0 px-2 py-[4px]">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col md:pl-5">
            <p className="text-primary text-sm font-semibold">Complementos Cadastrados</p>
            <p className="text-tertiary md:text-[22px] text-sm font-normal">
              Total {complementos.length} de {totalComplementos}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              openTabsModal({
                mode: 'create',
                complementoId: undefined,
              })
            }
            className="h-8 md:px-[30px] px-4 bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[2px] border-t-2 border-primary/70 flex-shrink-0" />

      <div className="flex flex-shrink-0 gap-3 md:px-[20px] px-2 py-2">
        <div className="max-w-[360px] min-w-[180px] flex-1">
          <div className="relative h-8">
            <MdSearch
              className="text-secondary-text absolute left-4 top-1/2 -translate-y-1/2"
              size={18}
            />
            <input
              id="complementos-search"
              type="text"
              placeholder="Pesquisar complemento..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="focus:border-primary h-full w-full rounded-lg border border-gray-200 bg-info pl-12 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none"
            />
          </div>
        </div>

        <div className="w-full flex gap-1 items-center sm:w-[160px]">
          <label className="text-secondary-text mb-1 block text-xs font-semibold">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Inativo')}
            className="focus:border-primary h-8 w-full rounded-lg border border-gray-200 bg-info px-5 text-sm text-primary-text focus:outline-none"
          >
            <option value="Todos">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      <div className="md:px-[30px] mt-0 flex-shrink-0 px-1">
        <div className="bg-custom-2 flex h-10 items-center gap-[10px] rounded-lg px-1 md:px-4">
          <div className="md:flex-[3] flex-[2] font-semibold text-xs text-primary-text md:text-sm">
            Nome
          </div>
          <div className="hidden flex-[3] font-semibold text-xs text-primary-text md:flex md:text-sm">
            Descrição
          </div>
          <div className="flex-[2] font-semibold text-xs text-primary-text md:text-sm">
            Valor
          </div>
          <div className="flex-[1] text-center font-semibold text-xs text-primary-text md:text-sm">
            Impacto
          </div>
          <div className="md:flex-[2] flex-[1] text-end font-semibold text-xs text-primary-text md:mt-0 md:text-end md:text-sm">
            Status
          </div>
        </div>
      </div>

      {/* Só as linhas rolam: ocupa todo o espaço restante abaixo do cabeçalho das colunas (sem max-h). */}
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-2 pt-2 scrollbar-hide md:px-[30px]"
      >
        {(isLoading || (complementos.length === 0 && isFetching)) && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <JiffyLoading />
          </div>
        )}

        {complementos.length === 0 && !isLoading && !isFetching && hasLoadedOnce && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum complemento encontrado.</p>
          </div>
        )}

        {complementos.map((complemento, index) => (
          <ComplementoRow
            key={complemento.getId()}
            complemento={complemento}
            index={index}
            valorDisplay={
              valorInputs[complemento.getId()] ?? formatValorFromNumber(complemento.getValor())
            }
            onValorChange={handleValorInputChange}
            onValorSubmit={handleValorSubmit}
            onValorKeyDown={handleValorKeyDown}
            onValorFocus={e => e.target.select()}
            onTipoChange={handleTipoImpactoChange}
            onToggleStatus={handleToggleComplementoStatus}
            onRowClick={handleRowOpenEdit}
            savingValor={!!savingValorMap[complemento.getId()]}
            savingTipo={!!savingTipoMap[complemento.getId()]}
            togglingStatus={!!togglingStatus[complemento.getId()]}
          />
        ))}

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <ComplementosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
    </div>
  )
}
