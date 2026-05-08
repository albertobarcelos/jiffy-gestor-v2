'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { UsuarioGestor } from '@/src/domain/entities/UsuarioGestor'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch } from 'react-icons/md'
import { Select, MenuItem, FormControl } from '@mui/material'
import {
  UsuariosGestorTabsModal,
  UsuariosGestorTabsModalState,
} from './UsuariosGestorTabsModal'
import {
  UsuarioGestaoRow,
  USUARIO_GESTAO_GRID_DESKTOP,
} from './components/UsuarioGestaoRow'

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
  const [allPerfis, setAllPerfis] = useState<Array<{ id: string; role: string }>>([]) // Lista de todos os perfis disponíveis
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [updatingPerfil, setUpdatingPerfil] = useState<Record<string, boolean>>({})
  const [tabsModalState, setTabsModalState] = useState<UsuariosGestorTabsModalState>({
    open: false,
    tab: 'usuario',
    mode: 'create',
    usuarioId: undefined,
  })
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
   * Carrega todos os perfis gestor disponíveis
   */
  const loadAllPerfis = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      return
    }

    try {
      const allPerfisList: Array<{ id: string; role: string }> = []
      let currentOffset = 0
      let hasMore = true
      let maxIterations = 100 // Proteção contra loop infinito
      let iterations = 0

      while (hasMore && iterations < maxIterations) {
        iterations++
        const params = new URLSearchParams({
          limit: '10',
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/pessoas/perfis-gestor?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          break
        }

        const data = await response.json()
        const items = data.items || []

        if (items.length === 0) {
          hasMore = false
          break
        }

        const newPerfis = items
          .map((item: any) => ({
            id: item.id?.toString() || '',
            role: item.role?.toString() || '',
          }))
          .filter((perfil: { id: string; role: string }) => perfil.id && perfil.role)

        allPerfisList.push(...newPerfis)

        hasMore = data.hasNext !== undefined ? data.hasNext : newPerfis.length === 10
        currentOffset += newPerfis.length
      }

      setAllPerfis(allPerfisList)
    } catch (error) {
      console.error('Erro ao carregar perfis gestor:', error)
    }
  }, [auth])

  // Carrega todos os perfis quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadAllPerfis()
    }
  }, [isAuthenticated, loadAllPerfis])

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
   * Atualiza o perfil do usuário diretamente na lista
   */
  const handlePerfilChange = useCallback(
    async (usuarioId: string, novoPerfilId: string) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      setUpdatingPerfil((prev) => ({ ...prev, [usuarioId]: true }))

      // Atualização otimista
      const usuario = usuarios.find((u) => u.getId() === usuarioId)
      if (!usuario) {
        setUpdatingPerfil((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
        return
      }

      const perfilNome = allPerfis.find((p) => p.id === novoPerfilId)?.role || '-'
      setPerfisMap((prev) => ({ ...prev, [novoPerfilId]: perfilNome }))

      setUsuarios((prev) =>
        prev.map((u) =>
          u.getId() === usuarioId
            ? UsuarioGestor.fromJSON({ ...u.toJSON(), perfilGestorId: novoPerfilId })
            : u
        )
      )

      try {
        const bodyData: any = {
          perfilGestorId: novoPerfilId,
        }

        // Mantém o status atual
        if (usuario.isAtivo() !== undefined) {
          bodyData.ativo = usuario.isAtivo()
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
          throw new Error(errorData.error || 'Erro ao atualizar perfil do usuário')
        }

        const updatedData = await response.json()

        // Atualiza com os dados do servidor
        setUsuarios((prev) =>
          prev.map((u) =>
            u.getId() === usuarioId ? UsuarioGestor.fromJSON(updatedData) : u
          )
        )

        // Atualiza o mapa de perfis
        if (updatedData.perfilGestorId) {
          const updatedPerfilNome = allPerfis.find((p) => p.id === updatedData.perfilGestorId)?.role || '-'
          setPerfisMap((prev) => ({ ...prev, [updatedData.perfilGestorId]: updatedPerfilNome }))
        }

        showToast.success('Perfil atualizado com sucesso!')
      } catch (error: any) {
        showToast.error(error.message || 'Erro ao atualizar perfil do usuário')

        // Reverte a atualização otimista em caso de erro
        loadAllUsuarios()
      } finally {
        setUpdatingPerfil((prev) => {
          const { [usuarioId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [auth, usuarios, allPerfis, loadAllUsuarios]
  )

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

  if ((isLoading || !hasLoadedInitialRef.current) && usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <JiffyLoading />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <div className="flex flex-shrink-0 flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-nunito text-sm text-secondary-text">
            <span className="font-semibold text-primary-text">{usuarios.length}</span> de{' '}
            {totalUsuarios} usuários
          </p>
          <button
            type="button"
            onClick={() => openTabsModal({ mode: 'create' })}
            className="flex h-8 flex-shrink-0 items-center gap-2 rounded-lg bg-primary px-[30px] font-exo text-sm font-semibold text-info transition-colors hover:bg-primary/90"
          >
            Novo
            <span className="text-lg leading-none">+</span>
          </button>
        </div>

        <div className="relative h-8 min-w-[180px] max-w-[360px] flex-1">
          <MdSearch className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-secondary-text" />
          <input
            id="usuarios-gestor-search"
            type="search"
            placeholder="Buscar por nome ou e-mail…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="h-full w-full rounded-lg border border-gray-200 bg-info pl-11 pr-4 font-nunito text-sm text-primary-text placeholder:text-secondary-text focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {usuarios.length === 0 && !isLoading && hasLoadedInitialRef.current ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="font-nunito text-sm text-secondary-text">
            Nenhum usuário gestor encontrado.
          </p>
        </div>
      ) : usuarios.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="hidden min-w-0 flex-shrink-0 md:block">
            <div
              className={`${USUARIO_GESTAO_GRID_DESKTOP} h-11 w-full flex-shrink-0 border-b border-gray-200 bg-gray-50 px-3 pr-2 md:px-4`}
            >
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary-text md:text-sm">
                Nome
              </div>
              <div className="min-w-0 truncate text-left font-nunito text-xs font-semibold text-secondary-text md:text-sm">
                E-mail
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-xs font-semibold text-secondary-text md:text-sm">
                Perfil
              </div>
              <div className="min-w-0 truncate text-center font-nunito text-xs font-semibold text-secondary-text md:text-sm">
                Status
              </div>
            </div>
          </div>

          <div className="min-w-0 max-w-full divide-y divide-gray-100 scrollbar-hide">
            {usuarios.map(usuario => {
              const perfilNome = usuario.getPerfilGestorId()
                ? perfisMap[usuario.getPerfilGestorId()!] ||
                  usuario.getPerfilGestor()?.role ||
                  '-'
                : '-'

              return (
                <UsuarioGestaoRow
                  key={usuario.getId()}
                  usuario={usuario}
                  perfilNome={perfilNome}
                  allPerfis={allPerfis}
                  updatingPerfil={!!updatingPerfil[usuario.getId()]}
                  togglingStatus={!!togglingStatus[usuario.getId()]}
                  onRowClick={() => openTabsModal({ mode: 'edit', usuarioId: usuario.getId() })}
                  onPerfilChange={handlePerfilChange}
                  onToggleStatus={handleToggleUsuarioStatus}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      <UsuariosGestorTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabChange}
        onReload={handleStatusChange}
      />
    </div>
  )
}
