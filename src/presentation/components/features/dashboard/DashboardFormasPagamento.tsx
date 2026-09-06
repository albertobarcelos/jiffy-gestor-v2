import { useMemo } from 'react'
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import { Tooltip as MuiTooltip } from '@mui/material'
import { formatarMoeda } from './dashboardTextHelpers'
import { corFormaPagamentoFiscal } from '@/src/shared/utils/corFormaPagamentoFiscal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { useDashboardMetodosPagamentoDetalhadoQuery } from '@/src/presentation/hooks/useDashboardMetodosPagamentoDetalhadoQuery'

/** Arco “restante” dos mini-donuts de formas de pagamento; cor principal vem da paleta fiscal. */
const COR_ARCO_RESTO_FORMAS_PAGAMENTO = '#EDE9FE'

/** Exibe % no centro do mini-donut (inteiro se próximo, senão 1 casa decimal). */
function formatarPercentualMiniDonut(p: number): string {
  const x = Math.min(100, Math.max(0, p))
  if (Math.abs(x - Math.round(x)) < 0.01) return `${Math.round(x)}%`
  return `${x.toFixed(1)}%`
}

/** Mini donut para cada forma de pagamento (layout Figma: um gráfico por método) */
function DonutFormaPagamento({
  principal,
  secundaria,
  pct,
  label,
  valor,
}: {
  principal: string
  secundaria: string
  pct: number
  label: string
  valor: number
}) {
  const fatiaPrincipal = Math.min(100, Math.max(0, pct))
  const data = [
    { name: 'principal', value: fatiaPrincipal, fill: principal },
    { name: 'resto', value: Math.max(0, 100 - fatiaPrincipal), fill: secundaria },
  ]

  const textoTooltipValor = useMemo(() => `Valor: ${formatarMoeda(valor ?? 0)}`, [valor])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[120px] w-[120px] outline-none md:h-[144px] md:w-[144px] [&_*:focus-visible]:outline-none [&_*:focus]:outline-none [&_.recharts-sector:focus-visible]:stroke-none [&_.recharts-sector:focus]:stroke-none [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_svg:focus]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart tabIndex={-1}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="54%"
              outerRadius="100%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-primary-text md:text-lg">
          {formatarPercentualMiniDonut(pct)}
        </span>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-primary-text md:text-xs">
        <MuiTooltip title={textoTooltipValor} placement="top" arrow>
          <span className="cursor-help">{label}</span>
        </MuiTooltip>
      </p>
    </div>
  )
}

interface DashboardFormasPagamentoProps {
  periodoData: string
  opcaoCalculatePeriodo: string
  inicioResumo: Date | null
  fimResumo: Date | null
}

export function DashboardFormasPagamento({
  periodoData,
  opcaoCalculatePeriodo,
  inicioResumo,
  fimResumo,
}: DashboardFormasPagamentoProps) {
  const {
    data: metodosPagamentoDetalhado,
    isLoading: carregandoMetodosPagamento,
    isError: erroMetodosPagamento,
  } = useDashboardMetodosPagamentoDetalhadoQuery({
    periodo: periodoData === 'personalizado' ? 'Últimos 30 Dias' : opcaoCalculatePeriodo,
    periodoInicial: inicioResumo,
    periodoFinal: fimResumo,
    enabled: inicioResumo != null && fimResumo != null,
  })

  /** Um mini-donut por método com quantidade > 0; ordenado pelo percentual (maior primeiro). */
  const metodosParaDonutsFormasPagamento = useMemo(() => {
    const lista = metodosPagamentoDetalhado ?? []
    return [...lista]
      .filter(m => m.getQuantidade() > 0)
      .sort((a, b) => b.getPercentual() - a.getPercentual())
  }, [metodosPagamentoDetalhado])

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-4">
      <h2 className="mb-4 text-lg font-semibold text-primary-text md:text-xl">
        Formas de Pagamento
      </h2>
      {carregandoMetodosPagamento ? (
        <div className="flex min-h-[200px] flex-1 items-center justify-center py-8">
          <JiffyLoading className="!gap-0 !py-0" />
        </div>
      ) : erroMetodosPagamento ? (
        <p className="py-6 text-center text-sm text-[#D92D20]">
          Não foi possível carregar os métodos de pagamento.
        </p>
      ) : metodosParaDonutsFormasPagamento.length === 0 ? (
        <p className="py-6 text-center text-sm text-secondary-text">
          Nenhuma forma de pagamento com movimentação no período.
        </p>
      ) : (
        <div className="scrollbar-hide max-h-[300px] min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain md:max-h-[380px]">
          <div className="grid grid-cols-2 gap-10">
            {metodosParaDonutsFormasPagamento.map((item, index) => (
              <DonutFormaPagamento
                key={`${item.getMetodo()}-${index}`}
                label={item.getMetodo()}
                principal={corFormaPagamentoFiscal(item.getFormaPagamentoFiscal())}
                secundaria={COR_ARCO_RESTO_FORMAS_PAGAMENTO}
                pct={item.getPercentual()}
                valor={item.getValor()}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}