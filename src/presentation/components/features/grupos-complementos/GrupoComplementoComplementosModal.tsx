'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MdSearch, MdAdd } from 'react-icons/md'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import {
  ComplementosTabsModal,
  ComplementosTabsModalState,
} from '@/src/presentation/components/features/complementos/ComplementosTabsModal'

interface GrupoComplementoComplementosModalProps {
  open?: boolean
  grupo?: GrupoComplemento
  onClose?: () => void
  onUpdated?: () => void
  isEmbedded?: boolean
}

/** Evita `[]` novo a cada render quando o React Query ainda não devolveu `data` (causa loop em useEffect). */
const EMPTY_COMPLEMENTOS: Complemento[] = []

/** IDs dos complementos vinculados ao grupo (a partir da entidade ou do GET do grupo) */
function getLinkedIdsFromGrupo(g: GrupoComplemento): string[] {
  const rawIds = g.getComplementosIds()
  if (rawIds && rawIds.length > 0) {
    return rawIds.map((id) => String(id))
  }
  const comps = g.getComplementos()
  if (Array.isArray(comps) && comps.length > 0) {
    return comps
      .map((item: { id?: unknown }) => item?.id?.toString())
      .filter((id): id is string => Boolean(id))
  }
  return []
}

/**
 * Aba Complementos do grupo: lista o catálogo de complementos com switch para vincular/desvincular.
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
  const [isLoadingGrupoComplementos, setIsLoadingGrupoComplementos] = useState(false)
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [vinculoLoadingId, setVinculoLoadingId] = useState<string | null>(null)

  // Estados para edição inline
  const [valorInputs, setValorInputs] = useState<Record<string, string>>({})
  const [descricaoInputs, setDescricaoInputs] = useState<Record<string, string>>({})
  const [savingMap, setSavingMap] = useState<Record<string, { valor?: boolean; descricao?: boolean; tipo?: boolean }>>({})
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})

  const {
    data: todosComplementosData,
    isLoading: isLoadingTodosComplementos,
    refetch: refetchComplementos,
  } = useComplementos({ limit: 2000 })
  const todosComplementos = todosComplementosData ?? EMPTY_COMPLEMENTOS
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
      setIsLoadingGrupoComplementos(true)
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
        setLinkedIds(getLinkedIdsFromGrupo(parsedGrupo))
      } catch (error) {
        console.error('Erro ao carregar complementos do grupo:', error)
        const message = handleApiError(error)
        showToast.error(message)
      } finally {
        setIsLoadingGrupoComplementos(false)
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
    const idsDoProps = getLinkedIdsFromGrupo(grupo)
    if (idsDoProps.length > 0) {
      setLinkedIds(idsDoProps)
    } else {
      carregarComplementos(grupo.getId())
    }
  }, [isVisible, grupo, carregarComplementos])

  const catalogo = useMemo(() => todosComplementos as Complemento[], [todosComplementos])

  const filteredComplementos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return catalogo
    }
    return catalogo.filter((c) => {
      const nome = c.getNome()?.toLowerCase() || ''
      const descricao = c.getDescricao()?.toLowerCase() || ''
      return nome.includes(term) || descricao.includes(term)
    })
  }, [catalogo, searchTerm])

  /** Vinculados ao grupo primeiro; não vinculados abaixo (ordem dentro de cada bloco = filtro atual) */
  const complementosOrdenados = useMemo(() => {
    const vinculados: Complemento[] = []
    const naoVinculados: Complemento[] = []
    for (const c of filteredComplementos) {
      if (linkedIds.includes(c.getId())) {
        vinculados.push(c)
      } else {
        naoVinculados.push(c)
      }
    }
    return [...vinculados, ...naoVinculados]
  }, [filteredComplementos, linkedIds])

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
        setLinkedIds(getLinkedIdsFromGrupo(parsedGrupo))
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

  const handleToggleVinculo = useCallback(
    async (complementoId: string, vincular: boolean) => {
      if (!grupo) return
      const next = new Set(linkedIds)
      if (vincular) {
        next.add(complementoId)
      } else {
        next.delete(complementoId)
      }
      const novosIds = Array.from(next)
      setVinculoLoadingId(complementoId)
      try {
        await updateGrupoComplementos(
          novosIds,
          vincular ? 'Complemento vinculado ao grupo!' : 'Complemento removido do grupo.'
        )
      } finally {
        setVinculoLoadingId(null)
      }
    },
    [grupo, linkedIds, updateGrupoComplementos]
  )

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

      const lista = todosComplementos as Complemento[]
      const complementoAtual = lista.find((c) => c.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const valorAtual = complementoAtual.getValor() ?? 0
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
          [complementoId]: formatValorFromNumber(complementoAtual.getValor()),
        }))
      } finally {
        setSavingMap((prev) => {
          const current = prev[complementoId] || {}
          const { valor: _, ...rest } = current
          return { ...prev, [complementoId]: rest }
        })
      }
    },
    [auth, valorInputs, parseValorToNumber, todosComplementos, formatValorFromNumber, queryClient]
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

      const lista = todosComplementos as Complemento[]
      const complementoAtual = lista.find((c) => c.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const descricaoAtual = complementoAtual.getDescricao() || ''
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
          [complementoId]: complementoAtual.getDescricao() || '',
        }))
      } finally {
        setSavingMap((prev) => {
          const current = prev[complementoId] || {}
          const { descricao: _, ...rest } = current
          return { ...prev, [complementoId]: rest }
        })
      }
    },
    [auth, descricaoInputs, todosComplementos, queryClient]
  )

  // Handler para atualizar status ativo
  const handleToggleAtivo = useCallback(
    async (complementoId: string, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const lista = todosComplementos as Complemento[]
      const complementoAtual = lista.find((c) => c.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      if (complementoAtual.isAtivo() === novoStatus) {
        return
      }

      setTogglingStatus((prev) => ({ ...prev, [complementoId]: true }))

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
      } finally {
        setTogglingStatus((prev) => {
          const { [complementoId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, todosComplementos, queryClient]
  )

  // Handler para atualizar tipoImpactoPreco
  const handleUpdateTipoImpacto = useCallback(
    async (complementoId: string, novoTipo: 'nenhum' | 'aumenta' | 'diminui') => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const lista = todosComplementos as Complemento[]
      const complementoAtual = lista.find((c) => c.getId() === complementoId)
      if (!complementoAtual) {
        showToast.error('Complemento não encontrado.')
        return
      }

      const tipoAtual = normalizeTipoImpacto(complementoAtual.getTipoImpactoPreco())
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
    [auth, todosComplementos, normalizeTipoImpacto, queryClient]
  )

  // Sincroniza inputs com o catálogo (React Query)
  useEffect(() => {
    const novosValorInputs: Record<string, string> = {}
    const novasDescricaoInputs: Record<string, string> = {}
    todosComplementos.forEach((c) => {
      const comp = c as Complemento
      const id = comp.getId()
      novosValorInputs[id] = formatValorFromNumber(comp.getValor())
      novasDescricaoInputs[id] = comp.getDescricao() || ''
    })
    setValorInputs((prev) => ({ ...prev, ...novosValorInputs }))
    setDescricaoInputs((prev) => ({ ...prev, ...novasDescricaoInputs }))
  }, [todosComplementos, formatValorFromNumber])

  if (!isVisible || !grupo) {
    return null
  }

  const content = (
    <div
      className={`flex w-full flex-col ${isEmbedded ? 'h-full min-h-0 flex-1' : 'max-h-[85vh] rounded-2xl'}`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col ${isEmbedded ? 'overflow-hidden' : ''}`}
      >
        <div className="flex min-h-0 flex-1 flex-col rounded-[12px] bg-info md:p-5 p-3">
          {/* Mesmo padrão visual da aba Grupo: título primary + linha + ação */}
          <div className="mb-2 flex flex-wrap items-center gap-3 md:gap-5">
            <h2 className="shrink-0 text-primary md:text-xl text-sm font-semibold font-exo">
              Complementos do Grupo
            </h2>
            <div className="h-px min-h-0 min-w-[2rem] flex-1 bg-primary/70" aria-hidden />
            <button
              type="button"
              onClick={openComplementoCreateModal}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-info shadow hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:px-5 md:text-sm"
              disabled={isLoadingTodosComplementos}
            >
              <MdAdd className="md:text-lg text-sm" />
              Novo complemento
            </button>
          </div>
          <p className="mb-2 text-xs font-semibold text-primary-text md:text-lg">{grupo.getNome()}</p>

          <div className="mb-2">
            <label className="mb-1 block text-xs font-semibold text-secondary-text">
              Buscar complemento
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Digite para filtrar..."
                className="h-8 w-full min-w-0 rounded-lg border border-gray-200 pl-11 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none md:min-w-[350px]"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                <MdSearch size={18} />
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoadingTodosComplementos || isLoadingGrupoComplementos ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : catalogo.length === 0 ? (
          <p className="text-center text-secondary-text text-sm">
            Nenhum complemento cadastrado no sistema.
          </p>
        ) : filteredComplementos.length === 0 ? (
          <p className="text-center text-secondary-text text-sm">
            Nenhum complemento encontrado com esse filtro.
          </p>
        ) : (
          <>
            <div
              className="sticky top-0 z-[1] grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-200 bg-info px-2 py-2"
              role="row"
            >
              <span className="text-left text-sm font-semibold tracking-wide text-primary-text">
                Complementos
              </span>
              <span className="text-right text-sm font-semibold tracking-wide text-primary-text">
                Vínculo
              </span>
            </div>
            {complementosOrdenados.map((item) => {
            const comp = item as Complemento
            const id = comp.getId()
            const isLinked = linkedIds.includes(id)
            return (
              <div
                key={id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-gray-200 p-2 transition-colors hover:bg-primary-bg/60"
              >
                <div className="min-w-0">
                  {isLinked ? (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <p className="text-sm font-normal text-primary-text">{comp.getNome()}</p>
                          <JiffyIconSwitch
                            size="xs"
                            checked={comp.isAtivo()}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleToggleAtivo(id, e.target.checked)
                            }}
                            disabled={!!togglingStatus[id]}
                            label={comp.isAtivo() ? 'Ativo' : 'Inativo'}
                            labelPosition="end"
                            bordered={false}
                            className="shrink-0"
                            inputProps={{
                              'aria-label': comp.isAtivo()
                                ? 'Desativar complemento'
                                : 'Ativar complemento',
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={valorInputs[id] ?? formatValorFromNumber(comp.getValor())}
                            onChange={(e) => {
                              setValorInputs((prev) => ({
                                ...prev,
                                [id]: formatValorInput(e.target.value),
                              }))
                            }}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleUpdateValor(id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            disabled={!!savingMap[id]?.valor}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-[100px] rounded border border-gray-200 px-2 py-1 text-xs font-normal text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                        <input
                          type="text"
                          value={descricaoInputs[id] ?? comp.getDescricao() ?? ''}
                          onChange={(e) => {
                            setDescricaoInputs((prev) => ({
                              ...prev,
                              [id]: e.target.value,
                            }))
                          }}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleUpdateDescricao(id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                          disabled={!!savingMap[id]?.descricao}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Sem descrição"
                          className="max-w-[200px] min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs text-secondary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <select
                          value={normalizeTipoImpacto(comp.getTipoImpactoPreco())}
                          onChange={(e) => {
                            const novoValor = e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                            handleUpdateTipoImpacto(id, novoValor)
                          }}
                          disabled={!!savingMap[id]?.tipo}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border border-gray-200 px-2 py-1 text-[11px] font-normal uppercase tracking-wide text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="nenhum">Nenhum</option>
                          <option value="aumenta">Aumenta</option>
                          <option value="diminui">Diminui</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="pr-1">
                      <p className="text-sm font-normal text-primary-text">{comp.getNome()}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-secondary-text">
                        {comp.getDescricao()?.trim() ? comp.getDescricao() : 'Sem descrição'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 justify-end self-start pt-0.5">
                  <JiffyIconSwitch
                    checked={isLinked}
                    onChange={(e) => {
                      e.stopPropagation()
                      void handleToggleVinculo(id, e.target.checked)
                    }}
                    disabled={vinculoLoadingId === id}
                    bordered={false}
                    size="sm"
                    className="shrink-0"
                    inputProps={{
                      'aria-label': isLinked ? 'Desvincular do grupo' : 'Vincular ao grupo',
                    }}
                  />
                </div>
              </div>
            )
          })}
          </>
        )}
          </div>
        </div>
      </div>

      {/* No modal com abas o rodapé é o `JiffySidePanelModal` (mesmo formato do Atualizar) */}
      {onClose && !isEmbedded ? (
        <div className="shrink-0 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-full font-semibold text-white shadow-none"
            style={{
              borderRadius: 0,
              backgroundColor: 'var(--color-primary)',
            }}
          >
            Fechar
          </button>
        </div>
      ) : null}
    </div>
  )

  if (isEmbedded) {
    return (
      <>
        <div className="h-full flex flex-col">{content}</div>
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
      <ComplementosTabsModal
        state={complementosTabsState}
        onClose={closeComplementosTabsModal}
        onTabChange={handleComplementosTabChange}
        onReload={handleComplementosTabsReload}
      />
    </>
  )
}


