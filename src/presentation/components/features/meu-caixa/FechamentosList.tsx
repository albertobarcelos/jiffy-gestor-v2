'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FechamentoCaixa } from '@/src/domain/entities/FechamentoCaixa'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Lista de fechamentos de caixa
 * Replica o design e funcionalidades do Flutter
 */
export function FechamentosList() {
  const router = useRouter()
  const { auth } = useAuthStore()
  const [fechamentos, setFechamentos] = useState<FechamentoCaixa[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filtroPeriodo, setFiltroPeriodo] = useState<'Semana' | '15 Dias' | '30 Dias' | '60 Dias' | 'Todos'>('Semana')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const hasLoadedInitialRef = useRef(false)

  // Refs para evitar dependências desnecessárias
  const isLoadingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const offsetRef = useRef(0)

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage
  }, [hasNextPage])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  const loadFechamentos = useCallback(
    async (reset: boolean = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (isLoadingRef.current || (!hasNextPageRef.current && !reset)) return

      setIsLoading(true)
      isLoadingRef.current = true

      if (reset) {
        setOffset(0)
        offsetRef.current = 0
        setFechamentos([])
        setHasNextPage(true)
        hasNextPageRef.current = true
      }

      const currentOffset = reset ? 0 : offsetRef.current

      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockFechamentos: FechamentoCaixa[] = []
        
        setFechamentos((prev) => (reset ? mockFechamentos : [...prev, ...mockFechamentos]))
        const newOffset = reset ? mockFechamentos.length : offsetRef.current + mockFechamentos.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(mockFechamentos.length === 10)
        hasNextPageRef.current = mockFechamentos.length === 10
      } catch (error) {
        console.error('Erro ao carregar fechamentos:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [auth, filtroPeriodo]
  )

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
        loadFechamentos()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega fechamentos quando o filtro muda
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return
    loadFechamentos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo])

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-[30px] pt-[30px]">
        {/* Header com filtro */}
        <div className="mb-6">
          <div className="h-[42px] bg-white/20 flex items-center justify-between px-4">
            <p className="text-primary text-sm font-semibold font-exo">
              Fechamentos | {filtroPeriodo}
            </p>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value as any)}
              className="h-9 px-4 rounded-lg border border-secondary bg-primary-bg text-primary-text text-sm font-nunito focus:outline-none focus:border-primary"
            >
              <option value="Semana">Semana</option>
              <option value="15 Dias">15 Dias</option>
              <option value="30 Dias">30 Dias</option>
              <option value="60 Dias">60 Dias</option>
              <option value="Todos">Todos</option>
            </select>
          </div>
        </div>

        {/* Lista de fechamentos */}
        <div
          ref={scrollContainerRef}
          className="max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          {fechamentos.length === 0 && !isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-secondary-text">Nenhum fechamento encontrado.</p>
            </div>
          )}

          {fechamentos.map((fechamento) => (
            <button
              key={fechamento.getId()}
              onClick={() => router.push(`/meu-caixa/${fechamento.getCaixaId()}`)}
              className="w-full mb-4 p-4 bg-info rounded-lg hover:bg-info/80 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-semibold text-primary-text">
                      Fechado por: {fechamento.getFechadoPorNome()}
                    </p>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        fechamento.temDiferenca()
                          ? 'bg-warning/20 text-warning'
                          : 'bg-success/20 text-success'
                      }`}
                    >
                      {fechamento.temDiferenca() ? 'Com Diferença' : 'OK'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-text">
                    {formatarData(fechamento.getDataFechamento())}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary-text mb-1">
                    {formatarMoeda(fechamento.getValorTotal())}
                  </p>
                  {fechamento.temDiferenca() && (
                    <p className="text-xs text-warning">
                      Diferença: {formatarMoeda(fechamento.getDiferenca())}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}

          {isLoading && (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

