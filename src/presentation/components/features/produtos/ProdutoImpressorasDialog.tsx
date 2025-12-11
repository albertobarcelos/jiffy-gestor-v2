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
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { MdAdd, MdClose, MdDelete, MdPrint, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [impressoras, setImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false)
  const [allImpressoras, setAllImpressoras] = useState<ProdutoImpressora[]>([])
  const [isLoadingAllImpressoras, setIsLoadingAllImpressoras] = useState(false)
  const [selectSearch, setSelectSearch] = useState('')
  const [tempSelection, setTempSelection] = useState<string[]>([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)

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

        collected.push(...items.filter((printer) => Boolean(printer.id)))

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
  }, [auth])

  useEffect(() => {
    setTempSelection(impressoras.map((item) => item.id))
  }, [impressoras])

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      loadImpressoras()
    }
  }, [open, loadImpressoras])

  const filteredImpressoras = useMemo(() => {
    if (!searchQuery.trim()) {
      return impressoras
    }

    const normalized = searchQuery.trim().toLowerCase()
    return impressoras.filter((impressora) => {
      const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
      return target.toLowerCase().includes(normalized)
    })
  }, [impressoras, searchQuery])

  const filteredSelectableImpressoras = useMemo(() => {
    if (!selectSearch.trim()) {
      return allImpressoras
    }

    const normalized = selectSearch.trim().toLowerCase()
    return allImpressoras.filter((impressora) => {
      const target = `${impressora.nome} ${impressora.modelo ?? ''} ${impressora.local ?? ''}`
      return target.toLowerCase().includes(normalized)
    })
  }, [allImpressoras, selectSearch])

  const findImpressoraById = useCallback(
    (id: string): ProdutoImpressora | undefined => {
      return allImpressoras.find((item) => item.id === id) || impressoras.find((item) => item.id === id)
    },
    [allImpressoras, impressoras]
  )

  const handleClose = () => {
    onClose()
  }

  const handleOpenSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(impressoras.map((item) => item.id))
    setIsSelectDialogOpen(true)
    if (!allImpressoras.length) {
      loadAllImpressoras()
    }
  }

  const handleCloseSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(impressoras.map((item) => item.id))
    setIsSelectDialogOpen(false)
  }

  const handleToggleSelection = (id: string) => {
    setTempSelection((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
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
    const newIds = impressoras.filter((imp) => imp.id !== id).map((imp) => imp.id)
    await persistImpressorasSelection(newIds, 'Impressora removida do produto.')
  }

  const persistImpressorasSelection = useCallback(
    async (ids: string[], successMessage?: string) => {
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

        const updatedList: ProdutoImpressora[] = ids.map((printerId) => {
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
    [produtoId, auth, findImpressoraById]
  )

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div
              key={`printer-skeleton-${index}`}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <p className="text-secondary-text text-sm">{error}</p>
          <button
            type="button"
            onClick={loadImpressoras}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    if (!filteredImpressoras.length) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
          <MdPrint className="text-secondary-text text-3xl" />
          <p className="text-secondary-text text-sm">
            Nenhuma impressora vinculada{searchQuery ? ` para "${searchQuery}"` : ''}.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {filteredImpressoras.map((impressora) => (
          <div
            key={impressora.id}
            className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleRemoveImpressora(impressora.id)}
                disabled={isUpdating}
                className="text-error hover:text-error/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={`Remover ${impressora.nome}`}
              >
                <MdDelete size={18} />
              </button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MdPrint />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-text">{impressora.nome}</p>
                <p className="text-xs text-secondary-text">
                  {impressora.modelo || 'Modelo não informado'}
                </p>
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-lg ${
                  impressora.ativo ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                }`}
              >
                {impressora.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-secondary-text pl-7">
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
    <div className="pr-8 flex flex-row items-center justify-between gap-2">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-primary-text">
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
          className="h-8 px-4 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <MdAdd size={16} />
          Vincular impressoras
        </button>
    </div>
  )

  const body = (
    <>
      <div className="flex flex-col items-start gap-1 mb-2 max-w-[400px]">
        <span className="text-xs font-semibold text-secondary-text">Buscar impressoras vinculadas</span>
        <div className="relative flex-1 w-full">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
          <input
            type="text"
            placeholder="Digite para filtrar..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full h-8 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      {renderContent()}
    </>
  )

  const selectionDialog = (
    <Dialog
      open={isSelectDialogOpen}
      onOpenChange={(openState) => {
        if (!openState) {
          handleCloseSelectDialog()
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogHeader>
        <div className="flex h-16 items-top justify-between border-b-2 border-primary/70">
        <DialogTitle>Selecionar impressoras</DialogTitle>
        <button
          type="button"
          className="h-8 px-6 rounded-lg bg-primary text-info text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Criar nova impressora"
        >
          Criar nova impressora
        </button>
        </div>
      </DialogHeader>
      <DialogContent sx={{ padding: '4px 24px' }}>
        <div className="relative mb-4">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
          <input
            type="text"
            value={selectSearch}
            onChange={(event) => setSelectSearch(event.target.value)}
            placeholder="Buscar impressora..."
            className="w-full h-8 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
          />
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoadingAllImpressoras ? (
            <p className="text-center text-secondary-text text-sm py-6">Carregando impressoras...</p>
          ) : filteredSelectableImpressoras.length ? (
            filteredSelectableImpressoras.map((impressora) => {
              const isSelected = tempSelection.includes(impressora.id)
              return (
                <label
                  key={impressora.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelection(impressora.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-primary-text">{impressora.nome}</p>
                    {impressora.local && (
                      <p className="text-xs text-secondary-text">{impressora.local}</p>
                    )}
                  </div>
                  {isSelected && <span className="text-xs font-semibold text-primary">Selecionada</span>}
                </label>
              )
            })
          ) : (
            <p className="text-center text-secondary-text text-sm py-6">Nenhuma impressora encontrada.</p>
          )}
        </div>
      </DialogContent>
      <DialogFooter sx={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={handleCloseSelectDialog}
          className="h-8 px-5 rounded-lg border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApplySelection}
          disabled={isSavingSelection || isUpdating}
          className="h-8 px-6 rounded-lg bg-primary text-info text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
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

  if (isEmbedded) {
    return (
      <>
        <div className="h-full flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">{header}</div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{body}</div>
          <div className="px-6 py-12 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="h-8 px-6 rounded-lg border border-primary text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
        {selectionDialogNode}
      </>
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(openState) => !openState && handleClose()}
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
            className="absolute top-2 left-2 text-secondary-text hover:text-primary transition-colors"
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
            className="h-10 px-6 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </DialogFooter>
      </Dialog>

      {selectionDialogNode}
    </>
  )
}


