'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { PerfilUsuarioActionsMenu } from './PerfilUsuarioActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { MdSearch, MdKeyboardArrowRight, MdPerson, MdEdit, MdAdd } from 'react-icons/md'
import {
  PerfisUsuariosTabsModal,
  PerfisUsuariosTabsModalState,
} from './PerfisUsuariosTabsModal'
import {
  UsuariosTabsModal,
  UsuariosTabsModalState,
} from '../usuarios/UsuariosTabsModal'

interface PerfisUsuariosListProps {
  onReload?: () => void
}

/**
 * Lista de perfis de usuários carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 * Replica exatamente o design e lógica do Flutter
 */
export function PerfisUsuariosList({ onReload }: PerfisUsuariosListProps) {
  const [perfis, setPerfis] = useState<PerfilUsuario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [totalPerfis, setTotalPerfis] = useState(0)
  const [expandedPerfis, setExpandedPerfis] = useState<Set<string>>(new Set())
  const [usuariosPorPerfil, setUsuariosPorPerfil] = useState<Record<string, any[]>>({})
  const [contagemUsuariosPorPerfil, setContagemUsuariosPorPerfil] = useState<Record<string, number>>({})
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<PerfisUsuariosTabsModalState>({
    open: false,
    tab: 'perfil',
    mode: 'create',
    perfilId: undefined,
  })
  const [usuariosTabsModalState, setUsuariosTabsModalState] = useState<UsuariosTabsModalState>({
    open: false,
    tab: 'usuario',
    mode: 'create',
    usuarioId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  const searchTextRef = useRef('')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    searchTextRef.current = debouncedSearch
  }, [debouncedSearch])

  /**
   * Carrega a contagem de usuários para cada perfil
   */
  const loadContagemUsuariosPorPerfil = useCallback(
    async (perfilIds: string[]) => {
      const token = auth?.getAccessToken()
      if (!token || perfilIds.length === 0) return

      try {
        // Busca a contagem de usuários para cada perfil em paralelo
        const contagens = await Promise.all(
          perfilIds.map(async (perfilId) => {
            try {
              const response = await fetch(`/api/usuarios?perfilPdvId=${perfilId}&limit=1&offset=0`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })

              if (response.ok) {
                const data = await response.json()
                return { perfilId, count: data.count || 0 }
              }
              return { perfilId, count: 0 }
            } catch (error) {
              console.error(`Erro ao buscar contagem de usuários para perfil ${perfilId}:`, error)
              return { perfilId, count: 0 }
            }
          })
        )

        // Cria um objeto com as contagens
        const contagensMap: Record<string, number> = {}
        contagens.forEach(({ perfilId, count }) => {
          contagensMap[perfilId] = count
        })

        setContagemUsuariosPorPerfil(contagensMap)
      } catch (error) {
        console.error('Erro ao carregar contagem de usuários:', error)
      }
    },
    [auth]
  )

  /**
   * Carrega todos os perfis fazendo requisições sequenciais
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllPerfis = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allPerfis: PerfilUsuario[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchTextRef.current) {
            params.append('q', searchTextRef.current)
          }

          const response = await fetch(`/api/perfis-usuarios-pdv?${params.toString()}`, {
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

          const newPerfis = (data.items || []).map((item: any) =>
            PerfilUsuario.fromJSON(item)
          )

          allPerfis.push(...newPerfis)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newPerfis.length === 10
          currentOffset += newPerfis.length
        }

        setPerfis(allPerfis)
        setTotalPerfis(totalCount)
        setExpandedPerfis(new Set())
        setUsuariosPorPerfil({})

        // Carrega a contagem de usuários para cada perfil em paralelo
        if (allPerfis.length > 0) {
          await loadContagemUsuariosPorPerfil(allPerfis.map((p) => p.getId()))
        }
      } catch (error) {
        console.error('Erro ao carregar perfis:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [auth, loadContagemUsuariosPorPerfil]
  )

  const loadUsuariosPorPerfil = useCallback(
    async (perfilId: string) => {
      const token = auth?.getAccessToken()
      if (!token || usuariosPorPerfil[perfilId]) return

      try {
        const response = await fetch(`/api/usuarios?perfilPdvId=${perfilId}&limit=100&offset=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUsuariosPorPerfil((prev) => ({
            ...prev,
            [perfilId]: data.items || [],
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar usuários do perfil:', error)
      }
    },
    [auth, usuariosPorPerfil]
  )

  const toggleExpand = (perfilId: string) => {
    const newExpanded = new Set(expandedPerfis)
    if (newExpanded.has(perfilId)) {
      newExpanded.delete(perfilId)
    } else {
      newExpanded.add(perfilId)
      loadUsuariosPorPerfil(perfilId)
    }
    setExpandedPerfis(newExpanded)
  }

  /**
   * Atualiza o status do usuário diretamente na lista
   */
  const handleToggleUsuarioStatus = useCallback(
    async (usuarioId: string, novoStatus: boolean, perfilId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setTogglingStatus((prev) => ({ ...prev, [usuarioId]: true }))

      // Atualização otimista
      setUsuariosPorPerfil((prev) => {
        const usuarios = prev[perfilId] || []
        return {
          ...prev,
          [perfilId]: usuarios.map((u: any) =>
            u.id === usuarioId ? { ...u, ativo: novoStatus } : u
          ),
        }
      })

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar usuário')
        }

        showToast.success(
          novoStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!'
        )

        // Recarrega os usuários do perfil para garantir sincronização
        await loadUsuariosPorPerfil(perfilId)
      } catch (error: any) {
        console.error('Erro ao atualizar status do usuário:', error)
        showToast.error(error.message || 'Erro ao atualizar status do usuário')

        // Reverte a atualização otimista em caso de erro
        const response = await fetch(`/api/usuarios?perfilPdvId=${perfilId}&limit=100&offset=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUsuariosPorPerfil((prev) => ({
            ...prev,
            [perfilId]: data.items || [],
          }))
        }
      } finally {
        setTogglingStatus((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, loadUsuariosPorPerfil]
  )

  // Debounce da busca
  useEffect(() => {
    setDebouncedSearch(searchText)
  }, [searchText])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      loadAllPerfis()
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [debouncedSearch, loadAllPerfis])

  // Carrega perfis iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadAllPerfis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadAllPerfis()
    onReload?.()
  }

  const openTabsModal = useCallback((config: Partial<PerfisUsuariosTabsModalState> = {}) => {
    setTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'perfil',
      mode: config.mode ?? 'create',
      perfilId: config.perfilId,
    }))
  }, [])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      perfilId: undefined,
    }))
  }, [])

  const handleTabChange = useCallback((tab: 'perfil') => {
    setTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  const openUsuariosTabsModal = useCallback((config: Partial<UsuariosTabsModalState> = {}) => {
    setUsuariosTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'usuario',
      mode: config.mode ?? 'create',
      usuarioId: config.usuarioId,
      initialPerfilPdvId: config.initialPerfilPdvId,
    }))
  }, [])

  const closeUsuariosTabsModal = useCallback(() => {
    setUsuariosTabsModalState((prev) => ({
      ...prev,
      open: false,
      usuarioId: undefined,
      initialPerfilPdvId: undefined,
    }))
  }, [])

  const handleUsuariosTabChange = useCallback((tab: 'usuario') => {
    setUsuariosTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  // Atualiza a contagem quando os usuários são carregados
  useEffect(() => {
    const novasContagens: Record<string, number> = {}
    Object.keys(usuariosPorPerfil).forEach((perfilId) => {
      novasContagens[perfilId] = usuariosPorPerfil[perfilId].length
    })
    setContagemUsuariosPorPerfil((prev) => ({ ...prev, ...novasContagens }))
  }, [usuariosPorPerfil])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex flex-col w-1/2 pl-5">
            <span className="text-primary text-lg font-semibold font-nunito">
              Perfis Cadastrados
            </span>
            <span className="text-tertiary text-[22px] font-medium font-nunito">
              Total {perfis.length} de {totalPerfis}
            </span>
          </div>
          <button
            onClick={() => openTabsModal({ mode: 'create' })}
            className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="flex gap-3 px-[20px] pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label
              htmlFor="complementos-search"
              className="text-xs font-semibold text-secondary-text mb-1 block"
            >
              Buscar Perfil de Usuário...
            </label>
            <div className="relative h-8">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                id="complementos-search"
                type="text"
                placeholder="Pesquisar perfil de usuário..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>
      </div>

      {/* Cabeçalho da tabela */}
      {perfis.length > 0 && (
        <div className="px-[30px] flex-shrink-0">
          <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-2">
            <div className="w-8"></div>
            <div className="flex-[3] font-nunito font-semibold text-xs text-primary-text uppercase">
              Perfil
            </div>
            <div className="flex-[2] text-center font-nunito font-semibold text-xs text-primary-text uppercase">
              Qtd Usuários
            </div>
            <div className="flex-[2] flex justify-end font-nunito font-semibold text-xs text-primary-text uppercase">
              Ações
            </div>
          </div>
        </div>
      )}

      {/* Lista de perfis com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >

        {perfis.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum perfil encontrado.</p>
          </div>
        )}

        {perfis.map((perfil) => {
          const isExpanded = expandedPerfis.has(perfil.getId())
          const usuarios = usuariosPorPerfil[perfil.getId()] || []
          const contagemUsuarios = contagemUsuariosPorPerfil[perfil.getId()] ?? 0

          return (
            <div
              key={perfil.getId()}
              className="bg-info rounded-xl my-2 overflow-visible shadow-sm shadow-primary-text/50 hover:bg-primary/10 transition-colors"
            >
              {/* Cabeçalho do perfil */}
              <div className="h-[50px] px-4 flex items-center gap-[10px] relative overflow-visible">
                <button
                  onClick={() => toggleExpand(perfil.getId())}
                  className="w-8 h-8 flex items-center justify-center text-primary-text hover:bg-secondary-bg/20 rounded transition-colors"
                >
                  <span title="Exibir usuários do perfil" 
                  className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <MdKeyboardArrowRight size={18} />
                  </span>
                </button>
                <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text flex items-center gap-2">
                  {perfil.getRole()}
                  <button
                    onClick={() => openTabsModal({ mode: 'edit', perfilId: perfil.getId() })}
                    className="w-5 h-5 flex items-center justify-center border border-primary/70 text-primary hover:bg-primary/20 rounded-full transition-colors"
                    title="Editar perfil"
                  >
                    <MdEdit size={16} />
                  </button>
                  <button
                    onClick={() => openUsuariosTabsModal({ mode: 'create', initialPerfilPdvId: perfil.getId() })}
                    className="w-5 h-5 flex items-center justify-center border border-primary/70 text-primary hover:bg-primary/20 rounded-full transition-colors"
                    title="Adicionar novo usuário ao perfil"
                  >
                    <MdAdd size={16} />
                  </button>
                </div>
                <div className="flex-[2] text-center font-nunito text-sm text-secondary-text">
                  {contagemUsuarios} usuário(s)
                </div>
                <div className="flex-[2] flex justify-end">
                  <PerfilUsuarioActionsMenu
                    perfilId={perfil.getId()}
                    onStatusChanged={handleStatusChange}
                    onEdit={() => openTabsModal({ mode: 'edit', perfilId: perfil.getId() })}
                  />
                </div>
              </div>

              {/* Lista de usuários expandida */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-primary/20 overflow-hidden">
                  {usuarios.length === 0 ? (
                    <p className="text-secondary-text text-sm py-4 text-center">
                      Nenhum usuário associado a este perfil
                    </p>
                  ) : (
                    <div className="space-y-2 pt-4">
                      {usuarios.map((usuario: any) => (
                        <div
                          key={usuario.id}
                          className="flex items-center gap-4 p-3 bg-primary-bg rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary"><MdPerson size={22} /></span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-nunito font-semibold text-sm text-primary-text">
                                {usuario.nome}
                              </p>
                              <button
                                onClick={() => openUsuariosTabsModal({ mode: 'edit', usuarioId: usuario.id })}
                                className="w-5 h-5 flex items-center justify-center text-primary hover:bg-primary/20 rounded-full transition-colors"
                                title="Editar usuário"
                              >
                                <MdEdit size={14} />
                              </button>
                            </div>
                            <p className="font-nunito text-xs text-secondary-text">
                              {usuario.telefone || 'Sem telefone'}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <label
                              className={`relative inline-flex h-5 w-12 items-center ${
                                togglingStatus[usuario.id]
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer'
                              }`}
                              title={usuario.ativo ? 'Usuário Ativo' : 'Usuário Desativado'}
                            >
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={usuario.ativo}
                                onChange={(event) =>
                                  handleToggleUsuarioStatus(
                                    usuario.id,
                                    event.target.checked,
                                    perfil.getId()
                                  )
                                }
                                disabled={!!togglingStatus[usuario.id]}
                              />
                              <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                              <span className="absolute left-[2px] top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[28px]" />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <PerfisUsuariosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabChange}
        onReload={handleStatusChange}
      />

      <UsuariosTabsModal
        state={usuariosTabsModalState}
        onClose={closeUsuariosTabsModal}
        onTabChange={handleUsuariosTabChange}
        onReload={() => {
          // Recarrega os usuários de todos os perfis expandidos quando um usuário é editado
          expandedPerfis.forEach((perfilId) => {
            setUsuariosPorPerfil((prev) => {
              const updated = { ...prev }
              delete updated[perfilId]
              return updated
            })
            loadUsuariosPorPerfil(perfilId)
          })
          // Recarrega a contagem de usuários e a lista de perfis
          loadAllPerfis()
          handleStatusChange()
        }}
      />
    </div>
  )
}


