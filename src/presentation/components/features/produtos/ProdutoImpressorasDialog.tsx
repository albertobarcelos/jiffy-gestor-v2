'use client'

import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdAdd, MdClose, MdPrint, MdSearch, MdEdit } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  ImpressorasTabsModal,
  ImpressorasTabsModalState,
} from '@/src/presentation/components/features/impressoras/ImpressorasTabsModal'
import { cn } from '@/src/shared/utils/cn'

interface ProdutoImpressora {
  id: string
  nome: string
  modelo?: string
  local?: string
  tipoConexao?: string
  ip?: string
  porta?: string
  ativo?: boolean
}

/** Resumo vindo de `Produto.getImpressoras()` — evita loading bloqueante duplicado quando o modal já tem os vínculos. */
export type ProdutoImpressoraResumoInicial = Readonly<{
  id: string
  nome: string
  ativo: boolean
}>

function mapResumoToImpressoras(
  resumo?: ReadonlyArray<ProdutoImpressoraResumoInicial>
): ProdutoImpressora[] {
  if (!resumo?.length) return []
  return resumo
    .filter(i => Boolean(i?.id))
    .map(i => ({
      id: i.id,
      nome: i.nome || 'Impressora',
      ativo: i.ativo,
    }))
}

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export type ProdutoImpressorasHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

export type ProdutoImpressorasEmbedState = {
  isDirty: boolean
  isSaving: boolean
}

interface ProdutoImpressorasDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  /** Vínculos já conhecidos no estado do modal de abas (lista do produto / entidade em memória). */
  initialImpressorasResumo?: ReadonlyArray<ProdutoImpressoraResumoInicial>
  onClose: () => void
  isEmbedded?: boolean
  onEmbedStateChange?: (state: ProdutoImpressorasEmbedState) => void
}

/**
 * Modal / aba para vincular impressoras a um produto (persistência no Salvar).
 */
export const ProdutoImpressorasDialog = forwardRef<
  ProdutoImpressorasHandle,
  ProdutoImpressorasDialogProps
