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

interface Venda {
  id: string
  abertoPorId: string
  canceladoPorId?: string
  valorFinal: number
  totalValorProdutosRemovidos?: number
  dataCancelamento?: string
  dataFinalizacao?: string
}

interface UsuarioPDV {
  id: string
  nome: string
}

interface GraficoVendasPorUsuarioModalProps {
  open: boolean
  onClose: () => void
  vendas: Venda[]
  usuariosPDV: UsuarioPDV[]
  tipo?: 'finalizadas' | 'canceladas' // Tipo de vendas a exibir
}

// Cores para o gráfico
const COLORS = [
  '#194775', // azul escuro principal
  '#2196F3', // Azul
  '#4CAF50', // Verde
  '#FF9800', // Laranja
  '#F44336', // Vermelho
  '#00BCD4', // Ciano
  '#9C27B0', // Roxo escuro
  '#FFC107', // Amarelo
  '#795548', // Marrom
  '#607D8B', // Azul acinzentado
]

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
  // Agrupa vendas por usuário e calcula totais
  const chartData = useMemo(() => {
    let vendasFiltradas: Venda[] = []
    
    if (tipo === 'canceladas') {
      // Filtra apenas vendas canceladas
      vendasFiltradas = vendas.filter((v) => v.dataCancelamento)
    } else {
      // Filtra apenas vendas finalizadas (não canceladas)
      vendasFiltradas = vendas.filter(
        (v) => v.dataFinalizacao && !v.dataCancelamento
      )
    }

    // Agrupa por usuário e soma valores
    const vendasPorUsuario = vendasFiltradas.reduce(
      (acc, venda) => {
        // Para vendas canceladas, usa canceladoPorId; para finalizadas, usa abertoPorId
        const userId = tipo === 'canceladas' 
          ? (venda.canceladoPorId || venda.abertoPorId) // Fallback para abertoPorId se canceladoPorId não existir
          : venda.abertoPorId
        
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            valorTotal: 0,
          }
        }
        
        // Para vendas canceladas: soma totalValorProdutosRemovidos + valorFinal
        // Para vendas finalizadas: soma apenas valorFinal
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

    // Converte para array e busca nomes dos usuários
    const data = Object.values(vendasPorUsuario)
      .map((item) => {
        const usuario = usuariosPDV.find((u) => u.id === item.userId)
        return {
          name: usuario?.nome || item.userId || 'Usuário Desconhecido',
          value: item.valorTotal,
          userId: item.userId,
        }
      })
      .sort((a, b) => b.value - a.value) // Ordena por valor decrescente

    return data
  }, [vendas, usuariosPDV])

  // Calcula o total geral
  const totalGeral = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

  // Formata valor como moeda brasileira
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Formata porcentagem com mais casas decimais quando necessário
  const formatPercentual = (value: number, total: number): string => {
    if (total === 0) return '0.00000'
    const percentual = (value / total) * 100
    
    // Se a porcentagem for menor que 0.01%, usa 5 casas decimais
    if (percentual < 0.01) {
      return percentual.toFixed(5)
    }
    // Se for menor que 0.1%, usa 4 casas decimais
    if (percentual < 0.1) {
      return percentual.toFixed(4)
    }
    // Se for menor que 1%, usa 3 casas decimais
    if (percentual < 1) {
      return percentual.toFixed(3)
    }
    // Caso contrário, usa 2 casas decimais
    return percentual.toFixed(2)
  }

  // Tooltip customizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentual = formatPercentual(data.value, totalGeral)
      return (
        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-xs text-primary-text">{data.name}</p>
          <p className="text-xs text-primary font-bold">{formatCurrency(data.value)}</p>
          <p className="text-xs text-secondary-text">{percentual}% do total</p>
        </div>
      )
    }
    return null
  }

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
        }
      }}
    >
      <DialogContent sx={{ maxHeight: '90vh', overflowY: 'auto', p: 3 }}>
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>
              {tipo === 'canceladas' ? 'Vendas Canceladas por Usuário' : 'Vendas por Usuário'}
            </DialogTitle>
            <button
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <MdClose size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-secondary-text text-sm">
                {tipo === 'canceladas' 
                  ? 'Nenhuma venda cancelada encontrada para os filtros aplicados.'
                  : 'Nenhuma venda finalizada encontrada para os filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Gráfico de Rosca */}
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={200}
                      paddingAngle={0.5}
                      dataKey="value"
                      label={false}
                      minAngle={0}
                    >
                      {chartData.map((entry, index) => {
                        const percentual = (entry.value / totalGeral) * 100
                        // Para segmentos muito pequenos, adiciona stroke para melhor visibilidade
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
                    <Legend
                      wrapperStyle={{
                        paddingTop: '20px',
                      }}
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
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela de Resumo */}
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <h3 className="text-sm font-semibold font-exo text-primary-text mb-3">
                    Resumo
                  </h3>
                  <div className="space-y-1.5">
                    {chartData.map((item, index) => {
                      const percentual = formatPercentual(item.value, totalGeral)
                      return (
                        <div
                          key={item.userId}
                          className="flex items-center justify-between p-1.5 bg-white rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-xs font-nunito text-primary-text">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold font-nunito text-primary">
                              {formatCurrency(item.value)}
                            </span>
                            <span className="text-xs text-secondary-text">
                              {percentual}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="border-t-2 border-primary mt-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-exo text-primary-text">
                          TOTAL
                        </span>
                        <span className="text-sm font-bold font-exo text-primary">
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
      </DialogContent>
    </Dialog>
  )
}
