'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/src/presentation/components/ui/button'
import { BuscarTopProdutosDetalhadoUseCase } from '@/src/application/use-cases/dashboard/BuscarTopProdutosDetalhadoUseCase'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

interface TabelaTopProdutosProps {
  periodo: string;
  onDataLoad: (data: DashboardTopProduto[]) => void; // Nova prop
}

/**
 * Tabela de top produtos vendidos
 * Design clean e minimalista usando divs e flexbox
 */
export function TabelaTopProdutos({ periodo, onDataLoad }: TabelaTopProdutosProps) {
  const [data, setData] = useState<DashboardTopProduto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const produtos = await useCase.execute(mappedPeriodo, 10)
        setData(produtos)
        onDataLoad(produtos); 
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo, onDataLoad])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
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
    <div className="flex flex-col w-full text-sm">
      {/* Cabeçalho da "tabela" */}
      <div className="flex bg-custom-2 rounded-lg px-2 border border-primary font-bold text-primary py-2">
        <div className="w-1/12">#</div>
        <div className="w-6/12">Produto</div>
        <div className="w-3/12 text-center">Quant.</div>
        <div className="w-3/12 text-right">Valor Total</div>
      </div>

      {/* Linhas da "tabela" */}
      <div className="divide-y divide-gray-100 mt-2">
        {data.map((produto) => (
          <div key={produto.getRank()} className="flex mb-2 shadow-sm shadow-primary-text/50 border border-gray-200 bg-info rounded-lg p-2 hover:bg-custom-2/50">
            <span className="w-1/12 font-semibold text-primary">{produto.getRank()}</span>
            <span className="w-6/12 text-primary">{produto.getProduto()}</span>
            <span className="w-3/12 text-center text-primary">{produto.getQuantidade()}</span>
            <span className="w-3/12 text-right font-semibold text-primary">
              {formatCurrency(produto.getValorTotal())}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}