'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PerfilUsuario } from '@/src/domain/entities/PerfilUsuario'
import { PerfilUsuarioActionsMenu } from './PerfilUsuarioActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface PerfisUsuariosListProps {
  onReload?: () => void
}

/**
 * Lista de perfis de usuários com scroll infinito e expansão para mostrar usuários
 * Replica exatamente o design e lógica do Flutter
 */
export function PerfisUsuariosList({ onReload }: PerfisUsuariosListProps) {
  const [perfis, setPerfis] = useState<PerfilUsuario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [totalPerfis, setTotalPerfis] = useState(0)
  const [expandedPerfis, setExpandedPerfis] = useState<Set<string>>(new Set())
  const [usuariosPorPerfil, setUsuariosPorPerfil] = useState<Record<string, any[]>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const offsetRef = useRef(0)
  const searchTextRef = useRef('')

  // Atualiza refs quando os valores mudam
  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useEffect(() => {
    searchTextRef.current = searchText
  }, [searchText])

  const loadPerfis = useCallback(
    async (reset: boolean = false) => {
      const token = auth?.getAccessToken()
      if (!token) {
        return
      }

      if (isLoadingRef.current || (!hasNextPageRef.current && !reset)) return

      setIsLoading(true)
      isLoadingRef.current = true

      if (reset) {
        setOffset(0)
        offsetRef.current = 0
        setPerfis([])
        setHasNextPage(true)
        hasNextPageRef.current = true
        setExpandedPerfis(new Set())
        setUsuariosPorPerfil({})
      }

      const currentOffset = reset ? 0 : offsetRef.current

      try {
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

        setPerfis((prev) => (reset ? newPerfis : [...prev, ...newPerfis]))
        const newOffset = reset ? newPerfis.length : offsetRef.current + newPerfis.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(newPerfis.length === 10)
        hasNextPageRef.current = newPerfis.length === 10
        setTotalPerfis(data.count || 0)
      } catch (error) {
        console.error('Erro ao carregar perfis:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [auth]
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

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (searchTextRef.current !== searchText) {
        loadPerfis(true)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadPerfis])

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (
        scrollTop + clientHeight >= scrollHeight - 200 &&
        !isLoadingRef.current &&
        hasNextPageRef.current
      ) {
        loadPerfis()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega perfis iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadPerfis(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadPerfis(true)
    onReload?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Perfis Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {perfis.length} de {totalPerfis}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/perfis-usuarios-pdv/novo'
            }}
            className="h-10 px-[30px] bg-primary text-info rounded-[30px] font-semibold font-exo text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            Novo
            <span className="text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Divisor amarelo */}
      <div className="relative">
        <div className="h-[63px] border-t-2 border-alternate"></div>
        <div className="absolute top-3 left-[30px] right-[30px]">
          {/* Barra de pesquisa */}
          <div className="flex-[3]">
            <div className="h-[50px] relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full h-full px-5 pl-12 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-text">
                🔍
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de perfis com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {perfis.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum perfil encontrado.</p>
          </div>
        )}

        {perfis.map((perfil) => {
          const isExpanded = expandedPerfis.has(perfil.getId())
          const usuarios = usuariosPorPerfil[perfil.getId()] || []

          return (
            <div
              key={perfil.getId()}
              className="bg-info rounded-xl mb-2 overflow-hidden"
            >
              {/* Cabeçalho do perfil */}
              <div className="h-[50px] px-4 flex items-center gap-[10px]">
                <button
                  onClick={() => toggleExpand(perfil.getId())}
                  className="w-8 h-8 flex items-center justify-center text-primary-text hover:bg-secondary-bg/20 rounded transition-colors"
                >
                  <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                </button>
                <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
                  {perfil.getRole()}
                </div>
                <div className="flex-[2] text-center font-nunito text-sm text-secondary-text">
                  {usuarios.length} usuário(s)
                </div>
                <div className="flex-[2] flex justify-end">
                  <PerfilUsuarioActionsMenu
                    perfilId={perfil.getId()}
                    onStatusChanged={handleStatusChange}
                  />
                </div>
              </div>

              {/* Lista de usuários expandida */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-alternate/20">
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
                            <span className="text-primary">👤</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-nunito font-semibold text-sm text-primary-text">
                              {usuario.nome}
                            </p>
                            <p className="font-nunito text-xs text-secondary-text">
                              ID: {usuario.id}
                            </p>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-[24px] text-xs font-nunito font-medium ${
                              usuario.ativo
                                ? 'bg-success/20 text-success'
                                : 'bg-error/20 text-secondary-text'
                            }`}
                          >
                            {usuario.ativo ? 'Ativo' : 'Desativado'}
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
    </div>
  )
}


