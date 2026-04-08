'use client'

import { useEffect, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { X } from 'lucide-react'
import { useDashboardMetodosPagamentoDetalhadoQuery } from '@/src/presentation/hooks/useDashboardMetodosPagamentoDetalhadoQuery'

interface ModalMetodosPagamentoProps {
  isOpen: boolean
  onClose: () => void
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
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
  periodo = 'Mês Atual',
  periodoInicial,
  periodoFinal,
}: ModalMetodosPagamentoProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const {
    data: metodosData,
    isPending,
    isError,
    error: queryError,
  } = useDashboardMetodosPagamentoDetalhadoQuery({
    periodo,
    periodoInicial,
    periodoFinal,
    enabled: isOpen,
  })

  const data = metodosData ?? []
  const isLoading = isPending
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Erro ao carregar dados de pagamento.'
    : null

  // Bloqueia scroll do body e fecha com Escape (equivalente ao Dialog MUI)
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const total = data.reduce((sum, item) => sum + item.getValor(), 0)

  if (!isOpen) return null

  if (error) {
    return (
      <div
        className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-metodos-pagamento-titulo-erro"
      >
        <div
          className="absolute inset-0 bg-black/50"
          aria-hidden
          onClick={() => onClose()}
        />
        <div
          className="relative z-10 w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-2 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-20 rounded-md p-1.5 text-primary-text transition-colors hover:bg-black/5"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="p-2 pb-3 pr-12">
            <h2
              id="modal-metodos-pagamento-titulo-erro"
              className="m-0 p-0 font-exo text-lg font-semibold text-primary-text"
            >
              Erro
            </h2>
            <p className="mt-2 font-nunito text-sm text-secondary-text">
              Ocorreu um erro ao carregar os dados.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center h-64 text-red-600">
            <p>{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-metodos-pagamento-titulo"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={() => onClose()}
      />
      <div
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-2 pb-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 rounded-md p-1.5 text-primary-text transition-colors hover:bg-black/5"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="p-2 pb-3 pr-12">
          <h2
            id="modal-metodos-pagamento-titulo"
            className="m-0 p-0 font-exo text-lg font-semibold text-primary-text"
          >
            Vendas por Método de Pagamento
          </h2>
          <p className="mt-2 font-nunito text-sm text-secondary-text">
            Detalhamento completo de métodos de pagamento
          </p>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <JiffyLoading />
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 rounded-full bg-alternate/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <p className="text-primary-text font-nunito">Nenhum dado disponível</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                {/* Coluna esquerda: gráfico de rosca + legenda em grid 2 colunas */}
                <div className="flex w-full min-w-0 flex-1 flex-col justify-center lg:justify-start">
                  <div className="w-full max-w-[min(100%,440px)]">
                    <div className="w-full" style={{ height: '380px' }}>
                      <ResponsiveContainer width="100%" height={380}>
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
                            innerRadius={88}
                            label={false}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {data.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => {
                              if (typeof value === 'number') {
                                return formatCurrency(value)
                              }
                              return ''
                            }}
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #530CA3',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 w-full border p-2 border-gray-200">
                      <h3
                        id="modal-metodos-legenda-titulo"
                        className="mb-2 font-exo text-sm font-semibold text-primary-text border-b"
                      >
                        Legenda
                      </h3>
                      <div
                        className="grid grid-cols-2 gap-x-3 gap-y-2 text-left"
                        role="list"
                        aria-labelledby="modal-metodos-legenda-titulo"
                      >
                      {data.map((item, index) => (
                        <div
                          key={`${item.getMetodo()}-${index}`}
                          className="flex min-w-0 items-start gap-2"
                          role="listitem"
                        >
                          <span
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                            style={{ backgroundColor: cores[index % cores.length] }}
                            aria-hidden
                          />
                          <span className="break-words font-nunito text-[11px] leading-snug text-primary-text sm:text-xs">
                            {item.getMetodo()}
                          </span>
                        </div>
                      ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna direita: lista de métodos + total */}
                <div className="flex w-full min-w-0 flex-1 flex-col gap-4 lg:max-w-md border">
                  <h3
                    id="modal-metodos-movimentacao-titulo"
                    className="font-exo text-sm text-center pt-2 font-semibold text-primary-text"
                  >
                    Movimentação por métodos de pagamento
                  </h3>
                  <div
                    className="space-y-1.5"
                    role="list"
                    aria-labelledby="modal-metodos-movimentacao-titulo"
                  >
                    {data.map((item, index) => (
                      <div key={item.getMetodo()} role="listitem">
                        <div className="px-3 py-2 border-b border-gray-200">
                          <div className="flex gap-2">
                            <div
                              className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                              style={{ backgroundColor: cores[index % cores.length] }}
                              aria-hidden
                            />
                            {/* Linha 1: nome | valor · Linha 2: transações | % — alinhados ao topo */}
                            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-2 gap-y-0.5 text-left">
                              <p className="min-w-0 break-words font-exo text-xs font-semibold leading-tight text-primary-text">
                                {item.getMetodo()}
                              </p>
                              <p className="text-right font-exo text-xs font-semibold leading-tight tabular-nums text-primary-text">
                                {formatCurrency(item.getValor())}
                              </p>
                              <p className="font-nunito text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                                {item.getQuantidade()} transações
                              </p>
                              <p className="text-right font-nunito text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
                                {item.getPercentual().toFixed(1)}% do total
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="px-2 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="font-exo text-lg font-semibold text-primary-text">Total</p>
                      <p className="font-exo text-lg font-bold text-primary">
                        {formatCurrency(total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

