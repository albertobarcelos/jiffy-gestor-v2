'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Usuario } from '@/src/domain/entities/Usuario'
import { UsuarioActionsMenu } from './UsuarioActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface UsuariosListProps {
  onReload?: () => void
}

/**
 * Lista de usuários com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function UsuariosList({ onReload }: UsuariosListProps) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  // Refs para evitar dependências desnecessárias no useCallback
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const offsetRef = useRef(0)
  const searchTextRef = useRef('')
  const filterStatusRef = useRef<'Todos' | 'Ativo' | 'Desativado'>('Ativo')

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

  useEffect(() => {
    filterStatusRef.current = filterStatus
  }, [filterStatus])

  const loadUsuarios = useCallback(
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
        setUsuarios([])
        setHasNextPage(true)
        hasNextPageRef.current = true
      }

      const currentOffset = reset ? 0 : offsetRef.current

      // Determina o filtro ativo
      let ativoFilter: boolean | null = null
      if (filterStatusRef.current === 'Ativo') {
        ativoFilter = true
      } else if (filterStatusRef.current === 'Desativado') {
        ativoFilter = false
      }

      try {
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

        setUsuarios((prev) => (reset ? newUsuarios : [...prev, ...newUsuarios]))
        const newOffset = reset ? newUsuarios.length : offsetRef.current + newUsuarios.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(newUsuarios.length === 10)
        hasNextPageRef.current = newUsuarios.length === 10
        setTotalUsuarios(data.count || 0)
      } catch (error) {
        console.error('Erro ao carregar usuários:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [auth]
  )

  // Debounce da busca
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (searchTextRef.current !== searchText) {
        loadUsuarios(true)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadUsuarios])

  // Filtro de status
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadUsuarios(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

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
        loadUsuarios()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega usuários iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadUsuarios(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadUsuarios(true)
    onReload?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Usuários Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {usuarios.length} de {totalUsuarios}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/usuarios/novo'
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
        <div className="absolute top-3 left-[30px] right-[30px] flex gap-[10px]">
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

          {/* Filtro de status */}
          <div className="flex-1">
            <div className="h-[48px]">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as 'Todos' | 'Ativo' | 'Desativado'
                  )
                }
                className="w-[175px] h-full px-5 rounded-[24px] border-[0.6px] border-secondary bg-info text-primary-text focus:outline-none focus:border-secondary font-nunito text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Desativado">Desativado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            ID
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
            className="bg-info rounded-xl mb-2 overflow-hidden"
          >
            <div className="h-[50px] px-4 flex items-center gap-[10px]">
              <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
                {usuario.getNome()}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {usuario.getId()}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {usuario.getTelefone() || '-'}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {usuario.getPerfilPdv()?.role || '-'}
              </div>
              <div className="flex-[2] flex justify-center">
                <div
                  className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
                    usuario.isAtivo()
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-secondary-text'
                  }`}
                >
                  {usuario.isAtivo() ? 'Ativo' : 'Desativado'}
                </div>
              </div>
              <div className="flex-[2] flex justify-end">
                <UsuarioActionsMenu
                  usuarioId={usuario.getId()}
                  usuarioAtivo={usuario.isAtivo()}
                  onStatusChanged={handleStatusChange}
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
    </div>
  )
}


