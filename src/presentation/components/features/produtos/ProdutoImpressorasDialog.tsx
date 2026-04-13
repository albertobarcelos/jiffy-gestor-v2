'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { MdAdd, MdClose, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
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

const LISTAGEM_PAGE_SIZE = 25

/** Vinculadas primeiro; depois ordem alfabética por nome */
function ordenarVinculadosPrimeiro<T extends { id: string; nome?: string }>(
  itens: T[],
  idsVinculados: string[]
): T[] {
  const set = new Set(idsVinculados)
  return [...itens].sort((a, b) => {
    const va = set.has(a.id) ? 1 : 0
    const vb = set.has(b.id) ? 1 : 0
    if (va !== vb) return vb - va
    return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
  })
}

interface ProdutoImpressorasDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
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
  onClose,
  isEmbedded = false,
}: ProdutoImpressorasDialogProps) {
  const { auth } = useAuthStore()
  const [impressoras, setImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [allImpressoras, setAllImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoadingAllImpressoras, setIsLoadingAllImpressoras] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [impressorasModalState, setImpressorasModalState] = useState<ImpressorasTabsModalState>({
    open: false,
    tab: 'impressora',
    mode: 'create',
  })

  const loadImpressoras = useCallback(async () => {
    if (!open || !produtoId) return

    const token = auth?.getAccessToken()
    if (!token) {
      setError('Token não encontrado. Faça login novamente.')
      setImpressoras([])
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
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar impressoras')
      setImpressoras([])
    } finally {
      setIsLoading(false)
    }
  }, [open, produtoId, auth])

  const loadAllImpressoras = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      setAllImpressoras([])
      return
    }

    setIsLoadingAllImpressoras(true)
    try {
      const limit = LISTAGEM_PAGE_SIZE
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

        const apiHasNext =
          typeof data.hasNext === 'boolean'
            ? data.hasNext
            : fetchedCount === limit && collected.length < totalCount

        hasMore = apiHasNext
      }

      setAllImpressoras(collected)
    } catch (err) {
      console.error(err)
      showToast.error(err instanceof Error ? err.message : 'Erro ao carregar impressoras.')
    } finally {
      setIsLoadingAllImpressoras(false)
    }
  }, [auth])

  useEffect(() => {
    if (open) {
      setCatalogSearch('')
      loadImpressoras()
      void loadAllImpressoras()
    }
  }, [open, loadImpressoras, loadAllImpressoras])

  const impressorasVinculadasIds = useMemo(() => impressoras.map(i => i.id), [impressoras])

  const impressorasCatalogoParaLista = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase()
    const filtrados = !term
      ? allImpressoras
      : allImpressoras.filter(item => {
          const target = `${item.nome} ${item.modelo ?? ''} ${item.local ?? ''}`
          return target.toLowerCase().includes(term)
        })
    return ordenarVinculadosPrimeiro(filtrados, impressorasVinculadasIds)
  }, [allImpressoras, catalogSearch, impressorasVinculadasIds])

  const findImpressoraById = useCallback(
    (id: string): ProdutoImpressora | undefined => {
      return allImpressoras.find(item => item.id === id) || impressoras.find(item => item.id === id)
    },
    [allImpressoras, impressoras]
  )

  const handleClose = () => {
    onClose()
  }

  /** Abre `ImpressorasTabsModal` com `NovaImpressora` em modo criação */
  const handleOpenNovaImpressora = useCallback(() => {
    setImpressorasModalState({
      open: true,
      tab: 'impressora',
      mode: 'create',
    })
  }, [])

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

  const handleImpressorasTabChange = (tab: 'impressora') => {
    setImpressorasModalState(prev => ({ ...prev, tab }))
  }

  const persistImpressorasSelection = useCallback(
    async (ids: string[], successMessage?: string, options?: { silentSuccess?: boolean }) => {
      if (!produtoId) {
        showToast.error('Produto não encontrado.')
        return false
      }

      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return false
      }

      setIsUpdating(true)
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
        if (!options?.silentSuccess) {
          if (successMessage) {
            showToast.success(successMessage)
          } else {
            showToast.success('Impressoras atualizadas com sucesso!')
          }
        }
        return true
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar impressoras.')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [produtoId, auth, findImpressoraById]
  )

  /** Liga/desliga na lista completa (mesmo PATCH do modal) */
  const handleToggleCatalogImpressora = useCallback(
    async (id: string) => {
      if (isUpdating || !produtoId) return
      const current = impressoras.map(i => i.id)
      const newIds = current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      await persistImpressorasSelection(newIds, undefined, { silentSuccess: true })
    },
    [isUpdating, produtoId, impressoras, persistImpressorasSelection]
  )

  const header = (
    <div>
      {/* Mesmo padrão da aba Complementos: título + linha + ação na mesma linha */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
        <h2
          className="min-w-0 break-words font-exo text-lg font-semibold text-primary md:text-xl"
          title={produtoNome ? `Impressoras de ${produtoNome}` : 'Impressoras'}
        >
          {produtoNome ? `Impressoras de ${produtoNome}` : 'Impressoras'}
        </h2>
        <div className="h-px min-w-8 flex-1 bg-primary/70" />
        <button
          type="button"
          onClick={handleOpenNovaImpressora}
          disabled={isUpdating}
          className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
        >
          <MdAdd size={18} />
          Nova impressora
        </button>
      </div>
      <p className="font-nunito text-sm text-secondary-text">
        {impressoras.length}{' '}
        {impressoras.length === 1 ? 'impressora vinculada' : 'impressoras vinculadas'}
      </p>
    </div>
  )

  const renderCatalogoImpressorasCard = () => (
    <div className="mb-4 flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-info p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <JiffyLoading />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
          <p className="text-sm text-secondary-text">{error}</p>
          <button
            type="button"
            onClick={() => void loadImpressoras()}
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
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Buscar impressora..."
              className="font-nunito h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="max-h-[280px] min-h-0 overflow-y-auto overscroll-y-contain rounded-lg border border-gray-100 bg-gray-50/50 md:max-h-[360px]">
            {isLoadingAllImpressoras ? (
              <p className="font-nunito py-8 text-center text-xs text-secondary-text">
                Carregando impressoras...
              </p>
            ) : impressorasCatalogoParaLista.length ? (
              <ul className="divide-y divide-gray-100">
                {impressorasCatalogoParaLista.map(impressora => {
                  const vinculada = impressorasVinculadasIds.includes(impressora.id)
                  return (
                    <li
                      key={impressora.id}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80"
                    >
                      <div className="min-w-0 flex-1 py-2">
                        <p className="font-nunito truncate text-xs uppercase font-medium text-primary-text">
                          {impressora.nome || 'Impressora'}
                        </p>
                        {impressora.local ? (
                          <p className="font-nunito truncate text-[10px] text-secondary-text">
                            {impressora.local}
                          </p>
                        ) : null}
                      </div>
                      <div
                        className="shrink-0"
                        onClick={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                      >
                        <JiffyIconSwitch
                          checked={vinculada}
                          onChange={e => {
                            e.stopPropagation()
                            void handleToggleCatalogImpressora(impressora.id)
                          }}
                          labelPosition="start"
                          bordered={false}
                          size="xs"
                          className="shrink-0"
                          disabled={isUpdating}
                          inputProps={{
                            'aria-label': vinculada
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
              <p className="font-nunito py-8 text-center text-xs text-secondary-text">
                {allImpressoras.length === 0
                  ? 'Nenhuma impressora cadastrada.'
                  : 'Nenhuma impressora encontrada para a busca.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  const body = renderCatalogoImpressorasCard()

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
          <div className="px-6 py-2">{header}</div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{body}</div>
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
          <div className="pr-8">{header}</div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>{body}</DialogContent>

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
