'use client'

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdAdd, MdClose, MdPrint, MdSearch, MdEdit } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  ImpressorasTabsModal,
  ImpressorasTabsModalState,
} from '@/src/presentation/components/features/impressoras/ImpressorasTabsModal'

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

interface ProdutoImpressorasDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  /** Vínculos já conhecidos no estado do modal de abas (lista do produto / entidade em memória). */
  initialImpressorasResumo?: ReadonlyArray<ProdutoImpressoraResumoInicial>
  onClose: () => void
  isEmbedded?: boolean
}

/**
 * Modal de leitura para exibir as impressoras vinculadas a um produto
 */
export function ProdutoImpressorasDialog({
  open,
  produtoId,
  produtoNome,
  initialImpressorasResumo,
  onClose,
  isEmbedded = false,
}: ProdutoImpressorasDialogProps) {
  const isRehydrated = useAuthStore(s => s.isRehydrated)
  const [searchQuery, setSearchQuery] = useState('')
  const [impressoras, setImpressoras] = useState<ProdutoImpressora[]>(() =>
    mapResumoToImpressoras(initialImpressorasResumo)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allImpressoras, setAllImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoadingAllImpressoras, setIsLoadingAllImpressoras] = useState(false)
  /** Durante o PATCH só o switch desta impressora fica desabilitado (evita “congelar” toda a lista). */
  const [togglingId, setTogglingId] = useState<string | null>(null)
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

      const token = useAuthStore.getState().auth?.getAccessToken()
      if (!token) {
        setError('Token não encontrado. Faça login novamente.')
        setImpressoras([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
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

        setImpressoras(impressorasData)
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
    [produtoId]
  )

  const loadAllImpressoras = useCallback(async () => {
    const token = useAuthStore.getState().auth?.getAccessToken()
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
        const response = await fetch(`/api/impressoras?limit=${limit}&offset=${offset}`, {
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

  // Antes do paint: evita um frame com lista vazia e isLoading false (efeito roda depois do paint).
  useLayoutEffect(() => {
    if (open && produtoId && isRehydrated) {
      setIsLoading(true)
    }
    if (!open || !produtoId) {
      setIsLoading(false)
    }
  }, [open, produtoId, isRehydrated])

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
    }
  }, [open])

  const linkedIds = useMemo(() => {
    return new Set(impressoras.map(i => i.id))
  }, [impressoras])

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
    const base = allImpressoras ?? []
    const normalized = searchQuery.trim().toLowerCase()
    const filtered = !normalized
      ? [...base]
      : base.filter(impressora => {
          const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
          return target.toLowerCase().includes(normalized)
        })

    const linkedFallback = new Set(impressoras.map(i => i.id))
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

    const ordemSessao = sessionCatalogOrderRef.current
    if (!open || ordemSessao === null) {
      return [...filtered].sort((a, b) => {
        const aLinked = linkedFallback.has(a.id)
        const bLinked = linkedFallback.has(b.id)
        if (aLinked !== bLinked) return aLinked ? -1 : 1
        return collator.compare(a.nome, b.nome)
      })
    }

    const ordemMap = new Map(ordemSessao.map((id, idx) => [id, idx]))
    return [...filtered].sort((a, b) => {
      const ia = ordemMap.get(a.id)
      const ib = ordemMap.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return collator.compare(a.nome, b.nome)
    })
  }, [allImpressoras, searchQuery, impressoras, open, sessionOrderTick])

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

      const token = useAuthStore.getState().auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return false
      }

      try {
        const response = await fetch(`/api/produtos/${produtoId}`, {
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
    async (impressoraId: string, vincular: boolean) => {
      if (togglingId !== null) return

      const next = new Set(linkedIds)
      if (vincular) next.add(impressoraId)
      else next.delete(impressoraId)
      const newIds = Array.from(next)

      const antesSnapshot = impressoras
      const catalogOrderBefore = sessionCatalogOrderRef.current
        ? [...sessionCatalogOrderRef.current]
        : null

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

      setTogglingId(impressoraId)
      try {
        const ok = await persistImpressorasSelection(
          newIds,
          vincular ? 'Impressora vinculada ao produto!' : 'Impressora removida do produto.',
          { optimisticPreApplied: true }
        )
        if (!ok) {
          setImpressoras(antesSnapshot)
          sessionCatalogOrderRef.current = catalogOrderBefore
          setSessionOrderTick(t => t + 1)
        }
      } finally {
        setTogglingId(null)
      }
    },
    [togglingId, linkedIds, impressoras, findImpressoraById, persistImpressorasSelection]
  )

  /** Um único fluxo visual: só some o Jiffy quando produto + catálogo `/api/impressoras` terminarem. */
  const carregandoListaImpressoras = isLoading || isLoadingAllImpressoras

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
          <div className="relative mb-2 shrink-0">
            <MdSearch
              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar impressora..."
              className="font-nunito h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="scrollbar-hide max-h-[280px] min-h-0 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50 md:max-h-[360px]">
            {filteredAllImpressoras.length ? (
              <ul className="divide-y divide-gray-100">
                {filteredAllImpressoras.map(impressora => {
                  const isLinked = linkedIds.has(impressora.id)
                  const isRowLoading = togglingId === impressora.id
                  return (
                    <li
                      key={impressora.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80"
                    >
                      <div className="min-w-0 flex-1 py-2">
                        <div className="flex items-center gap-2">
                          <p className="font-nunito truncate text-xs font-medium uppercase text-primary-text">
                            {impressora.nome || 'Impressora'}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleEditImpressora(impressora)}
                            disabled={togglingId !== null}
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
                          <p className="font-nunito mt-0.5 text-xs leading-snug text-secondary-text">
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
                            void handleToggleVinculo(impressora.id, e.target.checked)
                          }}
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
                <p className="font-nunito text-xs text-secondary-text">
                  {allImpressoras.length === 0
                    ? 'Nenhuma impressora cadastrada.'
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
      {/* Mesmo padrão de ComplementosMultiSelectDialog (aba embutida) */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
        <h2 className="min-w-0 break-words font-exo text-lg font-semibold text-primary md:text-xl">
          Impressoras Vinculadas
        </h2>
        <div className="h-px min-w-8 flex-1 bg-primary/70" />
        <button
          type="button"
          onClick={handleOpenNovaImpressora}
          disabled={togglingId !== null}
          className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
        >
          <MdAdd size={18} />
          Nova impressora
        </button>
      </div>
      <p className="font-nunito text-sm text-secondary-text">
        {impressoras.length} impressora{impressoras.length === 1 ? '' : 's'} vinculadas
      </p>
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
                {produtoNome ? `Impressoras de ${produtoNome}` : 'Selecionar impressoras'}
              </DialogTitle>
              <button
                type="button"
                onClick={handleOpenNovaImpressora}
                disabled={togglingId !== null}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Nova impressora
              </button>
            </div>
            <p className="mt-1 text-xs text-secondary-text">
              {impressoras.length} impressora{impressoras.length === 1 ? '' : 's'} vinculadas
            </p>
          </div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>{renderDialogBody()}</DialogContent>

        <DialogFooter
          className="flex items-center justify-start border-t border-gray-100"
          sx={{ justifyContent: 'flex-start' }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="h-10 rounded-[24px] border border-gray-300 px-6 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
          >
            Fechar
          </button>
        </DialogFooter>
      </Dialog>
      {impressorasModalPortal}
    </>
  )
}
