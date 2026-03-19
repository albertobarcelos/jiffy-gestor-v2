'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
  ativo?: boolean
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
      ativo: item.ativo === true || item.ativo === 'true' || item.ativo === undefined ? true : false,
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
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingComplementos, setIsLoadingComplementos] = useState(false)
  const [complementosGrupo, setComplementosGrupo] = useState<GrupoComplementoItemResumo[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([])

  // Estados para edição inline
  const [valorInputs, setValorInputs] = useState<Record<string, string>>({})
  const [descricaoInputs, setDescricaoInputs] = useState<Record<string, string>>({})
  const [savingMap, setSavingMap] = useState<Record<string, { valor?: boolean; descricao?: boolean; tipo?: boolean }>>({})
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})

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

  // Funções de formatação monetária
  const formatValorInput = useCallback((value: string) => {
    // Remove tudo exceto dígitos
    const digits = value.replace(/\D/g, '')
    if (!digits) return 'R$ 0,00'
    const numberValue = parseInt(digits, 10)
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numberValue / 100)
  }, [])

  const formatValorFromNumber = useCallback((value: number | null | undefined) => {
    if (value === null || value === undefined) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }, [])

  const parseValorToNumber = useCallback((value: string) => {
    // Remove R$ e espaços, depois remove pontos (milhares) e substitui vírgula por ponto
    const normalized = value.replace(/R\$/g, '').trim().replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(normalized)
    return Number.isNaN(parsed) ? 0 : parsed
  }, [])

  // Normalizar tipoImpactoPreco
  const normalizeTipoImpacto = useCallback((tipo: string | null | undefined): 'nenhum' | 'aumenta' | 'diminui' => {
    if (!tipo) return 'nenhum'
    const tipoLower = tipo.toLowerCase()
    if (tipoLower === 'aumenta' || tipoLower === 'diminui') {
      return tipoLower
    }
    return 'nenhum'
  }, [])

  // Handler para atualizar valor
  const handleUpdateValor = useCallback(
    async (complementoId: string) => {
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

      const complementoAtual = complementosGrupo.find((item) => item.id === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const valorAtual = complementoAtual.valor ?? 0
      if (novoValor === valorAtual) {
        return
      }

      setSavingMap((prev) => ({ ...prev, [complementoId]: { ...prev[complementoId], valor: true } }))

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
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar valor')
        }

        showToast.success('Valor atualizado com sucesso!')
        setComplementosGrupo((prev) =>
          prev.map((item) =>
            item.id === complementoId
              ? { ...item, valor: novoValor }
              : item
          )
        )
        // Invalida cache do React Query para refletir mudanças em outras telas
        queryClient.invalidateQueries({ queryKey: ['complementos'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['complemento', complementoId] })
      } catch (error: any) {
        console.error('Erro ao atualizar valor do complemento:', error)
        const message = handleApiError(error)
        showToast.error(message)
        // Restaura valor anterior
        setValorInputs((prev) => ({
          ...prev,
          [complementoId]: formatValorFromNumber(complementoAtual.valor),
        }))
      } finally {
        setSavingMap((prev) => {
          const current = prev[complementoId] || {}
          const { valor: _, ...rest } = current
          return { ...prev, [complementoId]: rest }
        })
      }
    },
    [auth, valorInputs, parseValorToNumber, complementosGrupo, formatValorFromNumber, queryClient]
  )

  // Handler para atualizar descrição
  const handleUpdateDescricao = useCallback(
    async (complementoId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const novaDescricao = descricaoInputs[complementoId] ?? ''

      const complementoAtual = complementosGrupo.find((item) => item.id === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const descricaoAtual = complementoAtual.descricao || ''
      if (novaDescricao === descricaoAtual) {
        return
      }

      setSavingMap((prev) => ({ ...prev, [complementoId]: { ...prev[complementoId], descricao: true } }))

      try {
        const response = await fetch(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ descricao: novaDescricao || null }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar descrição')
        }

        showToast.success('Descrição atualizada com sucesso!')
        setComplementosGrupo((prev) =>
          prev.map((item) =>
            item.id === complementoId
              ? { ...item, descricao: novaDescricao || null }
              : item
          )
        )
        // Invalida cache do React Query para refletir mudanças em outras telas
        queryClient.invalidateQueries({ queryKey: ['complementos'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['complemento', complementoId] })
      } catch (error: any) {
        console.error('Erro ao atualizar descrição do complemento:', error)
        const message = handleApiError(error)
        showToast.error(message)
        // Restaura descrição anterior
        setDescricaoInputs((prev) => ({
          ...prev,
          [complementoId]: complementoAtual.descricao || '',
        }))
      } finally {
        setSavingMap((prev) => {
          const current = prev[complementoId] || {}
          const { descricao: _, ...rest } = current
          return { ...prev, [complementoId]: rest }
        })
      }
    },
    [auth, descricaoInputs, complementosGrupo, queryClient]
  )

  // Handler para atualizar status ativo
  const handleToggleAtivo = useCallback(
    async (complementoId: string, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoAtual = complementosGrupo.find((item) => item.id === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      if (complementoAtual.ativo === novoStatus) {
        return
      }

      setTogglingStatus((prev) => ({ ...prev, [complementoId]: true }))

      // Atualização otimista
      setComplementosGrupo((prev) =>
        prev.map((item) =>
          item.id === complementoId
            ? { ...item, ativo: novoStatus }
            : item
        )
      )

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
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar status do complemento')
        }

        showToast.success(
          novoStatus ? 'Complemento ativado com sucesso!' : 'Complemento desativado com sucesso!'
        )
        // Invalida cache do React Query para refletir mudanças em outras telas
        queryClient.invalidateQueries({ queryKey: ['complementos'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['complemento', complementoId] })
      } catch (error: any) {
        console.error('Erro ao atualizar status do complemento:', error)
        const message = handleApiError(error)
        showToast.error(message)
        // Reverte atualização otimista
        setComplementosGrupo((prev) =>
          prev.map((item) =>
            item.id === complementoId
              ? { ...item, ativo: complementoAtual.ativo ?? true }
              : item
          )
        )
      } finally {
        setTogglingStatus((prev) => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, complementosGrupo, queryClient]
  )

  // Handler para atualizar tipoImpactoPreco
  const handleUpdateTipoImpacto = useCallback(
    async (complementoId: string, novoTipo: 'nenhum' | 'aumenta' | 'diminui') => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const complementoAtual = complementosGrupo.find((item) => item.id === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const tipoAtual = normalizeTipoImpacto(complementoAtual.tipoImpactoPreco)
      if (tipoAtual === novoTipo) {
        return
      }

      setSavingMap((prev) => ({ ...prev, [complementoId]: { ...prev[complementoId], tipo: true } }))

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
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar tipo de impacto')
        }

        showToast.success('Tipo de impacto atualizado com sucesso!')
        setComplementosGrupo((prev) =>
          prev.map((item) =>
            item.id === complementoId
              ? { ...item, tipoImpactoPreco: payloadTipo }
              : item
          )
        )
        // Invalida cache do React Query para refletir mudanças em outras telas
        queryClient.invalidateQueries({ queryKey: ['complementos'], exact: false })
        queryClient.invalidateQueries({ queryKey: ['complemento', complementoId] })
      } catch (error: any) {
        console.error('Erro ao atualizar tipo de impacto:', error)
        const message = handleApiError(error)
        showToast.error(message)
      } finally {
        setSavingMap((prev) => {
          const current = prev[complementoId] || {}
          const { tipo: _, ...rest } = current
          return { ...prev, [complementoId]: rest }
        })
      }
    },
    [auth, complementosGrupo, normalizeTipoImpacto, queryClient]
  )

  // Inicializar valores dos inputs quando complementosGrupo mudar
  useEffect(() => {
    const novosValorInputs: Record<string, string> = {}
    const novasDescricaoInputs: Record<string, string> = {}
    
    complementosGrupo.forEach((complemento) => {
      novosValorInputs[complemento.id] = formatValorFromNumber(complemento.valor)
      novasDescricaoInputs[complemento.id] = complemento.descricao || ''
    })
    
    setValorInputs((prev) => ({ ...prev, ...novosValorInputs }))
    setDescricaoInputs((prev) => ({ ...prev, ...novasDescricaoInputs }))
  }, [complementosGrupo, formatValorFromNumber])

  if (!isVisible || !grupo) {
    return null
  }

  const content = (
    <div className="w-full h-full bg-info flex flex-col rounded-2xl">
      <div className="md:px-6 px-2 md:py-4 py-2 border-b-[2px] border-primary/70 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-text">Complementos do grupo:</p>
          <h2 className="md:text-lg text-sm font-semibold text-secondary-text">{grupo.getNome()}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedAddIds(complementosGrupo.map((item) => item.id))
              setIsAddModalOpen(true)
            }}
            className="md:h-8 md:px-4 px-1 py-1 rounded-lg bg-primary text-white md:text-sm text-xs font-semibold flex items-center md:gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoadingComplementos}
          >
            <MdAdd />
            Vincular complementos
          </button>
        </div>
      </div>

      <div className="md:px-6 px-2 md:py-1 py-1 ">
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
            className="w-full md:min-w-[350px] min-w-[280px] h-8 rounded-lg border border-gray-200 bg-primary-bg pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
            <MdSearch size={18} />
          </span>
        </div>
       
          </div>
      </div>

      <div className="flex-1 overflow-y-auto md:px-6 px-2 md:py-2 py-1 space-y-2">
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
                
                  <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-primary-text mr-4">{complemento.nome}</p>
                    <label
                      className={`relative inline-flex h-5 w-12 items-center ${
                        togglingStatus[complemento.id]
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer'
                      }`}
                      title={complemento.ativo ? 'Complemento Ativo' : 'Complemento Desativado'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={complemento.ativo ?? true}
                        onChange={(event) => {
                          event.stopPropagation()
                          handleToggleAtivo(complemento.id, event.target.checked)
                        }}
                        disabled={!!togglingStatus[complemento.id]}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                      <span className="absolute left-1 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-6" />
                    </label>
                    
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={valorInputs[complemento.id] ?? formatValorFromNumber(complemento.valor)}
                      onChange={(e) => {
                        setValorInputs((prev) => ({
                          ...prev,
                          [complemento.id]: formatValorInput(e.target.value),
                        }))
                      }}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => handleUpdateValor(complemento.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                      }}
                      disabled={!!savingMap[complemento.id]?.valor}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold text-primary-text px-2 py-1 rounded border border-gray-200 bg-primary-bg focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed min-w-[100px]"
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={descricaoInputs[complemento.id] ?? complemento.descricao ?? ''}
                    onChange={(e) => {
                      setDescricaoInputs((prev) => ({
                        ...prev,
                        [complemento.id]: e.target.value,
                      }))
                    }}
                    onFocus={(e) => e.target.select()}
                    onBlur={() => handleUpdateDescricao(complemento.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    disabled={!!savingMap[complemento.id]?.descricao}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Sem descrição"
                    className="text-xs text-secondary-text px-2 py-1 rounded border border-gray-200 bg-primary-bg focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed flex-1 max-w-[200px]"
                  />
                  <select
                    value={normalizeTipoImpacto(complemento.tipoImpactoPreco)}
                    onChange={(e) => {
                      const novoValor = e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                      handleUpdateTipoImpacto(complemento.id, novoValor)
                    }}
                    disabled={!!savingMap[complemento.id]?.tipo}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-semibold text-primary uppercase tracking-wide px-2 py-1 rounded border border-gray-200 bg-primary-bg focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="aumenta">Aumenta</option>
                    <option value="diminui">Diminui</option>
                  </select>
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


