'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdSearch, MdDelete, MdAdd } from 'react-icons/md'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import {
  ComplementosTabsModal,
  ComplementosTabsModalState,
} from '@/src/presentation/components/features/complementos/ComplementosTabsModal'
import { ComplementosSelectModal } from '@/src/presentation/components/features/complementos/ComplementosSelectModal'

interface GrupoComplementoComplementosModalProps {
  open?: boolean
  grupo?: GrupoComplemento
  onClose?: () => void
  onUpdated?: () => void
  isEmbedded?: boolean
}

interface GrupoComplementoItemResumo {
  id: string
  nome: string
  descricao?: string | null
  valor?: number | null
  tipoImpactoPreco?: string | null
}

const parseComplementosFromGrupo = (items: any[] | undefined): GrupoComplementoItemResumo[] => {
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .map((item) => ({
      id: item.id?.toString() || '',
      nome: item.nome?.toString() || 'Complemento sem nome',
      descricao: item.descricao ?? null,
      valor:
        typeof item.valor === 'number'
          ? item.valor
          : item.valor
            ? Number(item.valor)
            : null,
      tipoImpactoPreco: item.tipoImpactoPreco?.toString() || null,
    }))
    .filter((item) => item.id)
}

/**
 * Modal para visualizar os complementos vinculados a um grupo.
 * Exibe apenas os complementos relacionados ao grupo selecionado.
 */
