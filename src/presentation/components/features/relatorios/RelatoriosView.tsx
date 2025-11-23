'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Venda } from '@/src/domain/entities/Venda'
import { Faturamento } from '@/src/domain/entities/Faturamento'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Componente principal de Relatórios
 * Replica o design e funcionalidades do Flutter
 */
export function RelatoriosView() {
  const { auth } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'vendas' | 'faturamento'>('vendas')
  const [vendas, setVendas] = useState<Venda[]>([])
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([])
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('Hoje')
  const [dataInicio, setDataInicio] = useState<Date | null>(null)
  const [dataFim, setDataFim] = useState<Date | null>(null)
  const [mostrarModalDatas, setMostrarModalDatas] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [offset, setOffset] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
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

  const loadVendas = useCallback(
    async (reset: boolean = false) => {
      const token = auth?.getAccessToken()
      if (!token) return

      if (isLoadingRef.current || (!hasNextPageRef.current && !reset)) return

      setIsLoading(true)
      isLoadingRef.current = true

      if (reset) {
        setOffset(0)
        offsetRef.current = 0
        setVendas([])
        setHasNextPage(true)
        hasNextPageRef.current = true
      }

      const currentOffset = reset ? 0 : offsetRef.current

      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockVendas: Venda[] = []
        
        setVendas((prev) => (reset ? mockVendas : [...prev, ...mockVendas]))
        const newOffset = reset ? mockVendas.length : offsetRef.current + mockVendas.length
        setOffset(newOffset)
        offsetRef.current = newOffset
        setHasNextPage(mockVendas.length === 10)
        hasNextPageRef.current = mockVendas.length === 10
      } catch (error) {
        console.error('Erro ao carregar vendas:', error)
        setHasNextPage(false)
        hasNextPageRef.current = false
      } finally {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    },
    [auth, filtroPeriodo, dataInicio, dataFim]
  )

  const loadFaturamentos = useCallback(
    async () => {
      const token = auth?.getAccessToken()
      if (!token) return

      setIsLoading(true)
      try {
        // TODO: Implementar chamada à API quando disponível
        // Por enquanto, dados mockados
        const mockFaturamentos: Faturamento[] = []
        setFaturamentos(mockFaturamentos)
      } catch (error) {
        console.error('Erro ao carregar faturamentos:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [auth, filtroPeriodo, dataInicio, dataFim]
  )

  // Scroll infinito
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || activeTab !== 'vendas') return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (
        scrollTop + clientHeight >= scrollHeight - 200 &&
        !isLoadingRef.current &&
        hasNextPageRef.current
      ) {
        loadVendas()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isLoading, hasNextPage])

  // Carrega dados quando o filtro muda
  useEffect(() => {
    const token = auth?.getAccessToken()
    if (!token) return

    if (activeTab === 'vendas') {
      loadVendas(true)
    } else {
      loadFaturamentos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo, dataInicio, dataFim, activeTab])

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

  // Cálculos de resumo
  const totalVendas = vendas.length
  const vendasCanceladas = vendas.filter((v) => v.isCancelada()).length
  const totalAcrescimos = vendas.reduce((sum, v) => sum + v.getAcrescimo(), 0)
  const totalDescontos = vendas.reduce((sum, v) => sum + v.getTotalDescontos(), 0)
  const valorFaturado = vendas.filter((v) => v.isAprovada()).reduce((sum, v) => sum + v.getValorFaturado(), 0)

  const opcoesPeriodo = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Últimos 30 dias', 'Este mês', 'Mês passado']

  return (
    <div className="flex flex-col h-full">
      <div className="px-[30px] py-[30px]">
        {/* Tabs */}
        <div className="bg-info rounded-[10px] mb-6">
          <div className="flex border-b border-alternate">
            <button
              onClick={() => setActiveTab('vendas')}
              className={`px-5 py-3 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'vendas'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Vendas
            </button>
            <button
              onClick={() => setActiveTab('faturamento')}
              className={`px-5 py-3 text-sm font-semibold font-exo transition-colors ${
                activeTab === 'faturamento'
                  ? 'text-primary border-b-2 border-tertiary'
                  : 'text-secondary-text hover:text-primary'
              }`}
            >
              Faturamento
            </button>
          </div>

          {/* Conteúdo das tabs */}
          <div className="p-[18px]">
            {activeTab === 'vendas' ? (
              <div className="space-y-6">
                {/* Header com filtros */}
                <div className="flex items-center justify-between">
                  <h3 className="text-primary text-base font-semibold font-exo">
                    Relatório de Vendas
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-semibold font-nunito">
                      Período:
                    </span>
                    <select
                      value={filtroPeriodo}
                      onChange={(e) => setFiltroPeriodo(e.target.value)}
                      className="h-9 w-[180px] px-4 rounded-[50px] bg-primary text-info text-sm font-nunito focus:outline-none"
                    >
                      {opcoesPeriodo.map((opcao) => (
                        <option key={opcao} value={opcao}>
                          {opcao}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setMostrarModalDatas(true)}
                      className="h-9 px-4 bg-primary text-info rounded-[50px] text-sm font-medium font-exo hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      Por datas
                      <span className="text-base">📅</span>
                    </button>
                  </div>
                </div>

                {/* Cards de resumo */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="h-20 bg-info rounded-[10px] p-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-alternate flex items-center justify-center">
                      <span className="text-2xl">🛒</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-secondary-text text-xs font-nunito mb-1">
                        Total de Vendas
                      </p>
                      <p className="text-primary text-xl font-semibold font-exo">
                        {totalVendas}
                      </p>
                    </div>
                  </div>

                  <div className="h-20 bg-info rounded-[10px] p-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-error flex items-center justify-center">
                      <span className="text-2xl text-info">✕</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-secondary-text text-xs font-nunito mb-1">
                        Vendas Canceladas
                      </p>
                      <p className="text-primary text-xl font-semibold font-exo">
                        {vendasCanceladas}
                      </p>
                    </div>
                  </div>

                  <div className="h-20 bg-info rounded-[10px] p-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-accent3 flex items-center justify-center">
                      <span className="text-2xl text-info">+</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-secondary-text text-xs font-nunito mb-1">
                        Acréscimos
                      </p>
                      <p className="text-primary text-xl font-semibold font-exo">
                        {formatarMoeda(totalAcrescimos)}
                      </p>
                    </div>
                  </div>

                  <div className="h-20 bg-info rounded-[10px] p-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-warning flex items-center justify-center">
                      <span className="text-2xl text-info">-</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-secondary-text text-xs font-nunito mb-1">
                        Descontos
                      </p>
                      <p className="text-primary text-xl font-semibold font-exo">
                        {formatarMoeda(totalDescontos)}
                      </p>
                    </div>
                  </div>

                  <div className="h-20 bg-info rounded-[10px] p-2 flex items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                      <span className="text-2xl text-info">💰</span>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-secondary-text text-xs font-nunito mb-1">
                        Valor Faturado
                      </p>
                      <p className="text-primary text-xl font-semibold font-exo">
                        {formatarMoeda(valorFaturado)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de vendas */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[calc(100vh-500px)] overflow-y-auto bg-[#EEEEF5] rounded-[10px] p-4"
                >
                  {vendas.length === 0 && !isLoading && (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-secondary-text">Nenhuma venda encontrada.</p>
                    </div>
                  )}

                  {vendas.map((venda) => (
                    <div
                      key={venda.getId()}
                      className="mb-3 p-4 bg-primary-bg rounded-lg border border-secondary"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="text-sm font-semibold text-primary-text">
                              Venda #{venda.getNumeroVenda()}
                            </p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                venda.isAprovada()
                                  ? 'bg-success/20 text-success'
                                  : 'bg-error/20 text-error'
                              }`}
                            >
                              {venda.getStatus()}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-xs text-secondary-text">
                            <div>
                              <p className="font-medium">Data:</p>
                              <p>{formatarData(venda.getData())}</p>
                            </div>
                            <div>
                              <p className="font-medium">Usuário:</p>
                              <p>{venda.getUsuario()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Tipo:</p>
                              <p>{venda.getTipoVenda()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Método Pagamento:</p>
                              <p>{venda.getMetodoPagamento()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-primary-text mb-1">
                            {formatarMoeda(venda.getValorFaturado())}
                          </p>
                          {venda.getAcrescimo() > 0 && (
                            <p className="text-xs text-success">
                              +{formatarMoeda(venda.getAcrescimo())}
                            </p>
                          )}
                          {venda.getTotalDescontos() > 0 && (
                            <p className="text-xs text-warning">
                              -{formatarMoeda(venda.getTotalDescontos())}
                            </p>
                          )}
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
            ) : (
              <div className="space-y-6">
                <h3 className="text-primary text-base font-semibold font-exo">
                  Relatório de Faturamento
                </h3>
                <div className="text-center py-12">
                  <p className="text-secondary-text">Funcionalidade de faturamento será implementada aqui</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de seleção de datas */}
      {mostrarModalDatas && (
        <EscolheDatasModal
          onClose={() => setMostrarModalDatas(false)}
          onConfirm={(inicio, fim) => {
            setDataInicio(inicio)
            setDataFim(fim)
            setFiltroPeriodo('Personalizado')
            setMostrarModalDatas(false)
          }}
        />
      )}
    </div>
  )
}

// Componente Modal de Escolher Datas
function EscolheDatasModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: (inicio: Date, fim: Date) => void
}) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const handleConfirm = () => {
    if (!dataInicio || !dataFim) {
      alert('Selecione ambas as datas')
      return
    }

    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)

    if (inicio > fim) {
      alert('Data de início deve ser anterior à data de fim')
      return
    }

    onConfirm(inicio, fim)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-primary-bg rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-primary-text">Selecionar Período</h3>
          <button onClick={onClose} className="text-secondary-text hover:text-primary-text">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Data de Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text mb-2">
              Data de Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-secondary bg-info text-primary-text focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 h-12 bg-primary text-info rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Confirmar
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-secondary-bg text-primary-text rounded-lg font-medium hover:bg-secondary-bg/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

