'use client'

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Complemento } from '@/src/domain/entities/Complemento'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MdClose, MdSearch, MdAdd, MdKeyboardArrowDown } from 'react-icons/md'
import {
  GruposComplementosTabsModal,
  GruposComplementosTabsModalState,
} from '../grupos-complementos/GruposComplementosTabsModal'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'

/** Grupo vinculado ao produto (estado local da aba). */
interface GrupoComplementoItem {
  id: string
  nome: string
  complementos: Complemento[]
  obrigatorio: boolean
  qtdMinima: number
  qtdMaxima: number
}

/** Catálogo completo (mesmo endpoint do passo Configurações Gerais) */
interface GrupoCatalogoItem {
  id: string
  nome: string
  obrigatorio: boolean
}

/** Máximo permitido pela API (`GrupoComplementoRepository` / schema: limit ≤ 100). */
const LISTAGEM_PAGE_SIZE = 100

/** Mesmo shape do GET produto e do GET grupo — evita duplicar lógica de parse */
function mapApiGrupoToGrupoComplemento(grupo: any): GrupoComplementoItem {
  return {
    id: grupo.id?.toString() || '',
    nome: grupo.nome?.toString() || '',
    complementos: (grupo.complementos || []).map((item: any) => Complemento.fromJSON(item)),
    obrigatorio: Boolean(grupo.obrigatorio),
    qtdMinima: typeof grupo.qtdMinima === 'number' ? grupo.qtdMinima : grupo.obrigatorio ? 1 : 0,
    qtdMaxima: typeof grupo.qtdMaxima === 'number' && grupo.qtdMaxima > 0 ? grupo.qtdMaxima : 0,
  }
}

