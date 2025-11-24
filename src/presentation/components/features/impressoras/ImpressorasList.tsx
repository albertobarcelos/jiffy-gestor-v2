'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Impressora } from '@/src/domain/entities/Impressora'
import { ImpressoraActionsMenu } from './ImpressoraActionsMenu'
import { useAuthStore } from '@/src/presentation/stores/authStore'

interface ImpressorasListProps {
  onReload?: () => void
}

/**
 * Lista de impressoras com scroll infinito
 * Replica exatamente o design e lógica do Flutter
 */
export function ImpressorasList({ onReload }: ImpressorasListProps) {
  const [impressoras, setImpressoras] = useState<Impressora[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [totalImpressoras, setTotalImpressoras] = useState(0)
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

  const loadImpressoras = useCallback(
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
        setImpressoras([])
        setHasNextPage(true)
        hasNextPageRef.current = true
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

        const response = await fetch(`/api/impressoras?${params.toString()}`, {
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

        const newImpressoras = (data.items || []).map((item: any) =>
          Impressora.fromJSON(item)
        )

        setImpressoras((prev) => (reset ? newImpressoras : [...prev, ...newImpressoras]))
        const newOffset = reset ? newImpressoras.length : offsetRef.current + newImpressoras.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(newImpressoras.length === 10)
        hasNextPageRef.current = newImpressoras.length === 10
        setTotalImpressoras(data.count || 0)
      } catch (error) {
        console.error('Erro ao carregar impressoras:', error)
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
        loadImpressoras(true)
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchText, auth, loadImpressoras])

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
        loadImpressoras()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, hasNextPage])

  // Carrega impressoras iniciais apenas quando o token estiver disponível
  useEffect(() => {
    if (!isAuthenticated || hasLoadedInitialRef.current) return

    const token = auth?.getAccessToken()
    if (!token) return

    hasLoadedInitialRef.current = true
    loadImpressoras(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleStatusChange = () => {
    loadImpressoras(true)
    onReload?.()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com título e botão */}
      <div className="px-[30px] pt-[30px] pb-[10px]">
        <div className="flex items-start justify-between">
          <div className="w-1/2 pl-5">
            <p className="text-primary text-sm font-semibold font-nunito mb-2">
              Impressoras Cadastradas
            </p>
            <p className="text-tertiary text-[26px] font-medium font-nunito">
              Total {impressoras.length} de {totalImpressoras}
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/cadastros/impressoras/novo'
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
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="px-[30px] mt-0">
        <div className="h-10 bg-custom-2 rounded-lg px-4 flex items-center gap-[10px]">
          <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
            Nome
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Modelo
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            Conexão
          </div>
          <div className="flex-[2] font-nunito font-semibold text-sm text-primary-text">
            IP/Porta
          </div>
          <div className="flex-[2] text-center font-nunito font-semibold text-sm text-primary-text">
            Status
          </div>
          <div className="flex-[2] text-right font-nunito font-semibold text-sm text-primary-text">
            Ações
          </div>
        </div>
      </div>

      {/* Lista de impressoras com scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-[30px] mt-2"
      >
        {impressoras.length === 0 && !isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-secondary-text">Nenhuma impressora encontrada.</p>
          </div>
        )}

        {impressoras.map((impressora) => (
          <div
            key={impressora.getId()}
            className="bg-info rounded-xl mb-2 overflow-hidden"
          >
            <div className="h-[50px] px-4 flex items-center gap-[10px]">
              <div className="flex-[3] font-nunito font-semibold text-sm text-primary-text">
                {impressora.getNome()}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {impressora.getModelo() || '-'}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {impressora.getTipoConexao() || '-'}
              </div>
              <div className="flex-[2] font-nunito text-sm text-secondary-text">
                {impressora.getIp() && impressora.getPorta()
                  ? `${impressora.getIp()}:${impressora.getPorta()}`
                  : '-'}
              </div>
              <div className="flex-[2] flex justify-center">
                <div
                  className={`w-20 px-3 py-1 rounded-[24px] text-center text-sm font-nunito font-medium ${
                    impressora.isAtivo()
                      ? 'bg-success/20 text-success'
                      : 'bg-error/20 text-secondary-text'
                  }`}
                >
                  {impressora.isAtivo() ? 'Ativo' : 'Desativado'}
                </div>
              </div>
              <div className="flex-[2] flex justify-end">
                <ImpressoraActionsMenu
                  impressoraId={impressora.getId()}
                  impressoraAtiva={impressora.isAtivo()}
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


