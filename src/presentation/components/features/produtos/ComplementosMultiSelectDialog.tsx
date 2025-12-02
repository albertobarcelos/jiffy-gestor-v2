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
import { Complemento } from '@/src/domain/entities/Complemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { MdClose, MdSearch, MdKeyboardArrowDown, MdDelete, MdAdd } from 'react-icons/md'

interface GrupoComplemento {
  id: string
  nome: string
  complementos: Complemento[]
  obrigatorio: boolean
  qtdMinima: number
  qtdMaxima: number
}

interface ComplementosMultiSelectDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  onClose: () => void
  isEmbedded?: boolean
}

export function ComplementosMultiSelectDialog({
  open,
  produtoId,
  produtoNome,
  onClose,
  isEmbedded = false,
}: ComplementosMultiSelectDialogProps) {
  const { auth } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<GrupoComplemento[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSelectDialogOpen, setIsSelectDialogOpen] = useState(false)
  const [allSelectableGroups, setAllSelectableGroups] = useState<Array<{ id: string; nome: string }>>(
    []
  )
  const [isLoadingSelectableGroups, setIsLoadingSelectableGroups] = useState(false)
  const [selectSearch, setSelectSearch] = useState('')
  const [tempSelection, setTempSelection] = useState<string[]>([])
  const [isSavingSelection, setIsSavingSelection] = useState(false)

  const loadGroups = useCallback(async () => {
    if (!open || !produtoId) return

    const token = auth?.getAccessToken()
    if (!token) {
      setGroups([])
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
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao carregar complementos do produto')
      }

      const produto = await response.json()
      const grupos: GrupoComplemento[] = (produto.gruposComplementos || []).map((grupo: any) => ({
        id: grupo.id,
        nome: grupo.nome,
        complementos: (grupo.complementos || []).map((item: any) => Complemento.fromJSON(item)),
        obrigatorio: Boolean(grupo.obrigatorio),
        qtdMinima:
          typeof grupo.qtdMinima === 'number'
            ? grupo.qtdMinima
            : grupo.obrigatorio
              ? 1
              : 0,
        qtdMaxima: typeof grupo.qtdMaxima === 'number' && grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 0,
      }))

      setGroups(grupos)
      setExpandedGroups(
        grupos.reduce((acc, grupo) => {
          acc[grupo.id] = false
          return acc
        }, {} as Record<string, boolean>)
      )

    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar complementos')
    } finally {
      setIsLoading(false)
    }
  }, [open, produtoId, auth])

  const loadSelectableGroups = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      setAllSelectableGroups([])
      return
    }

    setIsLoadingSelectableGroups(true)
    try {
      const limit = 25
      let offset = 0
      let hasMore = true
      const collected: Array<{ id: string; nome: string }> = []

      while (hasMore) {
        const response = await fetch(
          `/api/grupos-complementos?ativo=true&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || errorData.message || 'Erro ao carregar grupos')
        }

        const data = await response.json()
        const items = data.items || []
        const mapped = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            nome: item.nome?.toString() || 'Grupo',
          }))
          .filter((item: { id: string }) => Boolean(item.id))

        collected.push(...mapped)

        const fetchedCount = items.length
        const totalCount = data.count ?? collected.length
        offset += fetchedCount
        hasMore = fetchedCount === limit && collected.length < totalCount
      }

      setAllSelectableGroups(collected)
    } catch (err) {
      console.error(err)
      showToast.error(
        err instanceof Error ? err.message : 'Erro ao carregar grupos de complementos.'
      )
    } finally {
      setIsLoadingSelectableGroups(false)
    }
  }, [auth])

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      loadGroups()
    }
  }, [open, loadGroups])

  useEffect(() => {
    setTempSelection(groups.map((grupo) => grupo.id))
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groups
    }

    const normalized = searchQuery.trim().toLowerCase()
    return groups
      .map((grupo) => ({
        ...grupo,
        complementos: grupo.complementos.filter((complemento) =>
          complemento.getNome().toLowerCase().includes(normalized)
        ),
      }))
      .filter((grupo) => grupo.complementos.length > 0)
  }, [groups, searchQuery])

  const filteredSelectableGroups = useMemo(() => {
    if (!selectSearch.trim()) {
      return allSelectableGroups
    }

    const normalized = selectSearch.trim().toLowerCase()
    return allSelectableGroups.filter((grupo) =>
      grupo.nome.toLowerCase().includes(normalized)
    )
  }, [allSelectableGroups, selectSearch])

  const persistGruposSelection = useCallback(
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
          body: JSON.stringify({ gruposComplementosIds: ids }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar grupos de complementos')
        }

        await loadGroups()
        setTempSelection(ids)
        showToast.success(successMessage ?? 'Grupos atualizados com sucesso!')
        return true
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar grupos.')
        return false
      } finally {
        setIsUpdating(false)
      }
    },
    [produtoId, auth, loadGroups]
  )

  const handleClose = () => {
    onClose()
  }
  const handleRemoveGroup = async (grupo: GrupoComplemento) => {
    if (isUpdating) return

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    if (!produtoId) {
      showToast.error('Produto não encontrado.')
      return
    }

    const requestUrl = `/api/produtos/${encodeURIComponent(
      produtoId
    )}/grupos-complementos/${encodeURIComponent(grupo.id)}`
    console.log('[ComplementosMultiSelectDialog] Removendo grupo', {
      produtoId,
      grupoId: grupo.id,
      requestUrl,
    })

    setIsUpdating(true)
    try {
      const response = await fetch(requestUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('[ComplementosMultiSelectDialog] Resposta remoção', {
        status: response.status,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error(
          '[ComplementosMultiSelectDialog] Erro ao remover grupo',
          response.status,
          errorData
        )
        throw new Error(errorData.message || 'Erro ao remover grupo do produto')
      }

      setGroups((prev) => prev.filter((g) => g.id !== grupo.id))
      showToast.success(`Grupo "${grupo.nome}" removido com sucesso.`)
    } catch (error) {
      console.error(error)
      showToast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o grupo. Tente novamente.'
      )
    } finally {
      setIsUpdating(false)
    }
  }


  const toggleGroupVisibility = (grupoId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [grupoId]: !prev[grupoId],
    }))
  }

  const handleOpenSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(groups.map((grupo) => grupo.id))
    setIsSelectDialogOpen(true)
    loadSelectableGroups()
  }

  const handleCloseSelectDialog = () => {
    setSelectSearch('')
    setTempSelection(groups.map((grupo) => grupo.id))
    setIsSelectDialogOpen(false)
  }

  const handleToggleSelection = (grupoId: string) => {
    setTempSelection((prev) =>
      prev.includes(grupoId) ? prev.filter((id) => id !== grupoId) : [...prev, grupoId]
    )
  }

  const handleApplySelection = async () => {
    if (isSavingSelection || isUpdating) return
    setIsSavingSelection(true)
    const success = await persistGruposSelection(tempSelection)
    setIsSavingSelection(false)
    if (success) {
      setIsSelectDialogOpen(false)
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={`group-skeleton-${index}`} className="rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="space-y-2 px-4 py-3">
                {[...Array(3)].map((__, subIndex) => (
                  <div key={`item-skeleton-${index}-${subIndex}`} className="h-10 rounded-xl bg-gray-100" />
                ))}
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
            onClick={loadGroups}
            className="text-primary text-sm font-semibold hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      )
    }

    if (!filteredGroups.length) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-secondary-text text-sm">
            Nenhum complemento encontrado para &quot;{searchQuery}&quot;.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {filteredGroups.map((grupo) => {
          const maxLabel = grupo.qtdMaxima ? `máx ${grupo.qtdMaxima}` : 'sem limite'
          const minLabel = grupo.qtdMinima ? `mín ${grupo.qtdMinima}` : 'mín 0'
          const isExpanded = expandedGroups[grupo.id] !== false

          return (
            <div key={grupo.id} className="rounded-2xl border border-gray-200 bg-white">
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGroupVisibility(grupo.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleGroupVisibility(grupo.id)
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemoveGroup(grupo)
                    }}
                    className="text-error hover:text-error/80 transition-colors"
                    aria-label={`Remover grupo ${grupo.nome}`}
                  >
                    <MdDelete size={18} />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-primary-text">{grupo.nome}</p>
                    <p className="text-xs text-secondary-text">
                      {minLabel} • {maxLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {grupo.obrigatorio && (
                    <span className="text-[10px] uppercase tracking-wide text-primary font-semibold bg-primary/10 px-2 py-1 rounded-full">
                      Obrigatório
                    </span>
                  )}
                  <MdKeyboardArrowDown
                    className={`text-lg text-secondary-text transition-transform ${
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {grupo.complementos.map((complemento) => {
                    return (
                      <div
                        key={complemento.getId()}
                        className="w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left border-gray-200 bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-primary-text">
                            {complemento.getNome()}
                          </p>
                          {complemento.getDescricao() && (
                            <p className="text-xs text-secondary-text">
                              {complemento.getDescricao()}
                            </p>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-primary-text">
                          {transformarParaReal(complemento.getValor())}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderDialogBody = () => (
    <>
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={handleOpenSelectDialog}
          disabled={isUpdating}
          className="h-8 px-4 rounded-[24px] border border-primary bg-primary text-white font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <MdAdd size={18} />
          Adicionar grupo
        </button>
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
          <input
            type="text"
            placeholder="Buscar complemento..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full h-8 pl-10 pr-4 rounded-[24px] border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
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
        <DialogTitle>Selecionar grupos de complementos</DialogTitle>
      </DialogHeader>
      <DialogContent sx={{ padding: '16px 24px' }}>
        <div className="relative mb-4">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={18} />
          <input
            type="text"
            value={selectSearch}
            onChange={(event) => setSelectSearch(event.target.value)}
            placeholder="Buscar grupo..."
            className="w-full h-11 pl-10 pr-4 rounded-[24px] border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
          />
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {isLoadingSelectableGroups ? (
            <p className="text-center text-secondary-text text-sm py-6">Carregando grupos...</p>
          ) : filteredSelectableGroups.length ? (
            filteredSelectableGroups.map((grupo) => {
              const isSelected = tempSelection.includes(grupo.id)
              return (
                <label
                  key={grupo.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelection(grupo.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-primary-text">{grupo.nome}</p>
                  </div>
                  {isSelected && <span className="text-xs font-semibold text-primary">Selecionado</span>}
                </label>
              )
            })
          ) : (
            <p className="text-center text-secondary-text text-sm py-6">Nenhum grupo encontrado.</p>
          )}
        </div>
      </DialogContent>
      <DialogFooter sx={{ justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={handleCloseSelectDialog}
          className="h-10 px-5 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleApplySelection}
          disabled={isSavingSelection || isUpdating}
          className="h-10 px-6 rounded-[24px] bg-primary text-info text-sm font-semibold transition-colors hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-text">
                {produtoNome ? `Complementos de ${produtoNome}` : 'Complementos'}
              </h3>
              <p className="text-xs text-secondary-text">
                {groups.length} grupo{groups.length === 1 ? '' : 's'} vinculados
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">{renderDialogBody()}</div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 px-6 rounded-[24px] border border-gray-300 text-sm font-semibold text-primary-text hover:bg-gray-50 transition-colors"
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
          <div className="pr-8">
            <DialogTitle>
              {produtoNome ? `Complementos de ${produtoNome}` : 'Selecionar complementos'}
            </DialogTitle>
            <p className="text-xs text-secondary-text mt-1">
              {groups.length} grupo{groups.length === 1 ? '' : 's'} vinculados
            </p>
          </div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>
          {renderDialogBody()}
        </DialogContent>

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

