'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { MdAttachMoney, MdDeleteOutline, MdRestaurant, MdShare } from 'react-icons/md'
import { showToast } from '@/src/shared/utils/toast'
import { DetalhesVendas } from './DetalhesVendas'
import { CircularProgress } from '@mui/material'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { TipoVendaIcon } from './TipoVendaIcon'
import { formatElapsedTime, parseApiDateMs } from '@/src/shared/utils/formatters'
// Tipos
interface Venda {
  id: string
  numeroVenda: number
  codigoVenda: string
  numeroMesa?: number
  valorFinal: number
  tipoVenda: 'balcao' | 'mesa' | 'gestor'
  abertoPorId: string
  codigoTerminal: string
  terminalId: string
  dataCriacao: string
  dataUltimaModificacao?: string
  dataUltimoProdutoLancado?: string
  clienteId?: string | null
  clienteNome?: string | null
  identificacao?: string | null
  vendaCompartilhada?: boolean
  rodizioAberto?: boolean
  dataCancelamento?: string
  dataFinalizacao?: string
  senha?: string | null
  tipoDesconto?: string | null
  valorDesconto?: number | null
  tipoAcrescimo?: string | null
  valorAcrescimo?: number | null
  totalValorProdutosRemovidos?: number | null
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
  initialPeriodo?: string // Período inicial vindo da URL (ex: "Hoje", "Últimos 7 Dias")
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
  const [vendas, setVendas] = useState<Venda[]>([])
  const [metricas, setMetricas] = useState<MetricasVendas | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPDV[]>([])
  const [apenasSemMovimentacao, setApenasSemMovimentacao] = useState(false)

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [canLoadMore, setCanLoadMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const [detalhesVendaAberta, setDetalhesVendaAberta] = useState(false)
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

  const resolveTotalCountFromResponse = (data: any): number | null => {
    const candidates = [data?.count, data?.total, data?.totalCount]
    for (const c of candidates) {
      if (typeof c === 'number' && Number.isFinite(c)) return c
    }
    // Alguns endpoints podem expor contagem dentro de metricas
    const m = data?.metricas
    if (m && typeof m.countVendasEfetivadas === 'number' && Number.isFinite(m.countVendasEfetivadas)) {
      return m.countVendasEfetivadas
    }
    return null
  }

  const resolveHasNextFromResponse = (data: any, currentPage: number): boolean => {
    if (typeof data?.hasNext === 'boolean') return data.hasNext
    if (typeof data?.totalPages === 'number' && Number.isFinite(data.totalPages) && data.totalPages > 0) {
      return currentPage + 1 < data.totalPages
    }
    const count = resolveTotalCountFromResponse(data)
    const limit = typeof data?.limit === 'number' && Number.isFinite(data.limit) ? data.limit : pageSize
    if (typeof count === 'number' && count >= 0 && limit > 0) {
      const totalPages = Math.ceil(count / limit)
      return currentPage + 1 < totalPages
    }
    return false
  }

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
   * Instantâneo da data da API, respeitando Z e offset.
   */
  const toMs = (value: Date | string): number => {
    const ms = parseApiDateMs(value)
    return Number.isNaN(ms) ? Date.now() : ms
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
      .map(v => v.toString(16).padStart(2, '0'))
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
   * Data que define mesa parada: última modificação, ou a abertura se ela não vier.
   */
  const referenciaParada = (venda: Venda): string =>
    venda.dataUltimaModificacao && venda.dataUltimaModificacao.length > 0
      ? venda.dataUltimaModificacao
      : venda.dataCriacao

  const minutosDesde = (value: string): number =>
    Math.max(0, Math.floor((Date.now() - toMs(value)) / (1000 * 60)))

  /**
   * Ordena pela mesa mexida por último (menor tempo parado primeiro).
   */
  const sortByParadaAsc = (items: Venda[]) =>
    [...items].sort((a, b) => minutosDesde(referenciaParada(a)) - minutosDesde(referenciaParada(b)))

  /**
   * Carrega todos os usuários PDV
   */
  const loadAllUsuariosPDV = useCallback(async () => {
    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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
        })

        const response = await fetchGestorApi(`/api/usuarios?${params.toString()}`, {
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
  }, [])

  /**
   * Busca apenas mesas em aberto
   */
  const fetchVendas = useCallback(
    async (resetPage = false, filterWithoutMovement: boolean = apenasSemMovimentacao) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
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

        const response = await fetchGestorApi(`/api/vendas?${params.toString()}`, {
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

        const filteredItems = sortByParadaAsc(
          (data.items || []).filter((item: Venda) => {
            if (item.dataCancelamento || item.dataFinalizacao) return false

            if (!filterWithoutMovement) return true
            return minutosDesde(referenciaParada(item)) >= 15
          })
        )

        if (resetPage) {
          // Evita duplicidade por possíveis mudanças na paginação/ordenação do backend
          const uniqueFirstPage = Array.from(
            new Map(filteredItems.map((v: Venda) => [v.id, v] as const)).values()
          )
          setVendas(uniqueFirstPage)
          currentPageRef.current = 1
          setCurrentPage(1)
          if (data.metricas) {
            setMetricas(data.metricas)
          } else {
            setMetricas({
              countVendasEfetivadas: 0,
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
          setVendas(prev => {
            const merged = [...prev, ...filteredItems]
            return Array.from(new Map(merged.map(v => [v.id, v] as const)).values())
          })
          if (data.metricas) {
            setMetricas(data.metricas)
          }
          currentPageRef.current += 1
          setCurrentPage(prev => prev + 1)
        }

        setCanLoadMore(resolveHasNextFromResponse(data, page))
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
        showToast.error('Erro ao buscar vendas')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        setHasLoadedOnce(true)
      }
    },
    [ apenasSemMovimentacao]
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
    if (!useAuthStore.getState().tenantAuth) return

    loadAllUsuariosPDV()
    fetchVendas(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apenasSemMovimentacao])

  useEffect(() => {
    const montadoEm = Date.now()
    let ultimoPedido = 0
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - montadoEm < 2000) return
      const agora = Date.now()
      if (agora - ultimoPedido < 1500) return
      ultimoPedido = agora
      fetchVendas(true)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [fetchVendas])

  return (
    <div className="flex h-full max-h-[calc(100vh-100px)] flex-col overflow-hidden">
      {/* Container principal */}
      <div className="bg-primary-background flex h-full min-h-0 flex-col overflow-hidden rounded-b-lg rounded-t-lg md:px-2">
      <div className="flex w-full py-1 flex-row items-center justify-between">
            <p className="text-primary text-lg px-[30px] font-semibold">
              Todas as Mesas Abertas
            </p>
            <div className="flex items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-xs text-primary-text md:text-sm">
            <input
              type="checkbox"
              checked={apenasSemMovimentacao}
              onChange={e => {
                const checked = e.target.checked
                setApenasSemMovimentacao(checked)
                fetchVendas(true, checked)
              }}
              className="h-4 w-4"
            />
            Mostrar mesas com +15 min sem movimentação
          </label>
        </div>
      </div>
      <div className="h-[1px] border-t-2 border-primary/70 flex-shrink-0"></div>
        {/* Cards de Métricas */}
        <div className="bg-primary-background sticky top-0 z-10 my-1 flex flex-shrink-0 gap-1 md:gap-2">
          {/* Vendas em Aberto (fixo) */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
              <TipoVendaIcon
                tipoVenda="mesa"
                numeroMesa={vendas.length}
                size={60}
                containerScale={0.9}
                corTexto="var(--color-info)"
              />
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-center text-[10px] text-secondary-text md:text-end md:text-xs">
                Mesas Abertas
              </span>
              <span className="text-lg text-primary md:text-[22px]">
                {vendas.length}
              </span>
            </div>
          </div>

          {/* Total de Produtos Vendidos */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning">
              <span className="text-xl text-info">
                <MdRestaurant />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-center text-[10px] text-secondary-text md:text-xs">
                Total de Produtos vendidos
              </span>
              <span className="text-lg text-primary md:text-[22px]">
                {metricas?.countProdutosVendidos || 0}
              </span>
            </div>
          </div>

          {/* Total Faturado */}
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border-2 p-1 md:flex-row md:gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent1">
              <span className="text-xl text-info">
                <MdAttachMoney />
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-between md:items-end">
              <span className="text-center text-[10px] text-secondary-text md:text-xs">
                Total à faturar
              </span>
              <span className="text-lg text-primary md:text-[22px]">
                {metricas?.totalFaturado ? formatCurrency(metricas.totalFaturado) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de Vendas */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg bg-info">
          {/* Lista com scroll */}
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide grid h-full grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden px-1 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          >
            {isLoading && vendas.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <JiffyLoading />
              </div>
            )}

            {vendas.length === 0 && !isLoading && hasLoadedOnce && (
              <div className="col-span-full flex items-center justify-center md:py-12">
                <p className="text-secondary-text">Nenhuma mesa em aberto encontrada.</p>
              </div>
            )}

            {vendas.map(venda => {
              void elapsedTimeUpdateTrigger
              const usuarioNome =
                usuariosPDV.find(u => u.id === venda.abertoPorId)?.nome || venda.abertoPorId
              const clienteNome =
                typeof venda.clienteNome === 'string' && venda.clienteNome.trim() !== ''
                  ? venda.clienteNome.trim()
                  : null
              const identificacao =
                typeof venda.identificacao === 'string' && venda.identificacao.trim() !== ''
                  ? venda.identificacao.trim()
                  : null
              const nomesDiferentes = Boolean(
                identificacao && clienteNome && identificacao !== clienteNome
              )
              const nomePrincipal = nomesDiferentes ? identificacao : identificacao || clienteNome
              const nomeSecundario = nomesDiferentes ? clienteNome : null
              const compartilhada = venda.vendaCompartilhada === true
              const rodizioAberto = venda.rodizioAberto === true
              const senhaExibir =
                typeof venda.senha === 'string' && venda.senha.trim() !== ''
                  ? venda.senha.trim()
                  : null
              const codigoTerminalExibir =
                typeof venda.codigoTerminal === 'string' && venda.codigoTerminal.trim() !== ''
                  ? venda.codigoTerminal.trim()
                  : null
              const temDescontoVenda =
                venda.valorDesconto != null && Number(venda.valorDesconto) > 0
              const temAcrescimoVenda =
                venda.valorAcrescimo != null && Number(venda.valorAcrescimo) > 0
              const totalRemovidos = Number(venda.totalValorProdutosRemovidos ?? 0)
              const ultimoLancamentoRef =
                venda.dataUltimoProdutoLancado && venda.dataUltimoProdutoLancado.length > 0
                  ? venda.dataUltimoProdutoLancado
                  : venda.dataCriacao

              const minutosAberta = minutosDesde(venda.dataCriacao)
              const minutosParada = minutosDesde(referenciaParada(venda))
              const minutosUltimoProduto = minutosDesde(ultimoLancamentoRef)
              const mesaParada = minutosParada >= 15
              const rotuloTempo = mesaParada ? 'Parada há' : 'Aberta há'
              const tempoExibido = formatElapsedTime(
                mesaParada ? referenciaParada(venda) : venda.dataCriacao
              )
              const movimentoTooltip = `Aberta há ${formatDiffTooltip(minutosAberta)}\n\nÚltimo produto há ${formatDiffTooltip(minutosUltimoProduto)}`
              const innerCircleColor = getCorMesaPorTempoJS(referenciaParada(venda))

              return (
                <div
                  key={venda.id}
                  onClick={() => {
                    setSelectedVendaId(venda.id)
                    setDetalhesVendaAberta(true)
                  }}
                  className="relative flex min-h-[210px] cursor-pointer flex-col items-center justify-between rounded-lg bg-info px-1 shadow-sm shadow-primary-text/50 transition-all hover:bg-primary/5 md:w-[200px]"
                >
                  {compartilhada ? (
                    <span
                      className="absolute left-1.5 top-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-primary/40 text-primary/70"
                      title="Compartilhamento ativo"
                      aria-label="Compartilhamento ativo"
                    >
                      <MdShare
                        size={12}
                        className="relative -translate-x-[1px] shrink-0 leading-none"
                      />
                    </span>
                  ) : null}
                  {totalRemovidos > 0 ? (
                    <span
                      className="absolute right-1.5 top-1.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-error/50 text-error"
                      title="Possui itens removidos"
                      aria-label="Possui itens removidos"
                    >
                      <MdDeleteOutline size={12} className="shrink-0 leading-none" />
                    </span>
                  ) : null}
                  <div className="flex w-full flex-grow flex-col items-center justify-center">
                    <TipoVendaIcon
                      tipoVenda={venda.tipoVenda}
                      numeroMesa={venda.numeroMesa}
                      size={96}
                      containerScale={0.9}
                      corTexto="var(--color-alternate)"
                      corCirculoInterno={innerCircleColor}
                      corBorda="var(--color-alternate)"
                      className="mb-0 mt-0"
                      title={movimentoTooltip}
                    />
                    {nomePrincipal ? (
                      <span className="max-w-full truncate px-1 text-center text-xs font-semibold text-primary-text">
                        {nomePrincipal}
                      </span>
                    ) : (
                      <span className="text-xs text-info">-</span>
                    )}
                    {nomeSecundario ? (
                      <span className="max-w-full truncate px-1 text-center text-[10px] text-secondary-text">
                        {nomeSecundario}
                      </span>
                    ) : null}
                    {senhaExibir ? (
                      <span className="text-[10px] text-secondary-text">Senha: {senhaExibir}</span>
                    ) : null}
                    {codigoTerminalExibir ? (
                      <span className="text-[10px] text-secondary-text">
                        Terminal #{codigoTerminalExibir}
                      </span>
                    ) : null}
                    {rodizioAberto ? (
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                        <span className="rounded-full bg-warning/40 px-2 py-0.5 text-[10px] font-semibold text-primary-text">
                          Rodízio
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-3 flex w-full flex-col items-start px-2">
                    <div className="flex w-full flex-col items-start md:flex-row md:items-center">
                      <span className="text-xs font-semibold text-primary-text">Usuário</span>{' '}
                      <span className="max-w-full truncate text-xs font-normal">: {usuarioNome}</span>
                    </div>
                    <div className="mt-1 flex w-full justify-between text-xs text-primary-text">
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">Valor atual</span>
                        <span>{formatCurrency(venda.valorFinal)}</span>
                        {(temDescontoVenda || temAcrescimoVenda) && (
                          <span className="mt-0.5 flex flex-wrap gap-1 text-[10px] font-normal text-secondary-text">
                            {temDescontoVenda ? <span>Desc.</span> : null}
                            {temAcrescimoVenda ? <span>Acrésc.</span> : null}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{rotuloTempo}</span>
                        <span>{tempoExibido}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {isLoadingMore && (
              <div className="col-span-full flex justify-center py-4">
                <CircularProgress size={24} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedVendaId ? (
        <DetalhesVendas
          vendaId={selectedVendaId}
          open={detalhesVendaAberta}
          onClose={() => {
            setDetalhesVendaAberta(false)
            fetchVendas(true)
          }}
          onAfterClose={() => setSelectedVendaId(null)}
        />
      ) : null}
    </div>
  )
}