>(function ProdutoImpressorasDialog(
  {
    open,
    produtoId,
    produtoNome: _produtoNome,
    initialImpressorasResumo,
    onClose,
    isEmbedded = false,
    onEmbedStateChange,
  },
  ref
) {
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'vinculados' | 'disponiveis' | 'todos'>('vinculados')
  const [impressoras, setImpressoras] = useState<ProdutoImpressora[]>(() =>
    mapResumoToImpressoras(initialImpressorasResumo)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allImpressoras, setAllImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoadingAllImpressoras, setIsLoadingAllImpressoras] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const baselineImpressorasIdsRef = useRef<string[]>(
    mapResumoToImpressoras(initialImpressorasResumo).map(i => i.id)
  )
  const isDirtyRef = useRef(false)
  const [impressorasModalState, setImpressorasModalState] = useState<ImpressorasTabsModalState>({
    open: false,
    tab: 'impressora',
    mode: 'create',
  })

  /** Ordem das linhas do catálogo enquanto o painel está aberto (sem reordenar a cada toggle). */
  const sessionCatalogOrderRef = useRef<string[] | null>(null)
  const [sessionOrderTick, setSessionOrderTick] = useState(0)

  const loadImpressoras = useCallback(
    async (signal?: AbortSignal) => {
      if (!produtoId) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        setError('Token não encontrado. Faça login novamente.')
        setImpressoras([])
        setIsLoading(false)
        return
      }

      const hasSeed = baselineImpressorasIdsRef.current.length > 0
      if (!(isEmbedded && hasSeed)) {
        setIsLoading(true)
      }
      setError(null)
      try {
        const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || errorData.message || 'Erro ao carregar impressoras do produto'
          )
        }

        const produto = await response.json()
        const impressorasData: ProdutoImpressora[] = (produto.impressoras || [])
          .map((item: any) => ({
            id: item.id?.toString() || '',
            nome: item.nome?.toString() || 'Impressora',
            modelo: item.modelo?.toString(),
            local: item.local?.toString(),
            tipoConexao: item.tipoConexao?.toString(),
            ip: item.ip?.toString(),
            porta: item.porta?.toString(),
            ativo: item.ativo === true || item.ativo === 'true',
          }))
          .filter((item: ProdutoImpressora) => Boolean(item.id))

        if (isDirtyRef.current) {
          setImpressoras(prev =>
            prev.map(local => {
              const fromServer = impressorasData.find(i => i.id === local.id)
              return fromServer ?? local
            })
          )
        } else {
          setImpressoras(impressorasData)
          baselineImpressorasIdsRef.current = impressorasData.map(i => i.id)
        }
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
          return
        }
        console.error(err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar impressoras')
        setImpressoras([])
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [produtoId, isEmbedded]
  )

  const loadAllImpressoras = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      setAllImpressoras([])
      return
    }

    setIsLoadingAllImpressoras(true)
    try {
      const limit = 100
      let offset = 0
      let hasMore = true
      const collected: ProdutoImpressora[] = []

      while (hasMore) {
        const response = await fetchGestorApi(`/api/impressoras?limit=${limit}&offset=${offset}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.message || 'Erro ao carregar impressoras')
        }

        const data = await response.json()
        const items: ProdutoImpressora[] = (data.items || []).map((item: any) => ({
          id: item.id?.toString() || '',
          nome: item.nome?.toString() || 'Impressora',
          modelo: item.modelo?.toString(),
          local: item.local?.toString(),
          tipoConexao: item.tipoConexao?.toString(),
          ip: item.ip?.toString(),
          porta: item.porta?.toString(),
          ativo: item.ativo === true || item.ativo === 'true',
        }))

        collected.push(...items.filter(printer => Boolean(printer.id)))

        const fetchedCount = items.length
        const totalCount = data.count ?? collected.length
        offset += fetchedCount
        hasMore = fetchedCount === limit && collected.length < totalCount
      }

      setAllImpressoras(collected)
    } catch (err) {
      console.error(err)
      showToast.error(err instanceof Error ? err.message : 'Erro ao carregar impressoras.')
    } finally {
      setIsLoadingAllImpressoras(false)
    }
  }, [])

  // Antes do paint: spinner só se não há seed (lista do produto) — em embed evita flash de loading.
  useLayoutEffect(() => {
    if (open && produtoId && isRehydrated) {
      const hasSeed = baselineImpressorasIdsRef.current.length > 0 || impressoras.length > 0
      if (!isEmbedded && !hasSeed) {
        setIsLoading(true)
      }
    }
    if (!open || !produtoId) {
      setIsLoading(false)
    }
    // impressoras só no momento da abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, produtoId, isRehydrated, isEmbedded])

  useEffect(() => {
    if (!open || !produtoId || !isRehydrated) {
      return
    }

    const ac = new AbortController()
    setSearchQuery('')
    void loadImpressoras(ac.signal)
    void loadAllImpressoras()

    return () => {
      // Não chamar setIsLoading(false) aqui: no Strict Mode o cleanup roda entre duas execuções
      // do efeito e gera um frame “vazio” sem spinner enquanto o segundo fetch ainda não terminou.
      ac.abort()
    }
  }, [open, produtoId, isRehydrated, loadImpressoras, loadAllImpressoras])

  useEffect(() => {
    if (!open) {
      sessionCatalogOrderRef.current = null
      setSessionOrderTick(0)
      setFilterTab('vinculados')
      setSearchQuery('')
      baselineImpressorasIdsRef.current = []
      isDirtyRef.current = false
      setIsSaving(false)
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
    }
  }, [open, onEmbedStateChange])

  const linkedIds = useMemo(() => {
    return new Set(impressoras.map(i => i.id))
  }, [impressoras])

  /** Catálogo + vínculos seedados (mostra "Neste produto" sem esperar `/api/impressoras`). */
  const catalogoComVinculos = useMemo(() => {
    const byId = new Map<string, ProdutoImpressora>()
    for (const i of allImpressoras) byId.set(i.id, i)
    for (const i of impressoras) {
      if (!byId.has(i.id)) byId.set(i.id, i)
    }
    return Array.from(byId.values())
  }, [allImpressoras, impressoras])

  const filterCounts = useMemo(() => {
    const vinculados = linkedIds.size
    const catalogSize = allImpressoras.length
    return {
      vinculados,
      disponiveis: catalogSize > 0 ? Math.max(0, catalogSize - vinculados) : 0,
      todos: catalogSize > 0 ? catalogSize : vinculados,
    }
  }, [linkedIds, allImpressoras])

  /** Captura ordem inicial (vinculadas primeiro) uma vez por abertura, após catálogo e vínculos carregados */
  useEffect(() => {
    if (!open || isLoading || isLoadingAllImpressoras || allImpressoras.length === 0) return
    if (sessionCatalogOrderRef.current !== null) return

    const normalized = searchQuery.trim().toLowerCase()
    const filtered = !normalized
      ? [...allImpressoras]
      : allImpressoras.filter(impressora => {
          const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
          return target.toLowerCase().includes(normalized)
        })

    const linkedSet = new Set(impressoras.map(i => i.id))
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
    const sorted = [...filtered].sort((a, b) => {
      const aLinked = linkedSet.has(a.id)
      const bLinked = linkedSet.has(b.id)
      if (aLinked !== bLinked) return aLinked ? -1 : 1
      return collator.compare(a.nome, b.nome)
    })
    sessionCatalogOrderRef.current = sorted.map(i => i.id)
    setSessionOrderTick(t => t + 1)
  }, [open, isLoading, isLoadingAllImpressoras, allImpressoras, searchQuery, impressoras])

  const findImpressoraById = useCallback(
    (id: string): ProdutoImpressora | undefined => {
      return allImpressoras.find(item => item.id === id) || impressoras.find(item => item.id === id)
    },
    [allImpressoras, impressoras]
  )

  const filteredAllImpressoras = useMemo(() => {
    const base = catalogoComVinculos
    const normalized = searchQuery.trim().toLowerCase()
    const bySearch = !normalized
      ? [...base]
      : base.filter(impressora => {
          const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
          return target.toLowerCase().includes(normalized)
        })

    const filtrados =
      filterTab === 'vinculados'
        ? bySearch.filter(i => linkedIds.has(i.id))
        : filterTab === 'disponiveis'
          ? bySearch.filter(i => !linkedIds.has(i.id))
          : bySearch

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

    if (filterTab !== 'todos') {
      return [...filtrados].sort((a, b) => collator.compare(a.nome, b.nome))
    }

    const ordemSessao = sessionCatalogOrderRef.current
    if (!open || ordemSessao === null) {
      return [...filtrados].sort((a, b) => {
        const aLinked = linkedIds.has(a.id)
        const bLinked = linkedIds.has(b.id)
        if (aLinked !== bLinked) return aLinked ? -1 : 1
        return collator.compare(a.nome, b.nome)
      })
    }

    const ordemMap = new Map(ordemSessao.map((id, idx) => [id, idx]))
    return [...filtrados].sort((a, b) => {
      const ia = ordemMap.get(a.id)
      const ib = ordemMap.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return collator.compare(a.nome, b.nome)
    })
  }, [catalogoComVinculos, searchQuery, filterTab, linkedIds, open, sessionOrderTick])

  const handleClose = () => {
    onClose()
  }

  const handleOpenNovaImpressora = () => {
    setImpressorasModalState({
      open: true,
      tab: 'impressora',
      mode: 'create',
    })
  }

  const handleCloseImpressorasModal = () => {
    setImpressorasModalState(prev => ({ ...prev, open: false }))
    // Recarregar impressoras após fechar o modal de edição
    loadImpressoras()
  }

  const handleImpressorasModalReload = () => {
    // Recarregar lista de impressoras disponíveis quando uma nova for criada
    loadAllImpressoras()
    // Recarregar também as impressoras vinculadas ao produto
    loadImpressoras()
  }

  const handleEditImpressora = useCallback((impressora: ProdutoImpressora) => {
    setImpressorasModalState({
      open: true,
      tab: 'impressora',
      mode: 'edit',
      impressoraId: impressora.id,
    })
  }, [])

  const handleImpressorasTabChange = (tab: 'impressora') => {
    setImpressorasModalState(prev => ({ ...prev, tab }))
  }

  const persistImpressorasSelection = useCallback(
    async (
      ids: string[],
      successMessage?: string,
      options?: { optimisticPreApplied?: boolean }
    ) => {
      if (!produtoId) {
        showToast.error('Produto não encontrado.')
        return false
      }

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return false
      }

      try {
        const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ impressorasIds: ids }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar impressoras do produto')
        }

        if (!options?.optimisticPreApplied) {
          const updatedList: ProdutoImpressora[] = ids.map(printerId => {
            const detalhes = findImpressoraById(printerId)
            if (detalhes) {
              return detalhes
            }
            return {
              id: printerId,
              nome: 'Impressora',
              ativo: true,
            }
          })
          setImpressoras(updatedList)
        }

        if (successMessage) {
          showToast.success(successMessage)
        } else {
          showToast.success('Impressoras atualizadas com sucesso!')
        }
        return true
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar impressoras.')
        return false
      }
    },
    [produtoId, findImpressoraById]
  )

  const handleToggleVinculo = useCallback(
    (impressoraId: string, vincular: boolean) => {
      if (isSaving) return

      const next = new Set(linkedIds)
      if (vincular) next.add(impressoraId)
      else next.delete(impressoraId)
      const newIds = Array.from(next)

      const optimisticList: ProdutoImpressora[] = newIds.map(printerId => {
        const detalhes = findImpressoraById(printerId)
        if (detalhes) return detalhes
        return {
          id: printerId,
          nome: 'Impressora',
          ativo: true,
        }
      })
      setImpressoras(optimisticList)

      if (sessionCatalogOrderRef.current) {
        if (!vincular) {
          sessionCatalogOrderRef.current = sessionCatalogOrderRef.current.filter(
            x => x !== impressoraId
          )
        } else if (!sessionCatalogOrderRef.current.includes(impressoraId)) {
          sessionCatalogOrderRef.current = [...sessionCatalogOrderRef.current, impressoraId]
        }
        setSessionOrderTick(t => t + 1)
      }

      isDirtyRef.current = !sameIdSet(newIds, baselineImpressorasIdsRef.current)
      onEmbedStateChange?.({ isDirty: isDirtyRef.current, isSaving: false })
    },
    [isSaving, linkedIds, findImpressoraById, onEmbedStateChange]
  )

  const savePendingImpressoras = useCallback(async (): Promise<boolean> => {
    if (!produtoId) {
      showToast.error('Produto não encontrado.')
      return false
    }

    const currentIds = impressoras.map(i => i.id)
    const baselineIds = baselineImpressorasIdsRef.current
    if (sameIdSet(currentIds, baselineIds)) {
      isDirtyRef.current = false
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
      return true
    }

    setIsSaving(true)
    onEmbedStateChange?.({ isDirty: true, isSaving: true })
    try {
      const ok = await persistImpressorasSelection(currentIds, 'Impressoras atualizadas com sucesso!', {
        optimisticPreApplied: true,
      })
      if (ok) {
        baselineImpressorasIdsRef.current = [...currentIds]
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
      } else {
        onEmbedStateChange?.({ isDirty: true, isSaving: false })
      }
      return ok
    } finally {
      setIsSaving(false)
    }
  }, [produtoId, impressoras, persistImpressorasSelection, onEmbedStateChange])

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () =>
        !sameIdSet(
          impressoras.map(i => i.id),
          baselineImpressorasIdsRef.current
        ),
      save: () => savePendingImpressoras(),
    }),
    [impressoras, savePendingImpressoras]
  )

  useEffect(() => {
    const dirty = !sameIdSet(
      impressoras.map(i => i.id),
      baselineImpressorasIdsRef.current
    )
    isDirtyRef.current = dirty
    onEmbedStateChange?.({ isDirty: dirty, isSaving })
  }, [impressoras, isSaving, onEmbedStateChange])

  /** Só bloqueia a UI se não há nada para mostrar (seed / vínculos locais). */
  const carregandoListaImpressoras =
    (isLoading || isLoadingAllImpressoras) &&
    impressoras.length === 0 &&
    allImpressoras.length === 0

  /** Mesmo shell visual de `renderCatalogoGruposCard` em ComplementosMultiSelectDialog */
  const renderCatalogoImpressorasCard = () => (
    <div className="mb-4 flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {carregandoListaImpressoras && !error ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <JiffyLoading />
        </div>
      ) : error && !isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
          <p className="text-sm text-secondary-text">{error}</p>
          <button
            type="button"
            onClick={() => {
              void loadImpressoras()
              void loadAllImpressoras()
            }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[140px] flex-1">
              <MdSearch
                className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar impressora..."
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex h-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
              {(['vinculados', 'disponiveis', 'todos'] as const).map(tab => {
                const labels = {
                  vinculados: 'Neste produto',
                  disponiveis: 'Disponíveis',
                  todos: 'Todos',
                }
                const count = filterCounts[tab]
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={cn(
                      'flex h-full items-center gap-1.5 px-2.5 transition-colors',
                      filterTab === tab
                        ? 'bg-primary text-white'
                        : 'bg-white text-secondary-text hover:bg-gray-50'
                    )}
                  >
                    <span>{labels[tab]}</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        filterTab === tab ? 'text-white/80' : 'text-secondary-text/80'
                      )}
                    >
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="scrollbar-hide max-h-[280px] min-h-0 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50 md:max-h-[360px]">
            {filteredAllImpressoras.length ? (
              <ul className="divide-y divide-gray-100">
                {filteredAllImpressoras.map(impressora => {
                  const isLinked = linkedIds.has(impressora.id)
                  const isRowLoading = isSaving
                  return (
                    <li
                      key={impressora.id}
                      className={cn(
                        'flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80',
                        !isLinked && filterTab === 'todos' && 'opacity-70'
                      )}
                    >
                      <div className="min-w-0 flex-1 py-2">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-medium text-primary-text">
                            {impressora.nome || 'Impressora'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleEditImpressora(impressora)}
                            disabled={isSaving}
                            className="shrink-0 text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Editar ${impressora.nome}`}
                            title="Editar impressora"
                          >
                            <MdEdit size={16} />
                          </button>
                        </div>
                        {(impressora.modelo ||
                          impressora.local ||
                          impressora.tipoConexao ||
                          impressora.ip ||
                          impressora.porta) && (
                          <p className="mt-0.5 text-xs leading-snug text-secondary-text">
                            {[
                              impressora.modelo && `Modelo: ${impressora.modelo}`,
                              impressora.local && `Local: ${impressora.local}`,
                              impressora.tipoConexao && impressora.tipoConexao,
                              (impressora.ip || impressora.porta) &&
                                `IP: ${impressora.ip || '-'}${impressora.porta ? `:${impressora.porta}` : ''}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <div
                        className="shrink-0"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <JiffyIconSwitch
                          checked={isLinked}
                          onChange={e => {
                            e.stopPropagation()
                            handleToggleVinculo(impressora.id, e.target.checked)
                          }}
                          label="Vínculo"
                          labelPosition="start"
                          bordered={false}
                          size="xs"
                          className="shrink-0"
                          disabled={isRowLoading}
                          inputProps={{
                            'aria-label': isLinked
                              ? `Desvincular impressora ${impressora.nome ?? ''}`
                              : `Vincular impressora ${impressora.nome ?? ''}`,
                            onClick: e => e.stopPropagation(),
                          }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 py-12 text-center">
                <MdPrint className="text-3xl text-secondary-text" />
                <p className="text-xs text-secondary-text">
                  {allImpressoras.length === 0
                    ? 'Nenhuma impressora cadastrada.'
                    : filterTab === 'vinculados'
                      ? 'Nenhuma impressora vinculada a este produto.'
                      : filterTab === 'disponiveis'
                        ? 'Nenhuma impressora disponível para vincular.'
                        : `Nenhuma impressora encontrada${searchQuery.trim() ? ` para "${searchQuery.trim()}"` : ''}.`}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderDialogBody = () => renderCatalogoImpressorasCard()

  const embeddedSectionHeader = (
    <div className="px-6 py-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
        <h2 className="min-w-0 break-words text-lg font-semibold text-primary md:text-xl">
          Impressoras ({filterCounts.vinculados})
        </h2>
        <div className="h-px min-w-8 flex-1 bg-primary/70" />
        <button
          type="button"
          onClick={handleOpenNovaImpressora}
          disabled={isSaving}
          className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
        >
          <MdAdd size={18} />
          Nova impressora
        </button>
      </div>
    </div>
  )

  const impressorasModalNode = impressorasModalState.open ? (
    <ImpressorasTabsModal
      state={impressorasModalState}
      onClose={handleCloseImpressorasModal}
      onReload={handleImpressorasModalReload}
      onTabChange={handleImpressorasTabChange}
    />
  ) : null

  const impressorasModalPortal =
    typeof document !== 'undefined' && impressorasModalNode
      ? createPortal(impressorasModalNode, document.body)
      : impressorasModalNode

  if (isEmbedded) {
    return (
      <>
        <div className="flex h-full flex-col overflow-hidden">
          {embeddedSectionHeader}
          <div className="scrollbar-hide flex-1 overflow-y-auto px-2 py-4 md:px-6">
            {renderDialogBody()}
          </div>
        </div>
        {impressorasModalPortal}
      </>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={openState => !openState && handleClose()}
        fullWidth
        maxWidth="md"
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'stretch',
            justifyContent: 'flex-end',
            margin: 0,
          },
        }}
        PaperProps={{
          sx: {
            m: 0,
            height: '100vh',
            maxHeight: '100vh',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogHeader className="relative border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-2 top-2 text-secondary-text transition-colors hover:text-primary"
            aria-label="Fechar"
          >
            <MdClose size={22} />
          </button>
          <div className="pr-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <DialogTitle className="flex-1 !pb-0 !pt-0">
                Impressoras ({filterCounts.vinculados})
              </DialogTitle>
              <button
                type="button"
                onClick={handleOpenNovaImpressora}
                disabled={isSaving}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Nova impressora
              </button>
            </div>
          </div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>{renderDialogBody()}</DialogContent>

        <DialogFooter
          className="flex items-center justify-between gap-3 border-t border-gray-100"
          sx={{ justifyContent: 'space-between' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="h-10 rounded-[24px] border border-gray-300 px-6 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void savePendingImpressoras()}
            disabled={
              isSaving ||
              sameIdSet(
                impressoras.map(i => i.id),
                baselineImpressorasIdsRef.current
              )
            }
            className="h-10 rounded-[24px] border border-primary bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </DialogFooter>
      </Dialog>
      {impressorasModalPortal}
    </>
  )
})
