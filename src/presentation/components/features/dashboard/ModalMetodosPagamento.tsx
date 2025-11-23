'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { Card, CardContent } from '@/src/presentation/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { BuscarMetodosPagamentoUseCase } from '@/src/application/use-cases/dashboard/BuscarMetodosPagamentoUseCase'
import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

interface ModalMetodosPagamentoProps {
  isOpen: boolean
  onClose: () => void
  periodo?: string
}

const cores = [
  '#4CAF50', // Verde - Dinheiro
  '#2196F3', // Azul - Cartão
  '#FF9800', // Laranja - PIX
  '#9C27B0', // Roxo - Outros
  '#00BCD4', // Ciano - Débito
  '#E91E63', // Rosa - Crédito
]

/**
 * Modal de métodos de pagamento
 * Replica o design do Flutter
 */
export function ModalMetodosPagamento({
  isOpen,
  onClose,
  periodo = 'mes',
}: ModalMetodosPagamentoProps) {
  const [data, setData] = useState<DashboardMetodoPagamento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const useCase = new BuscarMetodosPagamentoUseCase(new ApiClient())
        const metodos = await useCase.execute(periodo)
        setData(metodos)
      } catch (err) {
        console.error('Erro ao carregar métodos de pagamento:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen, periodo])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const total = data.reduce((sum, item) => sum + item.getValor(), 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendas por Método de Pagamento</DialogTitle>
          <DialogDescription>Detalhamento completo das vendas</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 rounded-full bg-alternate/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <p className="text-primary-text font-nunito">Nenhum dado disponível</p>
            </div>
          ) : (
            <>
              {/* Gráfico de pizza */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.map((item, index) => ({
                        name: item.getMetodo(),
                        value: item.getValor(),
                        percentual: item.getPercentual(),
                        quantidade: item.getQuantidade(),
                        color: cores[index % cores.length],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentual }) => `${percentual.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #530CA3',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Lista de métodos */}
              <div className="space-y-3">
                {data.map((item, index) => (
                  <Card key={item.getMetodo()}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cores[index % cores.length] }}
                        />
                        <div>
                          <p className="font-exo font-semibold text-primary-text">
                            {item.getMetodo()}
                          </p>
                          <p className="text-sm text-muted-foreground font-nunito">
                            {item.getQuantidade()} transações
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-exo font-semibold text-primary-text">
                          {formatCurrency(item.getValor())}
                        </p>
                        <p className="text-sm text-muted-foreground font-nunito">
                          {item.getPercentual().toFixed(1)}% do total
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Total */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-exo font-semibold text-primary-text">Total</p>
                  <p className="text-lg font-exo font-bold text-primary">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