function formatarValorComplemento(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

/** Ordenação alinhada ao modal de grupo (ordem explícita, depois nome) */
function ordenarComplementosParaExibicao(lista: Complemento[]): Complemento[] {
  return [...lista].sort((a, b) => {
    const oa = a.getOrdem()
    const ob = b.getOrdem()
    if (oa != null && ob != null && oa !== ob) return oa - ob
    if (oa != null && ob == null) return -1
    if (oa == null && ob != null) return 1
    return (a.getNome() || '').localeCompare(b.getNome() || '', 'pt-BR', { sensitivity: 'base' })
  })
}

/** Atualiza apenas o flag ativo para refletir o PATCH sem recarregar o grupo inteiro */
function atualizarAtivoNaLista(
  complementos: Complemento[],
  complementoId: string,
  ativo: boolean
): Complemento[] {
  return complementos.map(c =>
    c.getId() !== complementoId
      ? c
      : Complemento.create(
          c.getId(),
          c.getNome(),
          c.getDescricao(),
          c.getValor(),
          ativo,
          c.getTipoImpactoPreco(),
          c.getOrdem()
        )
  )
}

/** Vinculados primeiro; depois ordem alfabética por nome */
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

function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export type ComplementosMultiSelectHandle = {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

export type ComplementosEmbedState = {
  isDirty: boolean
  isSaving: boolean
}

function mapResumoToGrupos(
  resumo?: ReadonlyArray<{
    id: string
    nome: string
    complementos?: ReadonlyArray<{
      id: string
      nome: string
      valor?: number
      tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
    }>
  }>
): GrupoComplementoItem[] {
  if (!resumo?.length) return []
  return resumo
    .filter(g => Boolean(g?.id))
    .map(g => ({
      id: g.id,
      nome: g.nome || 'Grupo',
      complementos: (g.complementos || []).map(c =>
        Complemento.create(
          c.id,
          c.nome || 'Complemento',
          '',
          typeof c.valor === 'number' ? c.valor : 0,
          true,
          c.tipoImpactoPreco ?? 'nenhum'
        )
      ),
      obrigatorio: false,
      qtdMinima: 0,
      qtdMaxima: 0,
    }))
}

interface ComplementosMultiSelectDialogProps {
  open: boolean
  produtoId?: string
  produtoNome?: string
  /** Vínculos já conhecidos no produto da lista — evita spinner ao abrir a aba. */
  initialGruposResumo?: ReadonlyArray<{
    id: string
    nome: string
    complementos?: ReadonlyArray<{
      id: string
      nome: string
      valor?: number
      tipoImpactoPreco?: 'aumenta' | 'diminui' | 'nenhum'
    }>
  }>
  /**
   * Se informado, o vínculo de grupos grava só no snapshot do menu
   * (`PATCH /menus/:menuId/produtos/:produtoId`), não no cadastro base.
   */
  menuId?: string
  onClose: () => void
  isEmbedded?: boolean
  /** Estado do formulário embutido (dirty/saving) para o rodapé do painel. */
  onEmbedStateChange?: (state: ComplementosEmbedState) => void
}

export const ComplementosMultiSelectDialog = forwardRef<
  ComplementosMultiSelectHandle,
  ComplementosMultiSelectDialogProps
>(function ComplementosMultiSelectDialog(
  {
    open,
    produtoId,
    produtoNome,
    initialGruposResumo,
    menuId,
    onClose,
    isEmbedded = false,
    onEmbedStateChange,
  },
  ref
) {
  const invalidate = useInvalidateTenantQueries()
  const vinculoNoMenu = Boolean(menuId)
  const [groups, setGroups] = useState<GrupoComplementoItem[]>(() =>
    mapResumoToGrupos(initialGruposResumo)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Salvando todos os vínculos pendentes (botão Salvar). */
  const [isSaving, setIsSaving] = useState(false)
  /** IDs persistidos no backend — comparação define dirty. */
  const baselineGruposIdsRef = useRef<string[]>(
    mapResumoToGrupos(initialGruposResumo).map(g => g.id)
  )
  const isDirtyRef = useRef(false)
  const [allSelectableGroups, setAllSelectableGroups] = useState<GrupoCatalogoItem[]>([])
  const [isLoadingSelectableGroups, setIsLoadingSelectableGroups] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  /** Filtro da lista: neste produto / disponíveis / todos. */
  const [filterTab, setFilterTab] = useState<'vinculados' | 'disponiveis' | 'todos'>('vinculados')
  /** IDs de grupos com a lista de complementos expandida na UI */
  const [expandedGrupoIds, setExpandedGrupoIds] = useState<Set<string>>(() => new Set())
  /** Complementos carregados sob demanda (grupos ainda não vinculados ao produto) */
  const [detalhesComplementosCache, setDetalhesComplementosCache] = useState<
    Record<string, Complemento[]>
  >({})
  const [loadingDetalheGrupoId, setLoadingDetalheGrupoId] = useState<string | null>(null)
  const [togglingComplementoId, setTogglingComplementoId] = useState<string | null>(null)
  const [abrindoGrupoComplementosId, setAbrindoGrupoComplementosId] = useState<string | null>(
    null
  )
  const [gruposTabsModalState, setGruposTabsModalState] =
    useState<GruposComplementosTabsModalState>({
      open: false,
      tab: 'grupo',
      mode: 'create',
      grupo: undefined,
    })

  /**
   * Ordem das linhas do catálogo enquanto o painel está aberto (evita reordenar a cada toggle).
   * Ao fechar o modal, zera — na próxima abertura volta a ordenar “vinculados primeiro”.
   */
  const sessionCatalogOrderRef = useRef<string[] | null>(null)
  /** Incrementa quando a ordem estável da sessão é definida (ref sozinha não dispara render). */
  const [sessionOrderTick, setSessionOrderTick] = useState(0)

  const loadGroups = useCallback(
    async (options?: { silent?: boolean; signal?: AbortSignal }) => {
      if (!open || !produtoId) return

      /** Token via getState + tenantAuth (ERP): evita deps reativas na store e token de identidade do hub. */
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        setGroups([])
        return
      }

      /** Evita que um PATCH recoloque a lista inteira em modo loading (todos os switches “somem”). */
      const silent = options?.silent === true
      const signal = options?.signal
      if (!silent) {
        setIsLoading(true)
      }
      setError(null)
      try {
        const url = menuId
          ? `/api/menus/${menuId}/produtos/${produtoId}`
          : `/api/produtos/${produtoId}`
        const response = await fetchGestorApi(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao carregar complementos do produto')
        }

        const payload = await response.json()
        const produto =
          payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
            ? payload.data
            : payload
        const grupos: GrupoComplementoItem[] = (produto.gruposComplementos || []).map((grupo: any) =>
          mapApiGrupoToGrupoComplemento(grupo)
        )

        if (isDirtyRef.current && silent) {
          // Mantém vínculos pendentes; só hidrata detalhes dos já selecionados localmente.
          setGroups(prev =>
            prev.map(local => {
              const fromServer = grupos.find(g => g.id === local.id)
              return fromServer ?? local
            })
          )
        } else {
          setGroups(grupos)
          baselineGruposIdsRef.current = grupos.map(g => g.id)
          isDirtyRef.current = false
        }
      } catch (err) {
        if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
          return
        }
        console.error(err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar complementos')
      } finally {
        if (!silent && !signal?.aborted) {
          setIsLoading(false)
        }
      }
    },
    [open, produtoId, menuId]
  )

  const loadSelectableGroups = useCallback(async (signal?: AbortSignal) => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      setAllSelectableGroups([])
      return
    }

    setIsLoadingSelectableGroups(true)
    try {
      const limit = LISTAGEM_PAGE_SIZE
      let offset = 0
      let hasMore = true
      const collected: GrupoCatalogoItem[] = []

      while (hasMore) {
        if (signal?.aborted) return

        const response = await fetchGestorApi(
          `/api/grupos-complementos?ativo=true&limit=${limit}&offset=${offset}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: 'no-store',
            signal,
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
            obrigatorio: Boolean(item.obrigatorio),
          }))
          .filter((item: GrupoCatalogoItem) => Boolean(item.id))

        collected.push(...mapped)

        const fetchedCount = items.length
        const totalCount = data.count ?? collected.length
        offset += fetchedCount

        const apiHasNext =
          typeof data.hasNext === 'boolean'
            ? data.hasNext
            : fetchedCount === limit && collected.length < totalCount

        hasMore = apiHasNext
      }

      setAllSelectableGroups(collected)
    } catch (err) {
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return
      }
      console.error(err)
      showToast.error(
        err instanceof Error ? err.message : 'Erro ao carregar grupos de complementos.'
      )
    } finally {
      if (!signal?.aborted) {
        setIsLoadingSelectableGroups(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open || !produtoId) return

    const ac = new AbortController()
    setCatalogSearch('')
    // Em embed (ou com seed da lista): não bloqueia a UI com spinner full-card.
    // groups.length / baseline só no momento da abertura — não reexecutar a cada toggle.
    const silentInitial =
      isEmbedded || baselineGruposIdsRef.current.length > 0 || groups.length > 0
    void Promise.all([
      loadGroups({ silent: silentInitial, signal: ac.signal }),
      loadSelectableGroups(ac.signal),
    ])

    return () => {
      ac.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- groups só no momento da abertura
  }, [open, produtoId, isEmbedded, loadGroups, loadSelectableGroups])

  useEffect(() => {
    if (!open) {
      setExpandedGrupoIds(new Set())
      setDetalhesComplementosCache({})
      setLoadingDetalheGrupoId(null)
      setTogglingComplementoId(null)
      setAbrindoGrupoComplementosId(null)
      sessionCatalogOrderRef.current = null
      setSessionOrderTick(0)
      setFilterTab('vinculados')
      setCatalogSearch('')
      baselineGruposIdsRef.current = []
      isDirtyRef.current = false
      setIsSaving(false)
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
    }
  }, [open, onEmbedStateChange])

  const gruposVinculadosIds = useMemo(() => groups.map(g => g.id), [groups])

  /**
   * Catálogo + vínculos seedados: grupos já no produto aparecem mesmo antes do
   * GET `/api/grupos-complementos` terminar (filtro "Neste produto").
   */
  const catalogoComVinculos = useMemo(() => {
    const byId = new Map<string, GrupoCatalogoItem>()
    for (const g of allSelectableGroups) {
      byId.set(g.id, g)
    }
    for (const g of groups) {
      if (!byId.has(g.id)) {
        byId.set(g.id, {
          id: g.id,
          nome: g.nome,
          obrigatorio: g.obrigatorio,
        })
      }
    }
    return Array.from(byId.values())
  }, [allSelectableGroups, groups])

  /** Captura ordem inicial (“vinculados primeiro”) uma vez por abertura, após catálogo e vínculos estarem carregados */
  useEffect(() => {
    if (!open || isLoading) return
    if (sessionCatalogOrderRef.current !== null) return
    if (catalogoComVinculos.length === 0) return

    const term = catalogSearch.trim().toLowerCase()
    const filtrados = !term
      ? catalogoComVinculos
      : catalogoComVinculos.filter(item => (item.nome || '').toLowerCase().includes(term))

    sessionCatalogOrderRef.current = ordenarVinculadosPrimeiro(filtrados, groups.map(g => g.id)).map(
      g => g.id
    )
    setSessionOrderTick(t => t + 1)
  }, [open, isLoading, catalogoComVinculos, catalogSearch, groups])

  /** Totais absolutos por aba (sem busca). */
  const filterCounts = useMemo(() => {
    const vinculados = gruposVinculadosIds.length
    const catalogSize = allSelectableGroups.length
    const todos = catalogSize > 0 ? catalogSize : Math.max(catalogSize, vinculados)
    return {
      vinculados,
      disponiveis: catalogSize > 0 ? Math.max(0, catalogSize - vinculados) : 0,
      todos,
    }
  }, [gruposVinculadosIds, allSelectableGroups])

  const showAtivoComplemento = filterTab === 'todos' && !vinculoNoMenu

  /** Um único GET por grupo — reutilizado ao expandir catálogo e após vínculo (substitui GET produto inteiro). */
  const fetchGrupoComplementoPorId = useCallback(
    async (grupoId: string): Promise<GrupoComplementoItem | null> => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) return null
      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })
        if (!response.ok) return null
        const data = await response.json()
        return mapApiGrupoToGrupoComplemento(data)
      } catch {
        return null
      }
    },
    []
  )

  const carregarComplementosDoGrupo = useCallback(
    async (grupoId: string) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }
      setLoadingDetalheGrupoId(grupoId)
      try {
        const grupo = await fetchGrupoComplementoPorId(grupoId)
        if (!grupo?.id) {
          throw new Error('Erro ao carregar complementos do grupo')
        }
        setDetalhesComplementosCache(prev => ({ ...prev, [grupoId]: grupo.complementos }))
      } catch (err) {
        console.error(err)
        showToast.error(
          err instanceof Error ? err.message : 'Erro ao carregar complementos do grupo.'
        )
        setDetalhesComplementosCache(prev => ({ ...prev, [grupoId]: [] }))
      } finally {
        setLoadingDetalheGrupoId(null)
      }
    },
    [fetchGrupoComplementoPorId]
  )

  const toggleGrupoExpanded = useCallback((grupoId: string) => {
    setExpandedGrupoIds(prev => {
      const next = new Set(prev)
      if (next.has(grupoId)) {
        next.delete(grupoId)
      } else {
        next.add(grupoId)
      }
      return next
    })
  }, [])

  /** Complementos do grupo: no snapshot do menu o GET não traz a lista aninhada. */
  useEffect(() => {
    for (const grupoId of expandedGrupoIds) {
      const vinculado = groups.find(g => g.id === grupoId)
      if ((vinculado?.complementos?.length ?? 0) > 0) continue
      if (Object.hasOwn(detalhesComplementosCache, grupoId)) continue
      if (loadingDetalheGrupoId === grupoId) continue
      void carregarComplementosDoGrupo(grupoId)
    }
  }, [
    expandedGrupoIds,
    groups,
    detalhesComplementosCache,
    loadingDetalheGrupoId,
    carregarComplementosDoGrupo,
  ])

  const gruposCatalogoParaLista = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase()
    const bySearch = !term
      ? catalogoComVinculos
      : catalogoComVinculos.filter(item => (item.nome || '').toLowerCase().includes(term))

    const filtrados =
      filterTab === 'vinculados'
        ? bySearch.filter(g => gruposVinculadosIds.includes(g.id))
        : filterTab === 'disponiveis'
          ? bySearch.filter(g => !gruposVinculadosIds.includes(g.id))
          : bySearch

    if (filterTab !== 'todos') {
      return [...filtrados].sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
      )
    }

    const ordemSessao = sessionCatalogOrderRef.current
    if (!open || ordemSessao === null) {
      return ordenarVinculadosPrimeiro(filtrados, gruposVinculadosIds)
    }

    const ordemMap = new Map(ordemSessao.map((id, idx) => [id, idx]))
    return [...filtrados].sort((a, b) => {
      const ia = ordemMap.get(a.id)
      const ib = ordemMap.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    })
  }, [
    catalogoComVinculos,
    catalogSearch,
    filterTab,
    gruposVinculadosIds,
    open,
    sessionOrderTick,
  ])

  const persistGruposSelection = useCallback(
    async (
      ids: string[],
      successMessage?: string,
      options?: {
        silentSuccess?: boolean
        /** Estado local já atualizado antes do PATCH (switch otimista). */
        optimisticPreApplied?: boolean
        /** IDs antes do otimismo — obrigatório se `optimisticPreApplied`. */
        antesIdsSnapshot?: string[]
      }
    ) => {
      if (!produtoId) {
        showToast.error('Produto não encontrado.')
        return false
      }

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return false
      }

      const antesIds = options?.antesIdsSnapshot ?? groups.map(g => g.id)
      const removedIds = antesIds.filter(id => !ids.includes(id))
      const addedIds = ids.filter(id => !antesIds.includes(id))

      try {
        if (menuId) {
          const response = await fetchGestorApi(`/api/menus/${menuId}/produtos/${produtoId}`, {
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
          await invalidate(['menu-produtos', menuId])
          await invalidate(['menu', menuId])
        } else if (ids.length === 0) {
          // A API ignora PATCH com `gruposComplementosIds: []`, então removemos cada
          // vínculo via DELETE para desvincular todos os grupos do produto.
          const resultados = await Promise.allSettled(
            removedIds.map(grupoId =>
              fetchGestorApi(`/api/produtos/${produtoId}/grupos-complementos/${grupoId}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
            )
          )

          const algumFalhou = resultados.some(
            r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
          )
          if (algumFalhou) {
            throw new Error('Erro ao remover grupos de complementos')
          }
        } else {
          const response = await fetchGestorApi(`/api/produtos/${produtoId}`, {
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
        }

        if (options?.optimisticPreApplied) {
          if (addedIds.length > 0) {
            const carregados = await Promise.all(addedIds.map(gid => fetchGrupoComplementoPorId(gid)))
            const novos = carregados.filter((g): g is GrupoComplementoItem => g !== null)
            if (novos.length === addedIds.length) {
              setGroups(prev =>
                prev.map(g => {
                  const rich = novos.find(n => n.id === g.id)
                  return rich ?? g
                })
              )
            } else {
              await loadGroups({ silent: true })
            }
          }
        } else {
          if (removedIds.length > 0) {
            setGroups(prev => prev.filter(g => !removedIds.includes(g.id)))
            setDetalhesComplementosCache(prev => {
              const next = { ...prev }
              for (const id of removedIds) {
                delete next[id]
              }
              return next
            })
          }

          if (addedIds.length > 0) {
            const carregados = await Promise.all(addedIds.map(gid => fetchGrupoComplementoPorId(gid)))
            const novos = carregados.filter((g): g is GrupoComplementoItem => g !== null)
            if (novos.length === addedIds.length) {
              setGroups(prev => [...prev, ...novos])
            } else {
              await loadGroups({ silent: true })
            }
          }
        }

        if (!options?.silentSuccess) {
          showToast.success(successMessage ?? 'Grupos atualizados com sucesso!')
        }
        return true
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar grupos.')
        return false
      }
    },
    [produtoId, menuId, groups, fetchGrupoComplementoPorId, loadGroups, invalidate]
  )

  /** Liga/desliga vínculo só no estado local — PATCH ocorre no Salvar. */
  const handleToggleCatalogGrupo = useCallback(
    (id: string) => {
      if (isSaving || !produtoId) return

      const antesIds = groups.map(g => g.id)
      const newIds = antesIds.includes(id) ? antesIds.filter(x => x !== id) : [...antesIds, id]

      const removedIds = antesIds.filter(x => !newIds.includes(x))
      const addedIds = newIds.filter(x => !antesIds.includes(x))

      if (removedIds.length > 0) {
        setGroups(prev => prev.filter(g => !removedIds.includes(g.id)))
        setDetalhesComplementosCache(prev => {
          const next = { ...prev }
          for (const rid of removedIds) delete next[rid]
          return next
        })
        if (sessionCatalogOrderRef.current) {
          sessionCatalogOrderRef.current = sessionCatalogOrderRef.current.filter(
            x => !removedIds.includes(x)
          )
          setSessionOrderTick(t => t + 1)
        }
      }

      if (addedIds.length > 0) {
        setGroups(prev => {
          let next = prev
          for (const gid of addedIds) {
            if (next.some(g => g.id === gid)) continue
            const meta = allSelectableGroups.find(g => g.id === gid)
            next = [
              ...next,
              {
                id: gid,
                nome: meta?.nome ?? 'Grupo',
                complementos: [],
                obrigatorio: Boolean(meta?.obrigatorio),
                qtdMinima: meta?.obrigatorio ? 1 : 0,
                qtdMaxima: 0,
              },
            ]
          }
          return next
        })
        if (sessionCatalogOrderRef.current) {
          for (const gid of addedIds) {
            if (!sessionCatalogOrderRef.current.includes(gid)) {
              sessionCatalogOrderRef.current = [...sessionCatalogOrderRef.current, gid]
            }
          }
          setSessionOrderTick(t => t + 1)
        }
      }

      isDirtyRef.current = !sameIdSet(newIds, baselineGruposIdsRef.current)
      onEmbedStateChange?.({ isDirty: isDirtyRef.current, isSaving: false })
    },
    [isSaving, produtoId, groups, allSelectableGroups, onEmbedStateChange]
  )

  const savePendingGrupos = useCallback(async (): Promise<boolean> => {
    if (!produtoId) {
      showToast.error('Produto não encontrado.')
      return false
    }

    const currentIds = groups.map(g => g.id)
    const baselineIds = baselineGruposIdsRef.current
    if (sameIdSet(currentIds, baselineIds)) {
      isDirtyRef.current = false
      onEmbedStateChange?.({ isDirty: false, isSaving: false })
      return true
    }

    setIsSaving(true)
    onEmbedStateChange?.({ isDirty: true, isSaving: true })
    try {
      const ok = await persistGruposSelection(
        currentIds,
        vinculoNoMenu
          ? 'Complementos atualizados neste cardápio'
          : 'Grupos atualizados com sucesso!',
        {
          optimisticPreApplied: true,
          antesIdsSnapshot: baselineIds,
        }
      )
      if (ok) {
        baselineGruposIdsRef.current = [...currentIds]
        isDirtyRef.current = false
        onEmbedStateChange?.({ isDirty: false, isSaving: false })
      } else {
        onEmbedStateChange?.({ isDirty: true, isSaving: false })
      }
      return ok
    } finally {
      setIsSaving(false)
    }
  }, [produtoId, groups, persistGruposSelection, onEmbedStateChange, vinculoNoMenu])

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => !sameIdSet(
        groups.map(g => g.id),
        baselineGruposIdsRef.current
      ),
      save: () => savePendingGrupos(),
    }),
    [groups, savePendingGrupos]
  )

  // Sincroniza dirty com o rodapé quando groups/baseline mudam (ex.: load inicial).
  useEffect(() => {
    const dirty = !sameIdSet(
      groups.map(g => g.id),
      baselineGruposIdsRef.current
    )
    isDirtyRef.current = dirty
    onEmbedStateChange?.({ isDirty: dirty, isSaving })
  }, [groups, isSaving, onEmbedStateChange])

  const handleToggleComplementoAtivo = useCallback(
    async (grupoListaId: string, comp: Complemento, novoAtivo: boolean) => {
      const complementoId = comp.getId()
      if (comp.isAtivo() === novoAtivo) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setTogglingComplementoId(complementoId)
      try {
        const response = await fetchGestorApi(`/api/complementos/${complementoId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoAtivo }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao atualizar complemento')
        }

        setGroups(prev =>
          prev.map(g =>
            g.id === grupoListaId
              ? {
                  ...g,
                  complementos: atualizarAtivoNaLista(g.complementos, complementoId, novoAtivo),
                }
              : g
          )
        )
        setDetalhesComplementosCache(prev =>
          Object.hasOwn(prev, grupoListaId)
            ? {
                ...prev,
                [grupoListaId]: atualizarAtivoNaLista(prev[grupoListaId], complementoId, novoAtivo),
              }
            : prev
        )

        showToast.success(novoAtivo ? 'Complemento ativado.' : 'Complemento desativado.')
      } catch (err) {
        console.error(err)
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar complemento.')
      } finally {
        setTogglingComplementoId(null)
      }
    },
    []
  )

  const handleClose = () => {
    onClose()
  }

  const handleOpenNovoGrupoModal = useCallback(() => {
    setGruposTabsModalState({
      open: true,
      tab: 'grupo',
      mode: 'create',
      grupo: undefined,
    })
  }, [])

  /** Atualiza complementos do grupo na lista do produto após vincular no modal de cadastro. */
  const atualizarComplementosDoGrupoNaLista = useCallback(
    async (grupoId: string) => {
      const grupoMapeado = await fetchGrupoComplementoPorId(grupoId)
      if (!grupoMapeado) return

      setGroups(prev =>
        prev.map(g =>
          g.id === grupoId
            ? {
                ...g,
                nome: grupoMapeado.nome,
                complementos: grupoMapeado.complementos,
                obrigatorio: grupoMapeado.obrigatorio,
                qtdMinima: grupoMapeado.qtdMinima,
                qtdMaxima: grupoMapeado.qtdMaxima,
              }
            : g
        )
      )
      setDetalhesComplementosCache(prev => ({
        ...prev,
        [grupoId]: grupoMapeado.complementos,
      }))
    },
    [fetchGrupoComplementoPorId]
  )

  const handleOpenGrupoComplementosTab = useCallback(
    async (grupoId: string, grupoNome?: string) => {
      if (isSaving || abrindoGrupoComplementosId !== null) return

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setAbrindoGrupoComplementosId(grupoId)
      try {
        const response = await fetchGestorApi(`/api/grupos-complementos/${grupoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || errorData.error || 'Erro ao carregar o grupo')
        }

        const grupo = GrupoComplemento.fromJSON(await response.json())
        setGruposTabsModalState({
          open: true,
          tab: 'complementos',
          mode: 'edit',
          grupo,
        })
      } catch (err) {
        console.error(err)
        showToast.error(
          err instanceof Error
            ? err.message
            : `Erro ao abrir complementos do grupo${grupoNome ? ` "${grupoNome}"` : ''}.`
        )
      } finally {
        setAbrindoGrupoComplementosId(null)
      }
    },
    [isSaving, abrindoGrupoComplementosId]
  )

  const handleCloseGruposTabsModal = useCallback(() => {
    setGruposTabsModalState(prev => ({
      ...prev,
      open: false,
    }))
  }, [])

  const handleGruposTabsTabChange = useCallback((tab: 'grupo' | 'complementos') => {
    setGruposTabsModalState(prev => ({
      ...prev,
      tab,
    }))
  }, [])

  const handleGruposTabsReload = useCallback(async () => {
    const grupoId = gruposTabsModalState.grupo?.getId()
    await Promise.all([loadGroups({ silent: true }), loadSelectableGroups()])
    if (grupoId) {
      await atualizarComplementosDoGrupoNaLista(grupoId)
    }
  }, [
    loadGroups,
    loadSelectableGroups,
    gruposTabsModalState.grupo,
    atualizarComplementosDoGrupoNaLista,
  ])

  const handleGruposTabsClose = useCallback(() => {
    const grupoId = gruposTabsModalState.grupo?.getId()
    setGruposTabsModalState(prev => ({
      ...prev,
      open: false,
    }))
    void (async () => {
      await loadGroups({ silent: true })
      if (grupoId) {
        await atualizarComplementosDoGrupoNaLista(grupoId)
      }
    })()
  }, [loadGroups, gruposTabsModalState.grupo, atualizarComplementosDoGrupoNaLista])

  const renderCatalogoGruposCard = () => (
    <div className="mb-4 flex min-h-0 flex-col rounded-lg border border-[#E6E9F4] bg-white p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {isLoading && groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12">
          <JiffyLoading />
        </div>
      ) : error && groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
          <p className="text-sm text-secondary-text">{error}</p>
          <button
            type="button"
            onClick={() => void loadGroups()}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[140px] flex-1">
              <MdSearch
                className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-secondary-text"
                size={16}
              />
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Buscar grupo..."
                className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex h-8 shrink-0 overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
              {(['vinculados', 'disponiveis', 'todos'] as const).map(tab => {
                const labels = {
                  vinculados: vinculoNoMenu ? 'Neste cardápio' : 'Neste produto',
                  disponiveis: 'Disponíveis',
                  todos: 'Todos',
                }
                const count = filterCounts[tab]
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilterTab(tab)}
                    className={cn(
                      'flex h-full items-center gap-1.5 px-2.5 transition-colors',
                      filterTab === tab
                        ? 'bg-primary text-white'
                        : 'bg-white text-secondary-text hover:bg-gray-50'
                    )}
                  >
                    <span>{labels[tab]}</span>
                    <span
                      className={cn(
                        'tabular-nums',
                        filterTab === tab ? 'text-white/80' : 'text-secondary-text/80'
                      )}
                    >
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="scrollbar-hide max-h-[280px] min-h-0 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/50 md:max-h-[360px]">
            {isLoadingSelectableGroups &&
            gruposCatalogoParaLista.length === 0 &&
            filterTab !== 'vinculados' ? (
              <p className="py-8 text-center text-xs text-secondary-text">
                Carregando grupos...
              </p>
            ) : gruposCatalogoParaLista.length ? (
              <ul className="divide-y divide-gray-100">
                {gruposCatalogoParaLista.map(grupo => {
                  const vinculado = gruposVinculadosIds.includes(grupo.id)
                  const expandido = expandedGrupoIds.has(grupo.id)
                  const grupoVinculado = groups.find(g => g.id === grupo.id)
                  const complementosLista =
                    (grupoVinculado?.complementos?.length
                      ? grupoVinculado.complementos
                      : detalhesComplementosCache[grupo.id]) ?? []
                  const complementosOrdenados = ordenarComplementosParaExibicao(complementosLista)
                  const qtdComplementosConhecida =
                    (grupoVinculado?.complementos?.length ?? 0) > 0
                      ? grupoVinculado!.complementos.length
                      : grupo.id in detalhesComplementosCache
                        ? complementosOrdenados.length
                        : null
                  const mostrarLoadingDetalhe =
                    expandido &&
                    loadingDetalheGrupoId === grupo.id &&
                    !(grupo.id in detalhesComplementosCache) &&
                    !(grupoVinculado?.complementos?.length)

                  return (
                    <li key={grupo.id}>
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-white/80',
                          !vinculado && filterTab === 'todos' && 'opacity-70'
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleGrupoExpanded(grupo.id)}
                            className="shrink-0 rounded-md p-2 outline-none ring-primary focus-visible:ring-2"
                            aria-expanded={expandido}
                            aria-controls={`grupo-comp-list-${grupo.id}`}
                            aria-label={expandido ? 'Recolher complementos' : 'Expandir complementos'}
                          >
                            <MdKeyboardArrowDown
                              className={cn(
                                'text-secondary-text transition-transform duration-200',
                                expandido ? 'rotate-0' : '-rotate-90'
                              )}
                              size={20}
                              aria-hidden
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGrupoExpanded(grupo.id)}
                            className="min-w-0 shrink overflow-hidden rounded-md py-2 text-left outline-none ring-primary focus-visible:ring-2"
                            id={`grupo-comp-trigger-${grupo.id}`}
                            aria-expanded={expandido}
                            aria-controls={`grupo-comp-list-${grupo.id}`}
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <p className="truncate text-xs font-medium text-primary-text">
                                {grupo.nome || 'Grupo'}
                              </p>
                              {qtdComplementosConhecida != null ? (
                                <span className="shrink-0 tabular-nums text-[10px] text-secondary-text">
                                  ({qtdComplementosConhecida})
                                </span>
                              ) : null}
                              {grupo.obrigatorio ? (
                                <span className="inline-flex rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-primary">
                                  Obrigatório
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </div>
                        <div
                          className="shrink-0 self-center"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <JiffyIconSwitch
                            checked={vinculado}
                            onChange={e => {
                              e.stopPropagation()
                              handleToggleCatalogGrupo(grupo.id)
                            }}
                            label="Vínculo"
                            labelPosition="start"
                            bordered={false}
                            size="xs"
                            className="shrink-0"
                            disabled={isSaving}
                            inputProps={{
                              'aria-label': vinculado
                                ? `Desvincular grupo ${grupo.nome ?? ''}`
                                : `Vincular grupo ${grupo.nome ?? ''}`,
                              onClick: e => e.stopPropagation(),
                            }}
                          />
                        </div>
                      </div>
                      {expandido ? (
                        <div
                          id={`grupo-comp-list-${grupo.id}`}
                          role="region"
                          aria-labelledby={`grupo-comp-trigger-${grupo.id}`}
                          className="border-t border-gray-200 bg-info py-2 pl-8 pr-2 md:py-3 md:pl-10 md:pr-3"
                        >
                          {mostrarLoadingDetalhe ? (
                            <div className="flex justify-center py-10">
                              <JiffyLoading />
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  void handleOpenGrupoComplementosTab(grupo.id, grupo.nome)
                                }}
                                disabled={
                                  isSaving || abrindoGrupoComplementosId === grupo.id
                                }
                                className="mb-1 inline-flex items-center gap-1.5 rounded bg-white px-1 py-1 text-[11px] text-primary disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                + Gerenciar complementos
                                {qtdComplementosConhecida != null ? (
                                  <span className="tabular-nums text-primary/70">
                                    ({qtdComplementosConhecida})
                                  </span>
                                ) : null}
                              </button>
                              {complementosOrdenados.length === 0 ? (
                                <p className="py-2 text-center text-xs text-secondary-text">
                                  Nenhum complemento neste grupo.
                                </p>
                              ) : null}
                              {complementosOrdenados.map(comp => (
                                <div
                                  key={comp.getId()}
                                  className={cn(
                                    'grid items-center gap-2 border-b border-gray-200 p-2 transition-colors hover:bg-primary-bg/60',
                                    showAtivoComplemento
                                      ? 'grid-cols-[minmax(0,1fr)_auto_auto]'
                                      : 'grid-cols-[minmax(0,1fr)_auto]'
                                  )}
                                >
                                  <p
                                    className={cn(
                                      'min-w-0 truncate text-sm font-normal text-primary-text',
                                      !comp.isAtivo() && 'text-secondary-text line-through'
                                    )}
                                  >
                                    {comp.getNome()}
                                  </p>
                                  <div className="min-w-[100px] rounded border border-gray-200 bg-white px-2 py-1 text-right text-xs font-normal tabular-nums text-primary-text">
                                    {formatarValorComplemento(comp.getValor())}
                                  </div>
                                  {showAtivoComplemento ? (
                                    <div
                                      className="flex justify-end self-center"
                                      onClick={e => e.stopPropagation()}
                                      onMouseDown={e => e.stopPropagation()}
                                    >
                                      <JiffyIconSwitch
                                        size="xs"
                                        checked={comp.isAtivo()}
                                        onChange={e => {
                                          e.stopPropagation()
                                          void handleToggleComplementoAtivo(
                                            grupo.id,
                                            comp,
                                            e.target.checked
                                          )
                                        }}
                                        disabled={togglingComplementoId === comp.getId()}
                                        bordered={false}
                                        className="shrink-0"
                                        inputProps={{
                                          'aria-label': comp.isAtivo()
                                            ? 'Desativar complemento'
                                            : 'Ativar complemento',
                                          onClick: ev => ev.stopPropagation(),
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="py-8 text-center text-xs text-secondary-text">
                {allSelectableGroups.length === 0
                  ? 'Nenhum grupo de complementos cadastrado.'
                  : filterTab === 'vinculados'
                    ? vinculoNoMenu
                      ? 'Nenhum grupo vinculado a este cardápio.'
                      : 'Nenhum grupo vinculado a este produto.'
                    : filterTab === 'disponiveis'
                      ? 'Nenhum grupo disponível para vincular.'
                      : 'Nenhum grupo encontrado para a busca.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderDialogBody = () => renderCatalogoGruposCard()

  if (isEmbedded) {
    return (
      <>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="px-6 py-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3 md:gap-5">
              <h2 className="min-w-0 break-words text-lg font-semibold text-primary md:text-xl">
                Grupos de complementos
              </h2>
              <div className="h-px min-w-8 flex-1 bg-primary/70" />
              <button
                type="button"
                onClick={handleOpenNovoGrupoModal}
                disabled={isSaving}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Criar novo grupo
              </button>
            </div>
            {vinculoNoMenu ? (
              <p className="mt-2 text-xs text-secondary-text">
                Os grupos marcados valem só neste cardápio. Alterar aqui não muda o cadastro do
                produto.
              </p>
            ) : null}
          </div>
          <div className="scrollbar-hide flex-1 overflow-y-auto px-2 py-4 md:px-6">
            {renderDialogBody()}
          </div>
        </div>
        <GruposComplementosTabsModal
          state={gruposTabsModalState}
          onClose={handleGruposTabsClose}
          onTabChange={handleGruposTabsTabChange}
          onReload={handleGruposTabsReload}
        />
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
            <div className="pr-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <DialogTitle className="flex-1 !pb-0 !pt-0">
                {produtoNome || 'Selecionar complementos'}
              </DialogTitle>
              <button
                type="button"
                onClick={handleOpenNovoGrupoModal}
                disabled={isSaving}
                className="flex shrink-0 items-center rounded-lg border border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:h-8 md:gap-2 md:px-4 md:text-sm"
              >
                <MdAdd size={18} />
                Criar novo grupo
              </button>
            </div>
            {produtoNome ? (
              <p className="mt-1 text-xs text-secondary-text">Complementos</p>
            ) : null}
          </div>
        </DialogHeader>

        <DialogContent sx={{ padding: '16px 24px 0 24px' }}>{renderDialogBody()}</DialogContent>

        <DialogFooter
          className="flex items-center justify-between gap-3 border-t border-gray-100"
          sx={{ justifyContent: 'space-between' }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="h-10 rounded-[24px] border border-gray-300 px-6 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => void savePendingGrupos()}
            disabled={isSaving || sameIdSet(groups.map(g => g.id), baselineGruposIdsRef.current)}
            className="h-10 rounded-[24px] border border-primary bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </DialogFooter>
      </Dialog>

      <GruposComplementosTabsModal
        state={gruposTabsModalState}
        onClose={handleCloseGruposTabsModal}
        onTabChange={handleGruposTabsTabChange}
        onReload={handleGruposTabsReload}
      />
    </>
  )
})
