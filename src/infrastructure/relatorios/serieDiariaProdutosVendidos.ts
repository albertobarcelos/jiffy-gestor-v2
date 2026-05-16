import type {
  ProdutoSerieValor,
  RelatorioProdutosVendidosMvpSerieDiaDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type { VendaDetalheProdutos } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'

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

const TOP_SERIE_PADRAO = 5

/**
 * Agrega `valorFinal` por dia (fuso empresa) e por produto, limitando aos IDs em `produtoIdsTop`.
 * Usa apenas `detalhes` já carregados no BFF — sem chamadas extras.
 *
 * Ordem das séries segue `produtoIdsTop` (estável para legenda / Recharts).
 */
export function computarSerieDiariaValorProdutosFiltrados(
  detalhes: VendaDetalheProdutos[],
  timezone: string,
  produtoIdsTop: string[],
  nomePorProdutoId?: Map<string, string>
): { serie: RelatorioProdutosVendidosMvpSerieDiaDTO[] } {
  const alvo = new Set(produtoIdsTop.filter(Boolean))
  if (alvo.size === 0) {
    return { serie: [] }
  }

  const porDia = new Map<string, Map<string, number>>()

  for (const v of detalhes) {
    if (!v || typeof v !== 'object') continue
    const vo = v as Record<string, unknown>
    const dVenda = dataFinalizacaoVenda(vo)
    if (!dVenda) continue

    const dayKey = diaCivilEmpresaUtc(dVenda, timezone)
    const prods = Array.isArray(vo.produtosLancados) ? vo.produtosLancados : []

    let mapProd = porDia.get(dayKey)
    if (!mapProd) {
      mapProd = new Map()
      porDia.set(dayKey, mapProd)
    }

    for (const p of prods) {
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

  const diasOrdenados = [...porDia.keys()].sort()
  const serie: RelatorioProdutosVendidosMvpSerieDiaDTO[] = diasOrdenados.map(diaKey => {
    const m = porDia.get(diaKey) ?? new Map()
    const valores: ProdutoSerieValor[] = []
    for (const produtoId of produtoIdsTop) {
      if (!alvo.has(produtoId)) continue
      const valor = m.get(produtoId)
      if (valor != null && valor > 0) {
        const nome = nomePorProdutoId?.get(produtoId)
        valores.push({ produtoId, valor, ...(nome ? { nome } : {}) })
      }
    }
    const totalDia = valores.reduce((s, x) => s + x.valor, 0)
    return { dia: diaKey, valores, totalDia }
  })

  return { serie }
}

export function resolverTopProdutoIdsPorValor(
  linhasOrdenadasPorSort: Array<{ produtoId: string; valorTotal: number }>,
  k: number = TOP_SERIE_PADRAO
): string[] {
  const porValorDesc = [...linhasOrdenadasPorSort].sort((a, b) => b.valorTotal - a.valorTotal)
  return porValorDesc.slice(0, k).map(r => r.produtoId)
}
