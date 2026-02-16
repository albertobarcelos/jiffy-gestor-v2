'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { BuscarTopProdutosDetalhadoUseCase } from '@/src/application/use-cases/dashboard/BuscarTopProdutosDetalhadoUseCase'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'
import { MdExpandMore, MdExpandLess } from 'react-icons/md'

interface TabelaTopProdutosProps {
  periodo: string;
  onDataLoad: (data: DashboardTopProduto[]) => void; // Nova prop
  periodoInicial?: Date | null;
  periodoFinal?: Date | null;
}

/**
 * Tabela de top produtos vendidos
 * Design clean e minimalista usando divs e flexbox
 */
export function TabelaTopProdutos({ periodo, onDataLoad, periodoInicial, periodoFinal }: TabelaTopProdutosProps) {
  const [data, setData] = useState<DashboardTopProduto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  // Função para mapear o período do frontend para o formato esperado pelo caso de uso
  const mapPeriodoToUseCaseFormat = (frontendPeriodo: string): string => {
    switch (frontendPeriodo) {
      case 'Hoje': return 'hoje';
      case 'Últimos 7 Dias': return 'semana';
      case 'Mês Atual': return 'mes';
      case 'Últimos 30 Dias': return '30dias';
      case 'Últimos 60 Dias': return '60dias';
      case 'Últimos 90 Dias': return '90dias';
      case 'Todos': return 'todos';
      default: return 'todos'; 
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarTopProdutosDetalhadoUseCase()
        const mappedPeriodo = mapPeriodoToUseCaseFormat(periodo);
        // Se período for "Datas Personalizadas", usa as datas fornecidas
        const useCustomDates = periodo === 'Datas Personalizadas' && periodoInicial && periodoFinal;
        const produtos = await useCase.execute(mappedPeriodo, 10, useCustomDates ? periodoInicial : undefined, useCustomDates ? periodoFinal : undefined)
        setData(produtos)
        onDataLoad(produtos); 
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo, onDataLoad, periodoInicial, periodoFinal])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const toggleCard = (rank: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rank)) {
        newSet.delete(rank)
      } else {
        newSet.add(rank)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="contained">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-gray-500">Nenhum dado disponível</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full max-w-full text-sm overflow-x-hidden">
      {/* Cabeçalho da "tabela" - Desktop apenas */}
      <div className="hidden md:flex bg-custom-2 rounded-lg px-2 border border-primary font-bold text-primary py-2">
        <div className="w-1/12">#</div>
        <div className="w-6/12">Produto</div>
        <div className="w-3/12 text-center">Quant.</div>
        <div className="w-3/12 text-right">Valor Total</div>
      </div>

      {/* Linhas da "tabela" - Desktop */}
      <div className="hidden md:block divide-y divide-gray-100 mt-2">
        {data.map((produto, index) => {
          const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          return (
            <div key={produto.getRank()} className={`flex mb-2 border border-gray-200 ${bgColor} rounded-lg p-2 hover:bg-custom-2/50`}>
              <span className="w-1/12 font-semibold text-primary">{produto.getRank()}</span>
              <span className="w-6/12 text-primary">{produto.getProduto()}</span>
              <span className="w-3/12 text-center text-primary">{produto.getQuantidade()}</span>
              <span className="w-3/12 text-right font-semibold text-primary">
                {formatCurrency(produto.getValorTotal())}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-2 mt-2 w-full max-w-full">
        {data.map((produto, index) => {
          const isExpanded = expandedCards.has(produto.getRank())
          const bgColor = index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
          return (
            <div
              key={produto.getRank()}
              className={`w-full max-w-full border border-gray-200 ${bgColor} rounded-lg overflow-hidden`}
            >
              {/* Primeira linha: Rank e Nome do Produto */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-custom-2/50 transition-colors w-full"
                onClick={() => toggleCard(produto.getRank())}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                  <span className="font-semibold text-primary text-base flex-shrink-0">
                    {produto.getRank()}
                  </span>
                  <span className="text-primary text-sm truncate min-w-0">
                    {produto.getProduto()}
                  </span>
                </div>
                <div className="flex-shrink-0 text-primary ml-2">
                  {isExpanded ? (
                    <MdExpandLess className="text-xl" />
                  ) : (
                    <MdExpandMore className="text-xl" />
                  )}
                </div>
              </div>

              {/* Segunda linha: Quantidade e Valor (expansível) */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50/50 px-3 py-2 w-full">
                  <div className="flex items-center justify-between gap-4 px-4 py-2 bg-custom-2/50 rounded-lg">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs text-secondary-text font-semibold mb-1">Quant.</span>
                      <span className="text-primary font-medium break-words">{produto.getQuantidade()}</span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-xs text-secondary-text font-semibold mb-1">Valor</span>
                      <span className="text-primary font-semibold whitespace-nowrap">
                        {formatCurrency(produto.getValorTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}