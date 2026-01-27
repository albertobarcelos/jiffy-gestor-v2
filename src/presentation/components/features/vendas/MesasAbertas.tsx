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
  dataUltimaModificacao?: string
  dataUltimoProdutoLancado?: string
  dataUltimaMovimentacao?: string
  clienteId?: string
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


interface MesasAbertasProps {
  initialPeriodo?: string; // Período inicial vindo da URL (ex: "Hoje", "Últimos 7 Dias")
}

const COR_INICIAL = '#EEEFF5'
const COR_FINAL = '#E6AA37'
const DUR_MIN_MS = 15 * 60 * 1000 // 15 minutos
const DUR_MAX_MS = 2 * 60 * 60 * 1000 // 2 horas

/**
 * Componente de listagem de mesas em aberto
 * Exibe apenas mesas (não balcão) com scroll infinito e cards de métricas
 */
export function MesasAbertas({ initialPeriodo }: MesasAbertasProps) {
  const { auth } = useAuthStore()

  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])
  const [ultimoProdutoPorVenda, setUltimoProdutoPorVenda] = useState<Record<string, string | null>>({})
  const [vendaClienteIdMap, setVendaClienteIdMap] = useState<Record<string, string | null>>({})
  const [clienteNomeMap, setClienteNomeMap] = useState<Record<string, string | null>>({})
  const [apenasSemMovimentacao, setApenasSemMovimentacao] = useState(false)
  const [cachesHydrated, setCachesHydrated] = useState(false)

  // Hidrata caches de cliente a partir da sessionStorage para evitar refetch após reload
  useEffect(() => {
    try {
      const storedVendaCliente = sessionStorage.getItem('mesasAbertas_vendaClienteIdMap')
      const storedClienteNome = sessionStorage.getItem('mesasAbertas_clienteNomeMap')
      if (storedVendaCliente) {
        setVendaClienteIdMap(JSON.parse(storedVendaCliente))
      }
      if (storedClienteNome) {
        setClienteNomeMap(JSON.parse(storedClienteNome))
      }
      setCachesHydrated(true)
    } catch (err) {
      console.warn('Não foi possível ler caches de cliente da sessão', err)
      setCachesHydrated(true)
    }
  }, [])

  // Persiste caches na sessionStorage para reaproveitar após reload
  useEffect(() => {
    try {
      sessionStorage.setItem('mesasAbertas_vendaClienteIdMap', JSON.stringify(vendaClienteIdMap))
      sessionStorage.setItem('mesasAbertas_clienteNomeMap', JSON.stringify(clienteNomeMap))
    } catch (err) {
      console.warn('Não foi possível salvar caches de cliente na sessão', err)
    }
  }, [vendaClienteIdMap, clienteNomeMap])

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
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
   * Parser alinhado ao formatElapsedTime:
   * - Se string, remove offset/Z para tratar como horário local "puro"
   * - Se falhar, tenta parse padrão
   */
  const parseDateLocalWallTime = (value: string): Date => {
    const raw = value || ''
    const stripped = raw.replace(/([+-]\d{2}:\d{2}|[zZ])$/, '')
    const localParsed = new Date(stripped)
    if (!Number.isNaN(localParsed.getTime())) return localParsed
    const fallback = new Date(raw)
    if (!Number.isNaN(fallback.getTime())) return fallback
    return new Date()
  }

  /**
   * Converte Date|string em timestamp ms, usando o mesmo parser de cima.
   */
  const toMs = (value: Date | string): number => {
    if (value instanceof Date) return value.getTime()
    return parseDateLocalWallTime(value).getTime()
  }

  /**
   * Formata diff em minutos para texto (min, h, dia).
   */
  const formatDiffTooltip = (diffMinutes: number): string => {
    if (diffMinutes < 60) return `${diffMinutes} min`
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    if (hours < 24) {
      if (minutes === 0) return `${hours}h`
      return `${hours}h ${minutes} min`
    }

    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    // Para >= 1 dia, não exibimos minutos
    if (remHours === 0) return `${days} dia${days === 1 ? '' : 's'}`
    return `${days} dia${days === 1 ? '' : 's'} ${remHours}h`
  }

  const lerpColor = (hexA: string, hexB: string, t: number): string => {
    const toRGB = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16)
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
    }
    const a = toRGB(hexA)
    const b = toRGB(hexB)
    const clamped = Math.max(0, Math.min(1, t))
    const mix = (x: number, y: number) => Math.round(x + (y - x) * clamped)
    return `#${[mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')}`
  }

  const getCorMesaPorTempoJS = (tempoReferencia: Date | string): string => {
    const abertaMs = Math.max(0, Date.now() - toMs(tempoReferencia))
    if (abertaMs < DUR_MIN_MS) return COR_INICIAL
    if (abertaMs >= DUR_MAX_MS) return COR_FINAL
    const progresso = (abertaMs - DUR_MIN_MS) / (DUR_MAX_MS - DUR_MIN_MS)
    return lerpColor(COR_INICIAL, COR_FINAL, progresso)
  }

  /**
   * Ordena vendas por data de criação (mais recente primeiro).
   */
  const sortByDataCriacaoDesc = (items: Venda[]) =>
    [...items].sort((a, b) => {
      const aDate = parseDateLocalWallTime(a.dataCriacao).getTime()
      const bDate = parseDateLocalWallTime(b.dataCriacao).getTime()
      return bDate - aDate
    })

  /**
   * Ordena por tempo sem movimentação (mais recente primeiro: menor diff).
   */
  const sortByUltimaMovimentacaoAsc = (items: Venda[]) =>
    [...items].sort((a, b) => diffMinutosDesdeUltimaMovimentacao(a) - diffMinutosDesdeUltimaMovimentacao(b))

  /**
   * Retorna o tempo em minutos desde a última movimentação conhecida.
   */
  const diffMinutosDesdeUltimaMovimentacao = (venda: Venda): number => {
    const referencia =
      venda.dataUltimaModificacao 
    const ref = parseDateLocalWallTime(referencia || venda.dataCriacao)
    return Math.floor((Date.now() - ref.getTime()) / (1000 * 60))
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
   * Busca data do último produto lançado para uma lista de vendas
   */
  const fetchUltimoProdutoLancado = useCallback(
    async (ids: string[]) => {
      const token = auth?.getAccessToken()
      if (!token || ids.length === 0) return

      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const response = await fetch(`/api/vendas/${id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              if (!response.ok) {
                return { id, dataUltimoProdutoLancado: null }
              }
              const data = await response.json()
              return { id, dataUltimoProdutoLancado: data.dataUltimoProdutoLancado || null }
            } catch {
              return { id, dataUltimoProdutoLancado: null }
            }
          })
        )

        setUltimoProdutoPorVenda((prev) => {
          const next = { ...prev }
          results.forEach(({ id, dataUltimoProdutoLancado }) => {
            if (dataUltimoProdutoLancado !== undefined) {
              next[id] = dataUltimoProdutoLancado
            }
          })
          return next
        })
      } catch (error) {
        console.error('Erro ao buscar último produto lançado:', error)
      }
    },
    [auth]
  )

  /**
   * Busca o clienteId a partir do detalhe da venda (endpoint de detalhes).
   */
  const fetchClienteIdPorVenda = useCallback(
    async (ids: string[]) => {
      const token = auth?.getAccessToken()
      if (!token || ids.length === 0) return

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await fetch(`/api/vendas/${id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (!response.ok) return { id, clienteId: null }
            const data = await response.json()
            const clienteId = (data.clienteId as string | undefined) || null
            return { id, clienteId }
          } catch {
            return { id, clienteId: null }
          }
        })
      )

      setVendaClienteIdMap((prev) => {
        const next = { ...prev }
        results.forEach(({ id, clienteId }) => {
          // marca mesmo que null para evitar refetch infinito
          next[id] = clienteId
        })
        return next
      })
    },
    [auth]
  )

  /**
   * Busca nome do cliente dado o clienteId (usa mesmo endpoint de VisualizarCliente).
   */
  const fetchNomesClientes = useCallback(
    async (clienteIds: string[]) => {
      const token = auth?.getAccessToken()
      if (!token || clienteIds.length === 0) return

      const results = await Promise.all(
        clienteIds.map(async (clienteId) => {
          try {
            const response = await fetch(`/api/clientes/${clienteId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })
            if (!response.ok) return { clienteId, nome: null }
            const data = await response.json()
            const nome = (data?.nome || data?.razaoSocial || '').trim()
            return { clienteId, nome: nome || null }
          } catch {
            return { clienteId, nome: null }
          }
        })
      )

      setClienteNomeMap((prev) => {
        const next = { ...prev }
        results.forEach(({ clienteId, nome }) => {
          next[clienteId] = nome // nome pode ser null para evitar refetch
        })
        return next
      })
    },
    [auth]
  )


  /**
   * Busca apenas mesas em aberto
   */
  const fetchVendas = useCallback(
    async (resetPage = false, filterWithoutMovement: boolean = apenasSemMovimentacao) => {
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

        const filteredItems = sortByUltimaMovimentacaoAsc(
          (data.items || []).filter((item: Venda) => {
            if (item.dataCancelamento || item.dataFinalizacao) return false

            if (!filterWithoutMovement) return true
            return diffMinutosDesdeUltimaMovimentacao(item) > 15
          })
        )

        if (resetPage) {
          setVendas(filteredItems)
          currentPageRef.current = 1
          setCurrentPage(1)
          const nextCount = filteredItems.length
          if (data.metricas) {
            setMetricas({ ...data.metricas, countVendasEfetivadas: nextCount })
          } else {
            setMetricas({
              countVendasEfetivadas: nextCount,
              countVendasCanceladas: 0,
              countProdutosVendidos: 0,
              totalFaturado: 0,
            })
          }
          
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
          setVendas((prev) => {
            const next = [...prev, ...filteredItems]
            const nextCount = next.length
            setMetricas((prevMetricas) => {
              const base = data.metricas ?? prevMetricas ?? {
                countVendasCanceladas: 0,
                countProdutosVendidos: 0,
                totalFaturado: 0,
                countVendasEfetivadas: 0,
              }
              return { ...base, countVendasEfetivadas: nextCount }
            })
            return next
          })
          currentPageRef.current += 1
          setCurrentPage((prev) => prev + 1)
        }

        setCanLoadMore(data.hasNext || false)
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
        showToast.error('Erro ao buscar vendas')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        setHasLoadedOnce(true)
      }
    },
    [auth, apenasSemMovimentacao]
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

  /**
   * Busca data do último produto lançado para as vendas listadas
   */
  useEffect(() => {
    const ids = vendas
      .map((v) => v.id)
      .filter((id) => ultimoProdutoPorVenda[id] === undefined)

    if (ids.length > 0) {
      fetchUltimoProdutoLancado(ids)
    }
  }, [vendas, fetchUltimoProdutoLancado, ultimoProdutoPorVenda])

  // Buscar clienteId via detalhe da venda para cada venda listada
  useEffect(() => {
    const ids = vendas
      .map((v) => v.id)
      .filter((id) => !(id in vendaClienteIdMap))

    if (ids.length > 0) {
      fetchClienteIdPorVenda(ids)
    }
  }, [vendas, vendaClienteIdMap, fetchClienteIdPorVenda])

  // Buscar nome do cliente para clienteIds recém obtidos
  useEffect(() => {
    const clienteIds = Object.values(vendaClienteIdMap).filter(
      (cid): cid is string => !!cid && !(cid in clienteNomeMap)
    )
    if (clienteIds.length > 0) {
      fetchNomesClientes(clienteIds)
    }
  }, [vendaClienteIdMap, clienteNomeMap, fetchNomesClientes])

  // Efeito para carregar dados auxiliares e iniciar a busca de vendas
  useEffect(() => {
    if (!auth || !cachesHydrated) return
    
    loadAllUsuariosPDV()
    fetchVendas(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, cachesHydrated, apenasSemMovimentacao])

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden">
      {/* Container principal */}
      <div className="bg-primary-background rounded-t-lg rounded-b-lg md:px-2 flex flex-col h-full min-h-0 overflow-hidden">

        {/* Filtro por tempo sem movimentação */}
        <div className="flex items-center justify-end gap-2 py-2">
          <label className="md:text-sm text-xs text-primary-text font-nunito flex items-center gap-2">
            <input
              type="checkbox"
              checked={apenasSemMovimentacao}
              onChange={(e) => {
                const checked = e.target.checked
                setApenasSemMovimentacao(checked)
                fetchVendas(true, checked)
              }}
              className="h-4 w-4"
            />
            Mostrar mesas com +15 min sem movimentação
          </label>
        </div>

        {/* Cards de Métricas */}
        <div className="flex md:gap-2 gap-1 my-1 flex-shrink-0 sticky top-0 z-10 bg-primary-background">
          {/* Vendas em Aberto (fixo) */}
          <div className="flex-1 border-2 rounded-lg p-1 flex md:flex-row flex-col items-center justify-center md:gap-3 gap-1">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
              <TipoVendaIcon
                tipoVenda="mesa"
                numeroMesa={metricas?.countVendasEfetivadas || 0}
                size={60}
                containerScale={0.90}
                corTexto="var(--color-info)"
              />
            </div>
            <div className="flex flex-col items-center md:items-end justify-between flex-1">
              <span className="md:text-xs text-[10px] text-secondary-text text-center md:text-end font-nunito">
                Mesas Abertas
              </span>
              <span className="md:text-[22px] text-lg text-primary font-exo">
                {metricas?.countVendasEfetivadas || 0}
              </span>
            </div>
          </div>

          {/* Total de Produtos Vendidos */}
          <div className="flex-1 rounded-lg border-2 p-1 flex md:flex-row flex-col items-center justify-center md:gap-3 gap-1">
            <div className="w-10 h-10 rounded-full bg-warning flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdRestaurant /></span>
            </div>
            <div className="flex flex-col items-center md:items-end justify-between flex-1">
              <span className="md:text-xs text-[10px] text-secondary-text text-center font-nunito">Total de Produtos vendidos</span>
              <span className="md:text-[22px] text-lg text-primary font-exo">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex-1 rounded-lg border-2 p-1 flex md:flex-row flex-col items-center justify-center md:gap-3 gap-1">
            <div className="w-10 h-10 rounded-full bg-accent1 flex items-center justify-center flex-shrink-0">
              <span className="text-info text-xl"><MdAttachMoney /></span>
            </div>
            <div className="flex flex-col items-center md:items-end justify-between flex-1">
              <span className="md:text-xs text-[10px] text-secondary-text text-center font-nunito">Total à faturar</span>
              <span className="md:text-[22px] text-lg text-primary font-exo">
                {metricas?.totalFaturado ? formatCurrency(metricas.totalFaturado) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="bg-info rounded-lg min-h-0 flex flex-col overflow-hidden">
          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto overflow-x-hidden px-1 py-2 scrollbar-hide grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2"
          >
            {isLoading && vendas.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 col-span-full">
                <img
                  src="/images/jiffy-loading.gif"
                  alt="Carregando"
                  className="w-20 object-contain"
                />
                <span className="text-sm font-medium font-nunito text-primary-text">Carregando...</span>
              </div>
            )}

            {vendas.length === 0 && !isLoading && hasLoadedOnce && (
              <div className="flex items-center justify-center md:py-12 col-span-full">
                <p className="text-secondary-text">Nenhuma mesa em aberto encontrada.</p>
              </div>
            )}

            {vendas.map((venda) => {
              // Texto "Movimentado há" usa data de criação; cor/tooltip usam movimentações
              const elapsedTime = formatElapsedTime(venda.dataCriacao)
              const usuarioNome =
                usuariosPDV.find((u) => u.id === venda.abertoPorId)?.nome || venda.abertoPorId
              const resolvedClienteId =
                venda.clienteId || vendaClienteIdMap[venda.id] || undefined
              const clienteNome =
                (resolvedClienteId !== undefined && clienteNomeMap[resolvedClienteId]) || null

              const minutosUltimoProduto = venda.dataUltimoProdutoLancado
                ? Math.floor((Date.now() - toMs(venda.dataUltimoProdutoLancado)) / 60000)
                : ultimoProdutoPorVenda[venda.id]
                ? Math.floor((Date.now() - toMs(ultimoProdutoPorVenda[venda.id]!)) / 60000)
                : Math.floor((Date.now() - toMs(venda.dataCriacao)) / 60000)

              // Fallback para movimentação: dataUltimaMovimentacao -> dataUltimoProdutoLancado -> detalhe -> criação
              const minutosUltimaMov =
                venda.dataUltimaMovimentacao && venda.dataUltimaMovimentacao.length > 0
                  ? Math.floor((Date.now() - toMs(venda.dataUltimaMovimentacao)) / 60000)
                  : venda.dataUltimaModificacao && venda.dataUltimaModificacao.length > 0
                  ? Math.floor((Date.now() - toMs(venda.dataUltimaModificacao)) / 60000)
                  : venda.dataUltimoProdutoLancado && venda.dataUltimoProdutoLancado.length > 0
                  ? Math.floor((Date.now() - toMs(venda.dataUltimoProdutoLancado)) / 60000)
                  : ultimoProdutoPorVenda[venda.id]
                  ? Math.floor((Date.now() - toMs(ultimoProdutoPorVenda[venda.id]!)) / 60000)
                  : Math.floor((Date.now() - toMs(venda.dataCriacao)) / 60000)

              // Debug do tempo de movimentação
              if (typeof window !== 'undefined') {
                // eslint-disable-next-line no-console
                console.log('mesas-abertas::ultima-mov', {
                  id: venda.id,
                  dataUltimaMovimentacao: venda.dataUltimaMovimentacao,
                  minutosUltimaMov,
                  dataUltimoProdutoLancado: venda.dataUltimoProdutoLancado,
                  minutosUltimoProduto,
                  dataCriacao: venda.dataCriacao,
                })
              }

              // Debug: ver se estamos capturando os tempos corretamente
              if (typeof window !== 'undefined') {
                // eslint-disable-next-line no-console
                console.log('mesas-abertas::tempos', {
                  id: venda.id,
                  minutosUltimoProduto,
                  minutosUltimaMov,
                  dataUltimoProdutoLancado: venda.dataUltimoProdutoLancado,
                  dataUltimaMovimentacao: venda.dataUltimaMovimentacao,
                  dataCriacao: venda.dataCriacao,
                })
              }

              const movimentoTooltip =
                `# Últ. produto - ${formatDiffTooltip(minutosUltimoProduto)}` +
                (minutosUltimaMov !== null && minutosUltimaMov !== undefined
                  ? `\n\n# Últ. movimentação - ${formatDiffTooltip(minutosUltimaMov)}`
                  : '')

              // Cor baseada no tempo de movimentação (15 min -> 2h)
              let innerCircleColor = COR_FINAL
              const minutosParaCor = minutosUltimoProduto
              if (minutosParaCor < 15) {
                innerCircleColor = COR_INICIAL
              } else if (minutosParaCor < 120) {
                const progresso = (minutosParaCor - 15) / (120 - 15)
                innerCircleColor = lerpColor(COR_INICIAL, COR_FINAL, progresso)
              }

              return (
                <div
                  key={venda.id}
                  onClick={() => setSelectedVendaId(venda.id)}
                  className="cursor-pointer md:px-2 rounded-lg flex flex-col items-center justify-between shadow-sm shadow-primary-text/50 hover:bg-primary/5 transition-all md:w-[200px] h-[200px] md:h-[220px] relative bg-info">

                  <div className="flex flex-col items-center justify-center flex-grow">
                    <TipoVendaIcon
                      tipoVenda={venda.tipoVenda}
                      numeroMesa={venda.numeroMesa}
                      size={110} // Tamanho grande para o ícone
                      containerScale={0.90} // Reduz espaço externo do ícone
                      corTexto="var(--color-alternate)" // Cor do texto do número da mesa
                      corCirculoInterno={innerCircleColor} // Fundo dinâmico: branco -> amarelo
                      corBorda="var(--color-alternate)" // Borda sempre forte (roxo)
                      className="mt-0 mb-0"
                      title={movimentoTooltip}
                    />
                    {clienteNome ? (
                      <span className="text-xs text-primary-text font-semibold font-nunito">{clienteNome}</span>
                    ) : <span className="text-xs text-info font-nunito">-</span>}
                  </div>

                  <div className="w-full flex flex-col items-start px-2 mb-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center"><span className="text-xs text-primary-text font-nunito font-semibold">Usuário:</span> <span className="font-normal text-xs">{usuarioNome}</span></div>
                    <div className="flex justify-between w-full text-xs text-primary-text font-nunito mt-1">
                      <div className="flex flex-col items-start"><span className="font-semibold">Valor atual</span><span>{formatCurrency(venda.valorFinal)}</span></div>
                      <div className="flex flex-col items-start"><span className="font-semibold">Aberta há</span><span>{elapsedTime}</span></div>
                    </div>
                  </div>

                  
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
