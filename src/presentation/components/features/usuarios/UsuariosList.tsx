'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Usuario } from '@/src/domain/entities/Usuario'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { MdSearch, MdDelete } from 'react-icons/md'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/presentation/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/src/presentation/components/ui/dialog'
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
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [usuarioToDelete, setUsuarioToDelete] = useState<string | null>(null)
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
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

  // Carregar todos os perfis PDV fazendo requisições sequenciais
  // Continua carregando páginas de 10 em 10 até não haver mais itens
  const loadPerfisPDV = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingPerfis(true)
    try {
      const allPerfis: Array<{ id: string; role: string }> = []
      let currentOffset = 0
      let hasMore = true

      // Loop para carregar todas as páginas
      while (hasMore) {
        const params = new URLSearchParams({
          limit: '10',
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/perfis-pdv?${params.toString()}`, {
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
        // A API pode retornar { items: [...] } ou diretamente um array
        const items = Array.isArray(data) ? data : (data.items || [])
        const newPerfis = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            role: item.role?.toString() || '',
          }))
          .filter((perfil: { id: string; role: string }) => perfil.id && perfil.role) // Filtra perfis inválidos

        allPerfis.push(...newPerfis)

        // Verifica se há mais páginas
        // Se retornou menos de 10 itens, não há mais páginas
        hasMore = newPerfis.length === 10
        currentOffset += newPerfis.length
      }

      setAllPerfisPDV(allPerfis)
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

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalUsuarioOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeTabsModal = useCallback(() => {
    setTabsModalState((prev) => ({
      ...prev,
      open: false,
      usuarioId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalUsuarioOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadPerfisPDV() // Recarrega perfis para garantir que novos perfis apareçam
    loadAllUsuarios() // Recarrega a lista de usuários
    onReload?.()
  }, [router, searchParams, pathname, loadPerfisPDV, loadAllUsuarios, onReload])

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

  /**
   * Abre o modal de confirmação de exclusão
   */
  const handleDeleteClick = useCallback((usuarioId: string) => {
    setUsuarioToDelete(usuarioId)
    setIsConfirmDeleteOpen(true)
  }, [])

  /**
   * Confirma e executa a exclusão do usuário
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!usuarioToDelete) return

    setIsDeleting(true)

    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/usuarios/${usuarioToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        // Tenta obter mensagem de erro se houver corpo na resposta
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao deletar usuário')
      }

      setIsConfirmDeleteOpen(false)
      setUsuarioToDelete(null)
      showToast.success('Usuário deletado com sucesso!')
      await loadAllUsuarios()
      onReload?.()
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      showToast.error(
        error instanceof Error ? error.message : 'Erro ao deletar usuário'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [usuarioToDelete, auth, loadAllUsuarios, onReload])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="md:px-[30px] px-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="w-1/2 md:pl-5">
            <p className="text-primary md:text-lg text-sm font-semibold font-nunito">
              Usuários Cadastrados
            </p>
            <p className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
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

      <div className="h-[4px] border-t-2 border-primary/70 flex-shrink-0"></div>
      <div className="flex gap-3 md:px-[20px] px-1 pb-2 flex-shrink-0">
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
      <div className="md:px-[30px] mt-0 flex-shrink-0">
        <div className="h-10 bg-custom-2 rounded-lg md:px-4 px-1 flex items-center md:gap-[10px] gap-1">
          <div className="md:flex-[3] flex-[2] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Nome
          </div>
          <div className="md:flex-[2] flex-[1] font-nunito font-semibold md:text-sm text-xs text-primary-text hidden md:flex">
            Telefone
          </div>
          <div className="md:flex-[2] flex-[1] font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Perfil
          </div>
          <div className="md:flex-[2] flex-[1] md:text-center text-right font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Status
          </div>
          <div className="md:flex-[2] flex-[1] md:text-center text-right font-nunito font-semibold md:text-sm text-xs text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de usuários com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 mt-2 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 300px)' }}
      >
        {/* Mostrar loading quando está carregando ou ainda não houve tentativa de carregamento */}
        {(isLoading || !hasLoadedInitialRef.current) && usuarios.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <img
              src="/images/jiffy-loading.gif"
              alt="Carregando..."
              className="w-20 h-20"
            />
            <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
          </div>
        )}

        {/* Só exibir mensagem de "nenhum usuário" quando realmente não há usuários e já houve tentativa de carregamento */}
        {usuarios.length === 0 && !isLoading && hasLoadedInitialRef.current && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum usuário encontrado.</p>
          </div>
        )}

        {usuarios.map((usuario, index) => {
          // Handler para abrir edição ao clicar na linha
          const handleRowClick = () => {
            openTabsModal({ mode: 'edit', usuarioId: usuario.getId() })
          }

          // Intercala cores de fundo: cinza-50 para pares, branco para ímpares
          const isZebraEven = index % 2 === 0
          const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'

          return (
          <div
            key={usuario.getId()}
            onClick={handleRowClick}
            className={`${bgClass} rounded-lg mb-2 hover:bg-primary/10 transition-colors cursor-pointer`}
          >
            <div className="h-[50px] md:px-4 flex items-center md:gap-[10px] gap-1">
              <div className="md:flex-[3] flex-[2] font-nunito font-semibold md:text-sm text-[10px] text-primary-text flex items-center gap-2">
                {usuario.getNome()}
              </div>
              <div className="md:flex-[2] flex-[1] font-nunito md:text-sm text-[10px] text-secondary-text hidden md:flex">
                {usuario.getTelefone() || '-'}
              </div>
              <div className="md:flex-[2] flex-[1]" onClick={(e) => e.stopPropagation()}>
                {isLoadingPerfis ? (
                  <div className="text-secondary-text md:text-sm text-[10px]">Carregando...</div>
                ) : (
                  <Select
                    value={usuario.getPerfilPdvId() || undefined}
                    onValueChange={(value) => handlePerfilChange(usuario, value)}
                    disabled={!!updatingPerfil[usuario.getId()]}
                  >
                    <SelectTrigger
                      className={`w-full px-2 md:py-1 h-auto rounded-lg border border-gray-300 bg-info md:text-sm text-[10px] text-primary-text focus:outline-none focus:border-primary ${
                        updatingPerfil[usuario.getId()]
                          ? 'opacity-60 cursor-not-allowed'
                          : 'cursor-pointer hover:border-primary'
                      }`}
                    >
                      <SelectValue placeholder="Selecione um perfil..." />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-[200px] z-[9999] overflow-y-auto !bg-info border border-gray-300 shadow-lg"
                      style={{ backgroundColor: '#FFFFFF' }}
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
                              <SelectItem
                                key={perfilAtual.id}
                                value={perfilAtual.id}
                                className="md:min-h-[32px] min-h-[28px] md:max-h-[40px] max-h-[36px] data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors"
                              >
                                {perfilAtual.role}
                              </SelectItem>
                            )}
                            {outrosPerfis.map((perfil) => (
                              <SelectItem
                                key={perfil.id}
                                value={perfil.id}
                                className="md:min-h-[32px] min-h-[28px] md:max-h-[40px] max-h-[36px] data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary transition-colors"
                              >
                                {perfil.role}
                              </SelectItem>
                            ))}
                            {!perfilAtual && allPerfisPDV.length === 0 && (
                              <div className="px-2 py-1.5 md:text-sm text-[10px] text-secondary-text">
                                Nenhum perfil disponível
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="md:flex-[2] flex-[1] flex md:justify-center justify-end" onClick={(e) => e.stopPropagation()}>
                <label
                  className={`relative inline-flex md:h-5 h-4 md:w-12 w-8 items-center ${
                    togglingStatus[usuario.getId()]
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer'
                  }`}
                  title={usuario.isAtivo() ? 'Usuário Ativo' : 'Usuário Desativado'}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={usuario.isAtivo()}
                    onChange={(event) => {
                      event.stopPropagation()
                      handleToggleUsuarioStatus(usuario, event.target.checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!!togglingStatus[usuario.getId()]}
                  />
                  <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                  <span className="absolute md:left-[2px] left-0.5 top-1/2 block md:h-4 h-2.5 md:w-4 w-2.5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 md:peer-checked:translate-x-[28px] peer-checked:translate-x-[18px]" />
                </label>
              </div>
              <div className="md:flex-[2] flex-[1] flex md:justify-center justify-end" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(usuario.getId())
                  }}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-error hover:bg-error/10 transition-colors"
                  title="Deletar usuário"
                >
                  <MdDelete size={20} />
                </button>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <UsuariosTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onReload={handleTabsModalReload}
        onTabChange={handleTabsModalTabChange}
      />

      {/* Modal de confirmação de exclusão */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-primary-text">
              Confirmar exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-primary-text">
              Tem certeza que deseja deletar este usuário?
            </p>
            <p className="text-sm text-secondary-text mt-2">
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsConfirmDeleteOpen(false)
                setUsuarioToDelete(null)
              }}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg border border-gray-300 text-primary-text hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="h-10 px-6 rounded-lg bg-error text-white font-semibold hover:bg-error/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


