import type {
  ProdutoRankingAnteriorDTO,
  RelatorioParticipacaoAbcDTO,
  RelatorioParticipacaoGrupoDTO,
  RelatorioProdutosVendidosMvpKpisDTO,
  RelatorioProdutosVendidosMvpResponseDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type {
  RelatorioProdutoVendidoClasseAbc,
  RelatorioProdutosVendidosResponseDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'
import {
  calcularAbcPorProdutoId,
  type ExecRelatorioProdutosVendidosResult,
  type LinhaRelatorioProdutoInterna,
} from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'

function variacaoPct(atual: number, anterior: number): number | null {
  if (!Number.isFinite(anterior) || anterior === 0) return null
  return ((atual - anterior) / anterior) * 100
}

/** `%` relativos ao faturamento do conjunto já filtrado (`sumValorFiltrado`). */
export function montarParticipacaoGrupos(
  linhas: LinhaRelatorioProdutoInterna[],
  sumValorDasLinhasFiltradasParaPct: number
): RelatorioParticipacaoGrupoDTO[] {
  const map = new Map<string, { nome: string; valor: number; grupoId: string | null }>()
  for (const r of linhas) {
    const key = r.grupoId ?? '__sem_grupo__'
    const nome = r.grupoNome ?? 'Sem grupo'
    const prev = map.get(key)
    if (!prev) {
      map.set(key, { nome, valor: r.valorTotal, grupoId: r.grupoId })
    } else {
      prev.valor += r.valorTotal
    }
  }

  const base = sumValorDasLinhasFiltradasParaPct > 0 ? sumValorDasLinhasFiltradasParaPct : 0
  return [...map.entries()].map(([k, v]) => ({
    grupoId: v.grupoId,
    key: k,
    nomeGrupo: v.nome,
    valorTotal: v.valor,
    pct: base > 0 ? (v.valor / base) * 100 : 0,
  }))
}

const CLASSES_ABC_ORDEM: RelatorioProdutoVendidoClasseAbc[] = ['A', 'B', 'C']

/** Distribuição A/B/C por faturamento, SKUs e unidades no recorte filtrado. */
export function montarParticipacaoAbc(
  linhas: LinhaRelatorioProdutoInterna[],
  sumValorFiltrado: number,
  sumQtdFiltrado: number
): RelatorioParticipacaoAbcDTO[] {
  if (linhas.length === 0) return []

  const abcById = calcularAbcPorProdutoId(linhas, sumValorFiltrado)
  const acc: Record<
    RelatorioProdutoVendidoClasseAbc,
    { qtdProdutos: number; valorTotal: number; quantidade: number }
  > = {
    A: { qtdProdutos: 0, valorTotal: 0, quantidade: 0 },
    B: { qtdProdutos: 0, valorTotal: 0, quantidade: 0 },
    C: { qtdProdutos: 0, valorTotal: 0, quantidade: 0 },
  }

  for (const r of linhas) {
    const classe = abcById.get(r.produtoId) ?? 'C'
    acc[classe].qtdProdutos += 1
    acc[classe].valorTotal += r.valorTotal
    acc[classe].quantidade += r.quantidade
  }

  const totalSkus = linhas.length
  const baseValor = sumValorFiltrado > 0 ? sumValorFiltrado : 0
  const baseQtd = sumQtdFiltrado > 0 ? sumQtdFiltrado : 0

  return CLASSES_ABC_ORDEM.map(classe => {
    const b = acc[classe]
    return {
      classe,
      qtdProdutos: b.qtdProdutos,
      pctProdutos: totalSkus > 0 ? (b.qtdProdutos / totalSkus) * 100 : 0,
      valorTotal: b.valorTotal,
      pctFaturamento: baseValor > 0 ? (b.valorTotal / baseValor) * 100 : 0,
      quantidade: b.quantidade,
      pctUnidades: baseQtd > 0 ? (b.quantidade / baseQtd) * 100 : 0,
    }
  })
}

function mapProdutoValorQtd(lines: LinhaRelatorioProdutoInterna[]): Map<string, { q: number; v: number }> {
  const m = new Map<string, { q: number; v: number }>()
  for (const r of lines) {
    m.set(r.produtoId, { q: r.quantidade, v: r.valorTotal })
  }
  return m
}

export function montarRankingEVariacoes(
  atual: LinhaRelatorioProdutoInterna[],
  anterior: LinhaRelatorioProdutoInterna[] | null
): ProdutoRankingAnteriorDTO[] {
  if (!anterior || anterior.length === 0) {
    const porValor = [...atual].sort((a, b) => b.valorTotal - a.valorTotal)
    const liderNome = porValor[0]?.nome ?? ''
    return porValor.map(r => ({
      produtoId: r.produtoId,
      nome: r.nome,
      variacaoValorPct: null,
      variacaoQtdPct: null,
      liderValorNoPeriodo: r.produtoId === porValor[0]?.produtoId,
      maiorCrescimentoQtdPct: false,
      liderNomeNoPeriodo: liderNome,
    }))
  }

  const mPrev = mapProdutoValorQtd(anterior)
  const atualOrdenValor = [...atual].sort((a, b) => b.valorTotal - a.valorTotal)
  const liderId = atualOrdenValor[0]?.produtoId ?? ''
  const liderNome = atualOrdenValor[0]?.nome ?? ''

  type Row = ProdutoRankingAnteriorDTO & { deltaQtdPct: number }
  const linhasRank: Row[] = atual.map(r => {
    const prev = mPrev.get(r.produtoId)
    const vPct = prev ? variacaoPct(r.valorTotal, prev.v) : null
    const qPct = prev && prev.q > 0 ? variacaoPct(r.quantidade, prev.q) : null
    let deltaQtdPct = typeof qPct === 'number' && Number.isFinite(qPct) ? qPct : -Infinity
    if (prev === undefined || prev.q <= 0) {
      deltaQtdPct = r.quantidade > 0 ? Infinity : -Infinity
    }
    return {
      produtoId: r.produtoId,
      nome: r.nome,
      variacaoValorPct: vPct,
      variacaoQtdPct: qPct,
      deltaQtdPct,
      liderValorNoPeriodo: r.produtoId === liderId,
      maiorCrescimentoQtdPct: false,
      liderNomeNoPeriodo: liderNome,
    }
  })

  let bestGrowthId: string | null = null
  let bestGrowth = -Infinity
  for (const row of linhasRank) {
    if (typeof row.variacaoQtdPct !== 'number' || !Number.isFinite(row.variacaoQtdPct)) continue
    if (row.variacaoQtdPct > bestGrowth && row.variacaoQtdPct > 0) {
      bestGrowth = row.variacaoQtdPct
      bestGrowthId = row.produtoId
    }
  }
  if (bestGrowthId == null && linhasRank.length > 0) {
    linhasRank.sort((a, b) => (b.deltaQtdPct ?? 0) - (a.deltaQtdPct ?? 0))
    bestGrowthId = linhasRank[0]?.produtoId ?? null
  }

  return linhasRank.map(({ deltaQtdPct: _omit, ...rest }) => ({
    ...rest,
    maiorCrescimentoQtdPct: bestGrowthId != null && rest.produtoId === bestGrowthId && bestGrowth !== -Infinity,
  }))
}

export function montarKpisMvp(
  atualMeta: ExecRelatorioProdutosVendidosResult,
  anteriorMeta: ExecRelatorioProdutosVendidosResult | null
): RelatorioProdutosVendidosMvpKpisDTO {
  const fatAtual = atualMeta.valorTotalPeriodoVendas
  const qtdAtual = atualMeta.quantidadeTotalPeriodo
  const ticketMedioAtual = qtdAtual > 0 ? fatAtual / qtdAtual : 0
  let ticketMedioAnterior: number | null = null
  let ticketMedioVariacaoPct: number | null = null

  const orden = [...atualMeta.linhasFiltradasOrdenadas].sort((a, b) => b.quantidade - a.quantidade)
  const liderNome = orden[0]?.nome ?? '—'
  const liderQtd = orden[0]?.quantidade ?? 0
  let liderCrescPct: number | null = null

  let fatPrev: number | null = null
  let qtdPrev: number | null = null
  let fatVariacaoPct: number | null = null
  let qtdVariacaoPct: number | null = null

  if (anteriorMeta) {
    fatPrev = anteriorMeta.valorTotalPeriodoVendas
    qtdPrev = anteriorMeta.quantidadeTotalPeriodo
    fatVariacaoPct = variacaoPct(fatAtual, fatPrev)
    qtdVariacaoPct = variacaoPct(qtdAtual, qtdPrev)
    ticketMedioAnterior = qtdPrev > 0 ? fatPrev / qtdPrev : 0
    ticketMedioVariacaoPct = variacaoPct(ticketMedioAtual, ticketMedioAnterior)

    const atualLiderId = orden[0]?.produtoId
    if (atualLiderId) {
      const prevLinha = anteriorMeta.linhasFiltradasOrdenadas.find(r => r.produtoId === atualLiderId)
      if (prevLinha && prevLinha.quantidade > 0) {
        liderCrescPct = variacaoPct(liderQtd, prevLinha.quantidade)
      }
    }
  }

  const topGrowth = atualMeta.linhasFiltradasOrdenadas.map(r => {
    if (!anteriorMeta) return { nome: r.nome, pct: -Infinity }
    const p = anteriorMeta.linhasFiltradasOrdenadas.find(x => x.produtoId === r.produtoId)
    let pct = -Infinity
    if (!p || p.quantidade <= 0) {
      pct = r.quantidade > 0 ? 100 : -Infinity
    } else {
      const rawPct = variacaoPct(r.quantidade, p.quantidade)
      pct = rawPct === null ? -Infinity : rawPct
    }
    return { nome: r.nome, pct }
  })
  topGrowth.sort((a, b) => b.pct - a.pct)
  const g0 = topGrowth[0]
  let produtosComCrescimentoNome: string | null = null
  let produtosComCrescimentoValor: number | null = null
  if (
    anteriorMeta &&
    g0 &&
    Number.isFinite(g0.pct) &&
    g0.pct !== -Infinity &&
    g0.pct > 0
  ) {
    produtosComCrescimentoNome = g0.nome
    produtosComCrescimentoValor = Math.round(g0.pct * 10) / 10
  }

  const produtosDistintosAtual = atualMeta.linhasFiltradasOrdenadas.length
  let produtosDistintosAnterior: number | null = null
  let produtosDistintosVariacaoPct: number | null = null
  if (anteriorMeta) {
    produtosDistintosAnterior = anteriorMeta.linhasFiltradasOrdenadas.length
    produtosDistintosVariacaoPct = variacaoPct(produtosDistintosAtual, produtosDistintosAnterior)
  }

  return {
    faturamentoAtual: fatAtual,
    faturamentoAnterior: fatPrev,
    variacaoPercentualFat: fatVariacaoPct,
    quantidadeVendidaAtual: qtdAtual,
    quantidadeAnterior: qtdPrev,
    variacaoPercentualQuantidade: qtdVariacaoPct,
    ticketMedioPorItemNoPeriodo: ticketMedioAtual,
    ticketMedioPorItemPeriodoAnterior: ticketMedioAnterior,
    variacaoPercentualTicketMedio: ticketMedioVariacaoPct,
    produtoLiderNomeQuantidade: liderNome,
    produtoLiderQuantidadeUnidades: liderQtd,
    produtoLiderPercentualVsPeriodoAnterior: liderCrescPct,
    produtoComMaiorCrescimentoNome: produtosComCrescimentoNome,
    produtoComMaiorCrescimentoPct: produtosComCrescimentoValor,
    produtosDistintosAtual,
    produtosDistintosAnterior,
    variacaoPercentualProdutosDistintos: produtosDistintosVariacaoPct,
  }
}

export function combinarPayloadMvp(params: {
  base: RelatorioProdutosVendidosResponseDTO
  kpis: RelatorioProdutosVendidosMvpKpisDTO
  participacaoGrupos: RelatorioParticipacaoGrupoDTO[]
  serieTemporal: RelatorioProdutosVendidosMvpResponseDTO['serieTemporal']
  rankings: ProdutoRankingAnteriorDTO[]
  mockFlags: RelatorioProdutosVendidosMvpResponseDTO['mockFlags']
}): RelatorioProdutosVendidosMvpResponseDTO {
  return {
    ...params.base,
    kpis: params.kpis,
    participacaoGrupos: params.participacaoGrupos,
    serieTemporal: params.serieTemporal,
    rankingsPorProduto: params.rankings,
    mockFlags: params.mockFlags,
  }
}
