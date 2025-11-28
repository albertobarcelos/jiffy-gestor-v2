'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  onAddGroup?: (produtoId?: string) => void
  onRemoveGroup?: (grupoId: string) => Promise<void> | void
}

export function ComplementosMultiSelectDialog({
  open,
  produtoId,
  produtoNome,
  onClose,
  onAddGroup,
  onRemoveGroup,
}: ComplementosMultiSelectDialogProps) {
  const { auth } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [groups, setGroups] = useState<GrupoComplemento[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (open) {
      setSearchQuery('')
      loadGroups()
    }
  }, [open, loadGroups])

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

  const handleClose = () => {
    onClose()
  }
  const handleRemoveGroup = async (grupo: GrupoComplemento) => {
    if (!onRemoveGroup) {
      setGroups((prev) => prev.filter((g) => g.id !== grupo.id))
      showToast.success(`Grupo "${grupo.nome}" removido da visualização.`)
      return
    }

    try {
      await onRemoveGroup(grupo.id)
      setGroups((prev) => prev.filter((g) => g.id !== grupo.id))
      showToast.success(`Grupo "${grupo.nome}" removido com sucesso.`)
    } catch (error) {
      console.error(error)
      showToast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o grupo. Tente novamente.'
      )
    }
  }


  const toggleGroupVisibility = (grupoId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [grupoId]: !prev[grupoId],
    }))
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

  return (
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
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => onAddGroup?.(produtoId)}
            className="h-10 px-4 rounded-[24px] border border-primary text-primary font-semibold text-sm flex items-center gap-2 hover:bg-primary/10 transition-colors"
          >
            <MdAdd size={18} />
            Adicionar grupo
          </button>
        </div>
        <div className="relative mb-4">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" size={20} />
          <input
            type="text"
            placeholder="Buscar complemento..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-[24px] border border-gray-200 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
          />
        </div>
        {renderContent()}
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
  )
}

