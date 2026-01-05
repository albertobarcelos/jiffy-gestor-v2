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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarTopProdutosDetalhadoUseCase()
        const produtos = await useCase.execute(periodo, 10) // Ajustado para 1000 no outro use case, mas aqui é para exibir 10
        setData(produtos)
        onDataLoad(produtos); // Chamar onDataLoad aqui
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [periodo])

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
      <div className="flex font-bold text-gray-700 border-b border-gray-200 py-2">
        <div className="w-1/12">#</div>
        <div className="w-5/12">Produto</div>
        <div className="w-3/12 text-right">Quantidade</div>
        <div className="w-3/12 text-right">Valor Total</div>
      </div>

      {/* Linhas da "tabela" */}
      <div className="divide-y divide-gray-100">
        {data.map((produto) => (
          <div key={produto.getRank()} className="flex py-2 hover:bg-gray-50">
            <div className="w-1/12 font-semibold text-gray-800">{produto.getRank()}</div>
            <div className="w-5/12 text-gray-700">{produto.getProduto()}</div>
            <div className="w-3/12 text-right text-gray-700">{produto.getQuantidade()}</div>
            <div className="w-3/12 text-right font-semibold text-gray-900">
              {formatCurrency(produto.getValorTotal())}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}