'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PerfilGestor } from '@/src/domain/entities/PerfilGestor'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { MdSearch, MdPersonAdd } from 'react-icons/md'
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
                {/* Cabeçalho com Perfil e ícone */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
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
              </div>
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
        onReload={handleStatusChange}
      />
    </div>
  )
}
