'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { GrupoComplementoActionsMenu } from './GrupoComplementoActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast, handleApiError } from '@/src/shared/utils/toast'
import { Skeleton } from '@/src/presentation/components/ui/skeleton'

interface GruposComplementosListProps {
  onReload?: () => void
}

/**
 * Lista de grupos de complementos com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function GruposComplementosList({ onReload }: GruposComplementosListProps) {
  const [grupos, setGrupos] = useState<GrupoComplemento[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalGrupos, setTotalGrupos] = useState(0)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
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

  const loadGrupos = useCallback(
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
        setGrupos([])
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

        const response = await fetch(`/api/grupos-complementos?${params.toString()}`, {
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

        // Filtrar grupos inválidos (com qtdMinima > qtdMaxima)
        const validGrupos: GrupoComplemento[] = []
        const invalidGrupos: string[] = []

        for (const item of data.items || []) {
          try {
            const grupo = GrupoComplemento.fromJSON(item)
            validGrupos.push(grupo)
          } catch (error) {
            // Se o erro for sobre quantidade mínima > máxima, registra mas não quebra
            if (error instanceof Error && error.message.includes('Quantidade mínima não pode ser maior que máxima')) {
              invalidGrupos.push(item.nome || item.id || 'Grupo sem nome')
              console.warn(`Grupo de complementos inválido ignorado:`, item)
            } else {
              // Outros erros são re-lançados
              throw error
            }
          }
        }

        // Notificar sobre grupos inválidos, se houver
        if (invalidGrupos.length > 0) {
          showToast.warning(
            `${invalidGrupos.length} grupo(s) com dados inválidos foram ignorados. Verifique as quantidades mínima/máxima.`
          )
        }

        setGrupos((prev) => (reset ? validGrupos : [...prev, ...validGrupos]))
        const newOffset = reset ? validGrupos.length : offsetRef.current + validGrupos.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(validGrupos.length === 10)
        hasNextPageRef.current = validGrupos.length === 10
        setTotalGrupos(data.count || 0)
      } catch (error) {
        console.error('Erro ao carregar grupos de complementos:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
        // Só mostra erro se não for o carregamento inicial
        if (hasLoadedInitialRef.current) {
          const errorMessage = handleApiError(error)
          showToast.error(errorMessage)
        }
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
        loadGrupos(true)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadGrupos])

  // Filtro de status
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    loadGrupos(true)
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
        loadGrupos()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega grupos iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadGrupos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadGrupos(true)
    onReload?.()
  }

  const toggleExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Grupos de Complementos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {grupos.length} de {totalGrupos}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/grupos-complementos/novo'
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
            Qtd Mín/Máx
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Complementos
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {/* Skeleton loaders para carregamento inicial */}
        {grupos.length === 0 && isLoading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-[50px] bg-info rounded-xl px-4 flex items-center gap-[10px]"
              >
                <Skeleton className="flex-[3] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-4" />
                <Skeleton className="flex-[2] h-6 w-20 mx-auto" />
                <Skeleton className="flex-[2] h-10 w-10 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {grupos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum grupo de complementos encontrado.</p>
          </div>
        )}

        {grupos.map((grupo) => {
          const isExpanded = expandedGroups.has(grupo.getId())
          const complementos = grupo.getComplementos() || []
          const complementosIds = grupo.getComplementosIds() || []

          return (
            <div
              key={grupo.getId()}
              className="bg-info rounded-xl mb-2 overflow-hidden"
            >
              {/* Linha principal do grupo */}
              <div className="h-[50px] px-4 flex items-center gap-[10px]">
                <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
                  {grupo.getNome()}
                </div>
                <div className="flex-[2] font-nunito text-sm text-secondary-text">
                  {grupo.getQtdMinima()} / {grupo.getQtdMaxima()}
                </div>
                <div className="flex-[2] font-nunito text-sm text-secondary-text">
                  {complementosIds.length} complemento(s)
                </div>
                <div className="flex-[2] flex justify-center">
                  <div
                    className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
                      grupo.isAtivo()
                        ? 'bg-success/20 text-success'
                        : 'bg-error/20 text-secondary-text'
                    }`}
                  >
                    {grupo.isAtivo() ? 'Ativo' : 'Desativado'}
                  </div>
                </div>
                <div className="flex-[2] flex justify-end items-center gap-2">
                  {complementos.length > 0 && (
                    <button
                      onClick={() => toggleExpand(grupo.getId())}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary-bg/20 transition-colors"
                    >
                      <span className={`text-lg transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                  )}
                  <GrupoComplementoActionsMenu
                    grupoId={grupo.getId()}
                    grupoAtivo={grupo.isAtivo()}
                    onStatusChanged={handleStatusChange}
                  />
                </div>
              </div>

              {/* Lista de complementos expandida */}
              {isExpanded && complementos.length > 0 && (
                <div className="px-4 pb-4 border-t border-alternate/30">
                  <div className="pt-3 space-y-2">
                    {complementos.map((complemento: any, index: number) => (
                      <div
                        key={complemento.id || index}
                        className="px-3 py-2 bg-primary-bg rounded-lg"
                      >
                        <p className="text-sm font-medium text-primary-text">
                          {complemento.nome || 'Complemento sem nome'}
                        </p>
                        {complemento.valor && (
                          <p className="text-xs text-secondary-text">
                            R$ {parseFloat(complemento.valor).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
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

