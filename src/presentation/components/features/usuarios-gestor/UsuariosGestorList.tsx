'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UsuarioGestor } from '@/src/domain/entities/UsuarioGestor'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch } from 'react-icons/md'
import {
  UsuariosGestorTabsModal,
  UsuariosGestorTabsModalState,
} from './UsuariosGestorTabsModal'

interface UsuariosGestorListProps {
  onReload?: () => void
}

/**
 * Lista de usuários gestor carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 */
export function UsuariosGestorList({ onReload }: UsuariosGestorListProps) {
  const [usuarios, setUsuarios] = useState<UsuarioGestor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [perfisMap, setPerfisMap] = useState<Record<string, string>>({}) // Mapa de perfilGestorId -> role
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<UsuariosGestorTabsModalState>({
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

  // Atualiza ref quando o valor muda
  useEffect(() => {
    searchTextRef.current = debouncedSearch
  }, [debouncedSearch])

  /**
   * Carrega todos os usuários gestor fazendo requisições sequenciais
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
        const allUsuarios: UsuarioGestor[] = []
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

          const response = await fetch(`/api/pessoas/usuarios-gestor?${params.toString()}`, {
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
          const items = data.items || []

          const newUsuarios = items
            .map((item: any) => {
              try {
                const usuario = UsuarioGestor.fromJSON(item)
                return usuario
              } catch (error) {
                // Item inválido será ignorado
                return null
              }
            })
            .filter((usuario: UsuarioGestor | null): usuario is UsuarioGestor => usuario !== null)
          allUsuarios.push(...newUsuarios)

          // Atualiza o total apenas na primeira requisição
          if (currentOffset === 0) {
            totalCount = data.count || 0
          }

          // Verifica se há mais páginas
          // Usa hasNext da API se disponível, senão verifica se retornou 10 itens
          hasMore = data.hasNext !== undefined ? data.hasNext : newUsuarios.length === 10
          currentOffset += newUsuarios.length
        }

        // Coleta todos os perfilGestorId únicos
        const perfilGestorIds = Array.from(
          new Set(
            allUsuarios
              .map((u) => u.getPerfilGestorId())
              .filter((id): id is string => !!id)
          )
        )

        // Busca os roles de todos os perfis únicos em paralelo
        const perfisMapTemp: Record<string, string> = {}
        if (perfilGestorIds.length > 0) {
          await Promise.all(
            perfilGestorIds.map(async (perfilId) => {
              try {
                const perfilResponse = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
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
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar usuários gestor'
        showToast.error(errorMessage)
        setUsuarios([])
        setTotalUsuarios(0)
        setPerfisMap({})
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

  // Carrega usuários quando busca muda
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }
    
    loadAllUsuarios()
  }, [debouncedSearch, auth, loadAllUsuarios])

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

  const openTabsModal = useCallback((config: Partial<UsuariosGestorTabsModalState> = {}) => {
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
    loadAllUsuarios() // Recarrega a lista de usuários
    onReload?.()
  }, [router, searchParams, pathname, loadAllUsuarios, onReload])

  const handleTabChange = useCallback((tab: 'usuario') => {
    setTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  /**
   * Atualiza o status do usuário diretamente na lista
   */
  const handleToggleUsuarioStatus = useCallback(
    async (usuarioId: string, novoStatus: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setTogglingStatus((prev) => ({ ...prev, [usuarioId]: true }))

      // Atualização otimista
      setUsuarios((prev) =>
        prev.map((u) =>
          u.getId() === usuarioId
            ? UsuarioGestor.fromJSON({ ...u.toJSON(), ativo: novoStatus })
            : u
        )
      )

      try {
        const usuario = usuarios.find((u) => u.getId() === usuarioId)
        if (!usuario) {
          throw new Error('Usuário não encontrado')
        }

        // Envia apenas os campos necessários para atualizar o status
        // Remove campos que não devem ser enviados ou que a API não espera
        const bodyData: any = {
          ativo: novoStatus,
        }

        // Adiciona apenas campos essenciais se necessário
        const perfilGestorId = usuario.getPerfilGestorId()
        if (perfilGestorId) {
          bodyData.perfilGestorId = perfilGestorId
        }

        const response = await fetch(`/api/pessoas/usuarios-gestor/${usuarioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar usuário')
        }

        const updatedData = await response.json()

        // Atualiza com os dados do servidor
        setUsuarios((prev) =>
          prev.map((u) =>
            u.getId() === usuarioId ? UsuarioGestor.fromJSON(updatedData) : u
          )
        )

        showToast.success(
          novoStatus ? 'Usuário ativado com sucesso!' : 'Usuário desativado com sucesso!'
        )
      } catch (error: any) {
        showToast.error(error.message || 'Erro ao atualizar status do usuário')

        // Reverte a atualização otimista em caso de erro
        loadAllUsuarios()
      } finally {
        setTogglingStatus((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, usuarios, loadAllUsuarios]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="md:px-[30px] px-1 pt-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex flex-col w-1/2 md:pl-5">
            <span className="text-primary md:text-lg text-sm font-semibold font-nunito">
              Usuários Gestor Cadastrados
            </span>
            <span className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
              Total {usuarios.length} de {totalUsuarios}
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
      <div className="flex gap-3 md:px-[20px] px-1 pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <label
            htmlFor="usuarios-gestor-search"
            className="text-xs font-semibold text-secondary-text mb-1 block"
          >
            Buscar Usuário Gestor...
          </label>
          <div className="relative h-8">
            <MdSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              id="usuarios-gestor-search"
              type="text"
              placeholder="Pesquisar usuário gestor..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
            />
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela - Apenas Desktop */}
      {usuarios.length > 0 && (
        <div className="hidden md:block md:px-[30px] px-1 flex-shrink-0">
          <div className="h-10 bg-custom-2 rounded-lg md:px-4 pr-1 flex items-center gap-2">
            <div className="md:flex-[2] font-nunito font-semibold text-left md:text-sm text-primary-text uppercase">
              Nome
            </div>
            <div className="md:flex-[1.5] font-nunito font-semibold text-left md:text-sm text-primary-text uppercase">
              E-mail
            </div>
            <div className="md:flex-[1.5] font-nunito font-semibold text-left md:text-sm text-primary-text uppercase">
              Perfil
            </div>
            <div className="md:flex-[1] font-nunito font-semibold text-center md:text-sm text-primary-text uppercase">
              Status
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuários com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
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
            <p className="text-secondary-text">Nenhum usuário gestor encontrado.</p>
          </div>
        )}

        {usuarios.map((usuario, index) => {
            // Handler para abrir edição ao clicar na linha do usuário
            const handleUsuarioRowClick = () => {
              openTabsModal({ mode: 'edit', usuarioId: usuario.getId() })
            }

            // Intercala cores de fundo: cinza-50 para pares, branco para ímpares
            const isZebraEven = index % 2 === 0
            const bgClass = isZebraEven ? 'bg-gray-50' : 'bg-white'
            const perfilNome = usuario.getPerfilGestorId()
              ? perfisMap[usuario.getPerfilGestorId()!] || usuario.getPerfilGestor()?.role || '-'
              : '-'

          // Componente reutilizável para switch de status
          const StatusSwitch = () => (
            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
              <label
                className={`relative inline-flex h-4 w-10 md:h-5 md:w-12 items-center ${
                  togglingStatus[usuario.getId()]
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
                title={usuario.isAtivo() ? 'Usuário Ativo' : 'Usuário Desativado'}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={usuario.isAtivo()}
                  onChange={(event) => {
                    event.stopPropagation()
                    handleToggleUsuarioStatus(usuario.getId(), event.target.checked)
                  }}
                  disabled={!!togglingStatus[usuario.getId()]}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
                <span className="absolute left-[2px] top-1/2 block h-[14px] w-[14px] md:h-4 md:w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[18px] md:peer-checked:translate-x-[28px]" />
              </label>
            </div>
          )

          return (
            <div
              key={usuario.getId()}
              className={`${bgClass} rounded-lg my-2 overflow-visible hover:bg-primary/10 transition-colors`}
            >
              {/* Layout Desktop - Tabela horizontal */}
              <div 
                onClick={handleUsuarioRowClick}
                className="hidden md:flex h-[50px] md:px-4 items-center md:gap-[10px] relative overflow-visible cursor-pointer"
              >
                <div className="md:flex-[2] font-nunito font-semibold text-left md:text-sm text-primary-text">
                  {usuario.getNome()}
                </div>
                <div className="md:flex-[1.5] font-nunito md:text-sm text-secondary-text">
                  {usuario.getUsername()}
                </div>
                <div className="md:flex-[1.5] font-nunito md:text-sm text-secondary-text">
                  {perfilNome}
                </div>
                <div className="md:flex-[1] flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <StatusSwitch />
                </div>
              </div>

              {/* Layout Mobile - Vertical */}
              <div 
                onClick={handleUsuarioRowClick}
                className="md:hidden py-3 px-1 cursor-pointer"
              >
                {/* Cabeçalho com Usuário e Nome */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base font-semibold text-secondary-text">Usuário:</span>
                  <span className="font-nunito font-semibold text-base text-primary-text">
                    {usuario.getNome()}
                  </span>
                </div>

                {/* Labels dos campos */}
                <div className="flex items-center mb-2 px-1 gap-2">
                  <span className="text-[11px] font-bold text-secondary-text flex-[2] text-left">E-Mail</span>
                  <span className="text-[11px] font-bold text-secondary-text flex-1.5 text-left">Perfil</span>
                  <span className="text-[11px] font-bold text-secondary-text flex-1 w-12 text-right">Status</span>
                </div>

                {/* Valores dos campos */}
                <div className="flex items-center px-1 gap-2">
                  <div className="flex-[2] text-left min-w-0">
                    <span className="text-xs text-secondary-text font-nunito break-words">
                      {usuario.getUsername()}
                    </span>
                  </div>
                  <div className="flex-1.5 text-left min-w-0">
                    <span className="text-xs text-secondary-text font-nunito break-words">
                      {perfilNome}
                    </span>
                  </div>
                  <div className="w-12 flex flex-1 justify-end flex-shrink-0">
                    <StatusSwitch />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <UsuariosGestorTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabChange}
        onReload={handleStatusChange}
      />
    </div>
  )
}
