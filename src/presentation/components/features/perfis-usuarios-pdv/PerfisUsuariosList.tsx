'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch, MdKeyboardArrowRight, MdPerson, MdEdit, MdAdd, MdPersonAdd } from 'react-icons/md'
import {
  PerfisUsuariosTabsModal,
  PerfisUsuariosTabKey,
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

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
      initialPerfilPdvId: config.initialPerfilPdvId,
      usuarioId: config.usuarioId,
    }))

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalPerfilOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      tab: 'perfil',
      perfilId: undefined,
      usuarioId: undefined,
      initialPerfilPdvId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalPerfilOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadAllPerfis() // Recarrega a lista de perfis
    onReload?.()
  }, [router, searchParams, pathname, loadAllPerfis, onReload])

  const handleTabChange = useCallback((tab: PerfisUsuariosTabKey) => {
    setTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  /** Perfil embutido: após criar mantém o modal aberto e libera a aba Usuário */
  const handlePerfilEmbeddedSaved = useCallback(
    (payload?: { perfilIdCriado?: string }) => {
      if (payload?.perfilIdCriado) {
        handleStatusChange()
        setTabsModalState((prev) => ({
          ...prev,
          mode: 'edit',
          perfilId: payload.perfilIdCriado,
          initialPerfilPdvId: payload.perfilIdCriado,
        }))
        showToast.success('Perfil criado com sucesso!')
        return
      }
      closeTabsModal()
    },
    [closeTabsModal, handleStatusChange]
  )

  const openUsuariosTabsModal = useCallback((config: Partial<UsuariosTabsModalState> = {}) => {
    setUsuariosTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'usuario',
      mode: config.mode ?? 'create',
      usuarioId: config.usuarioId,
      initialPerfilPdvId: config.initialPerfilPdvId,
    }))

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalUsuarioPerfilOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeUsuariosTabsModal = useCallback(() => {
    setUsuariosTabsModalState((prev) => ({
      ...prev,
      open: false,
      usuarioId: undefined,
      initialPerfilPdvId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalUsuarioPerfilOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal

    // As funções de recarga do modal já lidam com o que precisa ser recarregado
    // (expandedPerfis, loadAllPerfis, handleStatusChange)
  }, [router, searchParams, pathname])

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
      <div className="md:px-[30px] px-1 pt-1 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col w-1/2 md:pl-5">
            <span className="text-primary md:text-lg text-sm font-semibold font-nunito">
              Perfis Cadastrados
            </span>
            <span className="text-tertiary md:text-[22px] text-sm font-normal font-nunito">
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

      <div className="h-[1px] border-t-2 border-primary/70 flex-shrink-0" aria-hidden />
      <div className="flex gap-3 px-2 flex-shrink-0 py-1">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
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
        <div className="px-1 flex-shrink-0">
          <div className="h-10 bg-custom-2 rounded-lg pr-1 flex items-center gap-2">
            <div className="w-8"></div>
            <div className="md:flex-[3] flex-[2] font-nunito font-semibold text-left md:text-sm text-xs text-primary-text ">
              Perfil
            </div>
            <div className="md:flex-[2] flex-[1] md:text-center mr-3 text-right font-nunito font-semibold md:text-sm text-xs text-primary-text ">
              Qtd Usuários
            </div>
          </div>
        </div>
      )}

      {/* Lista de perfis com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-1 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {/* Mostrar loading quando está carregando ou ainda não houve tentativa de carregamento */}
        {(isLoading || !hasLoadedInitialRef.current) && perfis.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <JiffyLoading />
          </div>
        )}

        {/* Só exibir mensagem de "nenhum perfil" quando realmente não há perfis e já houve tentativa de carregamento */}
        {perfis.length === 0 && !isLoading && hasLoadedInitialRef.current && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum perfil encontrado.</p>
          </div>
        )}

        {perfis.map((perfil, index) => {
          const isExpanded = expandedPerfis.has(perfil.getId())
          const usuarios = usuariosPorPerfil[perfil.getId()] || []
          const contagemUsuarios = contagemUsuariosPorPerfil[perfil.getId()] ?? 0

          // Handler para abrir edição ao clicar na linha do perfil
          const handlePerfilRowClick = () => {
            openTabsModal({ mode: 'edit', perfilId: perfil.getId() })
          }

          // Intercala cores de fundo: cinza-50 para pares, branco para ímpares
          const isZebraEven = index % 2 === 0
          const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

          return (
            <div
              key={perfil.getId()}
              className={`${bgClass} rounded-lg my-2 overflow-visible hover:bg-primary/10 transition-colors`}
            >
              {/* Cabeçalho do perfil */}
              <div
                onClick={handlePerfilRowClick}
                className="h-[50px] px-1 flex items-center md:gap-[10px] gap-1 relative overflow-visible cursor-pointer"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(perfil.getId())
                  }}
                  className="tooltip-hover-below tooltip-hover-below-icon flex h-6 w-6 shrink-0 items-center justify-center rounded text-primary-text transition-colors hover:bg-secondary-bg/20 md:h-8 md:w-8"
                  data-tooltip="Exibir usuários do perfil"
                  aria-label="Exibir usuários do perfil"
                  aria-expanded={isExpanded}
                >
                  <span
                    className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <MdKeyboardArrowRight size={18} />
                  </span>
                </button>
                <div className="md:flex-[3] flex-[2] uppercase font-normal text-left md:text-sm text-xs text-primary-text flex items-center gap-2">
                  {perfil.getRole()}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openTabsModal({
                        mode: 'edit',
                        perfilId: perfil.getId(),
                        tab: 'usuario',
                        initialPerfilPdvId: perfil.getId(),
                      })
                    }}
                    className="tooltip-hover-below flex h-5 w-5 shrink-0 items-center justify-center text-primary transition-colors hover:bg-primary/20 hover:rounded-full"
                    data-tooltip="Adicionar novo usuário ao perfil"
                    aria-label="Adicionar novo usuário ao perfil"
                  >
                    <MdPersonAdd size={16} />
                  </button>
                </div>
                <div className="md:flex-[2] flex-[1] mr-3 md:text-center text-right font-nunito md:text-sm text-xs text-secondary-text">
                  {contagemUsuarios} usuário(s)
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
                        <div className="flex items-center justify-start gap-2 w-full">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <p className="uppercase font-normal text-sm text-primary-text">
                                {usuario.nome}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openUsuariosTabsModal({
                                    mode: 'edit',
                                    usuarioId: usuario.id,
                                  })
                                }}
                                className="tooltip-hover-below tooltip-hover-below-icon flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/20"
                                data-tooltip="Editar usuário"
                                aria-label="Editar usuário"
                              >
                                <MdEdit size={14} />
                              </button>
                            </div>
                            <p className="font-nunito text-xs text-secondary-text">
                              {usuario.telefone || 'Sem telefone'}
                            </p>
                          </div>
                          <div
                            className="tooltip-hover-below flex items-center"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            data-tooltip={
                              usuario.ativo ? 'Usuário ativo' : 'Usuário desativado'
                            }
                          >
                            <JiffyIconSwitch
                              checked={usuario.ativo}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleToggleUsuarioStatus(
                                  usuario.id,
                                  e.target.checked,
                                  perfil.getId()
                                )
                              }}
                              disabled={!!togglingStatus[usuario.id]}
                              bordered={false}
                              size="sm"
                              className="shrink-0 px-0 py-0"
                              inputProps={{
                                'aria-label': usuario.ativo
                                  ? 'Desativar usuário'
                                  : 'Ativar usuário',
                                onClick: (e) => e.stopPropagation(),
                              }}
                            />
                          </div>
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
      </div>

      <PerfisUsuariosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabChange}
        onReload={handleStatusChange}
        onPerfilEmbeddedSaved={handlePerfilEmbeddedSaved}
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


