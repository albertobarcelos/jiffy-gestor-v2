'use client'

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/src/presentation/components/ui/dialog'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdAdd, MdClose, MdDelete, MdPrint, MdSearch, MdEdit } from 'react-icons/md'
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

/** Resumo vindo de `Produto.getImpressoras()` — evita loading bloqueante duplicado quando o modal já tem os vínculos. */
export type ProdutoImpressoraResumoInicial = Readonly<{
  id: string
  nome: string
  ativo: boolean
}>

function mapResumoToImpressoras(resumo?: ReadonlyArray<ProdutoImpressoraResumoInicial>): ProdutoImpressora[] {
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
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false)
  const [allImpressoras, setAllImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoadingAllImpressoras, setIsLoadingAllImpressoras] = useState(false)
  const [selectSearch, setSelectSearch] = useState('')
  const [tempSelection, setTempSelection] = useState<string[]>([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)
  const [impressorasModalState, setImpressorasModalState] = useState<ImpressorasTabsModalState>({
    open: false,
    tab: 'impressora',
    mode: 'create',
  })

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
      const limit = 25
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

  useEffect(() => {
    setTempSelection(impressoras.map(item => item.id))
  }, [impressoras])

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

    return () => {
      // Não chamar setIsLoading(false) aqui: no Strict Mode o cleanup roda entre duas execuções
      // do efeito e gera um frame “vazio” sem spinner enquanto o segundo fetch ainda não terminou.
      ac.abort()
    }
  }, [open, produtoId, isRehydrated, loadImpressoras])

  const filteredImpressoras = useMemo(() => {
    if (!searchQuery.trim()) {
      return impressoras
    }

    const normalized = searchQuery.trim().toLowerCase()
    return impressoras.filter(impressora => {
      const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
      return target.toLowerCase().includes(normalized)
    })
  }, [impressoras, searchQuery])

  const filteredSelectableImpressoras = useMemo(() => {
    if (!selectSearch.trim()) {
      return allImpressoras
    }

    const normalized = selectSearch.trim().toLowerCase()
    return allImpressoras.filter(impressora => {
      const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
      return target.toLowerCase().includes(normalized)
    })
  }, [allImpressoras, selectSearch])

  const findImpressoraById = useCallback(
    (id: string): ProdutoImpressora | undefined => {
      return allImpressoras.find(item => item.id === id) || impressoras.find(item => item.id === id)
    },
    [allImpressoras, impressoras]
  )

  const handleClose = () => {
    onClose()
  }

  const handleOpenSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(impressoras.map(item => item.id))
    setIsSelectDialogOpen(true)
    if (!allImpressoras.length) {
      loadAllImpressoras()
    }
  }

  const handleCloseSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(impressoras.map(item => item.id))
    setIsSelectDialogOpen(false)
  }

  const handleOpenNovaImpressora = () => {
    // Fechar o dialog de seleção antes de abrir o modal de criação
    setIsSelectDialogOpen(false)
    // Aguardar um pouco para garantir que o dialog foi fechado
    setTimeout(() => {
      setImpressorasModalState({
        open: true,
        tab: 'impressora',
        mode: 'create',
      })
    }, 100)
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

  const handleToggleSelection = (id: string) => {
    setTempSelection(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleApplySelection = async () => {
    if (isSavingSelection || isUpdating) return
    setIsSavingSelection(true)
    const success = await persistImpressorasSelection(tempSelection)
    setIsSavingSelection(false)
    if (success) {
      setIsSelectDialogOpen(false)
    }
  }

  const handleRemoveImpressora = async (id: string) => {
    if (isUpdating) return
    const newIds = impressoras.filter(imp => imp.id !== id).map(imp => imp.id)
    await persistImpressorasSelection(newIds, 'Impressora removida do produto.')
  }

  const persistImpressorasSelection = useCallback(
    async (ids: string[], successMessage?: string) => {
      if (!produtoId) {
        showToast.error('Produto não encontrado.')
        return false
      }

      const token = useAuthStore.getState().auth?.getAccessToken()
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
        setTempSelection(ids)
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
      } finally {
        setIsUpdating(false)
      }
    },
    [produtoId, findImpressoraById]
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <JiffyLoading />
        </div>
      )
    }

    if (error) {
      return (
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
      )
    }

    if (!filteredImpressoras.length) {
      return (
        <div className="flex flex-col items-center justify-center space-y-2 py-12 text-center">
          <MdPrint className="text-3xl text-secondary-text" />
          <p className="text-sm text-secondary-text">
            Nenhuma impressora vinculada{searchQuery ? ` para "${searchQuery}"` : ''}.
          </p>
        </div>
      )
    }

    return (
      <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
        {filteredImpressoras.map((impressora, index) => (
          <div
            key={impressora.id}
            className={`flex flex-col gap-2 rounded-lg px-2 py-3 md:px-4 ${
              index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRemoveImpressora(impressora.id)}
                disabled={isUpdating}
                className="text-error transition-colors hover:text-error/80 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Remover ${impressora.nome}`}
              >
                <MdDelete size={18} />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MdPrint />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary-text">{impressora.nome}</p>
                  <button
                    type="button"
                    onClick={() => handleEditImpressora(impressora)}
                    disabled={isUpdating}
                    className="text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Editar ${impressora.nome}`}
                    title="Editar impressora"
                  >
                    <MdEdit size={16} />
                  </button>
                </div>
                <p className="text-xs text-secondary-text">
                  {impressora.modelo || 'Modelo não informado'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pl-7 text-xs text-secondary-text">
              {impressora.local && <span>Local: {impressora.local}</span>}
              {impressora.tipoConexao && <span>Conexão: {impressora.tipoConexao}</span>}
              {(impressora.ip || impressora.porta) && (
                <span>
                  IP: {impressora.ip || '-'}
                  {impressora.porta ? `:${impressora.porta}` : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const header = (
    <div className="flex flex-row items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-primary-text md:text-lg">
          {produtoNome ? `Impressoras de ${produtoNome}` : 'Impressoras vinculadas'}
        </h3>
        <p className="text-xs text-secondary-text">
          {impressoras.length}{' '}
          {impressoras.length === 1 ? 'impressora encontrada' : 'impressoras encontradas'}
        </p>
      </div>
      <button
        type="button"
        onClick={handleOpenSelectDialog}
        disabled={isUpdating}
        className="flex items-center rounded-lg bg-primary px-2 py-1 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:py-0"
      >
        <MdAdd size={16} />
        Vincular impressoras
      </button>
    </div>
  )

  const body = (
    <>
      <div className="mb-2 flex max-w-[400px] flex-col items-start gap-1">
        <span className="text-xs font-semibold text-secondary-text">
          Buscar impressoras vinculadas
        </span>
        <div className="relative w-full flex-1">
          <MdSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={20}
          />
          <input
            type="text"
            placeholder="Digite para filtrar..."
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="font-nunito h-8 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      {renderContent()}
    </>
  )

  const selectionDialog = (
    <Dialog
      open={isSelectDialogOpen}
      onOpenChange={openState => {
        if (!openState) {
          handleCloseSelectDialog()
        }
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogHeader>
        <div className="items-top flex flex-col items-center border-b-2 border-primary/70 md:h-16 md:flex-row md:justify-between">
          <div className="text-sm font-semibold text-primary-text md:text-lg">
            Selecionar impressoras
          </div>
          <button
            type="button"
            onClick={handleOpenNovaImpressora}
            className="mb-2 rounded-lg bg-primary px-6 py-2 text-xs font-semibold text-info transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:mb-0 md:h-8 md:text-sm"
            aria-label="Criar nova impressora"
          >
            Criar nova impressora
          </button>
        </div>
      </DialogHeader>
      <DialogContent sx={{ padding: '4px 4px' }}>
        <div className="relative mb-4">
          <MdSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text"
            size={18}
          />
          <input
            type="text"
            value={selectSearch}
            onChange={event => setSelectSearch(event.target.value)}
            placeholder="Buscar impressora..."
            className="font-nunito h-8 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {isLoadingAllImpressoras ? (
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <JiffyLoading />
            </div>
          ) : filteredSelectableImpressoras.length ? (
            filteredSelectableImpressoras.map((impressora, index) => {
              const isSelected = tempSelection.includes(impressora.id)
              return (
                <label
                  key={impressora.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : `border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelection(impressora.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-primary-text md:text-sm">
                      {impressora.nome}
                    </p>
                    {impressora.local && (
                      <p className="text-xs text-secondary-text">{impressora.local}</p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-primary md:text-xs">
                      Selecionada
                    </span>
                  )}
                </label>
              )
            })
          ) : (
            <p className="py-6 text-center text-sm text-secondary-text">
              Nenhuma impressora encontrada.
            </p>
          )}
        </div>
      </DialogContent>
      <DialogFooter sx={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={handleCloseSelectDialog}
          className="h-8 rounded-lg border border-gray-300 px-5 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApplySelection}
          disabled={isSavingSelection || isUpdating}
          className="rounded-lg bg-primary px-6 py-2 text-xs font-semibold text-info transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:text-sm"
        >
          {isSavingSelection ? 'Aplicando...' : 'Aplicar seleção'}
        </button>
      </DialogFooter>
    </Dialog>
  )

  const selectionDialogNode =
    isEmbedded && typeof document !== 'undefined'
      ? createPortal(selectionDialog, document.getElementById('modal-root') ?? document.body)
      : selectionDialog

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
          <div className="border-b border-gray-200 px-6 py-4">{header}</div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{body}</div>
          <div className="flex justify-end border-t border-gray-100 px-6 py-12">
            <button
              type="button"
              onClick={handleClose}
              className="h-8 rounded-lg border border-primary px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Fechar
            </button>
          </div>
        </div>
        {selectionDialogNode}
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
          {header}
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

      {selectionDialogNode}
      {impressorasModalPortal}
    </>
  )
}