export function GrupoComplementoComplementosModal({
  open = false,
  grupo,
  onClose,
  onUpdated,
  isEmbedded = false,
}: GrupoComplementoComplementosModalProps) {
  const { auth } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [complementosGrupo, setComplementosGrupo] = useState<GrupoComplementoItemResumo[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([])

  const {
    data: todosComplementos = [],
    isLoading: isLoadingTodosComplementos,
    refetch: refetchComplementos,
  } = useComplementos({ ativo: true, limit: 100 })
  const [complementosTabsState, setComplementosTabsState] = useState<ComplementosTabsModalState>({
    open: false,
    tab: 'complemento',
    mode: 'create',
    complementoId: undefined,
  })

  const carregarComplementos = useCallback(
    async (grupoId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      setIsLoadingComplementos(true)
      try {
        const response = await fetch(`/api/grupos-complementos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || errorData.message || 'Erro ao carregar complementos do grupo'
          )
        }

        const data = await response.json()
        const parsedGrupo = GrupoComplemento.fromJSON(data)
        setComplementosGrupo(parseComplementosFromGrupo(parsedGrupo.getComplementos()))
      } catch (error) {
        console.error('Erro ao carregar complementos do grupo:', error)
        const message = handleApiError(error)
        showToast.error(message)
      } finally {
        setIsLoadingComplementos(false)
      }
    },
    [auth]
  )

  const isVisible = isEmbedded ? Boolean(grupo) : open

  useEffect(() => {
    if (!isVisible || !grupo) {
      return
    }

    setSearchTerm('')
    const complementosDoGrupo = parseComplementosFromGrupo(grupo.getComplementos())
    if (complementosDoGrupo.length > 0) {
      setComplementosGrupo(complementosDoGrupo)
    } else {
      carregarComplementos(grupo.getId())
    }
  }, [isVisible, grupo, carregarComplementos])

  const filteredComplementos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return complementosGrupo
    }
    return complementosGrupo.filter((item) => {
      const nome = item.nome?.toLowerCase() || ''
      const descricao = item.descricao?.toLowerCase() || ''
      return nome.includes(term) || descricao.includes(term)
    })
  }, [complementosGrupo, searchTerm])

  const availableComplementos = useMemo(() => {
    // Inclui todos os complementos para exibir os já selecionados marcados
    return todosComplementos as Complemento[]
  }, [todosComplementos])

  const updateGrupoComplementos = useCallback(
    async (novosIds: string[], successMessage: string) => {
      if (!grupo) return
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      const toastId = showToast.loading('Atualizando complementos...')
      try {
        const response = await fetch(`/api/grupos-complementos/${grupo.getId()}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ complementosIds: novosIds }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar complementos do grupo')
        }

        const data = await response.json()
        const parsedGrupo = GrupoComplemento.fromJSON(data)
        setComplementosGrupo(parseComplementosFromGrupo(parsedGrupo.getComplementos()))
        showToast.successLoading(toastId, successMessage)
        onUpdated?.()
      } catch (error) {
        console.error('Erro ao atualizar complementos:', error)
        const message = handleApiError(error)
        showToast.errorLoading(toastId, message)
      }
    },
    [auth, grupo, onUpdated]
  )

  const handleRemoveComplemento = useCallback(
    async (complementoId: string) => {
      if (!grupo) return
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      setRemovingId(complementoId)
      try {
        await updateGrupoComplementos(
          complementosGrupo.filter((item) => item.id !== complementoId).map((item) => item.id),
          'Complemento removido com sucesso!'
        )
      } finally {
        setRemovingId(null)
      }
    },
    [complementosGrupo, updateGrupoComplementos]
  )

  const toggleAddSelection = useCallback((id: string) => {
    setSelectedAddIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }, [])

  const handleConfirmAdd = useCallback(async () => {
    const novosIds = Array.from(new Set(selectedAddIds))
    await updateGrupoComplementos(novosIds, 'Complementos atualizados com sucesso!')
    setIsAddModalOpen(false)
    setSelectedAddIds([])
  }, [selectedAddIds, updateGrupoComplementos])

  const openComplementoCreateModal = useCallback(() => {
    setComplementosTabsState((prev) => ({
      ...prev,
      open: true,
      tab: 'complemento',
      mode: 'create',
      complementoId: undefined,
    }))
  }, [])

  const closeComplementosTabsModal = useCallback(() => {
    setComplementosTabsState((prev) => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleComplementosTabChange = useCallback((tab: 'complemento') => {
    setComplementosTabsState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleComplementosTabsReload = useCallback(async () => {
    await refetchComplementos()
  }, [refetchComplementos])

  if (!isVisible || !grupo) {
    return null
  }

  const content = (
    <div className="w-full h-full bg-info flex flex-col rounded-2xl">
      <div className="px-6 py-4 border-b-[2px] border-primary/70 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-secondary-text">Complementos do grupo</p>
          <h2 className="text-lg font-semibold text-primary-text">{grupo.getNome()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedAddIds(complementosGrupo.map((item) => item.id))
              setIsAddModalOpen(true)
            }}
            className="h-8 px-4 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoadingComplementos}
          >
            <MdAdd />
            Vincular complementos
          </button>
        </div>
      </div>

      <div className="px-6 py-1 ">
        <label className="text-xs font-semibold text-secondary-text mb-1 block">
          Buscar complemento do grupo
        </label>
        <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Digite para filtrar..."
            className="w-full min-w-[350px] h-8 rounded-lg border border-gray-200 bg-primary-bg pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
            <MdSearch size={18} />
          </span>
        </div>
       
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2">
        {isLoadingComplementos ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredComplementos.length === 0 ? (
          <p className="text-center text-secondary-text text-sm">
            Nenhum complemento vinculado ao grupo foi encontrado.
          </p>
        ) : (
          filteredComplementos.map((complemento) => (
            <div
              key={complemento.id}
              className="p-2 rounded-lg border border-gray-200 bg-primary-bg/60 flex items-start gap-3 transition-colors hover:bg-primary-bg"
            >
              <button
                type="button"
                onClick={() => handleRemoveComplemento(complemento.id)}
                disabled={removingId === complemento.id}
                className="mt-1 w-6 h-6 flex items-center justify-center rounded-full border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Remover complemento do grupo"
              >
                <MdDelete />
              </button>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary-text">{complemento.nome}</p>
                  {typeof complemento.valor === 'number' && (
                    <p className="text-xs font-semibold text-primary-text">
                      R$ {complemento.valor.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="text-xs text-secondary-text">
                    {complemento.descricao || 'Sem descrição'}
                  </p>
                  {complemento.tipoImpactoPreco && (
                    <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                      {complemento.tipoImpactoPreco}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {onClose && (
        <div className="px-6 pb-16 pt-6 border-t-[2px] border-primary/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-6 rounded-lg border border-gray-300 text-primary-text hover:border-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )

  const addModal = (
    <ComplementosSelectModal
      open={isAddModalOpen}
      title="Vincular complementos"
      complementos={availableComplementos}
      selectedIds={selectedAddIds}
      isLoading={isLoadingTodosComplementos}
      onToggle={toggleAddSelection}
      onConfirm={handleConfirmAdd}
      onClose={() => {
        setIsAddModalOpen(false)
        setSelectedAddIds([])
      }}
      onCreateComplemento={openComplementoCreateModal}
      confirmLabel="Vincular selecionados"
      emptyMessage="Nenhum complemento disponível para adicionar."
    />
  )

  if (isEmbedded) {
    return (
      <>
        <div className="h-full flex flex-col">{content}</div>
        {addModal}
        <ComplementosTabsModal
          state={complementosTabsState}
          onClose={closeComplementosTabsModal}
          onTabChange={handleComplementosTabChange}
          onReload={handleComplementosTabsReload}
        />
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-3xl max-h-[85vh]">{content}</div>
      </div>
      {addModal}
      <ComplementosTabsModal
        state={complementosTabsState}
        onClose={closeComplementosTabsModal}
        onTabChange={handleComplementosTabChange}
        onReload={handleComplementosTabsReload}
      />
    </>
  )
}


