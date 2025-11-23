'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { GrupoItem } from './GrupoItem'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface GruposProdutosListProps {
  onReload?: () => void
}

/**
 * Lista de grupos de produtos com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function GruposProdutosList({ onReload }: GruposProdutosListProps) {
  const [grupos, setGrupos] = useState<GrupoProduto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'Ativo' | 'Desativado'>('Ativo')
  const [totalGrupos, setTotalGrupos] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const hasLoadedInitialRef = useRef(false)
  const { auth, isAuthenticated } = useAuthStore()

  // Sensores para drag and drop
  // ActivationConstraint: só ativa o drag quando clica especificamente no handle
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer movimento de 8px para ativar (evita drag acidental)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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
          q: searchTextRef.current,
          limit: '10',
          offset: currentOffset.toString(),
        })

        if (ativoFilter !== null) {
          params.append('ativo', ativoFilter.toString())
        }

        const response = await fetch(`/api/grupos-produtos?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.message || `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()

        if (data.success) {
          const newGrupos = (data.items || []).map((item: any) =>
            GrupoProduto.fromJSON(item)
          )

          setGrupos((prev) => (reset ? newGrupos : [...prev, ...newGrupos]))
          const newOffset = reset ? newGrupos.length : offsetRef.current + newGrupos.length
          setOffset(newOffset)
          offsetRef.current = newOffset
          setHasNextPage(newGrupos.length === 10)
          hasNextPageRef.current = newGrupos.length === 10
          setTotalGrupos(data.count || 0)
        } else {
          throw new Error(data.message || 'Erro ao processar resposta da API')
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error)
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
      loadGrupos(true)
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  // Carrega grupos quando o filtro muda
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
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        if (!isLoading && hasNextPage) {
          loadGrupos()
        }
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

  // Handler para quando o drag termina
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = grupos.findIndex((g) => g.getId() === active.id)
    const newIndex = grupos.findIndex((g) => g.getId() === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Atualiza a ordem localmente
    const newGrupos = arrayMove(grupos, oldIndex, newIndex)
    setGrupos(newGrupos)

    // Calcula a nova posição (1-based)
    const newOrder = newIndex + 1
    const grupoId = active.id as string

    // Atualiza no backend
    try {
      const token = auth?.getAccessToken()
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(
        `/api/grupos-produtos/${grupoId}/reordena-grupo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaPosicao: newOrder }),
        }
      )

      if (!response.ok) {
        // Reverte a mudança local se falhar
        setGrupos(grupos)
        const error = await response.json()
        throw new Error(error.message || 'Erro ao reordenar grupo')
      }

      // Sucesso - pode mostrar notificação se necessário
      console.log('Ordem atualizada com sucesso')
    } catch (error: any) {
      console.error('Erro ao reordenar grupo:', error)
      // Reverte a mudança local
      setGrupos(grupos)
      alert(error.message || 'Erro ao atualizar ordem do grupo')
    }
  }


  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Grupos Cadastrados
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {grupos.length} de {totalGrupos}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/grupos-produtos/novo'
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
              <button
                onClick={() => loadGrupos(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-[40px] px-[30px] bg-info text-secondary rounded-[40px] border-[0.6px] border-secondary font-exo text-sm hover:bg-info/90 transition-colors"
              >
                Buscar
              </button>
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
          <div className="flex-[1] font-nunito font-semibold text-sm text-primary-text">
            Ordem
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Ícones do Grupo
          </div>
          <div className="flex-[4] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de grupos com scroll e drag and drop */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {grupos.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum grupo encontrado.</p>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={grupos.map((g) => g.getId())}
            strategy={verticalListSortingStrategy}
          >
            {grupos.map((grupo, index) => (
              <GrupoItem
                key={grupo.getId()}
                grupo={grupo}
                index={index}
                onStatusChanged={handleStatusChange}
              />
            ))}
          </SortableContext>
        </DndContext>

        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

