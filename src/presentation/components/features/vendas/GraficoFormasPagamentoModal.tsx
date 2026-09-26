'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/src/presentation/components/ui/dialog'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { MdClose } from 'react-icons/md'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buscarFormasPagamentoRelatorio } from '@/src/presentation/utils/vendas/buscarFormasPagamentoRelatorio'
import type {
  MetodoPagamentoRelatorio,
  VendaListItem,
  VendasFiltrosQuerySnapshot,
} from '@/src/presentation/utils/vendas/vendasListTypes'

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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatPercentual(value: number, total: number): string {
  if (total === 0) return '0.00'
  const percentual = (value / total) * 100
  if (percentual < 0.01) return percentual.toFixed(5)
  if (percentual < 0.1) return percentual.toFixed(4)
  if (percentual < 1) return percentual.toFixed(3)
  return percentual.toFixed(2)
}

interface GraficoFormasPagamentoModalProps {
  open: boolean
  onClose: () => void
  filters: VendasFiltrosQuerySnapshot
  timeZoneEmpresa: string
  meiosPagamentoPorId: Map<string, string>
  vendasJaCarregadas: VendaListItem[]
  listaCompleta: boolean
}

export function GraficoFormasPagamentoModal({
  open,
  onClose,
  filters,
  timeZoneEmpresa,
  meiosPagamentoPorId,
  vendasJaCarregadas,
  listaCompleta,
}: GraficoFormasPagamentoModalProps) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [metodos, setMetodos] = useState<MetodoPagamentoRelatorio[]>([])
  const [totalPagamentos, setTotalPagamentos] = useState(0)
  const [totalFaturado, setTotalFaturado] = useState(0)

  useEffect(() => {
    if (!open) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      setErro('Sessão expirada. Faça login novamente.')
      setMetodos([])
      return
    }

    let cancelado = false
    setCarregando(true)
    setErro(null)

    void buscarFormasPagamentoRelatorio({
      filters,
      token,
      timeZoneEmpresa,
      meiosPagamentoPorId,
      vendasJaCarregadas,
      listaCompleta,
    })
      .then(resultado => {
        if (cancelado) return
        setMetodos(resultado.metodos)
        setTotalPagamentos(resultado.totalPagamentos)
        setTotalFaturado(resultado.totalFaturado)
      })
      .catch(error => {
        if (cancelado) return
        setErro(
          error instanceof Error ? error.message : 'Não foi possível carregar as formas de pagamento.'
        )
        setMetodos([])
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [filters, listaCompleta, meiosPagamentoPorId, open, timeZoneEmpresa, vendasJaCarregadas])

  const chartData = useMemo(
    () => metodos.map(item => ({ name: item.metodo, value: item.valor, quantidade: item.quantidade })),
    [metodos]
  )

  const divergeDoFaturado = Math.abs(totalPagamentos - totalFaturado) > 0.01

  return (
    <Dialog
      open={open}
      onOpenChange={aberto => {
        if (!aberto) onClose()
      }}
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
              Total faturado por forma de pagamento
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
          {carregando ? (
            <div className="flex flex-col items-center justify-center py-12">
              <JiffyLoading />
              <p className="mt-3 text-sm text-secondary-text">Carregando formas de pagamento…</p>
            </div>
          ) : erro ? (
            <p className="py-12 text-center text-sm text-error">{erro}</p>
          ) : chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-secondary-text">
              Nenhuma venda faturada com forma de pagamento neste filtro.
            </p>
          ) : (
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="min-h-0 flex-1 outline-none [&_*]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-sector:focus]:stroke-none [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_svg:focus]:outline-none">
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart tabIndex={-1}>
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
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`${entry.name}-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="none"
                          style={{ outline: 'none' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0]
                        const valor = Number(data.value) || 0
                        return (
                          <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                            <p className="text-xs font-semibold text-primary-text">{data.name}</p>
                            <p className="text-xs font-semibold text-primary">
                              {formatCurrency(valor)}
                            </p>
                            <p className="text-xs text-secondary-text">
                              {formatPercentual(valor, totalPagamentos)}% do total
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      formatter={(value, entry) => {
                        const payload = entry.payload as { value?: number } | undefined
                        const valor = Number(payload?.value) || 0
                        return (
                          <span style={{ color: '#666', fontSize: '10px' }}>
                            {value} ({formatPercentual(valor, totalPagamentos)}%)
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1">
                <div className="rounded-lg bg-gray-50 p-3">
                  <h3 className="mb-3 text-sm font-semibold text-primary-text">Resumo</h3>
                  <div className="space-y-1.5">
                    {metodos.map((item, index) => (
                      <div
                        key={`${item.metodo}-${index}`}
                        className="flex items-center justify-between rounded-lg bg-white p-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-xs text-primary-text">
                            {item.metodo}
                            <span className="ml-1 text-secondary-text">({item.quantidade})</span>
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-semibold text-primary">
                            {formatCurrency(item.valor)}
                          </span>
                          <span className="text-xs text-secondary-text">
                            {formatPercentual(item.valor, totalPagamentos)}%
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 border-t-2 border-primary pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary-text">TOTAL</span>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(totalPagamentos)}
                        </span>
                      </div>
                    </div>
                    {divergeDoFaturado ? (
                      <p className="pt-1 text-[11px] leading-tight text-secondary-text">
                        Soma dos pagamentos efetivados. Total faturado do período:{' '}
                        {formatCurrency(totalFaturado)}.
                      </p>
                    ) : null}
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
