'use client'

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Venda } from '@/src/domain/entities/Venda'
import { DetalhesVendas } from '@/src/presentation/components/features/vendas/DetalhesVendas'
import { TipoVendaIcon } from '@/src/presentation/components/features/vendas/TipoVendaIcon'
import { calculatePeriodo } from '@/src/shared/utils/dateFilters' // Importar calculatePeriodo
import { useDashboardUltimasVendasQuery } from '@/src/presentation/hooks/useDashboardUltimasVendasQuery'

interface VendaExtraInfo {
  tipoVenda: 'mesa' | 'balcao' | 'gestor'
  numeroMesa?: number | null
}

interface UltimasVendasProps {
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
}

/**
 * Componente de Últimas Vendas
 * Paginação infinita (20 por página) ao rolar até o fim da lista.
 */
export function UltimasVendas({ periodo, periodoInicial, periodoFinal }: UltimasVendasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }, [])

  const formatDate = useCallback((date: Date) => {
    const day = date.getDate()
    const month = date.toLocaleDateString('pt-BR', { month: 'long' })
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    // Formato: "20 fevereiro, 11:20" (sem AM/PM)
    return `${day} ${month}, ${hours}:${minutes}`
  }, [])

  const handleOpenModal = useCallback((vendaId: string) => {
    setSelectedVendaId(vendaId)
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedVendaId(null)
    setIsModalOpen(false)
  }, [])

  // Função para mapear o período do frontend para o formato esperado pela função calculatePeriodo
  const mapPeriodoToCalculateFormat = (frontendPeriodo: string): string => {
    switch (frontendPeriodo) {
      case 'Hoje':
        return 'Hoje'
      case 'Últimos 7 Dias':
        return 'Últimos 7 Dias'
      case 'Mês Atual':
        return 'Mês Atual'
      case 'Últimos 30 Dias':
        return 'Últimos 30 Dias'
      case 'Últimos 60 Dias':
        return 'Últimos 60 Dias'
      case 'Últimos 90 Dias':
        return 'Últimos 90 Dias'
      case 'Todos':
        return 'Todos'
      default:
        return 'Todos'
    }
  }

  const { inicio, fim } = useMemo(() => {
    // Intervalo definido em "Por datas" (dropdown mantém outro preset)
    if (periodoInicial && periodoFinal) {
      return { inicio: periodoInicial, fim: periodoFinal }
    }

    const mappedPeriodo = mapPeriodoToCalculateFormat(periodo)
    // "Todos" => não aplica filtro
    if (mappedPeriodo === 'Todos') return { inicio: null, fim: null }

    const { inicio: calcInicio, fim: calcFim } = calculatePeriodo(mappedPeriodo)
    return { inicio: calcInicio, fim: calcFim }
  }, [periodo, periodoInicial, periodoFinal])

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDashboardUltimasVendasQuery({
    periodoInicial: inicio,
    periodoFinal: fim,
    limit: 20,
  })

  // Carrega próxima página ao chegar no fim da área rolável
  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !hasNextPage) return

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries
        if (!entry?.isIntersecting) return
        void fetchNextPage()
      },
      { root, rootMargin: '120px', threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasNextPage, fetchNextPage, data?.items?.length])

  const { vendas, vendasExtraInfo } = useMemo(() => {
    const items = data?.items ?? []
    if (!items.length) {
      return { vendas: [] as Venda[], vendasExtraInfo: new Map<string, VendaExtraInfo>() }
    }

    const extraInfoMap = new Map<string, VendaExtraInfo>()
    const vendasMapeadas: Venda[] = (items || []).map((item: any) => {
          const userId =
            item.abertoPor?.id ||
            item.usuarioPdv?.id ||
            item.usuario?.id ||
            item.abertoPorId ||
            item.usuarioId ||
            ''

          const dataVenda = item.dataCriacao
            ? new Date(item.dataCriacao)
            : item.data
              ? new Date(item.data)
              : item.createdAt
                ? new Date(item.createdAt)
                : item.dataAbertura
                  ? new Date(item.dataAbertura)
                  : new Date()
          const valorFaturado = item.valorFinal || item.valorTotal || item.valor || 0
          const numeroVenda = item.numeroVenda || item.numero || item.id || ''
          const tipoVendaRaw = item.tipoVenda || item.tipo || 'Balcão'
          // Normalizar tipoVenda para o formato esperado pelo TipoVendaIcon
          // Aceita variações: 'Mesa', 'mesa', 'MESA', etc.
          const tipoVendaLower = tipoVendaRaw.toLowerCase().trim()
          const origemLower = String(item.origem ?? '')
            .toLowerCase()
            .trim()
          const ehGestor =
            tipoVendaLower === 'gestor' ||
            item.tabelaOrigem === 'venda_gestor' ||
            origemLower.includes('gestor')
          const tipoVendaNormalizado = ehGestor
            ? 'gestor'
            : tipoVendaLower === 'mesa'
              ? 'mesa'
              : 'balcao'
          // Extrair numeroMesa com múltiplos fallbacks
          const numeroMesa =
            item.numeroMesa !== undefined && item.numeroMesa !== null
              ? item.numeroMesa
              : item.mesa?.numero !== undefined && item.mesa?.numero !== null
                ? item.mesa.numero
                : item.mesa?.numeroMesa !== undefined && item.mesa?.numeroMesa !== null
                  ? item.mesa.numeroMesa
                  : item.mesaNumero !== undefined && item.mesaNumero !== null
                    ? item.mesaNumero
                    : null
          const metodoPagamento =
            item.meioPagamento?.nome ||
            item.meioPagamentoNome ||
            item.metodoPagamento ||
            item.formaPagamento ||
            'Não informado'
          // Todas as vendas retornadas serão FINALIZADAS, então sempre 'Aprovada'
          const status = 'Aprovada'
          const dataUltimoProdutoLancado = item.dataUltimoProdutoLancado
            ? new Date(item.dataUltimoProdutoLancado)
            : null
          const dataUltimaMovimentacao = item.dataUltimaMovimentacao
            ? new Date(item.dataUltimaMovimentacao)
            : null
          const dataCancelamento = item.dataCancelamento ? new Date(item.dataCancelamento) : null
          const dataFinalizacao = item.dataFinalizacao ? new Date(item.dataFinalizacao) : null

          const vendaId = item.id?.toString() || ''

          // Armazenar informações extras para o TipoVendaIcon
          // Converte numeroMesa para número, tratando 0 como valor válido
          let numeroMesaConvertido: number | null = null
          if (numeroMesa !== null && numeroMesa !== undefined) {
            if (typeof numeroMesa === 'number') {
              numeroMesaConvertido = numeroMesa
            } else {
              const parsed = parseInt(String(numeroMesa), 10)
              numeroMesaConvertido = isNaN(parsed) ? null : parsed
            }
          }

          extraInfoMap.set(vendaId, {
            tipoVenda: tipoVendaNormalizado,
            numeroMesa: numeroMesaConvertido,
          })

          return Venda.create(
            vendaId,
            dataVenda,
            typeof numeroVenda === 'number' ? numeroVenda : parseInt(numeroVenda) || 0,
            userId,
            tipoVendaRaw,
            valorFaturado, // valorInicial
            0, // acrescimo
            0, // descontoConta
            0, // descontoItem
            valorFaturado,
            metodoPagamento,
            status as 'Aprovada' | 'Cancelada',
            dataUltimoProdutoLancado,
            dataUltimaMovimentacao,
            dataCancelamento,
            dataFinalizacao
          )
        })
    const ultimasVendas = vendasMapeadas.sort((a, b) => {
      const dataA = a.getDataFinalizacao() || a.getData()
      const dataB = b.getDataFinalizacao() || b.getData()
      return dataB.getTime() - dataA.getTime()
    })
    return { vendas: ultimasVendas, vendasExtraInfo: extraInfoMap }
  }, [data])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/3 rounded bg-gray-200"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-100"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Erro ao carregar vendas'}
          </p>
          <button
            onClick={() => void refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const userNames = data?.userNames ?? {}

  return (
    <>
      <div
        ref={scrollRootRef}
        className="scrollbar-hide h-[440px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-sm shadow-primary/70 md:p-6"
      >
        <div className="mb-2 flex items-center justify-center md:mb-6 md:justify-between">
          <h3 className="text-lg font-semibold text-primary">Vendas do Período</h3>
        </div>

        <div className="space-y-4">
          {vendas.length === 0 && !isLoading ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">Nenhuma venda encontrada</p>
            </div>
          ) : (
            vendas.map(venda => {
              const displayUserId = venda.getUserId()
              const displayedName = userNames[displayUserId] || 'Usuário Desconhecido'

              return (
                <div
                  key={venda.getId()}
                  className="group flex cursor-pointer flex-col items-center justify-between rounded-lg border border-primary/50 bg-white p-2 transition-colors hover:bg-primary/10 md:flex-row md:p-4"
                  onClick={() => handleOpenModal(venda.getId())}
                >
                  <div className="flex w-full flex-1 items-center md:w-auto md:gap-4">
                    {/* Ícone do tipo de venda (Mesa ou Balcão) */}
                    <div
                      className="flex-shrink-0 md:flex"
                      style={{ minWidth: 'fit-content', minHeight: 'fit-content' }}
                    >
                      {(() => {
                        const extraInfo = vendasExtraInfo.get(venda.getId())
                        if (extraInfo) {
                          return (
                            <TipoVendaIcon
                              tipoVenda={extraInfo.tipoVenda}
                              numeroMesa={extraInfo.numeroMesa}
                              size={55}
                              containerScale={0.9}
                              corTexto="#FFFFFF"
                              corPrincipal="var(--color-primary)"
                              corSecundaria="var(--color-info)"
                              corBorda="var(--color-primary)"
                              corFundo="var(--color-primary-background)"
                              corBalcao="var(--color-primary)"
                              corGestor="var(--color-primary)"
                            />
                          )
                        }
                        // Fallback: se não tiver info, mostra ícone de balcão
                        return (
                          <TipoVendaIcon
                            tipoVenda="balcao"
                            size={55}
                            containerScale={0.9}
                            corBalcao="var(--color-primary)"
                          />
                        )
                      })()}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col md:gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {displayedName}
                      </p>
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold text-primary-text">Fechada em:</span>{' '}
                        {formatDate(venda.getDataFinalizacao() || venda.getData())}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 md:w-auto">
                    <div className="mx-2 flex w-full flex-row items-center justify-between gap-2 md:mx-0 md:flex-col md:justify-end md:text-right">
                      <p className="text-sm font-semibold text-green-600 md:text-base">
                        {formatCurrency(venda.getValorFaturado())}
                      </p>
                      <p className="text-xs text-gray-500">Venda #{venda.getNumeroVenda()}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {hasNextPage && (
          <div
            ref={sentinelRef}
            className="flex min-h-[48px] items-center justify-center py-2"
            aria-hidden
          >
            {isFetchingNextPage && (
              <span className="text-xs text-gray-500">Carregando mais vendas…</span>
            )}
          </div>
        )}
      </div>
      <DetalhesVendas
        vendaId={selectedVendaId || ''}
        open={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}
