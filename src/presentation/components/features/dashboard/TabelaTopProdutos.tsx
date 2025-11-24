'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/presentation/components/ui/table'
import { Button } from '@/src/presentation/components/ui/button'
import { BuscarTopProdutosUseCase } from '@/src/application/use-cases/dashboard/BuscarTopProdutosUseCase'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

interface TabelaTopProdutosProps {
  periodo?: string
}

/**
 * Tabela de top produtos vendidos
 * Design clean e minimalista
 */
export function TabelaTopProdutos({ periodo = 'mes' }: TabelaTopProdutosProps) {
  const [data, setData] = useState<DashboardTopProduto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const useCase = new BuscarTopProdutosUseCase(new ApiClient())
        const produtos = await useCase.execute(periodo, 10)
        setData(produtos)
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((produto) => (
            <TableRow key={produto.getRank()}>
              <TableCell className="font-semibold">{produto.getRank()}</TableCell>
              <TableCell>{produto.getProduto()}</TableCell>
              <TableCell className="text-right">{produto.getQuantidade()}</TableCell>
              <TableCell className="text-right font-semibold text-gray-900">
                {formatCurrency(produto.getValorTotal())}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
