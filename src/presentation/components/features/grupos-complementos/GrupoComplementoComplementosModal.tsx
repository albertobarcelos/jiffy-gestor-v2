'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { MdSearch, MdAdd } from 'react-icons/md'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { Complemento } from '@/src/domain/entities/Complemento'
import { useComplementos } from '@/src/presentation/hooks/useComplementos'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
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
  mode?: 'persisted' | 'draft'
  draftGrupoNome?: string
  draftLinkedIds?: string[]
  onDraftLinkedIdsChange?: (ids: string[]) => void
  /** Painel de novo/editar complemento deve ficar acima do modal do grupo. */
  nestedModalZIndex?: number
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
  mode = 'persisted',
  draftGrupoNome,
  draftLinkedIds = [],
  onDraftLinkedIdsChange,
  nestedModalZIndex = 1450,
}: GrupoComplementoComplementosModalProps) {
  const invalidate = useInvalidateTenantQueries()
  const isDraftMode = mode === 'draft'
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoadingGrupoComplementos, setIsLoadingGrupoComplementos] = useState(false)
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [vinculoLoadingId, setVinculoLoadingId] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<'todos' | 'vinculados' | 'catalogo'>('vinculados')

  // Estados para edição inline
  const [valorInputs, setValorInputs] = useState<Record<string, string>>({})
  const [savingMap, setSavingMap] = useState<Record<string, { valor?: boolean; tipo?: boolean }>>({})
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
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      setIsLoadingGrupoComplementos(true)
      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupoId}`, {
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
    []
  )

  const isVisible = isEmbedded ? Boolean(grupo) || isDraftMode : open
  const effectiveLinkedIds = isDraftMode ? draftLinkedIds : linkedIds

  // Usar o ID (primitivo) como dep em vez do objeto `grupo` inteiro — evita loop se o
  // pai recriar o objeto a cada render sem mudar o ID.
  const grupoId = grupo?.getId() ?? null

  useEffect(() => {
    if (!isVisible || isDraftMode || !grupoId || !grupo) {
      return
    }

    setSearchTerm('')
    const idsDoProps = getLinkedIdsFromGrupo(grupo)
    if (idsDoProps.length > 0) {
      setLinkedIds(idsDoProps)
    } else {
      carregarComplementos(grupoId)
    }
    // `grupo` é lido mas excluído das deps propositalmente — só nos importa o grupoId mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, isDraftMode, grupoId, carregarComplementos])

  const catalogo = useMemo(() => todosComplementos as Complemento[], [todosComplementos])

  /** Totais absolutos por aba (sem busca) — bate com as regras de cada filtro. */
  const filterCounts = useMemo(() => {
    let vinculados = 0
    let catalogoAtivos = 0
    for (const c of catalogo) {
      const linked = effectiveLinkedIds.includes(c.getId())
      if (linked && c.isAtivo()) vinculados += 1
      if (!linked && c.isAtivo()) catalogoAtivos += 1
    }
    return {
      vinculados,
      catalogo: catalogoAtivos,
      todos: catalogo.length,
    }
  }, [catalogo, effectiveLinkedIds])

  const filteredComplementos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const bySearch = !term
      ? catalogo
      : catalogo.filter((c) => {
          const nome = c.getNome()?.toLowerCase() || ''
          const descricao = c.getDescricao()?.toLowerCase() || ''
          return nome.includes(term) || descricao.includes(term)
        })

    // Neste grupo / Disponíveis: só ativos. Todos: inclui inativos (com coluna Ativo).
    if (filterTab === 'vinculados') {
      return bySearch.filter((c) => effectiveLinkedIds.includes(c.getId()) && c.isAtivo())
    }
    if (filterTab === 'catalogo') {
      return bySearch.filter((c) => !effectiveLinkedIds.includes(c.getId()) && c.isAtivo())
    }
    return bySearch
  }, [catalogo, searchTerm, filterTab, effectiveLinkedIds])

  /** Vinculados ao grupo primeiro; não vinculados abaixo (ordem dentro de cada bloco = filtro atual) */
  const complementosOrdenados = useMemo(() => {
    if (filterTab !== 'todos') return filteredComplementos
    const vinculados: Complemento[] = []
    const naoVinculados: Complemento[] = []
    for (const c of filteredComplementos) {
      if (effectiveLinkedIds.includes(c.getId())) {
        vinculados.push(c)
      } else {
        naoVinculados.push(c)
      }
    }
    return [...vinculados, ...naoVinculados]
  }, [filteredComplementos, effectiveLinkedIds, filterTab])

  const updateGrupoComplementos = useCallback(
    async (novosIds: string[], successMessage: string) => {
      if (!grupo) return
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      const toastId = showToast.loading('Atualizando complementos...')
      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupo.getId()}`, {
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
    [ grupo, onUpdated]
  )

  const handleToggleVinculo = useCallback(
    async (complementoId: string, vincular: boolean) => {
      if (!grupo && !isDraftMode) return
      const next = new Set(effectiveLinkedIds)
      if (vincular) {
        next.add(complementoId)
      } else {
        next.delete(complementoId)
      }
      const novosIds = Array.from(next)
      if (isDraftMode) {
        onDraftLinkedIdsChange?.(novosIds)
        return
      }

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
    [grupo, isDraftMode, effectiveLinkedIds, onDraftLinkedIdsChange, updateGrupoComplementos]
  )

  /**
   * Após criar um novo complemento no modal, vincula-o automaticamente ao grupo
   * e recarrega o catálogo para exibir o item recém-criado.
   */
  const handleComplementoCreated = useCallback(
    async (newId: string) => {
      const next = Array.from(new Set([...effectiveLinkedIds, newId]))
      if (isDraftMode) {
        onDraftLinkedIdsChange?.(next)
        await refetchComplementos()
        return
      }
      await refetchComplementos()
      await updateGrupoComplementos(next, 'Complemento criado e vinculado ao grupo!')
    },
    [effectiveLinkedIds, isDraftMode, onDraftLinkedIdsChange, refetchComplementos, updateGrupoComplementos]
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

  const openComplementoEditModal = useCallback((id: string) => {
    setComplementosTabsState((prev) => ({
      ...prev,
      open: true,
      tab: 'complemento',
      mode: 'edit',
      complementoId: id,
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
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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
        const response = await fetchGestorApi(`/api/complementos/${complementoId}`, {
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
        void invalidate(['complementos'])
        void invalidate(['complemento', complementoId])
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
    [ valorInputs, parseValorToNumber, todosComplementos, formatValorFromNumber, invalidate]
  )

  // Handler para atualizar status ativo
  const handleToggleAtivo = useCallback(
    async (complementoId: string, novoStatus: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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
        const response = await fetchGestorApi(`/api/complementos/${complementoId}`, {
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
        void invalidate(['complementos'])
        void invalidate(['complemento', complementoId])
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
    [ todosComplementos, invalidate]
  )

  // Handler para atualizar tipoImpactoPreco
  const handleUpdateTipoImpacto = useCallback(
    async (complementoId: string, novoTipo: 'nenhum' | 'aumenta' | 'diminui') => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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
        const response = await fetchGestorApi(`/api/complementos/${complementoId}`, {
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
        void invalidate(['complementos'])
        void invalidate(['complemento', complementoId])
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
    [ todosComplementos, normalizeTipoImpacto, invalidate]
  )

  // Sincroniza inputs de valor com o catálogo (React Query)
  useEffect(() => {
    const novosValorInputs: Record<string, string> = {}
    todosComplementos.forEach((c) => {
      const comp = c as Complemento
      novosValorInputs[comp.getId()] = formatValorFromNumber(comp.getValor())
    })
    setValorInputs((prev) => ({ ...prev, ...novosValorInputs }))
  }, [todosComplementos, formatValorFromNumber])

  if (!isVisible || (!grupo && !isDraftMode)) {
    return null
  }

  const showAtivoColumn = filterTab === 'todos'
  // Todos: só nome + Ativo. Outras abas: Preço + Impacto + Vínculo.
  const showDetailColumns = filterTab !== 'todos'
  const gridCols = showAtivoColumn
    ? 'minmax(0,1fr) 3.25rem'
    : 'minmax(0,1fr) 5.5rem 6.5rem 3.25rem'

  const content = (
    <div
      className={`flex w-full flex-col ${isEmbedded ? 'h-full min-h-0 flex-1' : 'max-h-[85vh] rounded-2xl'}`}
    >
      <div
        className={`flex min-h-0 flex-1 flex-col ${isEmbedded ? 'overflow-hidden' : ''}`}
      >
        <div className="flex min-h-0 flex-1 flex-col rounded-[12px] bg-info md:p-5 p-3">
          {/* Cabeçalho */}
          <div className="mb-2 flex flex-wrap items-center gap-3 md:gap-5">
            <h2 className="shrink-0 text-primary md:text-xl text-sm font-semibold">
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
          <p className="mb-3 text-xs font-semibold text-primary-text md:text-lg">
            {grupo?.getNome() || draftGrupoNome || 'Novo grupo'}
          </p>

          {/* Busca + filtros */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar..."
                className="h-8 w-full min-w-0 rounded-lg border border-gray-200 pl-9 pr-4 text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text">
                <MdSearch size={16} />
              </span>
            </div>
            <div className="flex h-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
              {(['vinculados', 'catalogo', 'todos'] as const).map((tab) => {
                const labels = { vinculados: 'Neste grupo', catalogo: 'Disponíveis', todos: 'Todos' }
                const count = filterCounts[tab]
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={`flex h-full items-center gap-1.5 px-3 transition-colors ${
                      filterTab === tab
                        ? 'bg-primary text-white'
                        : 'bg-white text-secondary-text hover:bg-gray-50'
                    }`}
                  >
                    <span>{labels[tab]}</span>
                    <span
                      className={`tabular-nums ${
                        filterTab === tab ? 'text-white/80' : 'text-secondary-text/80'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista */}
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            {isLoadingTodosComplementos || isLoadingGrupoComplementos ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : catalogo.length === 0 ? (
              <p className="text-center text-secondary-text text-sm py-6">
                Nenhum complemento cadastrado no sistema.
              </p>
            ) : complementosOrdenados.length === 0 ? (
              <p className="text-center text-secondary-text text-sm py-6">
                Nenhum complemento encontrado.
              </p>
            ) : (
              <>
                {/* Cabeçalho sticky acima dos switches (transform cria stacking context) */}
                <div
                  className="sticky top-0 z-20 hidden sm:grid items-center gap-3 border-b border-gray-200 bg-info px-2 py-1.5 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
                  style={{ gridTemplateColumns: gridCols }}
                  role="row"
                >
                  <span className="text-xs font-semibold text-secondary-text">Complemento</span>
                  {showDetailColumns ? (
                    <>
                      <span className="text-center text-xs font-semibold text-secondary-text">Preço</span>
                      <span className="text-center text-xs font-semibold text-secondary-text">Impacto</span>
                      <span className="text-center text-xs font-semibold text-secondary-text">Vínculo</span>
                    </>
                  ) : null}
                  {showAtivoColumn ? (
                    <span className="text-center text-xs font-semibold text-secondary-text">Ativo</span>
                  ) : null}
                </div>

                {complementosOrdenados.map((item) => {
                  const comp = item as Complemento
                  const id = comp.getId()
                  const isLinked = effectiveLinkedIds.includes(id)
                  const descricao = comp.getDescricao()?.trim()

                  return (
                    <div
                      key={id}
                      className={`relative z-0 border-b border-gray-100 px-2 py-2 transition-colors hover:bg-primary-bg/40 ${
                        isLinked || showAtivoColumn ? '' : 'opacity-70'
                      }`}
                    >
                      {/* Layout desktop */}
                      <div
                        className="hidden sm:grid items-center gap-3"
                        style={{ gridTemplateColumns: gridCols }}
                      >
                        {/* Nome + descrição */}
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openComplementoEditModal(id)}
                            className="block truncate text-left text-sm font-medium text-primary-text hover:text-primary hover:underline focus:outline-none"
                            title="Editar complemento"
                          >
                            {comp.getNome()}
                          </button>
                          {descricao && (
                            <p className="truncate text-xs text-secondary-text">{descricao}</p>
                          )}
                        </div>

                        {showDetailColumns ? (
                          <>
                            {/* Preço inline */}
                            {isLinked ? (
                              <input
                                type="text"
                                value={valorInputs[id] ?? formatValorFromNumber(comp.getValor())}
                                onChange={(e) =>
                                  setValorInputs((prev) => ({
                                    ...prev,
                                    [id]: formatValorInput(e.target.value),
                                  }))
                                }
                                onFocus={(e) => e.target.select()}
                                onBlur={() => handleUpdateValor(id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                disabled={!!savingMap[id]?.valor}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded border border-gray-200 px-2 py-1 text-center text-xs text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            ) : (
                              <span className="block text-center text-xs text-secondary-text">
                                {formatValorFromNumber(comp.getValor())}
                              </span>
                            )}

                            {/* Impacto inline */}
                            {isLinked ? (
                              <select
                                value={normalizeTipoImpacto(comp.getTipoImpactoPreco())}
                                onChange={(e) =>
                                  handleUpdateTipoImpacto(
                                    id,
                                    e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                                  )
                                }
                                disabled={!!savingMap[id]?.tipo}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded border border-gray-200 px-1.5 py-1 text-[11px] text-primary-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="nenhum">Nenhum</option>
                                <option value="aumenta">Aumenta</option>
                                <option value="diminui">Diminui</option>
                              </select>
                            ) : (
                              <span className="block text-center text-[11px] capitalize text-secondary-text">
                                {normalizeTipoImpacto(comp.getTipoImpactoPreco())}
                              </span>
                            )}

                            {/* Switch Vínculo */}
                            <div className="flex justify-center">
                              <JiffyIconSwitch
                                checked={isLinked}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  void handleToggleVinculo(id, e.target.checked)
                                }}
                                disabled={vinculoLoadingId === id}
                                bordered={false}
                                size="sm"
                                inputProps={{ 'aria-label': isLinked ? 'Desvincular' : 'Vincular' }}
                              />
                            </div>
                          </>
                        ) : null}

                        {/* Switch Ativo — só na aba Todos */}
                        {showAtivoColumn ? (
                          <div className="flex justify-center">
                            <JiffyIconSwitch
                              size="xs"
                              checked={comp.isAtivo()}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleToggleAtivo(id, e.target.checked)
                              }}
                              disabled={!!togglingStatus[id]}
                              bordered={false}
                              inputProps={{ 'aria-label': comp.isAtivo() ? 'Desativar' : 'Ativar' }}
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Layout mobile */}
                      <div className="sm:hidden flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => openComplementoEditModal(id)}
                            className="block truncate text-left text-sm font-medium text-primary-text hover:text-primary"
                          >
                            {comp.getNome()}
                          </button>
                          {descricao && (
                            <p className="truncate text-xs text-secondary-text">{descricao}</p>
                          )}
                          {showDetailColumns && isLinked ? (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                value={valorInputs[id] ?? formatValorFromNumber(comp.getValor())}
                                onChange={(e) =>
                                  setValorInputs((prev) => ({
                                    ...prev,
                                    [id]: formatValorInput(e.target.value),
                                  }))
                                }
                                onFocus={(e) => e.target.select()}
                                onBlur={() => handleUpdateValor(id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                disabled={!!savingMap[id]?.valor}
                                className="w-[90px] rounded border border-gray-200 px-2 py-1 text-xs text-primary-text focus:border-primary focus:outline-none disabled:opacity-50"
                              />
                              <select
                                value={normalizeTipoImpacto(comp.getTipoImpactoPreco())}
                                onChange={(e) =>
                                  handleUpdateTipoImpacto(
                                    id,
                                    e.target.value as 'nenhum' | 'aumenta' | 'diminui'
                                  )
                                }
                                disabled={!!savingMap[id]?.tipo}
                                className="min-w-[5.5rem] rounded border border-gray-200 px-1.5 py-1 text-[11px] text-primary-text focus:outline-none disabled:opacity-50"
                              >
                                <option value="nenhum">Nenhum</option>
                                <option value="aumenta">Aumenta</option>
                                <option value="diminui">Diminui</option>
                              </select>
                            </div>
                          ) : null}
                          {showAtivoColumn ? (
                            <div className="mt-1.5">
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
                                inputProps={{ 'aria-label': comp.isAtivo() ? 'Desativar' : 'Ativar' }}
                              />
                            </div>
                          ) : null}
                        </div>
                        {showDetailColumns ? (
                          <JiffyIconSwitch
                            checked={isLinked}
                            onChange={(e) => {
                              e.stopPropagation()
                              void handleToggleVinculo(id, e.target.checked)
                            }}
                            disabled={vinculoLoadingId === id}
                            bordered={false}
                            size="sm"
                            inputProps={{ 'aria-label': isLinked ? 'Desvincular' : 'Vincular' }}
                          />
                        ) : null}
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
          onCreated={handleComplementoCreated}
          zIndex={nestedModalZIndex}
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
        onCreated={handleComplementoCreated}
        zIndex={nestedModalZIndex}
      />
    </>
  )
}


