'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  MdArrowBack,
  MdAttachMoney,
  MdMouse,
  MdVisibility,
  MdAddShoppingCart,
  MdShoppingBag,
  MdReceiptLong,
} from 'react-icons/md'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useRelatorioPecaTambem } from '@/src/presentation/hooks/useRelatorioPecaTambem'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { formatarMoedaBrl, formatarInteiroBr } from '@/src/presentation/components/features/relatorios/relatorioEntregasFormat'
import { MSG_SEM_DADOS_PECA_TAMBEM } from '@/src/shared/types/relatorioPecaTambemApi'
import {
  OPCOES_PERIODO_PECA_TAMBEM,
  formatarTaxaPct,
  isPeriodoPecaTambemLabel,
  resolverIntervaloPecaTambem,
  taxaPercentual,
  type PeriodoPecaTambemLabel,
} from '@/src/presentation/utils/relatorioPecaTambemPeriodo'
import { sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'

function MetricCard({
  titulo,
  valor,
  rodape,
  icon,
}: {
  titulo: string
  valor: string
  rodape: string
  icon: React.ReactNode
}) {
  return (
    <div className="min-w-[200px] flex-1 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100/90 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary-text">{titulo}</p>
          <p className="mt-0.5 text-base font-semibold tracking-tight text-primary-text md:text-lg">
            {valor}
          </p>
          <p className="mt-1 text-xs leading-snug text-[#006699]">{rodape}</p>
        </div>
      </div>
    </div>
  )
}

export function RelatorioPecaTambemPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const periodoQuery = searchParams.get('periodo') || 'Últimos 30 Dias'
  const deQuery = searchParams.get('de')
  const ateQuery = searchParams.get('ate')

  const [periodo, setPeriodo] = useState<string>(() =>
    isPeriodoPecaTambemLabel(periodoQuery) ? periodoQuery : 'Últimos 30 Dias'
  )

  const intervalo = useMemo(() => {
    if (deQuery && ateQuery) {
      return { de: deQuery, ate: ateQuery }
    }
    return resolverIntervaloPecaTambem({
      periodo,
      timeZoneEmpresa: tz,
    })
  }, [periodo, deQuery, ateQuery, tz])

  const query = useRelatorioPecaTambem({
    de: intervalo.de,
    ate: intervalo.ate,
  })

  const resumo = query.data?.resumo
  const ranking = query.data?.ranking ?? []

  const taxaClique = taxaPercentual(resumo?.cliques ?? 0, resumo?.impressoes ?? 0)
  const taxaAdd = taxaPercentual(resumo?.adds ?? 0, resumo?.cliques ?? 0)
  const taxaConversao = taxaPercentual(resumo?.conversoes ?? 0, resumo?.adds ?? 0)

  const voltarParaVendas = () => {
    const qs = new URLSearchParams()
    if (isPeriodoPecaTambemLabel(periodo)) {
      qs.set('periodo', periodo)
    }
    const suffix = qs.toString()
    router.push(suffix ? `/relatorios-vendas?${suffix}` : '/relatorios-vendas')
  }

  const onChangePeriodo = (value: string) => {
    setPeriodo(value)
    const qs = new URLSearchParams()
    qs.set('periodo', value)
    router.replace(`/relatorios-peca-tambem?${qs.toString()}`)
  }

  return (
    <div className="flex h-full flex-col gap-4 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={voltarParaVendas}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-white px-3 text-sm text-primary transition-colors hover:bg-primary/5"
          >
            <MdArrowBack size={18} />
            Voltar
          </button>
          <div>
            <h1 className="text-lg font-semibold text-primary-text md:text-xl">
              Relatório Peça Também
            </h1>
            <p className="text-xs text-primary/80 md:text-sm">
              Funil e vendas atribuídas ao carrossel Peça Também (exclui cancelados).
            </p>
          </div>
        </div>

        <FormControl size="small" sx={{ minWidth: 160, ...sxEntradaCompactaProdutoSelect }}>
          <InputLabel id="periodo-peca-tambem">Período</InputLabel>
          <Select
            labelId="periodo-peca-tambem"
            label="Período"
            value={isPeriodoPecaTambemLabel(periodo) ? periodo : 'Últimos 30 Dias'}
            onChange={e => onChangePeriodo(String(e.target.value))}
            sx={{
              height: 32,
              bgcolor: 'primary.main',
              color: 'white',
              '& .MuiSelect-icon': { color: 'white' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
              '& .MuiSvgIcon-root': { color: 'white' },
            }}
          >
            {OPCOES_PERIODO_PECA_TAMBEM.map(opcao => (
              <MenuItem key={opcao} value={opcao}>
                {opcao}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {query.isLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <JiffyLoading />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          {query.error?.message || MSG_SEM_DADOS_PECA_TAMBEM}
        </div>
      ) : (
        <>
          {(resumo?.produtosVendidos ?? 0) === 0 &&
          (resumo?.pedidosComPecaTambem ?? 0) === 0 &&
          (resumo?.impressoes ?? 0) === 0 &&
          (resumo?.cliques ?? 0) === 0 &&
          (resumo?.adds ?? 0) === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center">
              <p className="text-sm font-medium text-primary-text">
                Nenhuma atividade do Peça Também neste período
              </p>
              <p className="mt-2 text-sm text-primary/70">
                Ainda não há impressões, cliques nem vendas atribuídas ao carrossel.
                Quando os clientes interagirem e comprarem sugestões, o funil e o
                ranking aparecem aqui.
              </p>
            </div>
          ) : (
            <>
              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-primary-text">Resultado</h2>
                <div className="flex flex-wrap gap-2">
                  <MetricCard
                    titulo="Produtos vendidos"
                    valor={formatarInteiroBr(resumo?.produtosVendidos ?? 0)}
                    rodape="Itens atribuídos ao Peça Também"
                    icon={<MdShoppingBag size={18} />}
                  />
                  <MetricCard
                    titulo="Faturamento"
                    valor={formatarMoedaBrl(resumo?.faturamento ?? 0)}
                    rodape="Soma do valor final dos itens"
                    icon={<MdAttachMoney size={18} />}
                  />
                  <MetricCard
                    titulo="Pedidos"
                    valor={formatarInteiroBr(resumo?.pedidosComPecaTambem ?? 0)}
                    rodape="Pedidos com pelo menos 1 item Peça Também"
                    icon={<MdReceiptLong size={18} />}
                  />
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-primary-text">Funil</h2>
                <div className="flex flex-wrap gap-2">
                  <MetricCard
                    titulo="Impressões"
                    valor={formatarInteiroBr(resumo?.impressoes ?? 0)}
                    rodape="Carrossel exibido"
                    icon={<MdVisibility size={18} />}
                  />
                  <MetricCard
                    titulo="Cliques"
                    valor={formatarInteiroBr(resumo?.cliques ?? 0)}
                    rodape={`Taxa clique: ${formatarTaxaPct(taxaClique)}`}
                    icon={<MdMouse size={18} />}
                  />
                  <MetricCard
                    titulo="Adds no carrinho"
                    valor={formatarInteiroBr(resumo?.adds ?? 0)}
                    rodape={`Taxa add: ${formatarTaxaPct(taxaAdd)}`}
                    icon={<MdAddShoppingCart size={18} />}
                  />
                  <MetricCard
                    titulo="Conversões"
                    valor={formatarInteiroBr(resumo?.conversoes ?? 0)}
                    rodape={`Taxa conversão: ${formatarTaxaPct(taxaConversao)}`}
                    icon={<MdShoppingBag size={18} />}
                  />
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold text-primary-text">
                  Ranking de produtos
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {ranking.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-primary/70">
                      Nenhuma venda atribuída ao Peça Também neste período. O funil
                      acima mostra a interação; as vendas aparecem quando um item
                      sugerido for finalizado.
                    </p>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Produto</TableCell>
                          <TableCell align="right">Quantidade</TableCell>
                          <TableCell align="right">Faturamento</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ranking.map(item => (
                          <TableRow key={item.produtoId} hover>
                            <TableCell>{item.nomeProduto}</TableCell>
                            <TableCell align="right">
                              {formatarInteiroBr(item.quantidade)}
                            </TableCell>
                            <TableCell align="right">
                              {formatarMoedaBrl(item.faturamento)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

export type { PeriodoPecaTambemLabel }
