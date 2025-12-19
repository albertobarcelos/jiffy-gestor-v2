'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Usuario } from '@/src/domain/entities/Usuario'
import { UsuarioActionsMenu } from './UsuarioActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { MdSearch, MdEdit } from 'react-icons/md'
import {
  UsuariosTabsModal,
  UsuariosTabsModalState,
} from './UsuariosTabsModal'

interface UsuariosListProps {
  onReload?: () => void
}

/**
 * Lista de usuários carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
export function UsuariosList({ onReload }: UsuariosListProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [perfisMap, setPerfisMap] = useState<Record<string, string>>({}) // Mapa de perfilPdvId -> role
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [updatingPerfil, setUpdatingPerfil] = useState<Record<string, boolean>>({}) // Controla qual usuário está atualizando perfil
  const [tabsModalState, setTabsModalState] = useState<UsuariosTabsModalState>({
    open: false,
    tab: 'usuario',
    mode: 'create',
    usuarioId: undefined,
  })
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()
  
  // Estados para perfis PDV (sempre busca dados atualizados)
  const [allPerfisPDV, setAllPerfisPDV] = useState<Array<{ id: string; role: string }>>([])
  const [isLoadingPerfis, setIsLoadingPerfis] = useState(false)

  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    searchTextRef.current = debouncedSearch
  }, [debouncedSearch])

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

  // Carregar perfis PDV diretamente da API (sem cache)
  const loadPerfisPDV = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingPerfis(true)
    try {
      const response = await fetch('/api/perfis-pdv', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        const perfis = (data.items || []).map((item: any) => ({
          id: item.id?.toString() || '',
          role: item.role?.toString() || '',
        }))
        setAllPerfisPDV(perfis)
      } else {
        console.error('Erro ao carregar perfis PDV:', response.status)
        setAllPerfisPDV([])
      }
    } catch (error) {
      console.error('Erro ao carregar perfis PDV:', error)
      setAllPerfisPDV([])
    } finally {
      setIsLoadingPerfis(false)
    }
  }, [auth])

  // Carregar perfis PDV quando o componente montar
  useEffect(() => {
    loadPerfisPDV()
  }, [loadPerfisPDV])

  /**
   * Carrega todos os usuários fazendo requisições sequenciais
   * Continua carregando páginas de 10 em 10 até não haver mais itens
   */
  const loadAllUsuarios = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      setIsLoading(true)

      try {
        const allUsuarios: Usuario[] = []
        let currentOffset = 0
        let hasMore = true
        let totalCount = 0

        // Determina o filtro ativo
        const ativoFilter =
          filterStatusRef.current === 'Ativo'
            ? true
            : filterStatusRef.current === 'Desativado'
              ? false
              : null

        // Loop para carregar todas as páginas
        while (hasMore) {
          const params = new URLSearchParams({
            limit: '10',
            offset: currentOffset.toString(),
          })

          if (searchTextRef.current) {
            params.append('q', searchTextRef.current)
          }

          if (ativoFilter !== null) {
            params.append('ativo', ativoFilter.toString())
          }

          const response = await fetch(`/api/usuarios?${params.toString()}`, {
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

          const newUsuarios = (data.items || []).map((item: any) =>
            Usuario.fromJSON(item)
          )

          allUsuarios.push(...newUsuarios)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || 0
          }

          // Verifica se há mais páginas
          // Se retornou menos de 10 itens, não há mais páginas
          hasMore = newUsuarios.length === 10
          currentOffset += newUsuarios.length
        }

        // Coleta todos os perfilPdvId únicos
        const perfilPdvIds = Array.from(
          new Set(
            allUsuarios
              .map((u) => u.getPerfilPdvId())
              .filter((id): id is string => !!id)
          )
        )

        // Busca os roles de todos os perfis únicos em paralelo
        const perfisMapTemp: Record<string, string> = {}
        if (perfilPdvIds.length > 0) {
          await Promise.all(
            perfilPdvIds.map(async (perfilId) => {
              try {
                const perfilResponse = await fetch(`/api/perfis-pdv/${perfilId}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                })

                if (perfilResponse.ok) {
                  const perfilData = await perfilResponse.json()
                  perfisMapTemp[perfilId] = perfilData.role || '-'
                } else {
                  perfisMapTemp[perfilId] = '-'
                }
              } catch (error) {
                console.error(`Erro ao buscar perfil PDV ${perfilId}:`, error)
                perfisMapTemp[perfilId] = '-'
              }
            })
          )
        }

        // Atualiza o estado com todos os itens carregados e o mapa de perfis
        setUsuarios(allUsuarios)
        setTotalUsuarios(totalCount)
        setPerfisMap(perfisMapTemp)
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        setUsuarios([])
        setTotalUsuarios(0)
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
  )

  // Debounce da busca (500ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchText)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText])

  // Carrega usuários quando busca ou filtro mudam
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadAllUsuarios()
  }, [debouncedSearch, filterStatus, auth, loadAllUsuarios])

  // Carrega usuários iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadAllUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadAllUsuarios()
    onReload?.()
  }

  const openTabsModal = useCallback((config: Partial<UsuariosTabsModalState> = {}) => {
    setTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'usuario',
      mode: config.mode ?? 'create',
      usuarioId: config.usuarioId,
    }))
  }, [])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      usuarioId: undefined,
    }))
  }, [])

  const handleTabsModalReload = useCallback(() => {
    loadPerfisPDV() // Recarrega perfis para garantir que novos perfis apareçam
    loadAllUsuarios()
    onReload?.()
  }, [loadPerfisPDV, loadAllUsuarios, onReload])

  const handleTabsModalTabChange = useCallback((tab: 'usuario') => {
    setTabsModalState((prev) => ({
      ...prev,
      tab,
    }))
  }, [])

  /**
   * Atualiza o perfil do usuário diretamente na lista
   */
  const handlePerfilChange = useCallback(
    async (usuario: Usuario, novoPerfilId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const usuarioId = usuario.getId()
      const perfilAtualId = usuario.getPerfilPdvId()
      
      // Se não mudou, não faz nada
      if (novoPerfilId === perfilAtualId) {
        return
      }

      const previousUsuarios = usuarios

      setUpdatingPerfil((prev) => ({ ...prev, [usuarioId]: true }))
      // Atualização otimista
      setUsuarios((prev) =>
        prev.map((item) => {
          if (item.getId() === usuarioId) {
            // Cria uma nova instância do Usuario com o perfil atualizado
            return Usuario.fromJSON({
              ...item.toJSON(),
              perfilPdvId: novoPerfilId,
            })
          }
          return item
        })
      )

      // Atualiza o mapa de perfis se necessário
      const novoPerfil = allPerfisPDV.find((p) => p.id === novoPerfilId)
      if (novoPerfil) {
        setPerfisMap((prev) => ({
          ...prev,
          [novoPerfilId]: novoPerfil.role,
        }))
      }

      try {
        const response = await fetch(`/api/usuarios/${usuarioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ perfilPdvId: novoPerfilId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Erro ao atualizar perfil do usuário')
        }

        showToast.success('Perfil atualizado com sucesso!')
        await loadAllUsuarios()
        onReload?.()
      } catch (error: any) {
        console.error('Erro ao atualizar perfil do usuário:', error)
        showToast.error(error.message || 'Erro ao atualizar perfil do usuário')
        // Reverte a atualização otimista em caso de erro
        setUsuarios([...previousUsuarios])
      } finally {
        setUpdatingPerfil((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, usuarios, allPerfisPDV, loadAllUsuarios, onReload]
  )

  /**
   * Atualiza o status do usuário diretamente na lista
   */
  const handleToggleUsuarioStatus = useCallback(
    async (usuario: Usuario, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const usuarioId = usuario.getId()
      const previousUsuarios = usuarios

      setTogglingStatus((prev) => ({ ...prev, [usuarioId]: true }))
      // Atualização otimista
      setUsuarios((prev) =>
        prev.map((item) => {
          if (item.getId() === usuarioId) {
            // Cria uma nova instância do Usuario com o status atualizado
            return Usuario.fromJSON({
              ...item.toJSON(),
              ativo: novoStatus,
            })
          }
          return item
        })
      )

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
        await loadAllUsuarios()
        onReload?.()
      } catch (error: any) {
        console.error('Erro ao atualizar status do usuário:', error)
        showToast.error(error.message || 'Erro ao atualizar status do usuário')
        // Reverte a atualização otimista em caso de erro
        setUsuarios([...previousUsuarios])
      } finally {
        setTogglingStatus((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, usuarios, loadAllUsuarios, onReload]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-lg font-semibold font-nunito">
              Usuários Cadastrados
            </p>
            <p className="text-tertiary text-[22px] font-medium font-nunito">
              Total {usuarios.length} de {totalUsuarios}
            </p>
          </div>
          <button
            onClick={() => {
              openTabsModal({
                mode: 'create',
                usuarioId: undefined,
              })
            }}
            className="h-8 px-[30px] bg-primary text-info rounded-lg font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      <div className="h-[4px] border-t-2 border-primary/70"></div>
      <div className="flex gap-3 px-[20px] py-2">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
            <label
              htmlFor="complementos-search"
              className="text-xs font-semibold text-secondary-text mb-1 block"
            >
              Buscar Usuário...
            </label>
            <div className="relative h-8">
              <MdSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
                size={18}
              />
              <input
                id="complementos-search"
                type="text"
                placeholder="Pesquisar usuário..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
              />
            </div>
          </div>

          <div className="w-full sm:w-[160px]">
            <label className="text-xs font-semibold text-secondary-text mb-1 block">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'Todos' | 'Ativo' | 'Desativado')
              }
              className="w-full h-8 px-5 rounded-lg border border-gray-200 bg-info text-primary-text focus:outline-none focus:border-primary text-sm font-nunito"
            >
              <option value="Todos">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Desativado">Desativado</option>
            </select>
          </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Telefone
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Perfil
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de usuários com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {usuarios.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum usuário encontrado.</p>
          </div>
        )}

        {usuarios.map((usuario) => (
          <div
            key={usuario.getId()}
            className="bg-info rounded-lg mb-2 shadow-sm shadow-primary-text/50 hover:bg-primary/10 transition-colors"
          >
            <div className="h-[50px] px-4 flex items-center gap-[10px]">
              <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text flex items-center gap-2">
                {usuario.getNome()}
                <button
                  type="button"
                  onClick={() => openTabsModal({ mode: 'edit', usuarioId: usuario.getId() })}
                  className="w-5 h-5 rounded-full border border-primary/70 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                  title="Editar usuário"
                >
                  <MdEdit size={14} />
                </button>
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {usuario.getTelefone() || '-'}
              </div>
              <div className="flex-[2]">
                {isLoadingPerfis ? (
                  <div className="text-secondary-text text-sm">Carregando...</div>
                ) : (
                  <select
                    value={usuario.getPerfilPdvId() || ''}
                    onChange={(e) => handlePerfilChange(usuario, e.target.value)}
                    disabled={!!updatingPerfil[usuario.getId()]}
                    className={`w-full px-2 py-1 rounded-lg border border-gray-300 bg-info text-sm text-primary-text focus:outline-none focus:border-primary ${
                      updatingPerfil[usuario.getId()]
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:border-primary'
                    }`}
                  >
                    {(() => {
                      const perfilAtualId = usuario.getPerfilPdvId()
                      const perfilAtual = perfilAtualId
                        ? allPerfisPDV.find((p) => p.id === perfilAtualId)
                        : null
                      
                      // Filtra perfis para remover o perfil atual da lista
                      const outrosPerfis = allPerfisPDV.filter((p) => p.id !== perfilAtualId)
                      
                      return (
                        <>
                          {perfilAtual && (
                            <option value={perfilAtual.id} key={perfilAtual.id}>
                              {perfilAtual.role}
                            </option>
                          )}
                          {outrosPerfis.map((perfil) => (
                            <option value={perfil.id} key={perfil.id}>
                              {perfil.role}
                            </option>
                          ))}
                          {!perfilAtual && (
                            <option value="">Selecione um perfil...</option>
                          )}
                        </>
                      )
                    })()}
                  </select>
                )}
              </div>
              <div className="flex-[2] flex justify-center">
                <label
                  className={`relative inline-flex h-5 w-12 items-center ${
                    togglingStatus[usuario.getId()]
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  title={usuario.isAtivo() ? 'Usuário Ativo' : 'Usuário Desativado'}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={usuario.isAtivo()}
                    onChange={(event) =>
                      handleToggleUsuarioStatus(usuario, event.target.checked)
                    }
                    disabled={!!togglingStatus[usuario.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute left-[2px] top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[28px]" />
                </label>
              </div>
              <div className="flex-[2] flex justify-end">
                <UsuarioActionsMenu
                  usuarioId={usuario.getId()}
                  usuarioAtivo={usuario.isAtivo()}
                  onStatusChanged={handleStatusChange}
                  onDeleted={handleStatusChange}
                  onEdit={() => {
                    openTabsModal({
                      mode: 'edit',
                      usuarioId: usuario.getId(),
                    })
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <UsuariosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />
    </div>
  )
}


