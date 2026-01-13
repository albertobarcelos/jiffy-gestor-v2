'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { MdAttachMoney, MdRestaurant, MdPrint } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DetalhesVendas } from './DetalhesVendas'
import { CircularProgress } from '@mui/material'
import { TipoVendaIcon } from './TipoVendaIcon'
import { formatElapsedTime } from '@/src/shared/utils/formatters'
// Tipos
interface Venda {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataCancelamento?: string
  dataFinalizacao?: string
  metodoPagamento?: string
  status?: string
}

interface MetricasVendas {
  totalFaturado: number
  countVendasEfetivadas: number
  countVendasCanceladas: number
  countProdutosVendidos: number
}

interface UsuarioPDV {
  id: string
  nome: string
}


interface VendasAbertasProps {
  initialPeriodo?: string; // Período inicial vindo da URL (ex: "Hoje", "Últimos 7 Dias")
}

/**
 * Componente de listagem de mesas em aberto
 * Exibe apenas mesas (não balcão) com scroll infinito e cards de métricas
 */
export function VendasAbertas({ initialPeriodo }: VendasAbertasProps) {
  const { auth } = useAuthStore()

  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [elapsedTimeUpdateTrigger, setElapsedTimeUpdateTrigger] = useState(0) // Estado para forçar atualização do tempo decorrido

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimeUpdateTrigger(prev => prev + 1) // Atualiza a cada minuto para re-renderizar o tempo
    }, 60 * 1000) // 1 minuto

    return () => clearInterval(interval)
  }, [])

  const pageSize = 100 // Aumentado para carregar mais itens por vez
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentPageRef = useRef(0)

  /**
   * Formata valor como moeda brasileira
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }



  /**
   * Carrega todos os usuários PDV
   */
  const loadAllUsuariosPDV = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    try {
      const allUsuarios: UsuarioPDV[] = []
      let currentOffset = 0
      let hasMore = true
      const limit = 100

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          ativo: 'true',
        })

        const response = await fetch(`/api/usuarios?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const newUsuarios = (data.items || []).map((u: any) => ({
          id: u.id,
          nome: u.nome || u.name || 'Sem nome',
        }))

        allUsuarios.push(...newUsuarios)
        hasMore = newUsuarios.length === limit
        currentOffset += newUsuarios.length
      }

      setUsuariosPDV(allUsuarios)
    } catch (error) {
      console.error('Erro ao carregar usuários PDV:', error)
    } finally {
      //setIsLoadingUsuariosPDV(false) // Não temos este estado, mas manter para referência
    }
  }, [auth])


  /**
   * Busca apenas mesas em aberto
   */
  const fetchVendas = useCallback(
    async (resetPage = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (resetPage) {
        setIsLoading(true)
        currentPageRef.current = 0
        setCurrentPage(0)
      } else {
        setIsLoadingMore(true)
      }

      try {
        const page = resetPage ? 0 : currentPageRef.current
        const params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
          status: 'ABERTA',
          tipoVenda: 'mesa', // Filtro fixo: apenas mesas
        })

        const response = await fetch(`/api/vendas?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao buscar vendas')
        }

        const data = await response.json()

        if (resetPage) {
          setVendas(data.items || [])
          currentPageRef.current = 1
          setCurrentPage(1)
          
          // Verifica se precisa carregar mais itens para preencher a tela
          setTimeout(() => {
            const container = scrollContainerRef.current
            if (container && data.hasNext) {
              const { scrollHeight, clientHeight } = container
              // Se o conteúdo não preenche a tela, carrega mais
              if (scrollHeight <= clientHeight) {
                fetchVendas(false)
              }
            }
          }, 100)
        } else {
          setVendas((prev) => [...prev, ...(data.items || [])])
          currentPageRef.current += 1
          setCurrentPage((prev) => prev + 1)
        }

        setMetricas(data.metricas || null)
        setCanLoadMore(data.hasNext || false)
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
        showToast.error('Erro ao buscar vendas')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [auth]
  )

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

      if (isNearBottom && canLoadMore && !isLoadingMore && !isLoading) {
        fetchVendas(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [canLoadMore, isLoadingMore, isLoading, fetchVendas])

  // Efeito para carregar dados auxiliares e iniciar a busca de vendas
  useEffect(() => {
    if (!auth) return
    
    loadAllUsuariosPDV()
    fetchVendas(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-lg rounded-b-lg px-2 flex flex-col h-full min-h-0 overflow-hidden">

        {/* Cards de Métricas */}
        <div className="flex gap-2 m-1 flex-shrink-0 sticky top-0 z-10 bg-primary-background">
          {/* Vendas em Aberto (fixo) */}
          <div className="flex-1 border-2 rounded-lg p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-alternate flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl">🛒</span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">
                Vendas em Aberto
              </span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countVendasEfetivadas || 0}
              </span>
            </div>
          </div>

          {/* Vendas Canceladas - REMOVIDO */}
          {/* Total de Produtos Vendidos */}
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdRestaurant /></span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Total de Produtos à Vender</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex-1 rounded-lg border-2 p-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent1 flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdAttachMoney /></span>
            </div>
            <div className="flex flex-col items-end flex-1">
              <span className="text-xs text-secondary-text font-nunito">Total à faturar</span>
              <span className="text-[22px] text-primary font-exo">
                {metricas?.totalFaturado ? formatCurrency(metricas.totalFaturado) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-info rounded-lg flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto px-1 py-2 scrollbar-hide grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            {vendas.length === 0 && !isLoading && (
              <div className="flex items-center justify-center py-12 col-span-full">
                <p className="text-secondary-text">Nenhuma mesa em aberto encontrada.</p>
              </div>
            )}

            {vendas.map((venda) => {
              const elapsedTime = formatElapsedTime(venda.dataCriacao)
              const usuarioNome =
                usuariosPDV.find((u) => u.id === venda.abertoPorId)?.nome || venda.abertoPorId

              // Calcula cor dinâmica para o círculo interno (começa branco e vai amarelando até o warning cheio)
              const now = new Date()
              const start = new Date(venda.dataCriacao)
              const diffMs = now.getTime() - start.getTime()
              const diffMinutes = Math.floor(diffMs / (1000 * 60))
              const intensity = diffMinutes <= 10 ? 0 : Math.min(100, Math.ceil(diffMinutes / 10) * 10)
              const innerCircleColor =
                intensity === 0
                  ? 'white'
                  : `color-mix(in srgb, white ${100 - intensity}%, var(--color-warning) ${intensity}%)`

              return (
                <div
                  key={venda.id}
                  onClick={() => setSelectedVendaId(venda.id)}
                  className="cursor-pointer px-2 rounded-lg flex flex-col items-center justify-between shadow-sm shadow-primary-text/50 hover:bg-primary/15 transition-all w-[220px] h-[240px] relative bg-primary/5">

                  <div className="flex flex-col items-center justify-center flex-grow">
                    <TipoVendaIcon
                      tipoVenda={venda.tipoVenda}
                      numeroMesa={venda.numeroMesa}
                      size={150} // Tamanho grande para o ícone
                      corTexto="var(--color-alternate)" // Cor do texto do número da mesa
                      corCirculoInterno={innerCircleColor} // Fundo dinâmico: branco -> amarelo
                    />
                  </div>

                  <div className="w-full flex flex-col items-start px-2 mb-4">
                    <span className="text-xs text-primary-text font-nunito font-semibold">Usuário: <span className="font-normal">{usuarioNome}</span></span>
                    <div className="flex justify-between w-full text-xs text-primary-text font-nunito mt-1">
                      <div className="flex flex-col items-start"><span className="font-semibold">Valor a faturar</span><span>{formatCurrency(venda.valorFinal)}</span></div>
                      <div className="flex flex-col items-start"><span className="font-semibold">Aberto há</span><span>{elapsedTime}</span></div>
                    </div>
                  </div>

                  {/* Botão de impressão posicionado no canto superior direito */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedVendaId(venda.id); }}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Comprovante de Venda"
                  >
                    <MdPrint size={20}/>
                  </button>
                </div>
              )
            })}

            {isLoadingMore && (
              <div className="flex justify-center py-4 col-span-full">
                <CircularProgress size={24} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedVendaId && (
        <DetalhesVendas
          vendaId={selectedVendaId}
          open={!!selectedVendaId}
          onClose={() => setSelectedVendaId(null)}
        />
      )}

    </div>
  )
}
