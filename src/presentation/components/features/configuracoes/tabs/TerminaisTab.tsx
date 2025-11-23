'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Terminal } from '@/src/domain/entities/Terminal'

/**
 * Tab de Terminais - Lista de terminais com scroll infinito
 */
export function TerminaisTab() {
  const { auth } = useAuthStore()
  const [terminais, setTerminais] = useState<Terminal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalItems, setTotalItems] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const offsetRef = useRef(0)
  const searchQueryRef = useRef('')

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
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  const loadTerminais = useCallback(
    async (reset: boolean = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (isLoadingRef.current || (!hasNextPageRef.current && !reset)) return

      setIsLoading(true)
      isLoadingRef.current = true

      if (reset) {
        setOffset(0)
        offsetRef.current = 0
        setTerminais([])
        setHasNextPage(true)
        hasNextPageRef.current = true
      }

      const currentOffset = reset ? 0 : offsetRef.current
      const currentQuery = searchQueryRef.current

      try {
        const params = new URLSearchParams({
          limit: '10',
          offset: currentOffset.toString(),
        })
        if (currentQuery) {
          params.append('q', currentQuery)
        }

        const response = await fetch(`/api/terminais?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          // Debug: log da resposta da API
          if (process.env.NODE_ENV === 'development') {
            console.log('Resposta da API de terminais:', data)
          }
          
          // Filtrar e mapear apenas itens válidos
          const newTerminais = (data.items || [])
            .map((t: any) => {
              try {
                return Terminal.fromJSON(t)
              } catch (error) {
                console.warn('Erro ao criar Terminal:', error, 'Dados:', t)
                return null
              }
            })
            .filter((t: Terminal | null): t is Terminal => t !== null)
          
          setTerminais((prev) => (reset ? newTerminais : [...prev, ...newTerminais]))
          const newOffset = reset ? newTerminais.length : offsetRef.current + newTerminais.length
          setOffset(newOffset)
          offsetRef.current = newOffset
          setHasNextPage(data.hasNextPage ?? false)
          hasNextPageRef.current = data.hasNextPage ?? false
          setTotalItems(data.total ?? 0)
        } else {
          console.error('Erro na resposta da API:', response.status, await response.text().catch(() => ''))
        }
      } catch (error) {
        console.error('Erro ao carregar terminais:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [auth]
  )

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTerminais(true)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

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
        loadTerminais()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega dados iniciais
  useEffect(() => {
    loadTerminais(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-primary text-base font-semibold font-exo mb-1">
            Terminais
          </h3>
          <p className="text-tertiary text-[26px] font-medium font-nunito">
            Total {terminais.length} de {totalItems}
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: Implementar modal de adicionar terminal
            alert('Funcionalidade de adicionar terminal será implementada')
          }}
          className="h-9 px-4 bg-primary text-info rounded-[50px] text-sm font-medium font-exo hover:bg-primary/90 transition-colors"
        >
          + Adicionar Terminal
        </button>
      </div>

      {/* Busca */}
      <div className="bg-info rounded-[10px] p-4">
        <input
          type="text"
          placeholder="Buscar terminais..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text focus:outline-none focus:border-primary"
        />
      </div>

      {/* Lista de terminais */}
      <div
        ref={scrollContainerRef}
        className="max-h-[calc(100vh-400px)] overflow-y-auto bg-info rounded-[10px] p-4 space-y-3"
      >
        {terminais.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhum terminal encontrado.</p>
          </div>
        )}

        {terminais.map((terminal) => (
          <div
            key={terminal.getId()}
            className="p-4 bg-primary-bg rounded-lg border border-secondary flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-sm font-semibold text-primary-text">
                  {terminal.getName()}
                </p>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    terminal.getAtivo()
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-error'
                  }`}
                >
                  {terminal.getAtivo() ? 'Ativo' : 'Inativo'}
                </span>
                {terminal.getSincronizado() && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-info/20 text-info">
                    Sincronizado
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary-text">
                MAC: {terminal.getEnderecoMac() || 'N/A'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // TODO: Implementar edição
                  alert('Funcionalidade de editar terminal será implementada')
                }}
                className="h-8 px-3 bg-alternate text-white rounded-lg text-xs font-medium hover:bg-alternate/90 transition-colors"
              >
                Editar
              </button>
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

