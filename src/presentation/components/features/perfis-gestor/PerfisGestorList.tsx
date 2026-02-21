'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PerfilGestor } from '@/src/domain/entities/PerfilGestor'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch, MdPersonAdd, MdKeyboardArrowRight, MdPerson, MdEdit } from 'react-icons/md'
import {
  PerfisGestorTabsModal,
  PerfisGestorTabsModalState,
} from './PerfisGestorTabsModal'
import {
  UsuariosGestorTabsModal,
  UsuariosGestorTabsModalState,
} from '../usuarios-gestor/UsuariosGestorTabsModal'

interface PerfisGestorListProps {
  onReload?: () => void
}

/**
 * Lista de perfis gestor carregando todos os itens de uma vez
 * Faz requisições sequenciais de 10 em 10 até carregar tudo
 * Replica exatamente o design e lógica do Flutter
 */
export function PerfisGestorList({ onReload }: PerfisGestorListProps) {
  const [perfis, setPerfis] = useState<PerfilGestor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [totalPerfis, setTotalPerfis] = useState(0)
  const [expandedPerfis, setExpandedPerfis] = useState<Set<string>>(new Set())
  const [usuariosPorPerfil, setUsuariosPorPerfil] = useState<Record<string, any[]>>({})
  const [contagemUsuariosPorPerfil, setContagemUsuariosPorPerfil] = useState<Record<string, number>>({})
  const [togglingStatus, setTogglingStatus] = useState<Record<string, boolean>>({})
  const [updatingPermissions, setUpdatingPermissions] = useState<Record<string, Set<string>>>({})
  const [tabsModalState, setTabsModalState] = useState<PerfisGestorTabsModalState>({
    open: false,
    tab: 'perfil',
    mode: 'create',
    perfilId: undefined,
  })
  const [usuariosTabsModalState, setUsuariosTabsModalState] = useState<UsuariosGestorTabsModalState>({
    open: false,
    tab: 'usuario',
    mode: 'create',
    usuarioId: undefined,
    initialPerfilGestorId: undefined,
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
   * Carrega a contagem de usuários gestor para cada perfil
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
              // Busca todos os usuários do perfil (com limit alto) para contar corretamente
              const response = await fetch(`/api/pessoas/usuarios-gestor?perfilGestorId=${perfilId}&limit=100&offset=0`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })

              if (response.ok) {
                const data = await response.json()
                const items = data.items || []
                
                // Filtra no frontend para garantir que só conta usuários deste perfil específico
                const usuariosFiltrados = items.filter((usuario: any) => {
                  const usuarioPerfilId = usuario.perfilGestorId?.toString() || usuario.perfilGestor?.id?.toString() || ''
                  return usuarioPerfilId === perfilId.toString()
                })
                
                // Remove duplicatas baseado no ID do usuário
                const usuariosUnicos = usuariosFiltrados.reduce((acc: any[], usuario: any) => {
                  const existe = acc.find((u: any) => u.id?.toString() === usuario.id?.toString())
                  if (!existe) {
                    acc.push(usuario)
                  }
                  return acc
                }, [])
                
                return { perfilId, count: usuariosUnicos.length }
              }
              return { perfilId, count: 0 }
            } catch (error) {
              console.error(`Erro ao buscar contagem de usuários gestor para perfil ${perfilId}:`, error)
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
        console.error('Erro ao carregar contagem de usuários gestor:', error)
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
        const allPerfis: PerfilGestor[] = []
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

          const response = await fetch(`/api/pessoas/perfis-gestor?${params.toString()}`, {
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
            PerfilGestor.fromJSON(item)
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
        console.error('Erro ao carregar perfis gestor:', error)
        showToast.error('Erro ao carregar perfis gestor')
      } finally {
        setIsLoading(false)
      }
    },
    [auth]
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

  const loadUsuariosPorPerfil = useCallback(
    async (perfilId: string) => {
      const token = auth?.getAccessToken()
      if (!token || usuariosPorPerfil[perfilId]) return

      try {
        const response = await fetch(`/api/pessoas/usuarios-gestor?perfilGestorId=${perfilId}&limit=100&offset=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          
          // Filtra no frontend também como garantia (caso a API não filtre corretamente)
          const usuariosFiltrados = items.filter((usuario: any) => {
            // Verifica se o usuário tem o perfilGestorId correspondente
            // Pode estar em diferentes formatos: perfilGestorId, perfilGestor.id, perfilGestorId (string ou number)
            const usuarioPerfilId = usuario.perfilGestorId?.toString() || usuario.perfilGestor?.id?.toString() || ''
            return usuarioPerfilId === perfilId.toString()
          })
          
          console.log(`🔍 [PerfisGestorList] Perfil ${perfilId}: ${items.length} usuários retornados, ${usuariosFiltrados.length} filtrados`)
          
          setUsuariosPorPerfil((prev) => ({
            ...prev,
            [perfilId]: usuariosFiltrados,
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar usuários gestor do perfil:', error)
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
   * Atualiza o status do usuário gestor diretamente na lista
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
        const response = await fetch(`/api/pessoas/usuarios-gestor/${usuarioId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: novoStatus }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao atualizar usuário gestor')
        }

        showToast.success(
          novoStatus ? 'Usuário gestor ativado com sucesso!' : 'Usuário gestor desativado com sucesso!'
        )

        // Recarrega os usuários do perfil para garantir sincronização
        await loadUsuariosPorPerfil(perfilId)
      } catch (error: any) {
        console.error('Erro ao atualizar status do usuário gestor:', error)
        showToast.error(error.message || 'Erro ao atualizar status do usuário gestor')

        // Reverte a atualização otimista em caso de erro
        const response = await fetch(`/api/pessoas/usuarios-gestor?perfilGestorId=${perfilId}&limit=100&offset=0`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const items = data.items || []
          
          // Filtra no frontend também como garantia (caso a API não filtre corretamente)
          const usuariosFiltrados = items.filter((usuario: any) => {
            // Verifica se o usuário tem o perfilGestorId correspondente
            // Pode estar em diferentes formatos: perfilGestorId, perfilGestor.id, perfilGestorId (string ou number)
            const usuarioPerfilId = usuario.perfilGestorId?.toString() || usuario.perfilGestor?.id?.toString() || ''
            return usuarioPerfilId === perfilId.toString()
          })
          
          console.log(`🔍 [PerfisGestorList] Perfil ${perfilId}: ${items.length} usuários retornados, ${usuariosFiltrados.length} filtrados`)
          
          setUsuariosPorPerfil((prev) => ({
            ...prev,
            [perfilId]: usuariosFiltrados,
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

  /**
   * Atualiza uma permissão específica do perfil
   */
  const handleTogglePermission = useCallback(
    async (perfilId: string, permission: 'acessoFinanceiro' | 'acessoEstoque' | 'acessoFiscal' | 'acessoDashboard', newValue: boolean) => {
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado. Faça login novamente.')
        return
      }

      // Marca como atualizando
      setUpdatingPermissions((prev) => {
        const newState = { ...prev }
        if (!newState[perfilId]) {
          newState[perfilId] = new Set()
        }
        newState[perfilId].add(permission)
        return newState
      })

      // Atualização otimista
      setPerfis((prev) =>
        prev.map((p) => {
          if (p.getId() === perfilId) {
            const currentData = p.toJSON()
            return PerfilGestor.fromJSON({
              ...currentData,
              [permission]: newValue,
            })
          }
          return p
        })
      )

      try {
        const perfil = perfis.find((p) => p.getId() === perfilId)
        if (!perfil) {
          throw new Error('Perfil não encontrado')
        }

        const currentData = perfil.toJSON()
        // Remove o id do body, pois ele já está na URL
        const { id, ...bodyData } = currentData
        
        const requestBody = {
          ...bodyData,
          [permission]: newValue,
        }
        
        const response = await fetch(`/api/pessoas/perfis-gestor/${perfilId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`)
        }

        const updatedData = await response.json()
        
        // Atualiza com os dados do servidor
        setPerfis((prev) =>
          prev.map((p) =>
            p.getId() === perfilId ? PerfilGestor.fromJSON(updatedData) : p
          )
        )

        showToast.success('Permissão atualizada com sucesso!')
      } catch (error: any) {
        console.error('Erro ao atualizar permissão:', error)
        showToast.error(error.message || 'Erro ao atualizar permissão')

        // Reverte a atualização otimista em caso de erro
        loadAllPerfis()
      } finally {
        // Remove o estado de atualização
        setUpdatingPermissions((prev) => {
          const newState = { ...prev }
          if (newState[perfilId]) {
            newState[perfilId].delete(permission)
            if (newState[perfilId].size === 0) {
              delete newState[perfilId]
            }
          }
          return newState
        })
      }
    },
    [auth, perfis, loadAllPerfis]
  )

  const openTabsModal = useCallback((config: Partial<PerfisGestorTabsModalState> = {}) => {
    setTabsModalState(() => ({
      open: true,
      tab: config.tab ?? 'perfil',
      mode: config.mode ?? 'create',
      perfilId: config.perfilId,
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
      perfilId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalPerfilOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadAllPerfis() // Recarrega a lista de perfis
    onReload?.()
  }, [router, searchParams, pathname, loadAllPerfis, onReload])

  const handleTabChange = useCallback((tab: 'perfil') => {
    setTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  const openUsuariosTabsModal = useCallback((perfilId: string) => {
    setUsuariosTabsModalState({
      open: true,
      tab: 'usuario',
      mode: 'create',
      usuarioId: undefined,
      initialPerfilGestorId: perfilId,
    })

    // Adicionar um parâmetro na URL para forçar o recarregamento ao fechar o modal
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.set('modalUsuarioGestorOpen', 'true')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
  }, [router, searchParams, pathname])

  const closeUsuariosTabsModal = useCallback(() => {
    setUsuariosTabsModalState((prev: UsuariosGestorTabsModalState) => ({
      ...prev,
      open: false,
      usuarioId: undefined,
      initialPerfilGestorId: undefined,
    }))

    // Remover o parâmetro da URL para forçar o recarregamento da rota
    const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
    currentSearchParams.delete('modalUsuarioGestorOpen')
    router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
    router.refresh() // Força a revalidação da rota principal
    loadAllPerfis() // Recarrega a lista de perfis
    onReload?.()
  }, [router, searchParams, pathname, loadAllPerfis, onReload])

  const handleUsuariosTabChange = useCallback((tab: 'usuario') => {
    setUsuariosTabsModalState((prev) => ({ ...prev, tab }))
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="md:px-[30px] px-1 pt-1 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex flex-col w-1/2 md:pl-5">
            <span className="text-primary md:text-lg text-sm font-semibold font-nunito">
              Perfis Gestor Cadastrados
            </span>
            <span className="text-tertiary md:text-[22px] text-sm font-medium font-nunito">
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
      <div className="flex gap-3 md:px-[20px] px-1 pb-2 flex-shrink-0">
        <div className="flex-1 min-w-[180px] max-w-[360px]">
          <label
            htmlFor="perfis-gestor-search"
            className="text-xs font-semibold text-secondary-text mb-1 block"
          >
            Buscar Perfil Gestor...
          </label>
          <div className="relative h-8">
            <MdSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text"
              size={18}
            />
            <input
              id="perfis-gestor-search"
              type="text"
              placeholder="Pesquisar perfil gestor..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-full pl-11 pr-4 rounded-lg border border-gray-200 bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-primary text-sm font-nunito"
            />
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela - Apenas Desktop */}
      {perfis.length > 0 && (
        <div className="hidden md:block md:px-[30px] px-1 flex-shrink-0">
          <div className="h-10 bg-custom-2 rounded-lg md:px-4 pr-1 flex items-center gap-2">
            <div className="w-8"></div>
            <div className="md:flex-[3] font-nunito font-semibold text-left md:text-sm text-primary-text uppercase">
              Perfil
            </div>
            <div className="md:flex-[1] font-nunito font-semibold text-center md:text-sm text-primary-text uppercase">
              Financeiro
            </div>
            <div className="md:flex-[1] font-nunito font-semibold text-center md:text-sm text-primary-text uppercase">
              Estoque
            </div>
            <div className="md:flex-[1] font-nunito font-semibold text-center md:text-sm text-primary-text uppercase">
              Fiscal
            </div>
            <div className="md:flex-[1] font-nunito font-semibold text-center md:text-sm text-primary-text uppercase">
              Dashboard
            </div>
          </div>
        </div>
      )}

      {/* Lista de perfis com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto md:px-[30px] px-1 scrollbar-hide"
        style={{ maxHeight: 'calc(100vh - 250px)' }}
      >
        {/* Mostrar loading quando está carregando ou ainda não houve tentativa de carregamento */}
        {(isLoading || !hasLoadedInitialRef.current) && perfis.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <img
              src="/images/jiffy-loading.gif"
              alt="Carregando..."
              className="w-20 h-20"
            />
            <span className="text-sm font-medium text-primary-text font-nunito">Carregando...</span>
          </div>
        )}

        {/* Só exibir mensagem de "nenhum perfil" quando realmente não há perfis e já houve tentativa de carregamento */}
        {perfis.length === 0 && !isLoading && hasLoadedInitialRef.current && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum perfil gestor encontrado.</p>
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

          // Componente reutilizável para switch de permissão
          const PermissionSwitch = ({ 
            permission, 
            checked, 
            disabled, 
            title 
          }: { 
            permission: 'acessoFinanceiro' | 'acessoEstoque' | 'acessoFiscal' | 'acessoDashboard'
            checked: boolean
            disabled: boolean
            title: string
          }) => (
            <label
              className={`relative inline-flex h-4 w-10 md:h-5 md:w-12 items-center ${
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
              }`}
              title={title}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={(event) => {
                  event.stopPropagation()
                  handleTogglePermission(perfil.getId(), permission, event.target.checked)
                }}
                disabled={disabled}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="h-full w-full rounded-full bg-gray-300 transition-colors peer-checked:bg-primary" />
              <span className="absolute left-[2px] top-1/2 block h-[14px] w-[14px] md:h-4 md:w-4 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 peer-checked:translate-x-[18px] md:peer-checked:translate-x-[28px]" />
            </label>
          )

          return (
            <div
              key={perfil.getId()}
              className={`${bgClass} rounded-lg my-2 overflow-visible hover:bg-primary/10 transition-colors`}
            >
              {/* Layout Desktop - Tabela horizontal */}
              <div 
                onClick={handlePerfilRowClick}
                className="hidden md:flex h-[50px] md:px-4 items-center md:gap-[10px] relative overflow-visible cursor-pointer"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(perfil.getId())
                  }}
                  className="md:w-8 w-6 md:h-8 h-6 flex items-center justify-center text-primary-text hover:bg-secondary-bg/20 rounded transition-colors"
                >
                  <span title="Exibir usuários gestor do perfil" 
                  className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    <MdKeyboardArrowRight size={18} />
                  </span>
                </button>
                <div className="md:flex-[3] font-nunito font-semibold text-left md:text-sm text-primary-text flex items-center gap-2">
                  {perfil.getRole()}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openUsuariosTabsModal(perfil.getId())
                    }}
                    className="w-5 h-5 flex items-center justify-center text-primary hover:bg-primary/20 rounded-full transition-colors"
                    title="Criar novo usuário para este perfil"
                  >
                    <MdPersonAdd size={16} />
                  </button>
                </div>
                <div className="md:flex-[1] flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <PermissionSwitch
                    permission="acessoFinanceiro"
                    checked={perfil.hasAcessoFinanceiro()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoFinanceiro')}
                    title={perfil.hasAcessoFinanceiro() ? 'Acesso Financeiro habilitado' : 'Acesso Financeiro desabilitado'}
                  />
                </div>
                <div className="md:flex-[1] flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <PermissionSwitch
                    permission="acessoEstoque"
                    checked={perfil.hasAcessoEstoque()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoEstoque')}
                    title={perfil.hasAcessoEstoque() ? 'Acesso Estoque habilitado' : 'Acesso Estoque desabilitado'}
                  />
                </div>
                <div className="md:flex-[1] flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <PermissionSwitch
                    permission="acessoFiscal"
                    checked={perfil.hasAcessoFiscal()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoFiscal')}
                    title={perfil.hasAcessoFiscal() ? 'Acesso Fiscal habilitado' : 'Acesso Fiscal desabilitado'}
                  />
                </div>
                <div className="md:flex-[1] flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <PermissionSwitch
                    permission="acessoDashboard"
                    checked={perfil.hasAcessoDashboard()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoDashboard')}
                    title={perfil.hasAcessoDashboard() ? 'Acesso Dashboard habilitado' : 'Acesso Dashboard desabilitado'}
                  />
                </div>
              </div>

              {/* Layout Mobile - Vertical */}
              <div 
                onClick={handlePerfilRowClick}
                className="md:hidden p-3 cursor-pointer"
              >
                {/* Cabeçalho com seta, Perfil e ícone na mesma linha */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(perfil.getId())
                      }}
                      className="w-6 h-6 flex items-center justify-center text-primary-text hover:bg-secondary-bg/20 rounded transition-colors"
                    >
                      <span title="Exibir usuários gestor do perfil" 
                      className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        <MdKeyboardArrowRight size={18} />
                      </span>
                    </button>
                    <span className="text-base font-semibold text-secondary-text">Perfil:</span>
                    <span className="font-nunito font-semibold text-base text-primary-text">
                      {perfil.getRole()}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openUsuariosTabsModal(perfil.getId())
                    }}
                    className="w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded-full transition-colors"
                    title="Criar novo usuário para este perfil"
                  >
                    <MdPersonAdd size={18} />
                  </button>
                </div>

                {/* Labels dos módulos */}
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[10px] font-semibold text-secondary-text flex-1 text-center">Financeiro</span>
                  <span className="text-[10px] font-semibold text-secondary-text flex-1 text-center">Estoque</span>
                  <span className="text-[10px] font-semibold text-secondary-text flex-1 text-center">Fiscal</span>
                  <span className="text-[10px] font-semibold text-secondary-text flex-1 text-center">Dashboard</span>
                </div>

                {/* Switches dos módulos */}
                <div className="flex justify-between items-center px-1">
                  <PermissionSwitch
                    permission="acessoFinanceiro"
                    checked={perfil.hasAcessoFinanceiro()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoFinanceiro')}
                    title={perfil.hasAcessoFinanceiro() ? 'Acesso Financeiro habilitado' : 'Acesso Financeiro desabilitado'}
                  />
                  <PermissionSwitch
                    permission="acessoEstoque"
                    checked={perfil.hasAcessoEstoque()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoEstoque')}
                    title={perfil.hasAcessoEstoque() ? 'Acesso Estoque habilitado' : 'Acesso Estoque desabilitado'}
                  />
                  <PermissionSwitch
                    permission="acessoFiscal"
                    checked={perfil.hasAcessoFiscal()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoFiscal')}
                    title={perfil.hasAcessoFiscal() ? 'Acesso Fiscal habilitado' : 'Acesso Fiscal desabilitado'}
                  />
                  <PermissionSwitch
                    permission="acessoDashboard"
                    checked={perfil.hasAcessoDashboard()}
                    disabled={!!updatingPermissions[perfil.getId()]?.has('acessoDashboard')}
                    title={perfil.hasAcessoDashboard() ? 'Acesso Dashboard habilitado' : 'Acesso Dashboard desabilitado'}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="font-nunito text-xs text-secondary-text">
                    {contagemUsuarios} usuário(s)
                  </span>
                </div>
              </div>

              {/* Lista de usuários gestor expandida - Desktop e Mobile */}
              {isExpanded && (
                <div className="hidden md:block px-4 pb-4 border-t border-primary/20 overflow-hidden">
                  {usuarios.length === 0 ? (
                    <p className="text-secondary-text text-sm py-4 text-center">
                      Nenhum usuário gestor associado a este perfil
                    </p>
                  ) : (
                    <div className="space-y-2 pt-4">
                      {usuarios.map((usuario: any) => (
                        <div
                          key={usuario.id}
                          className="flex items-center gap-3 p-3 bg-primary-bg rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary"><MdPerson size={22} /></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-nunito font-semibold text-sm text-primary-text">
                                {usuario.nome}
                              </p>
                              <button
                                onClick={() => {
                                  setUsuariosTabsModalState({
                                    open: true,
                                    tab: 'usuario',
                                    mode: 'edit',
                                    usuarioId: usuario.id,
                                    initialPerfilGestorId: undefined,
                                  })
                                  const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
                                  currentSearchParams.set('modalUsuarioGestorOpen', 'true')
                                  router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
                                }}
                                className="w-5 h-5 flex items-center justify-center text-primary hover:bg-primary/20 rounded-full transition-colors flex-shrink-0"
                                title="Editar usuário gestor"
                              >
                                <MdEdit size={14} />
                              </button>
                              <div className="flex items-center">
                                <label
                                  className={`relative inline-flex h-5 w-12 items-center ${
                                    togglingStatus[usuario.id]
                                      ? 'cursor-not-allowed opacity-60'
                                      : 'cursor-pointer'
                                  }`}
                                  title={usuario.ativo ? 'Usuário Gestor Ativo' : 'Usuário Gestor Desativado'}
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
                            <p className="font-nunito text-xs text-secondary-text mt-1">
                              {usuario.username || 'Sem e-mail'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lista de usuários gestor expandida - Mobile */}
              {isExpanded && (
                <div className="md:hidden px-4 pb-4 border-t border-primary/20 overflow-hidden">
                  {usuarios.length === 0 ? (
                    <p className="text-secondary-text text-sm py-4 text-center">
                      Nenhum usuário gestor associado a este perfil
                    </p>
                  ) : (
                    <div className="space-y-2 pt-4">
                      {usuarios.map((usuario: any) => (
                        <div
                          key={usuario.id}
                          className="flex items-center gap-3 p-3 bg-primary-bg rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary"><MdPerson size={22} /></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-nunito font-semibold text-sm text-primary-text">
                                {usuario.nome}
                              </p>
                              <button
                                onClick={() => {
                                  setUsuariosTabsModalState({
                                    open: true,
                                    tab: 'usuario',
                                    mode: 'edit',
                                    usuarioId: usuario.id,
                                    initialPerfilGestorId: undefined,
                                  })
                                  const currentSearchParams = new URLSearchParams(Array.from(searchParams.entries()))
                                  currentSearchParams.set('modalUsuarioGestorOpen', 'true')
                                  router.replace(`${pathname}?${currentSearchParams.toString()}`, { scroll: false })
                                }}
                                className="w-5 h-5 flex items-center justify-center text-primary hover:bg-primary/20 rounded-full transition-colors flex-shrink-0"
                                title="Editar usuário gestor"
                              >
                                <MdEdit size={14} />
                              </button>
                              <div className="flex items-center">
                                <label
                                  className={`relative inline-flex h-5 w-12 items-center ${
                                    togglingStatus[usuario.id]
                                      ? 'cursor-not-allowed opacity-60'
                                      : 'cursor-pointer'
                                  }`}
                                  title={usuario.ativo ? 'Usuário Gestor Ativo' : 'Usuário Gestor Desativado'}
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
                            <p className="font-nunito text-xs text-secondary-text mt-1">
                              {usuario.username || 'Sem e-mail'}
                            </p>
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

      <PerfisGestorTabsModal
        state={tabsModalState}
        onClose={closeTabsModal}
        onTabChange={handleTabChange}
        onReload={handleStatusChange}
      />

      <UsuariosGestorTabsModal
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
