'use client'

import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { MdClose } from 'react-icons/md'

export interface Venda {
  id: string
  abertoPorId: string
  canceladoPorId?: string
  valorFinal: number
  totalValorProdutosRemovidos?: number
  dataCancelamento?: string
  dataFinalizacao?: string
}

export interface UsuarioPDV {
  id: string
  nome: string
}

const COLORS = [
  '#194775',
  '#2196F3',
  '#4CAF50',
  '#FF9800',
  '#F44336',
  '#00BCD4',
  '#9C27B0',
  '#FFC107',
  '#795548',
  '#607D8B',
]

export interface GraficoVendasPorUsuarioConteudoProps {
  vendas: Venda[]
  usuariosPDV: UsuarioPDV[]
  tipo?: 'finalizadas' | 'canceladas'
  /** Altura do container do gráfico em px (modal usa 500). */
  alturaGraficoPx?: number
  innerRadius?: number
  outerRadius?: number
  /** No card do dashboard, empilha gráfico + resumo em uma coluna. */
  layoutColunaUnica?: boolean
  className?: string
  /** Padrão true (modal em VendasList). No dashboard V2 use false para evitar redundância com o bloco Resumo. */
  mostrarLegenda?: boolean
}

/**
 * Corpo do gráfico de rosca + resumo (reutilizável no modal ou embutido em página/card).
 */
export function GraficoVendasPorUsuarioConteudo({
  vendas,
  usuariosPDV,
  tipo = 'finalizadas',
  alturaGraficoPx = 500,
  innerRadius = 100,
  outerRadius = 200,
  layoutColunaUnica = false,
  className = '',
  mostrarLegenda = true,
}: GraficoVendasPorUsuarioConteudoProps) {
  const chartData = useMemo(() => {
    let vendasFiltradas: Venda[] = []

    if (tipo === 'canceladas') {
      vendasFiltradas = vendas.filter(v => v.dataCancelamento)
    } else {
      vendasFiltradas = vendas.filter(v => v.dataFinalizacao && !v.dataCancelamento)
    }

    const vendasPorUsuario = vendasFiltradas.reduce(
      (acc, venda) => {
        const userId =
          tipo === 'canceladas' ? venda.canceladoPorId || venda.abertoPorId : venda.abertoPorId

        if (!acc[userId]) {
          acc[userId] = {
            userId,
            valorTotal: 0,
          }
        }

        if (tipo === 'canceladas') {
          const totalRemovidos = venda.totalValorProdutosRemovidos || 0
          acc[userId].valorTotal += totalRemovidos + (venda.valorFinal || 0)
        } else {
          acc[userId].valorTotal += venda.valorFinal || 0
        }

        return acc
      },
      {} as Record<string, { userId: string; valorTotal: number }>
    )

    const data = Object.values(vendasPorUsuario)
      .map(item => {
        const usuario = usuariosPDV.find(u => u.id === item.userId)
        return {
          name: usuario?.nome || item.userId || 'Usuário Desconhecido',
          value: item.valorTotal,
          userId: item.userId,
        }
      })
      .sort((a, b) => b.value - a.value)

    return data
  }, [vendas, usuariosPDV, tipo])

  const totalGeral = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData])

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatPercentual = (value: number, total: number): string => {
    if (total === 0) return '0.00000'
    const percentual = (value / total) * 100
    if (percentual < 0.01) return percentual.toFixed(5)
    if (percentual < 0.1) return percentual.toFixed(4)
    if (percentual < 1) return percentual.toFixed(3)
    return percentual.toFixed(2)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentual = formatPercentual(data.value, totalGeral)
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <p className="text-xs font-semibold text-primary-text">{data.name}</p>
          <p className="text-xs font-semibold text-primary">{formatCurrency(data.value)}</p>
          <p className="text-xs text-secondary-text">{percentual}% do total</p>
        </div>
      )
    }
    return null
  }

  const layoutClass = layoutColunaUnica
    ? 'flex flex-col gap-4'
    : 'flex flex-col gap-4 md:flex-row md:items-center'

  return (
    <div className={className}>
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-sm text-secondary-text">
            {tipo === 'canceladas'
              ? 'Nenhuma venda cancelada encontrada para os filtros aplicados.'
              : 'Nenhuma venda finalizada encontrada para os filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div className={layoutClass}>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height={alturaGraficoPx}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={0.5}
                  dataKey="value"
                  label={false}
                  minAngle={0}
                >
                  {chartData.map((entry, index) => {
                    const percentual = (entry.value / totalGeral) * 100
                    const strokeWidth = percentual < 0.1 ? 1 : 0
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={strokeWidth}
                      />
                    )
                  })}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {mostrarLegenda ? (
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    formatter={(value, entry: any) => {
                      const percentual = formatPercentual(entry.payload.value, totalGeral)
                      return (
                        <span style={{ color: '#666', fontSize: '10px' }}>
                          {value} ({percentual}%)
                        </span>
                      )
                    }}
                  />
                ) : null}
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1">
            <div className="rounded-lg bg-gray-50 p-3">
              <h3 className="mb-3 font-exo text-sm font-semibold text-primary-text">Resumo</h3>
              <div className="space-y-1.5">
                {chartData.map((item, index) => {
                  const percentual = formatPercentual(item.value, totalGeral)
                  return (
                    <div
                      key={item.userId}
                      className="flex items-center justify-between rounded-lg bg-white p-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-nunito text-xs text-primary-text">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-nunito text-xs font-semibold text-primary">
                          {formatCurrency(item.value)}
                        </span>
                        <span className="text-xs text-secondary-text">{percentual}%</span>
                      </div>
                    </div>
                  )
                })}
                <div className="mt-3 border-t-2 border-primary pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-exo text-sm font-semibold text-primary-text">TOTAL</span>
                    <span className="font-exo text-sm font-semibold text-primary">
                      {formatCurrency(totalGeral)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GraficoVendasPorUsuarioModalProps {
  open: boolean
  onClose: () => void
  vendas: Venda[]
  usuariosPDV: UsuarioPDV[]
  tipo?: 'finalizadas' | 'canceladas'
}

/**
 * Modal com gráfico de rosca exibindo vendas por usuário
 */
export function GraficoVendasPorUsuarioModal({
  open,
  onClose,
  vendas,
  usuariosPDV,
  tipo = 'finalizadas',
}: GraficoVendasPorUsuarioModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: '22px',
          width: '95%',
          maxWidth: '1000px',
          maxHeight: '95vh',
        },
      }}
    >
      <DialogContent sx={{ maxHeight: '90vh', overflowY: 'auto', p: 3 }}>
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>
              {tipo === 'canceladas' ? 'Vendas Canceladas por Usuário' : 'Vendas por Usuário'}
            </DialogTitle>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <MdClose size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <GraficoVendasPorUsuarioConteudo vendas={vendas} usuariosPDV={usuariosPDV} tipo={tipo} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
