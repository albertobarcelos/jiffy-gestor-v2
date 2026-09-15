'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { Terminal } from '@/src/domain/entities/Terminal'
import { MdDelete, MdPhone, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { CatalogGroupedList } from '@/src/presentation/components/features/catalogo/CatalogGroupedList'
import type { CatalogGroup } from '@/src/presentation/components/features/catalogo/types'
import type { Menu } from '@/src/shared/types/menus'
import { JiffyFriendlyAlertDialog } from '@/src/presentation/components/ui/JiffyFriendlyAlertDialog'
import { TerminaisGroupMenuSelector } from './TerminaisGroupMenuSelector'
import { TerminaisTabsModal, TerminaisTabsModalState } from './TerminaisTabsModal'

const SEM_MENU_GROUP_KEY = 'sem_menu'

function formatMenuGroupLabel(menu: Pick<Menu, 'nome' | 'tipo' | 'ativo'>): string {
  let label = menu.nome.trim()
  if (menu.tipo === 'principal' && !/^menu\s/i.test(label)) {
    label = `Menu ${label}`
  }
  return menu.ativo === false ? `${label} (inativo)` : label
}

function menusParaGrupoSelect(
  group: CatalogGroup<TerminalData>,
  menusAtivos: Menu[],
  allMenus: Menu[]
): Menu[] {
  if (group.grupoId && !menusAtivos.some(menu => menu.id === group.grupoId)) {
    const atual = allMenus.find(menu => menu.id === group.grupoId)
    if (atual) return [atual, ...menusAtivos]
  }
  return menusAtivos
}

const TERMINAIS_COL_HEADER =
  'font-semibold text-[10px] text-primary-text uppercase'

function TerminaisListColumnHeader() {
  return (
    <div className="mb-1 flex min-h-8 items-center gap-[10px] px-4 py-1 bg-primary/10">
      <div className={`flex-[2] hidden md:block ${TERMINAIS_COL_HEADER}`}>
        Código do Terminal
      </div>
      <div className={`flex-[2] ${TERMINAIS_COL_HEADER}`}>Nome do Terminal</div>
      <div className={`flex-[2] ${TERMINAIS_COL_HEADER}`}>Modelo Dispositivo</div>
      <div className={`w-16 shrink-0 text-center leading-tight ${TERMINAIS_COL_HEADER}`}>
        <span className="block">Versão APK</span>
      </div>
      <div className={`flex-[2] hidden md:flex ${TERMINAIS_COL_HEADER}`}>Imp. Finalização</div>
      <div className={`flex-[1.5] text-center ${TERMINAIS_COL_HEADER}`}>Comp. Mesas</div>
      <div className={`flex-[1.5] text-center ${TERMINAIS_COL_HEADER}`}>Fiscal ativo</div>
      <div className={`flex-[1.5] text-center leading-tight ${TERMINAIS_COL_HEADER}`}>
        <span className="block">Leitor C. Barras</span>
      </div>
      <div className="w-10 shrink-0" aria-hidden />
    </div>
  )
}

/** Tamanho de página alinhado ao backend (Swagger): menos round-trips na listagem */
const PAGE_SIZE_TERMINAIS = 100
const PAGE_SIZE_PREFS = 100

/**
 * Tab de Terminais - Lista de terminais carregando todos os itens de uma vez
 * Pagina terminais e preferências de 100 em 100; preferências em lista quando disponível
 */
interface TerminalData {
  terminal: Terminal
  rawData: any // Dados brutos da API para campos extras
}

interface TerminalPreferenceData {
  compartilharMesas: boolean
  impressoraFinalizacaoNome: string
  impressoraFinalizacaoId?: string
  fiscalAtivo: boolean
  leitorHabilitado: boolean
}

/** Normaliza resposta de GET único ou item da lista de preferências */
function rawToPreferenceData(data: any): TerminalPreferenceData {
  const impressoraId =
    data.impressoraFinalizacaoId ||
    data.impressoraFinalizacao?.id ||
    data.impressoraFinalizacao?.impressoraId ||
    data.impressoraFinalizacao?.impressora?.id
  const impressoraNome =
    data.impressoraFinalizacao?.name ||
    data.impressoraFinalizacao?.nome ||
    data.impressoraFinalizacaoNome ||
    data.impressoraFinalizacao?.impressora?.nome ||
    data.impressoraFinalizacao?.impressora?.name ||
    'Nenhuma'
  return {
    compartilharMesas: !!data.compartilharMesas,
    impressoraFinalizacaoNome: impressoraNome,
    impressoraFinalizacaoId: impressoraId,
    fiscalAtivo: !!data.fiscalAtivo,
    leitorHabilitado: !!data.leitorHabilitado,
  }
}

/** Preferências padrão quando o backend ainda não tem registro para o terminal */
const DEFAULT_TERMINAL_PREFERENCES: TerminalPreferenceData = {
  compartilharMesas: false,
  impressoraFinalizacaoNome: 'Nenhuma',
  impressoraFinalizacaoId: undefined,
  fiscalAtivo: false,
  leitorHabilitado: false,
}

/** Após carregar preferências, terminais sem registro usam o padrão (evita “Carregando...” infinito) */
function resolvePreferencesForTerminal(
  terminalId: string,
  map: Record<string, TerminalPreferenceData>
): TerminalPreferenceData {
  return map[terminalId] ?? DEFAULT_TERMINAL_PREFERENCES
}

export function TerminaisTab() {
  const [terminais, setTerminais] = useState<TerminalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [preferencesMap, setPreferencesMap] = useState<Record<string, TerminalPreferenceData>>({})
  /** true somente após tentativa de carregar preferências (lista ou fallback por terminal) */
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [updatingShare, setUpdatingShare] = useState<Record<string, boolean>>({})
  const [updatingFiscal, setUpdatingFiscal] = useState<Record<string, boolean>>({})
  const [updatingLeitor, setUpdatingLeitor] = useState<Record<string, boolean>>({})
  const [updatingPrinter, setUpdatingPrinter] = useState<Record<string, boolean>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [updatingGroupMenuKey, setUpdatingGroupMenuKey] = useState<string | null>(null)
  const [bulkMenuConfirm, setBulkMenuConfirm] = useState<{
    group: CatalogGroup<TerminalData>
    newMenuId: string
    newMenuLabel: string
  } | null>(null)
  const [bulkMenuSaving, setBulkMenuSaving] = useState(false)
  const [impressoras, setImpressoras] = useState<Array<{ id: string; nome: string }>>([])
  const [loadingImpressoras, setLoadingImpressoras] = useState(false)
  const menusQuery = useMenus({ limit: 100 })
  const menusAtivos = useMemo(
    () => (menusQuery.data?.items ?? []).filter(menu => menu.ativo),
    [menusQuery.data?.items]
  )
  const [tabsModalState, setTabsModalState] = useState<TerminaisTabsModalState>({
    open: false,
    tab: 'terminal',
    mode: 'edit',
    terminalId: undefined,
  })
  const searchQueryRef = useRef('')
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  /**
   * Carrega todos os terminais fazendo requisições sequenciais
   * Continua carregando páginas até não haver mais itens (PAGE_SIZE_TERMINAIS por página)
   */
  const loadAllTerminais = useCallback(
    async () => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        setIsLoading(false)
        setPreferencesLoaded(true)
        return
      }

      setIsLoading(true)
      setPreferencesLoaded(false)

      try {
        const allTerminais: TerminalData[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0
        let firstRequest = true

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: String(PAGE_SIZE_TERMINAIS),
            offset: currentOffset.toString(),
          })

          if (searchQueryRef.current) {
            params.append('q', searchQueryRef.current)
          }

          const response = await fetchGestorApi(`/api/terminais?${params.toString()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            const errorMessage = errorData.error || `Erro ${response.status}: ${response.statusText}`
            throw new Error(errorMessage)
          }

          const data = await response.json()

          // Debug: log da resposta da API
          if (process.env.NODE_ENV === 'development') {
            console.log('Resposta da API de terminais:', data)
          }

          // Atualiza o total apenas na primeira requisição
          if (firstRequest) {
            totalCount = data.count || data.total || allTerminais.length || 0
            firstRequest = false
          }

          // Filtrar e mapear apenas itens válidos, mantendo dados brutos
          const newTerminais = (data.items || [])
            .map((t: any) => {
              try {
                const terminal = Terminal.fromJSON(t)
                return {
                  terminal,
                  rawData: t, // Mantém dados brutos para campos extras
                }
              } catch (error) {
                console.warn('Erro ao criar Terminal:', error, 'Dados:', t)
                return null
              }
            })
            .filter((t: TerminalData | null): t is TerminalData => t !== null)

          allTerminais.push(...newTerminais)

          // Verifica se há mais páginas (página cheia = pode existir próxima)
          hasMore = newTerminais.length === PAGE_SIZE_TERMINAIS
          currentOffset += newTerminais.length

          // Proteção contra loop infinito: se não retornou nenhum item e já fez pelo menos uma requisição, para
          if (newTerminais.length === 0 && !firstRequest) {
            hasMore = false
          }
        }

        setTerminais(allTerminais)
        setTotalItems(totalCount)

        // Preferências: lista paginada (1+ requisições) em vez de N GETs por terminal
        try {
          const q = searchQueryRef.current
          let prefsMap: Record<string, TerminalPreferenceData> = {}

          let prefsOffset = 0
          let prefsHasMore = true
          let listOk = false

          while (prefsHasMore) {
            const pParams = new URLSearchParams({
              limit: String(PAGE_SIZE_PREFS),
              offset: String(prefsOffset),
            })
            if (q) {
              pParams.append('q', q)
            }

            const listResp = await fetchGestorApi(`/api/preferencias-terminal?${pParams.toString()}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })

            if (!listResp.ok) {
              break
            }

            listOk = true
            const listData = await listResp.json()
            const items: any[] = listData.items || []

            for (const row of items) {
              const tid = row.terminalId ?? row.terminal?.id
              if (!tid) {
                continue
              }
              prefsMap[tid] = rawToPreferenceData(row)
            }

            prefsHasMore = items.length === PAGE_SIZE_PREFS
            prefsOffset += items.length
          }

          if (!listOk) {
            // Fallback: backend sem GET em lista — mantém comportamento anterior
            const prefsEntries = await Promise.all(
              allTerminais.map(async (item) => {
                try {
                  const resp = await fetchGestorApi(`/api/preferencias-terminal/${item.terminal.getId()}`, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                  })
                  if (!resp.ok) {
                    return null
                  }
                  const data = await resp.json()
                  return {
                    terminalId: item.terminal.getId(),
                    ...rawToPreferenceData(data),
                  }
                } catch {
                  return null
                }
              })
            )

            prefsMap = prefsEntries
              .filter(
                (p): p is { terminalId: string } & TerminalPreferenceData => !!p
              )
              .reduce<Record<string, TerminalPreferenceData>>((acc, curr) => {
                const { terminalId, ...rest } = curr
                acc[terminalId] = rest
                return acc
              }, {})
          }

          setPreferencesMap(prefsMap)
        } catch (error) {
          console.warn('Não foi possível carregar preferências dos terminais', error)
        }
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
      } finally {
        setIsLoading(false)
        setPreferencesLoaded(true)
      }
    },
    []
  )

  const loadAllImpressoras = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    setLoadingImpressoras(true)
    try {
      const all: Array<{ id: string; nome: string }> = []
      let currentOffset = 0
      let hasMore = true
      const limit = 50

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const resp = await fetchGestorApi(`/api/impressoras?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar impressoras')
        }

        const data = await resp.json()
        const list = (data.items || []).map((i: any) => ({
          id: i.id,
          nome: i.nome || 'Sem nome',
        }))
        all.push(...list)

        hasMore = list.length === limit
        currentOffset += list.length
      }

      setImpressoras(all)
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error)
      showToast.error('Erro ao carregar impressoras')
    } finally {
      setLoadingImpressoras(false)
    }
  }, [])

  // Debounce para busca
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAllTerminais()
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery, loadAllTerminais])

  /**
   * Atualiza o status do terminal (bloqueado/desbloqueado)
   */
  const handleToggleTerminalStatus = useCallback(
    async (terminalId: string, novoBloqueado: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setTogglingStatus((prev) => ({ ...prev, [terminalId]: true }))

      // Atualização otimista
      const previousTerminais = terminais
      setTerminais((prev) =>
        prev.map((item) => {
          if (item.terminal.getId() === terminalId) {
            return {
              ...item,
              rawData: {
                ...item.rawData,
                bloqueado: novoBloqueado,
              },
              terminal: Terminal.fromJSON({
                ...item.rawData,
                bloqueado: novoBloqueado,
              }),
            }
          }
          return item
        })
      )

      try {
        const response = await fetchGestorApi(`/api/terminais/${terminalId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bloqueado: novoBloqueado }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar terminal')
        }

        showToast.success(
          novoBloqueado
            ? 'Terminal bloqueado com sucesso!'
            : 'Terminal desbloqueado com sucesso!'
        )

        // Recarrega os terminais para garantir sincronização
        await loadAllTerminais()
      } catch (error: any) {
        console.error('Erro ao atualizar status do terminal:', error)
        showToast.error(error.message || 'Erro ao atualizar status do terminal')

        // Reverte a atualização otimista em caso de erro
        setTerminais(previousTerminais)
      } finally {
        setTogglingStatus((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [ terminais, loadAllTerminais]
  )

  const handleToggleCompartilhar = useCallback(
    async (terminalId: string, novoValor: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setUpdatingShare((prev) => ({ ...prev, [terminalId]: true }))
      setPreferencesMap((prev) => ({
        ...prev,
        [terminalId]: {
          compartilharMesas: novoValor,
          impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
          impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId, // Preserva o ID da impressora
          fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
          leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
        },
      }))

      try {
        const response = await fetchGestorApi(`/api/preferencias-terminal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            terminaisId: terminalId,
            fields: {
              compartilharMesas: novoValor,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar preferências')
        }

        // Busca as preferências atualizadas do backend para garantir sincronização
        try {
          const prefsResponse = await fetchGestorApi(`/api/preferencias-terminal/${terminalId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json()
            // Atualiza o estado com os dados confirmados do backend
            setPreferencesMap((prev) => ({
              ...prev,
              [terminalId]: rawToPreferenceData(prefsData),
            }))
          }
        } catch (prefsError) {
          console.warn('Erro ao buscar preferências atualizadas:', prefsError)
          // Mesmo com erro ao buscar, mantém a atualização otimista já que a API confirmou sucesso
        }

        showToast.success('Preferência de compartilhamento atualizada!')
      } catch (error: any) {
        console.error('Erro ao atualizar compartilhamento:', error)
        showToast.error(error.message || 'Erro ao atualizar compartilhamento')
        setPreferencesMap((prev) => ({
          ...prev,
          [terminalId]: {
            compartilharMesas: !novoValor,
            impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
            impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId, // Preserva o ID da impressora
            fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
            leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
          },
        }))
      } finally {
        setUpdatingShare((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    []
  )

  const handleToggleFiscalAtivo = useCallback(
    async (terminalId: string, novoValor: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setUpdatingFiscal((prev) => ({ ...prev, [terminalId]: true }))
      setPreferencesMap((prev) => ({
        ...prev,
        [terminalId]: {
          compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
          impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
          impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId,
          fiscalAtivo: novoValor,
          leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
        },
      }))

      try {
        const response = await fetchGestorApi(`/api/preferencias-terminal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            terminaisId: terminalId,
            fields: {
              fiscalAtivo: novoValor,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar preferências')
        }

        try {
          const prefsResponse = await fetchGestorApi(`/api/preferencias-terminal/${terminalId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json()
            setPreferencesMap((prev) => ({
              ...prev,
              [terminalId]: rawToPreferenceData(prefsData),
            }))
          }
        } catch (prefsError) {
          console.warn('Erro ao buscar preferências atualizadas:', prefsError)
        }

        showToast.success('Preferência fiscal atualizada!')
      } catch (error: any) {
        console.error('Erro ao atualizar fiscal ativo:', error)
        showToast.error(error.message || 'Erro ao atualizar fiscal ativo')
        setPreferencesMap((prev) => ({
          ...prev,
          [terminalId]: {
            compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
            impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
            impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId,
            fiscalAtivo: !novoValor,
            leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
          },
        }))
      } finally {
        setUpdatingFiscal((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    []
  )

  const handleToggleLeitorCodigoBarras = useCallback(
    async (terminalId: string, novoValor: boolean) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setUpdatingLeitor((prev) => ({ ...prev, [terminalId]: true }))
      setPreferencesMap((prev) => ({
        ...prev,
        [terminalId]: {
          compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
          impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
          impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId,
          fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
          leitorHabilitado: novoValor,
        },
      }))

      try {
        const response = await fetchGestorApi(`/api/preferencias-terminal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            terminaisId: terminalId,
            fields: {
              leitorHabilitado: novoValor,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar preferências')
        }

        try {
          const prefsResponse = await fetchGestorApi(`/api/preferencias-terminal/${terminalId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })

          if (prefsResponse.ok) {
            const prefsData = await prefsResponse.json()
            setPreferencesMap((prev) => ({
              ...prev,
              [terminalId]: rawToPreferenceData(prefsData),
            }))
          }
        } catch (prefsError) {
          console.warn('Erro ao buscar preferências atualizadas:', prefsError)
        }

        showToast.success('Preferência do leitor atualizada!')
      } catch (error: any) {
        console.error('Erro ao atualizar leitor habilitado:', error)
        showToast.error(error.message || 'Erro ao atualizar leitor habilitado')
        setPreferencesMap((prev) => ({
          ...prev,
          [terminalId]: {
            compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
            impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
            impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId,
            fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
            leitorHabilitado: !novoValor,
          },
        }))
      } finally {
        setUpdatingLeitor((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    []
  )

  const handleChangeImpressora = useCallback(
    async (terminalId: string, impressoraId: string) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setUpdatingPrinter((prev) => ({ ...prev, [terminalId]: true }))

      const impressoraNome =
        impressoras.find((i) => i.id === impressoraId)?.nome || 'Nenhuma'

      setPreferencesMap((prev) => ({
        ...prev,
        [terminalId]: {
          compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
          impressoraFinalizacaoNome: impressoraNome,
          impressoraFinalizacaoId: impressoraId || undefined,
          fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
          leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
        },
      }))

      try {
        const response = await fetchGestorApi(`/api/preferencias-terminal`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            terminaisId: terminalId,
            fields: {
              impressoraFinalizacaoId: impressoraId || null,
            },
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar impressora de finalização')
        }

        showToast.success('Impressora de finalização atualizada!')
      } catch (error: any) {
        console.error('Erro ao atualizar impressora de finalização:', error)
        showToast.error(error.message || 'Erro ao atualizar impressora de finalização')

        // Reverte para o valor anterior
        setPreferencesMap((prev) => ({
          ...prev,
          [terminalId]: {
            compartilharMesas: prev[terminalId]?.compartilharMesas ?? false,
            impressoraFinalizacaoNome:
              impressoras.find((i) => i.id === prev[terminalId]?.impressoraFinalizacaoId)?.nome ||
              'Nenhuma',
            impressoraFinalizacaoId: prev[terminalId]?.impressoraFinalizacaoId,
            fiscalAtivo: prev[terminalId]?.fiscalAtivo ?? false,
            leitorHabilitado: prev[terminalId]?.leitorHabilitado ?? false,
          },
        }))
      } finally {
        setUpdatingPrinter((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [impressoras]
  )

  const handleRequestBulkMenuChange = useCallback(
    (group: CatalogGroup<TerminalData>, newMenuId: string) => {
      const menu =
        menusAtivos.find(item => item.id === newMenuId) ??
        (menusQuery.data?.items ?? []).find(item => item.id === newMenuId)

      if (!menu) {
        showToast.error('Menu selecionado não encontrado')
        return
      }

      setBulkMenuConfirm({
        group,
        newMenuId,
        newMenuLabel: formatMenuGroupLabel(menu),
      })
    },
    [menusAtivos, menusQuery.data?.items]
  )

  const confirmBulkMenuChange = useCallback(async () => {
    if (!bulkMenuConfirm) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado. Faça login novamente.')
      return
    }

    const { group, newMenuId } = bulkMenuConfirm
    const terminalIds = group.items.map(item => item.terminal.getId())
    const previousById = new Map(
      group.items.map(item => [item.terminal.getId(), item.rawData?.menuPrincipalId as string | undefined])
    )

    setBulkMenuSaving(true)
    setUpdatingGroupMenuKey(group.groupKey)

    setTerminais(prev =>
      prev.map(item => {
        if (!terminalIds.includes(item.terminal.getId())) return item
        return {
          ...item,
          rawData: {
            ...item.rawData,
            menuPrincipalId: newMenuId,
          },
        }
      })
    )

    try {
      const results = await Promise.allSettled(
        terminalIds.map(async terminalId => {
          const response = await fetchGestorApi(`/api/terminais/${terminalId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ menuPrincipalId: newMenuId }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
              (errorData as { error?: string }).error || 'Erro ao atualizar menu do terminal'
            )
          }
        })
      )

      const failedIds = terminalIds.filter((_, index) => results[index].status === 'rejected')

      if (failedIds.length > 0) {
        setTerminais(prev =>
          prev.map(item => {
            const terminalId = item.terminal.getId()
            if (!failedIds.includes(terminalId)) return item
            return {
              ...item,
              rawData: {
                ...item.rawData,
                menuPrincipalId: previousById.get(terminalId),
              },
            }
          })
        )
        showToast.error(
          `${failedIds.length} de ${terminalIds.length} terminal(is) não puderam ser atualizados.`
        )
        await loadAllTerminais()
      } else {
        showToast.success(
          `Menu atualizado para ${terminalIds.length} terminal${terminalIds.length === 1 ? '' : 'is'}!`
        )
      }
    } catch (error: unknown) {
      console.error('Erro ao atualizar menu em lote:', error)
      showToast.error(
        error instanceof Error ? error.message : 'Erro ao atualizar menu dos terminais'
      )
      await loadAllTerminais()
    } finally {
      setBulkMenuSaving(false)
      setUpdatingGroupMenuKey(null)
      setBulkMenuConfirm(null)
    }
  }, [bulkMenuConfirm, loadAllTerminais])

  const renderGroupMenuSelector = useCallback(
    (group: CatalogGroup<TerminalData>) => (
      <TerminaisGroupMenuSelector
        currentMenuId={group.grupoId}
        menus={menusParaGrupoSelect(group, menusAtivos, menusQuery.data?.items ?? [])}
        disabled={
          bulkMenuSaving || updatingGroupMenuKey === group.groupKey || menusQuery.isPending
        }
        formatMenuLabel={formatMenuGroupLabel}
        onRequestChange={newMenuId => handleRequestBulkMenuChange(group, newMenuId)}
      />
    ),
    [
      bulkMenuSaving,
      updatingGroupMenuKey,
      menusAtivos,
      menusQuery.data?.items,
      menusQuery.isPending,
      handleRequestBulkMenuChange,
    ]
  )

  // Carrega dados iniciais
  useEffect(() => {
    loadAllTerminais()
    loadAllImpressoras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Lista só terminais não bloqueados (ativos); API não filtra por status. */
  const terminaisFiltrados = useMemo(() => {
    return terminais.filter(({ terminal, rawData }) => {
      const bloqueado = rawData?.bloqueado ?? terminal.getBloqueado()
      return !bloqueado
    })
  }, [terminais])

  const terminalGroups = useMemo<CatalogGroup<TerminalData>[]>(() => {
    const allMenus = menusQuery.data?.items ?? []
    const groupsMap = new Map<string, CatalogGroup<TerminalData>>()
    const semMenuItems: TerminalData[] = []

    for (const menu of menusAtivos) {
      groupsMap.set(menu.id, {
        groupKey: `menu:${menu.id}`,
        grupoLabel: formatMenuGroupLabel(menu),
        grupoId: menu.id,
        grupoAtivo: true,
        items: [],
      })
    }

    for (const item of terminaisFiltrados) {
      const menuId =
        typeof item.rawData?.menuPrincipalId === 'string'
          ? item.rawData.menuPrincipalId.trim()
          : ''

      if (!menuId) {
        semMenuItems.push(item)
        continue
      }

      let group = groupsMap.get(menuId)
      if (!group) {
        const menu = allMenus.find(m => m.id === menuId)
        group = {
          groupKey: `menu:${menuId}`,
          grupoLabel: menu ? formatMenuGroupLabel(menu) : 'Menu desconhecido',
          grupoId: menuId,
          grupoAtivo: menu?.ativo ?? false,
          items: [],
        }
        groupsMap.set(menuId, group)
      }

      group.items.push(item)
    }

    const groups: CatalogGroup<TerminalData>[] = []

    for (const menu of menusAtivos) {
      const group = groupsMap.get(menu.id)
      if (group && group.items.length > 0) {
        groups.push(group)
      }
    }

    for (const [menuId, group] of groupsMap) {
      if (menusAtivos.some(menu => menu.id === menuId)) continue
      if (group.items.length > 0) {
        groups.push(group)
      }
    }

    if (semMenuItems.length > 0) {
      groups.push({
        groupKey: SEM_MENU_GROUP_KEY,
        grupoLabel: 'Sem menu',
        grupoAtivo: true,
        items: semMenuItems,
      })
    }

    return groups
  }, [terminaisFiltrados, menusAtivos, menusQuery.data?.items])

  const terminalGroupsVisiveis = useMemo(
    () => terminalGroups.filter(group => group.items.length > 0),
    [terminalGroups]
  )

  useEffect(() => {
    setExpandedGroups(prev => {
      let changed = false
      const next: Record<string, boolean> = {}
      terminalGroupsVisiveis.forEach(({ groupKey }) => {
        if (typeof prev[groupKey] === 'undefined') {
          changed = true
          next[groupKey] = true
        } else {
          next[groupKey] = prev[groupKey]
        }
      })
      return changed ? next : prev
    })
  }, [terminalGroupsVisiveis])

  const handleToggleExpand = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const currentlyExpanded = prev[groupKey] !== false
      return { ...prev, [groupKey]: !currentlyExpanded }
    })
  }, [])

  const renderTerminalRow = useCallback(
    (item: TerminalData, index: number) => {
      const { terminal, rawData } = item
      const codigo =
        rawData?.codigoInterno ||
        rawData?.codigo ||
        rawData?.code ||
        terminal.getName() ||
        'N/A'
      const nome = rawData?.nome || terminal.getName() || codigo
      const modelo = rawData?.modeloDispositivo || rawData?.modelo || rawData?.deviceModel || 'Unknown'
      const versao =
        rawData?.versaoApk || rawData?.versao || rawData?.apkVersion || rawData?.version || '1.0.0'
      const prefs = resolvePreferencesForTerminal(terminal.getId(), preferencesMap)
      const compartilhamentoAtivo = prefs.compartilharMesas
      const fiscalAtivo = prefs.fiscalAtivo
      const leitorHabilitado = prefs.leitorHabilitado

      return (
        <div
          onClick={() =>
            setTabsModalState({
              open: true,
              tab: 'terminal',
              mode: 'edit',
              terminalId: terminal.getId(),
            })
          }
          className={`px-4 py-2 flex items-center gap-[10px] rounded-lg hover:bg-primary/10 transition-colors cursor-pointer ${
            index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          }`}
        >
          <div className="flex-[2] hidden md:flex items-center gap-3">
            <span className="text-sm font-normal text-primary-text"># {codigo}</span>
          </div>
          <div className="flex-[2] flex items-center gap-1 md:text-sm text-[10px] text-primary-text">
            {nome}
          </div>
          <div className="flex-[2] md:text-sm text-[10px] text-secondary-text">{modelo}</div>
          <div className="w-14 shrink-0 text-center md:text-sm text-[10px] text-secondary-text">
            {versao}
          </div>
          <div className="flex-[2] md:text-sm text-[10px] text-secondary-text hidden md:flex">
            {preferencesLoaded ? (
              <select
                value={prefs.impressoraFinalizacaoId ?? ''}
                onChange={event => {
                  event.stopPropagation()
                  handleChangeImpressora(terminal.getId(), event.target.value)
                }}
                onClick={event => event.stopPropagation()}
                disabled={updatingPrinter[terminal.getId()] || loadingImpressoras}
                className="w-full max-w-[220px] h-8 rounded-lg border border-gray-200 bg-white md:text-sm text-xs text-primary-text px-2 focus:outline-none focus:border-primary"
              >
                <option value="">Nenhuma</option>
                {impressoras.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="md:text-xs text-[10px] text-secondary-text">Carregando...</div>
            )}
          </div>
          <div
            className="flex-[1.5] flex justify-center"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <JiffyIconSwitch
              checked={compartilhamentoAtivo}
              onChange={e => {
                e.stopPropagation()
                handleToggleCompartilhar(terminal.getId(), e.target.checked)
              }}
              disabled={!!updatingShare[terminal.getId()]}
              size="sm"
              className="justify-center gap-0 px-0 py-0"
              inputProps={{
                'aria-label': `Compartilhar mesas — ${nome}`,
                title: compartilhamentoAtivo
                  ? 'Compartilhamento habilitado'
                  : 'Compartilhamento desabilitado',
              }}
            />
          </div>
          <div
            className="flex-[1.5] flex justify-center"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <JiffyIconSwitch
              checked={fiscalAtivo}
              onChange={e => {
                e.stopPropagation()
                handleToggleFiscalAtivo(terminal.getId(), e.target.checked)
              }}
              disabled={!!updatingFiscal[terminal.getId()]}
              size="sm"
              className="justify-center gap-0 px-0 py-0"
              inputProps={{
                'aria-label': `Fiscal ativo — ${nome}`,
                title: fiscalAtivo ? 'Fiscal ativo' : 'Fiscal inativo',
              }}
            />
          </div>
          <div
            className="flex-[1.5] flex justify-center"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <JiffyIconSwitch
              checked={leitorHabilitado}
              onChange={e => {
                e.stopPropagation()
                handleToggleLeitorCodigoBarras(terminal.getId(), e.target.checked)
              }}
              disabled={!!updatingLeitor[terminal.getId()]}
              size="sm"
              className="justify-center gap-0 px-0 py-0"
              inputProps={{
                'aria-label': `Leitor código de barras — ${nome}`,
                title: leitorHabilitado ? 'Leitor habilitado' : 'Leitor desabilitado',
              }}
            />
          </div>
          <div
            className="w-10 shrink-0 flex justify-center"
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                void handleToggleTerminalStatus(terminal.getId(), true)
              }}
              disabled={!!togglingStatus[terminal.getId()]}
              className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Desativar terminal"
              aria-label={`Desativar terminal — ${nome}`}
            >
              <MdDelete className="h-6 w-6" />
            </button>
          </div>
        </div>
      )
    },
    [
      preferencesMap,
      preferencesLoaded,
      impressoras,
      loadingImpressoras,
      updatingPrinter,
      updatingShare,
      updatingFiscal,
      updatingLeitor,
      togglingStatus,
      handleChangeImpressora,
      handleToggleCompartilhar,
      handleToggleFiscalAtivo,
      handleToggleLeitorCodigoBarras,
      handleToggleTerminalStatus,
    ]
  )

  return (
    <div className="flex flex-col h-full overflow-hidden py-1">
      {/* Header fixo */}
      <div className="md:px-6 px-1 flex-shrink-0">
        <div className="flex items-start justify-between border-b-2 border-primary/70 pb-2">
          <div className="flex flex-col">
            <span className="text-primary text-lg md:text-xl font-semibold ">
              Terminais Cadastrados
            </span>
            <span className="text-tertiary text-sm md:text-[20px] font-medium ">
              Total {terminaisFiltrados.length}
              {totalItems > 0 ? ` de ${terminaisFiltrados.length}` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setTabsModalState({
                open: true,
                tab: 'terminal',
                mode: 'create',
                terminalId: undefined,
              })
            }
            className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Busca fixa */}
      <div className="flex gap-3 md:px-[20px] px-1 pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <div className="relative h-8">
            <MdSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              id="terminais-search"
              type="text"
              placeholder="Pesquisar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm "
            />
          </div>
        </div>
      </div>

      {/* Lista de terminais com scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden md:px-[20px] px-1 scrollbar-hide">
        {terminais.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <MdPhone className="text-secondary-text mb-4" size={48} />
            <p className="text-primary-text font-semibold text-lg mb-2">
              Nenhum terminal cadastrado
            </p>
            <p className="text-secondary-text text-sm text-center max-w-md mb-4">
              Não há terminais cadastrados no sistema. Cadastre um terminal para começar a utilizá-lo.
            </p>
            <button
              type="button"
              onClick={() =>
                setTabsModalState({
                  open: true,
                  tab: 'terminal',
                  mode: 'create',
                  terminalId: undefined,
                })
              }
              className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              Novo
              <span className="text-lg">+</span>
            </button>
          </div>
        )}

        {terminais.length > 0 && terminaisFiltrados.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <MdPhone className="text-secondary-text mb-4" size={48} />
            <p className="text-primary-text font-semibold text-lg mb-2">
              Nenhum terminal ativo
            </p>
            <p className="text-secondary-text text-sm text-center max-w-md">
              Esta lista mostra apenas terminais ativos. Os desativados permanecem no cadastro, mas
              não aparecem aqui.
            </p>
          </div>
        )}

        {terminaisFiltrados.length > 0 && (
          <CatalogGroupedList
            groups={terminalGroupsVisiveis}
            getItemKey={item => item.terminal.getId()}
            renderItem={(item, index) => renderTerminalRow(item, index)}
            expandedGroups={expandedGroups}
            isLoading={isLoading && terminalGroupsVisiveis.length === 0}
            emptyLabel="Nenhum terminal encontrado com essa pesquisa."
            listAriaLabel="Terminais cadastrados por menu"
            showHeaderActions={false}
            showGrupoStatusSwitch={false}
            itemCountSuffix="terminais"
            showCollapsedHint={false}
            onToggleExpand={handleToggleExpand}
            renderBeforeGroupItems={() => <TerminaisListColumnHeader />}
            renderGroupHeaderAddon={renderGroupMenuSelector}
          />
        )}

        {isLoading && terminaisFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <JiffyLoading />
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <TerminaisTabsModal
        state={tabsModalState}
        onClose={() =>
          setTabsModalState({
            open: false,
            tab: 'terminal',
            mode: 'edit',
            terminalId: undefined,
          })
        }
        onTabChange={(tab) => setTabsModalState((prev) => ({ ...prev, tab }))}
        onReload={loadAllTerminais}
      />

      <JiffyFriendlyAlertDialog
        open={Boolean(bulkMenuConfirm)}
        onClose={() => {
          if (!bulkMenuSaving) setBulkMenuConfirm(null)
        }}
        onConfirm={() => void confirmBulkMenuChange()}
        title="Alterar menu de todos os terminais?"
        description={
          bulkMenuConfirm
            ? `Esta ação aplicará o menu "${bulkMenuConfirm.newMenuLabel}" a ${bulkMenuConfirm.group.items.length} terminal${bulkMenuConfirm.group.items.length === 1 ? '' : 'is'} do grupo "${bulkMenuConfirm.group.grupoLabel}".`
            : ''
        }
        confirmLabel="Sim, alterar"
        iconVariant="warning"
        busy={bulkMenuSaving}
      />
    </div>
  )
}

