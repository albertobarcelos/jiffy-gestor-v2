'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Terminal } from '@/src/domain/entities/Terminal'
import { MdPhone, MdPowerSettingsNew, MdSearch } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { TerminaisTabsModal, TerminaisTabsModalState } from './TerminaisTabsModal'

/**
 * Tab de Terminais - Lista de terminais carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
interface TerminalData {
  terminal: Terminal
  rawData: any // Dados brutos da API para campos extras
}

interface TerminalPreferenceData {
  compartilharMesas: boolean
  impressoraFinalizacaoNome: string
  impressoraFinalizacaoId?: string
}

export function TerminaisTab() {
  const { auth } = useAuthStore()
  const [terminais, setTerminais] = useState<TerminalData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalItems, setTotalItems] = useState(0)
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [preferencesMap, setPreferencesMap] = useState<Record<string, TerminalPreferenceData>>({})
  const [updatingShare, setUpdatingShare] = useState<Record<string, boolean>>({})
  const [updatingPrinter, setUpdatingPrinter] = useState<Record<string, boolean>>({})
  const [impressoras, setImpressoras] = useState<Array<{ id: string; nome: string }>>([])
  const [loadingImpressoras, setLoadingImpressoras] = useState(false)
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
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllTerminais = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allTerminais: TerminalData[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchQueryRef.current) {
            params.append('q', searchQueryRef.current)
          }

          const response = await fetch(`/api/terminais?${params.toString()}`, {
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

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || data.total || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newTerminais.length === 10
          currentOffset += newTerminais.length
        }

        setTerminais(allTerminais)
        setTotalItems(totalCount)

        // Buscar preferências (compartilhar mesas e impressora) para cada terminal
        try {
          const prefsEntries = await Promise.all(
            allTerminais.map(async (item) => {
              try {
                const resp = await fetch(`/api/preferencias-terminal/${item.terminal.getId()}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                })

                if (!resp.ok) {
                  return null
                }

                const data = await resp.json()
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
                  terminalId: item.terminal.getId(),
                  compartilharMesas: !!data.compartilharMesas,
                  impressoraFinalizacaoNome: impressoraNome,
                  impressoraFinalizacaoId: impressoraId,
                }
              } catch {
                return null
              }
            })
          )

          const prefsMap = prefsEntries
            .filter(
              (p): p is {
                terminalId: string
                compartilharMesas: boolean
                impressoraFinalizacaoNome: string
                impressoraFinalizacaoId: string | undefined
              } => !!p
            )
            .reduce<Record<string, TerminalPreferenceData>>((acc, curr) => {
              acc[curr.terminalId] = {
                compartilharMesas: curr.compartilharMesas,
                impressoraFinalizacaoNome: curr.impressoraFinalizacaoNome,
                impressoraFinalizacaoId: curr.impressoraFinalizacaoId,
              }
              return acc
            }, {})

          setPreferencesMap(prefsMap)
        } catch (error) {
          console.warn('Não foi possível carregar preferências dos terminais', error)
        }
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
  )

  const loadAllImpressoras = useCallback(async () => {
    const token = auth?.getAccessToken()
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

        const resp = await fetch(`/api/impressoras?${params.toString()}`, {
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
  }, [auth])

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
      const token = auth?.getAccessToken()
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
        const response = await fetch(`/api/terminais/${terminalId}`, {
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
    [auth, terminais, loadAllTerminais]
  )

  const handleToggleCompartilhar = useCallback(
    async (terminalId: string, novoValor: boolean) => {
      const token = auth?.getAccessToken()
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
        },
      }))

      try {
        const response = await fetch(`/api/preferencias-terminal`, {
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

        showToast.success('Preferência de compartilhamento atualizada!')
      } catch (error: any) {
        console.error('Erro ao atualizar compartilhamento:', error)
        showToast.error(error.message || 'Erro ao atualizar compartilhamento')
        setPreferencesMap((prev) => ({
          ...prev,
          [terminalId]: {
            compartilharMesas: !novoValor,
            impressoraFinalizacaoNome: prev[terminalId]?.impressoraFinalizacaoNome || 'Nenhuma',
          },
        }))
      } finally {
        setUpdatingShare((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth]
  )

  const handleChangeImpressora = useCallback(
    async (terminalId: string, impressoraId: string) => {
      const token = auth?.getAccessToken()
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
        },
      }))

      try {
        const response = await fetch(`/api/preferencias-terminal`, {
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
          },
        }))
      } finally {
        setUpdatingPrinter((prev) => {
          const { [terminalId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, impressoras]
  )

  // Carrega dados iniciais
  useEffect(() => {
    loadAllTerminais()
    loadAllImpressoras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header fixo */}
      <div className="px-4 flex-shrink-0">
        <div className="flex items-center justify-between border-b-2 border-primary/70 pb-2">
          <div className="flex flex-col">
            <span className="text-primary text-2xl font-semibold font-exo">
              Terminais Cadastrados
            </span>
            <span className="text-tertiary text-[20px] font-medium font-nunito">
              Total {terminais.length} de {totalItems}
            </span>
          </div>
          
        </div>
      </div>

      {/* Busca fixa */}
      <div className="flex gap-3 px-[20px] pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <label
            htmlFor="terminais-search"
            className="text-xs font-semibold text-secondary-text mb-1 block"
          >
            Buscar Terminal...
          </label>
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
              className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
            />
          </div>
        </div>
      </div>

      {/* Lista de terminais com scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-[20px] scrollbar-hide">
        {/* Barra de títulos das colunas - sticky dentro do scroll */}
        {terminais.length > 0 && (
          <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px] sticky top-0 z-10 mb-2">
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Código do Terminal
            </div>
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Nome do Terminal
            </div>
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Modelo Dispositivo
            </div>
            <div className="flex-[1.5] font-nunito font-semibold text-xs text-primary-text uppercase">
              Versão APK
            </div>
            <div className="flex-[2] font-nunito font-semibold text-xs text-primary-text uppercase">
              Impressora Finalização
            </div>
            <div className="flex-[1.5] text-center font-nunito font-semibold text-xs text-primary-text uppercase">
              Compartilhar Mesas
            </div>
            <div className="flex-[1.5] text-center font-nunito font-semibold text-xs text-primary-text uppercase">
              Status
            </div>
          </div>
        )}

        {terminais.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum terminal encontrado.</p>
          </div>
        )}

        {terminais.map(({ terminal, rawData }) => {
          // Extrai campos dos dados brutos conforme documentação da API
          const codigo = rawData?.codigoInterno || rawData?.codigo || rawData?.code || terminal.getName() || 'N/A'
          const nome = rawData?.nome || terminal.getName() || codigo
          const modelo = rawData?.modeloDispositivo || rawData?.modelo || rawData?.deviceModel || 'Unknown'
          const versao = rawData?.versaoApk || rawData?.versao || rawData?.apkVersion || rawData?.version || '1.0.0'
          // Status: bloqueado = false significa ATIVO, bloqueado = true significa BLOQUEADO/INATIVO
          const bloqueado = rawData?.bloqueado ?? terminal.getBloqueado()
          const ativo = !bloqueado
          const prefs = preferencesMap[terminal.getId()]
          const compartilhamentoAtivo = prefs?.compartilharMesas ?? false
          const impressoraFinalizacaoNome = prefs?.impressoraFinalizacaoNome ?? '—'

          return (
              <div
              key={terminal.getId()}
              onClick={() =>
                setTabsModalState({
                  open: true,
                  tab: 'terminal',
                  mode: 'edit',
                  terminalId: terminal.getId(),
                })
              }
              className=" px-4 py-2 flex items-center gap-[10px] bg-info rounded-lg my-2 shadow-sm shadow-primary-text/50 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <div className="flex-[2] flex items-center gap-3">
                
                <span className="text-sm font-medium text-primary-text font-nunito">
                 # {codigo}
                </span>
              </div>
              <div className="flex-[2] flex items-center gap-1 text-sm text-primary-text font-nunito">
                {nome}
              </div>
              <div className="flex-[2] text-sm text-secondary-text font-nunito">
                {modelo}
              </div>
              <div className="flex-[1.5] text-sm text-secondary-text font-nunito">
                {versao}
              </div>
              <div className="flex-[2] text-sm text-secondary-text font-nunito">
                {preferencesMap[terminal.getId()] ? (
                  <select
                    value={preferencesMap[terminal.getId()]?.impressoraFinalizacaoId ?? ''}
                    onChange={(event) => {
                      event.stopPropagation()
                      handleChangeImpressora(terminal.getId(), event.target.value)
                    }}
                    onClick={(event) => event.stopPropagation()}
                    disabled={updatingPrinter[terminal.getId()] || loadingImpressoras}
                    className="w-full max-w-[220px] h-8 rounded-lg border border-gray-200 bg-white text-sm text-primary-text px-2 focus:outline-none focus:border-primary"
                  >
                    <option value="">Nenhuma</option>
                    {impressoras.map((imp) => (
                      <option key={imp.id} value={imp.id}>
                        {imp.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-secondary-text">Carregando...</div>
                )}
              </div>
              <div className="flex-[1.5] flex justify-center">
                <label
                  className={`relative inline-flex h-5 w-12 items-center ${
                    updatingShare[terminal.getId()] ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  }`}
                  title={compartilhamentoAtivo ? 'Compartilhamento habilitado' : 'Compartilhamento desabilitado'}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={compartilhamentoAtivo}
                    onChange={(event) => {
                      event.stopPropagation();
                      handleToggleCompartilhar(terminal.getId(), event.target.checked)
                    }}
                    disabled={!!updatingShare[terminal.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-[2px] top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[28px]" />
                </label>
              </div>
              <div className="flex-[1.5] flex justify-center">
                <label
                  className={`relative inline-flex h-5 w-12 items-center ${
                    togglingStatus[terminal.getId()]
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  title={ativo ? 'Terminal Ativo' : 'Terminal Bloqueado'}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={ativo}
                    onChange={(event) => {
                      event.stopPropagation();
                      handleToggleTerminalStatus(terminal.getId(), !event.target.checked)
                    }}
                    disabled={!!togglingStatus[terminal.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-[2px] top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[28px]" />
                </label>
              </div>
            </div>
          )
        })} 

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
    </div>
  )
}

