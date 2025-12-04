'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MdSearch, MdDelete, MdAdd } from 'react-icons/md'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { handleApiError, showToast } from '@/src/shared/utils/toast'

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
  const [addSearch, setAddSearch] = useState('')
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([])

  const {
    data: todosComplementos = [],
    isLoading: isLoadingTodosComplementos,
  } = useComplementos({ ativo: true, limit: 100 })

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
    const grupoIds = new Set(complementosGrupo.map((c) => c.id))
    return (todosComplementos as Complemento[]).filter((item) => !grupoIds.has(item.getId()))
  }, [todosComplementos, complementosGrupo])

  const filteredAvailable = useMemo(() => {
    const term = addSearch.trim().toLowerCase()
    if (!term) return availableComplementos
    return availableComplementos.filter((item) => {
      const nome = item.getNome()?.toLowerCase() || ''
      const descricao = item.getDescricao()?.toLowerCase() || ''
      return nome.includes(term) || descricao.includes(term)
    })
  }, [availableComplementos, addSearch])

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
    const novosIds = Array.from(
      new Set([...complementosGrupo.map((item) => item.id), ...selectedAddIds])
    )
    await updateGrupoComplementos(novosIds, 'Complementos adicionados com sucesso!')
    setIsAddModalOpen(false)
    setSelectedAddIds([])
    setAddSearch('')
  }, [complementosGrupo, selectedAddIds, updateGrupoComplementos])

  if (!isVisible || !grupo) {
    return null
  }

  const content = (
    <div className="w-full h-full bg-info flex flex-col rounded-2xl">
      <div className="px-6 py-4 border-b border-alternate flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-secondary-text">Complementos do grupo</p>
          <h2 className="text-lg font-semibold text-primary-text">{grupo.getNome()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="h-9 px-4 rounded-full bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoadingComplementos}
          >
            <MdAdd />
            Adicionar
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-alternate">
        <label className="text-xs font-semibold text-secondary-text mb-1 block">
          Buscar complemento do grupo
        </label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Digite para filtrar..."
            className="w-full h-10 rounded-xl border border-gray-200 bg-primary-bg pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
            <MdSearch size={18} />
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
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
              className="p-4 rounded-2xl border border-gray-200 bg-primary-bg/60 flex items-start gap-3 transition-colors hover:bg-primary-bg"
            >
              <button
                type="button"
                onClick={() => handleRemoveComplemento(complemento.id)}
                disabled={removingId === complemento.id}
                className="mt-1 w-8 h-8 flex items-center justify-center rounded-full border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        <div className="px-6 py-4 border-t border-alternate flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-6 rounded-full border border-gray-300 text-secondary-text hover:text-primary-text hover:border-primary transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )

  const addModal = isAddModalOpen ? (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-2xl bg-info rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-alternate flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-secondary-text">
              Adicionar complementos
            </p>
            <h3 className="text-lg font-semibold text-primary-text">{grupo.getNome()}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(false)
              setSelectedAddIds([])
              setAddSearch('')
            }}
            className="text-secondary-text hover:text-primary-text transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 border-b border-alternate">
          <label className="text-xs font-semibold text-secondary-text mb-1 block">
            Buscar complemento disponível
          </label>
          <div className="relative">
            <input
              type="text"
              value={addSearch}
              onChange={(event) => setAddSearch(event.target.value)}
              placeholder="Digite para filtrar..."
              className="w-full h-10 rounded-xl border border-gray-200 bg-primary-bg pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
              <MdSearch size={18} />
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoadingTodosComplementos ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAvailable.length === 0 ? (
            <p className="text-center text-secondary-text text-sm">
              Nenhum complemento disponível para adicionar.
            </p>
          ) : (
            filteredAvailable.map((item) => {
              const id = item.getId()
              const isSelected = selectedAddIds.includes(id)
              return (
                <label
                  key={id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-primary-bg hover:bg-primary-bg/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleAddSelection(id)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-primary-text">{item.getNome()}</p>
                      <div className="text-right">
                        {item.getValor() > 0 && (
                          <p className="text-xs font-semibold text-primary-text">
                            R$ {item.getValor().toFixed(2)}
                          </p>
                        )}
                        
                      </div>
                    </div>
                    {(item.getDescricao() || item.getTipoImpactoPreco?.()) && (
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="text-xs text-secondary-text">
                          {item.getDescricao() || 'Sem descrição'}
                        </p>
                        {item.getTipoImpactoPreco?.() && (
                          <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                            {item.getTipoImpactoPreco()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 border-t border-alternate flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(false)
              setSelectedAddIds([])
              setAddSearch('')
            }}
            className="h-10 px-5 rounded-full border border-gray-300 text-secondary-text hover:text-primary-text hover:border-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmAdd}
            disabled={selectedAddIds.length === 0}
            className="h-10 px-6 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Adicionar selecionados
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (isEmbedded) {
    return (
      <>
        <div className="h-full flex flex-col">{content}</div>
        {addModal}
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-3xl max-h-[85vh]">{content}</div>
      </div>
      {addModal}
    </>
  )
}


