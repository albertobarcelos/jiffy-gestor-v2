import type {
  ProdutoSerieValor,
  RelatorioProdutosVendidosMvpSerieDiaDTO,
  RelatorioSerieGranularidade,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type { VendaDetalheProdutos } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'
import { extrairIntervaloDataFinalizacaoParams } from '@/src/infrastructure/relatorios/periodoRelatorioDeslizante'

/** Chave de dia civil no fuso da empresa (`YYYY-MM-DD`). */
export function diaCivilEmpresaUtc(dateUtc: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateUtc)
  } catch {
    const d = new Date(dateUtc)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const da = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }
}

function dataFinalizacaoVenda(raw: Record<string, unknown>): Date | null {
  const s = raw.dataFinalizacao
  if (typeof s === 'string' && s.trim() !== '') {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const s2 = raw.data_finalizacao
  if (typeof s2 === 'string' && s2.trim() !== '') {
    const d = new Date(s2)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/** Alinhado ao top 10 do gráfico de participação por grupo (MVP). */
const TOP_SERIE_PADRAO = 10

/** `YYYY-MM-DDTHH` (hora 00–23 no fuso da empresa). */
export function horaCivilEmpresaUtc(dateUtc: Date, timezone: string): string {
  const day = diaCivilEmpresaUtc(dateUtc, timezone)
  try {
    const hour = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(dateUtc)
    const h = hour.padStart(2, '0')
    return `${day}T${h}`
  } catch {
    return `${day}T${String(dateUtc.getUTCHours()).padStart(2, '0')}`
  }
}

export function periodoEhUmDiaCivil(inicioUtc: Date, fimUtc: Date, timezone: string): boolean {
  return diaCivilEmpresaUtc(inicioUtc, timezone) === diaCivilEmpresaUtc(fimUtc, timezone)
}

export function resolverGranularidadeSerie(
  paramsIntervaloPdV: URLSearchParams,
  timezone: string
): RelatorioSerieGranularidade {
  const intervalo = extrairIntervaloDataFinalizacaoParams(paramsIntervaloPdV)
  if (!intervalo) return 'dia'
  return periodoEhUmDiaCivil(intervalo.inicioUtc, intervalo.fimUtc, timezone) ? 'hora' : 'dia'
}

function somarProdutoNoBucket(
  mapBuckets: Map<string, Map<string, number>>,
  bucketKey: string,
  produtosLancados: unknown[],
  alvo: Set<string>
) {
  let mapProd = mapBuckets.get(bucketKey)
  if (!mapProd) {
    mapProd = new Map()
    mapBuckets.set(bucketKey, mapProd)
  }

  for (const p of produtosLancados) {
    if (!p || typeof p !== 'object') continue
    const po = p as Record<string, unknown>
    const pid =
      typeof po.produtoId === 'string'
        ? po.produtoId
        : po.produtoId != null
          ? String(po.produtoId).trim()
          : ''
    if (!pid || !alvo.has(pid)) continue
    if (po.removido === true) continue
    let valor = typeof po.valorFinal === 'number' ? po.valorFinal : 0
    if (!Number.isFinite(valor)) {
      valor = typeof po.valorFinal === 'string' ? parseFloat(po.valorFinal) : 0
      if (!Number.isFinite(valor)) valor = 0
    }
    mapProd.set(pid, (mapProd.get(pid) ?? 0) + valor)
  }
}

function montarPontoSerie(
  bucketKey: string,
  mapProd: Map<string, number>,
  produtoIdsTop: string[],
  alvo: Set<string>,
  nomePorProdutoId?: Map<string, string>
): RelatorioProdutosVendidosMvpSerieDiaDTO {
  const valores: ProdutoSerieValor[] = []
  for (const produtoId of produtoIdsTop) {
    if (!alvo.has(produtoId)) continue
    const valor = mapProd.get(produtoId)
    if (valor != null && valor > 0) {
      const nome = nomePorProdutoId?.get(produtoId)
      valores.push({ produtoId, valor, ...(nome ? { nome } : {}) })
    }
  }
  const totalDia = valores.reduce((s, x) => s + x.valor, 0)
  return { dia: bucketKey, valores, totalDia }
}

function bucketsHorariosDiaCivil(diaCivil: string): string[] {
  return Array.from({ length: 24 }, (_, h) => `${diaCivil}T${String(h).padStart(2, '0')}`)
}

/**
 * Agrega `valorFinal` por dia ou hora (fuso empresa) e por produto.
 * Período de um único dia civil → buckets de 0h a 23h (inclui horas sem venda).
 */
export function computarSerieValorProdutosFiltrados(
  detalhes: VendaDetalheProdutos[],
  timezone: string,
  produtoIdsTop: string[],
  opts: {
    granularidade: RelatorioSerieGranularidade
    paramsIntervaloPdV?: URLSearchParams
  },
  nomePorProdutoId?: Map<string, string>
): { serie: RelatorioProdutosVendidosMvpSerieDiaDTO[]; granularidade: RelatorioSerieGranularidade } {
  const alvo = new Set(produtoIdsTop.filter(Boolean))
  if (alvo.size === 0) {
    return { serie: [], granularidade: opts.granularidade }
  }

  const porBucket = new Map<string, Map<string, number>>()

  for (const v of detalhes) {
    if (!v || typeof v !== 'object') continue
    const vo = v as Record<string, unknown>
    const dVenda = dataFinalizacaoVenda(vo)
    if (!dVenda) continue

    const bucketKey =
      opts.granularidade === 'hora'
        ? horaCivilEmpresaUtc(dVenda, timezone)
        : diaCivilEmpresaUtc(dVenda, timezone)
    const prods = Array.isArray(vo.produtosLancados) ? vo.produtosLancados : []
    somarProdutoNoBucket(porBucket, bucketKey, prods, alvo)
  }

  let bucketsOrdenados: string[]

  if (opts.granularidade === 'hora' && opts.paramsIntervaloPdV) {
    const intervalo = extrairIntervaloDataFinalizacaoParams(opts.paramsIntervaloPdV)
    const diaCivil =
      intervalo != null
        ? diaCivilEmpresaUtc(intervalo.inicioUtc, timezone)
        : [...porBucket.keys()].sort()[0]?.slice(0, 10)
    if (diaCivil) {
      bucketsOrdenados = bucketsHorariosDiaCivil(diaCivil)
    } else {
      bucketsOrdenados = [...porBucket.keys()].sort()
    }
  } else if (opts.granularidade === 'hora') {
    const dias = [...new Set([...porBucket.keys()].map(k => k.slice(0, 10)))].sort()
    bucketsOrdenados = dias.flatMap(d => bucketsHorariosDiaCivil(d))
  } else {
    bucketsOrdenados = [...porBucket.keys()].sort()
  }

  const serie: RelatorioProdutosVendidosMvpSerieDiaDTO[] = bucketsOrdenados.map(bucketKey => {
    const m = porBucket.get(bucketKey) ?? new Map()
    return montarPontoSerie(bucketKey, m, produtoIdsTop, alvo, nomePorProdutoId)
  })

  if (opts.granularidade === 'dia') {
    return { serie: serie.filter(p => p.totalDia > 0), granularidade: 'dia' }
  }

  return { serie, granularidade: 'hora' }
}

/**
 * Agrega por dia (compatibilidade).
 * @deprecated Preferir `computarSerieValorProdutosFiltrados`.
 */
export function computarSerieDiariaValorProdutosFiltrados(
  detalhes: VendaDetalheProdutos[],
  timezone: string,
  produtoIdsTop: string[],
  nomePorProdutoId?: Map<string, string>
): { serie: RelatorioProdutosVendidosMvpSerieDiaDTO[] } {
  const { serie } = computarSerieValorProdutosFiltrados(
    detalhes,
    timezone,
    produtoIdsTop,
    { granularidade: 'dia' },
    nomePorProdutoId
  )
  return { serie }
}

export function resolverTopProdutoIdsPorValor(
  linhasOrdenadasPorSort: Array<{ produtoId: string; valorTotal: number }>,
  k: number = TOP_SERIE_PADRAO
): string[] {
  const porValorDesc = [...linhasOrdenadasPorSort].sort((a, b) => b.valorTotal - a.valorTotal)
  return porValorDesc.slice(0, k).map(r => r.produtoId)
}
