import { calculatePeriodo } from '@/src/shared/utils/dateFilters'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import type { VendaUnificadaDTO, VendasUnificadasQueryParams } from '@/src/application/dto/VendaUnificadaDTO'
import type { MetricasVendas, VendaListItem, VendasFiltrosQuerySnapshot } from './vendasListTypes'

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  let hour = Number(map.hour)
  const minute = Number(map.minute)
  const second = Number(map.second)
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

function zonedLocalPartsToUtcDate(
  dateParts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    millisecond: number
  },
  timeZone: string
): Date {
  const { year, month, day, hour, minute, second, millisecond } = dateParts
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const off1 = getTimeZoneOffsetMinutes(new Date(guess), timeZone)
  const utc1 = guess - off1 * 60_000
  const off2 = getTimeZoneOffsetMinutes(new Date(utc1), timeZone)
  const utc2 = guess - off2 * 60_000
  return new Date(utc2)
}

function toISOStringNoFusoEmpresa(date: Date, timeZoneEmpresa: string): string {
  const tz = timeZoneEmpresa.trim()
  if (!tz) return date.toISOString()
  return zonedLocalPartsToUtcDate(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
    },
    tz
  ).toISOString()
}

/** Normaliza string de moeda do filtro para número (mesma regra do input de valor). */
export function normalizarMoedaFiltroVLista(value: string): number | null {
  if (!value || value.trim() === '') return null

  let clean = value.replace(/[^\d,.]/g, '').trim()

  if (!clean) return null

  if (clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes('.')) {
    if ((clean.match(/\./g) || []).length > 1) {
      clean = clean.replace(/\./g, '')
    }
    const parts = clean.split('.')
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace('.', '')
    }
  }

  const num = parseFloat(clean)
  return isNaN(num) ? null : num
}

/** Monta query string da listagem (sem limit/offset). */
export function buildVendasListQueryParams(
  filters: VendasFiltrosQuerySnapshot,
  args?: { timeZoneEmpresa?: string }
): URLSearchParams {
  const baseParams = new URLSearchParams()

  if (filters.searchQuery) {
    baseParams.append('q', filters.searchQuery)
  }

  if (filters.tipoVendaFilter) {
    baseParams.append('tipoVenda', filters.tipoVendaFilter.toLowerCase())
  }

  const normalizedStatus = filters.statusFilter?.toUpperCase()
  if (normalizedStatus && normalizedStatus !== 'ABERTA') {
    baseParams.append('status', normalizedStatus)
  } else {
    baseParams.append('status', 'FINALIZADA')
    baseParams.append('status', 'CANCELADA')
  }

  if (filters.usuarioAbertoPorFilter) {
    baseParams.append('abertoPorId', filters.usuarioAbertoPorFilter)
  }

  if (filters.usuarioCancelouFilter) {
    baseParams.append('canceladoPorId', filters.usuarioCancelouFilter)
  }

  const valorMin = normalizarMoedaFiltroVLista(filters.valorMinimo)
  if (valorMin !== null && valorMin > 0) {
    baseParams.append('valorFinalMinimo', valorMin.toString())
  }

  const valorMax = normalizarMoedaFiltroVLista(filters.valorMaximo)
  if (valorMax !== null && valorMax > 0) {
    baseParams.append('valorFinalMaximo', valorMax.toString())
  }

  if (filters.meioPagamentoFilter) {
    baseParams.append('meioPagamentoId', filters.meioPagamentoFilter)
  }

  if (filters.terminalFilter) {
    baseParams.append('terminalId', filters.terminalFilter)
  }

  let inicioFiltro: Date | null = null
  let fimFiltro: Date | null = null
  let intervaloUtcJaNoFusoApi = false
  if (filters.periodoInicial && filters.periodoFinal) {
    inicioFiltro = filters.periodoInicial
    fimFiltro = filters.periodoFinal
  } else if (filters.periodo !== 'Todos') {
    const tzParaPresets = args?.timeZoneEmpresa?.trim() || 'America/Sao_Paulo'
    const noFuso = calcularPeriodoNoFusoEmpresa(filters.periodo, tzParaPresets)
    if (noFuso.inicio != null && noFuso.fim != null) {
      inicioFiltro = noFuso.inicio
      fimFiltro = noFuso.fim
      intervaloUtcJaNoFusoApi = true
    } else {
      const { inicio, fim } = calculatePeriodo(filters.periodo)
      inicioFiltro = inicio
      fimFiltro = fim
    }
  }

  const usarDatasCriacao = normalizedStatus === 'ABERTA'
  const tzEmpresa = args?.timeZoneEmpresa?.trim() || ''
  const isoInicioFiltroVendas = (): string => {
    if (usarDatasCriacao) return inicioFiltro!.toISOString()
    if (intervaloUtcJaNoFusoApi || !tzEmpresa) return inicioFiltro!.toISOString()
    return toISOStringNoFusoEmpresa(inicioFiltro!, tzEmpresa)
  }
  const isoFimFiltroVendas = (): string => {
    if (usarDatasCriacao) return fimFiltro!.toISOString()
    if (intervaloUtcJaNoFusoApi || !tzEmpresa) return fimFiltro!.toISOString()
    return toISOStringNoFusoEmpresa(fimFiltro!, tzEmpresa)
  }
  if (inicioFiltro) {
    baseParams.append(
      usarDatasCriacao ? 'dataCriacaoInicial' : 'dataFinalizacaoInicial',
      isoInicioFiltroVendas()
    )
  }
  if (fimFiltro) {
    baseParams.append(
      usarDatasCriacao ? 'dataCriacaoFinal' : 'dataFinalizacaoFinal',
      isoFimFiltroVendas()
    )
  }

  return baseParams
}

/** Extrai intervalo ISO usado na query (finalização ou criação). */
export function extrairPeriodoIsoDosFiltros(
  filters: VendasFiltrosQuerySnapshot,
  timeZoneEmpresa: string
): { inicio: string | null; fim: string | null } {
  const params = buildVendasListQueryParams(filters, { timeZoneEmpresa })
  return {
    inicio:
      params.get('dataFinalizacaoInicial') ?? params.get('dataCriacaoInicial'),
    fim: params.get('dataFinalizacaoFinal') ?? params.get('dataCriacaoFinal'),
  }
}

function mapearPagamentosApiRow(item: Record<string, unknown>): VendaListItem['pagamentos'] {
  if (!Array.isArray(item.pagamentos)) return undefined
  return item.pagamentos
    .map(pagamento => {
      const raw = pagamento as Record<string, unknown>
      const meioPagamentoId = String(raw.meioPagamentoId ?? '')
      if (!meioPagamentoId) return null
      return {
        meioPagamentoId,
        valor: Number(raw.valor) || 0,
        cancelado: raw.cancelado === true,
        dataCancelamento:
          raw.dataCancelamento != null ? String(raw.dataCancelamento) : undefined,
        isTefUsed: raw.isTefUsed === true,
        isTefConfirmed:
          raw.isTefConfirmed === true
            ? true
            : raw.isTefConfirmed === false
              ? false
              : undefined,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p != null)
}

/** Mapeia linha da API para o tipo usado na lista. */
export function mapearVendaApiRow(item: Record<string, unknown>): VendaListItem {
  const base = item as unknown as VendaListItem
  const pagamentos = mapearPagamentosApiRow(item)
  return {
    ...base,
    pagamentos: pagamentos?.length ? pagamentos : base.pagamentos,
    totalValorProdutosRemovidos:
      Number(item.totalValorProdutosRemovidos) ||
      Number(item.totalValorProdutosRemovido) ||
      Number(item.valorProdutosRemovidos) ||
      Number(item.valorProdutosRemovido) ||
      0,
  }
}

/**
 * Refina por status usando datas (quando a API retorna mistura ou caso "Aberta").
 */
export function filtrarVendasPorStatusCliente(
  itens: VendaListItem[],
  statusFilter: string | null
): VendaListItem[] {
  return itens.filter(v => {
    const normalizedStatus = statusFilter?.toUpperCase()

    if (!normalizedStatus || normalizedStatus === 'ABERTA') {
      if (normalizedStatus === 'ABERTA') {
        return !v.dataCancelamento && !v.dataFinalizacao
      }
      return !!(v.dataCancelamento || v.dataFinalizacao)
    }

    if (normalizedStatus === 'CANCELADA') {
      return !!v.dataCancelamento
    }

    if (normalizedStatus === 'FINALIZADA') {
      return !!v.dataFinalizacao && !v.dataCancelamento
    }

    return !!(v.dataCancelamento || v.dataFinalizacao)
  })
}

export function mapFiltroTipoVendaParaUnificado(tipoVendaFilter: string | null): {
  tipo?: VendasUnificadasQueryParams['tipo']
  tipoEntrega?: VendasUnificadasQueryParams['tipoEntrega']
  tipoVenda?: string
} {
  const raw = String(tipoVendaFilter ?? '')
    .trim()
    .toLowerCase()
  if (!raw) return {}
  if (raw === 'entrega' || raw === 'retirada') {
    return { tipo: 'DELIVERY', tipoEntrega: raw }
  }
  if (raw === 'delivery') {
    return { tipo: 'DELIVERY', tipoVenda: 'delivery' }
  }
  if (raw === 'gestor') {
    return { tipo: 'GESTOR' }
  }
  if (raw === 'mesa') {
    return { tipo: 'PDV', tipoVenda: 'mesa' }
  }
  if (raw === 'balcao') {
    return { tipoVenda: 'balcao' }
  }
  return { tipoVenda: raw }
}

export function filtrosVendasParaParamsUnificados(
  filters: VendasFiltrosQuerySnapshot,
  args?: { timeZoneEmpresa?: string }
): VendasUnificadasQueryParams {
  const listParams = buildVendasListQueryParams(filters, args)
  const canal = mapFiltroTipoVendaParaUnificado(filters.tipoVendaFilter)
  return {
    q: filters.searchQuery.trim() || undefined,
    tipo: canal.tipo,
    tipoEntrega: canal.tipoEntrega,
    tipoVenda: canal.tipoVenda,
    terminalId: filters.terminalFilter.trim() || undefined,
    dataFinalizacaoInicio:
      listParams.get('dataFinalizacaoInicial') ?? undefined,
    dataFinalizacaoFim: listParams.get('dataFinalizacaoFinal') ?? undefined,
    dataCriacaoInicial: listParams.get('dataCriacaoInicial') ?? undefined,
    dataCriacaoFinal: listParams.get('dataCriacaoFinal') ?? undefined,
  }
}

export function mapVendaUnificadaParaListItem(
  venda: VendaUnificadaDTO,
  tipoEntregaPorId?: Map<string, 'entrega' | 'retirada'>
): VendaListItem {
  const tipoEntrega =
    venda.tipoAtendimento() ??
    tipoEntregaPorId?.get(venda.id) ??
    (venda.codigoVenda ? tipoEntregaPorId?.get(venda.codigoVenda) : undefined) ??
    null
  return {
    id: venda.id,
    numeroVenda: venda.numeroVenda,
    codigoVenda: venda.codigoVenda,
    numeroMesa: venda.numeroMesa != null ? Number(venda.numeroMesa) : undefined,
    valorFinal: venda.valorFinal,
    tipoVenda: venda.tipoVenda ?? '',
    tipoEntrega,
    origem: venda.origem,
    tabelaOrigem: venda.tabelaOrigem,
    abertoPorId: venda.abertoPor.id,
    abertoPorNome: venda.abertoPor.nome,
    codigoTerminal: '',
    terminalId: '',
    dataCriacao: venda.dataCriacao,
    dataCancelamento: venda.dataCancelamento ?? undefined,
    dataFinalizacao: venda.dataFinalizacao ?? undefined,
    documentoFiscalId: venda.documentoFiscalId,
  }
}

/** Filtros que o GET unificado não expõe (valor, usuário). */
export function aplicarFiltrosClienteRelatorio(
  itens: VendaListItem[],
  filters: VendasFiltrosQuerySnapshot
): VendaListItem[] {
  const valorMin = normalizarMoedaFiltroVLista(filters.valorMinimo)
  const valorMax = normalizarMoedaFiltroVLista(filters.valorMaximo)
  const abertoPor = filters.usuarioAbertoPorFilter.trim()
  const canceladoPor = filters.usuarioCancelouFilter.trim()

  return itens.filter(item => {
    const valor = Number(item.valorFinal) || 0
    if (valorMin != null && valorMin > 0 && valor < valorMin) return false
    if (valorMax != null && valorMax > 0 && valor > valorMax) return false
    if (abertoPor && item.abertoPorId !== abertoPor) return false
    if (canceladoPor) {
      if (!item.canceladoPorId || item.canceladoPorId !== canceladoPor) return false
    }
    return true
  })
}

export function endpointDetalheVendaRelatorio(
  vendaId: string,
  tabelaOrigem?: 'venda' | 'venda_gestor'
): string {
  const id = encodeURIComponent(vendaId)
  return tabelaOrigem === 'venda_gestor' ? `/api/vendas/gestor/${id}` : `/api/vendas/${id}`
}

export function filtrarVendasPorTipoRelatorio(
  itens: VendaListItem[],
  tipoVendaFilter: string | null
): VendaListItem[] {
  const raw = String(tipoVendaFilter ?? '')
    .trim()
    .toLowerCase()
  if (!raw) return itens

  return itens.filter(item => {
    const tipo = String(item.tipoVenda ?? '').trim().toLowerCase()
    const entrega = item.tipoEntrega
    if (raw === 'entrega') return entrega === 'entrega' || tipo === 'entrega'
    if (raw === 'retirada') return entrega === 'retirada' || tipo === 'retirada'
    if (raw === 'delivery') return tipo === 'delivery'
    if (raw === 'gestor') return item.tabelaOrigem === 'venda_gestor' && tipo !== 'delivery'
    if (raw === 'balcao') return tipo === 'balcao'
    if (raw === 'mesa') return tipo === 'mesa'
    return tipo === raw
  })
}

export const METRICAS_VENDAS_VAZIAS: MetricasVendas = {
  totalFaturado: 0,
  countVendasEfetivadas: 0,
  countVendasCanceladas: 0,
  countProdutosVendidos: null,
  totalCancelado: 0,
}

export function mapearEFiltrarVendasUnificadas(
  items: VendaUnificadaDTO[],
  filters: VendasFiltrosQuerySnapshot,
  tipoEntregaPorId?: Map<string, 'entrega' | 'retirada'>
): VendaListItem[] {
  return aplicarFiltrosClienteRelatorio(
    filtrarVendasPorTipoRelatorio(
      filtrarVendasPorStatusCliente(
        items.map(item => mapVendaUnificadaParaListItem(item, tipoEntregaPorId)),
        filters.statusFilter
      ),
      filters.tipoVendaFilter
    ),
    filters
  )
}

export function acumularMetricasVendasLista(
  atual: MetricasVendas,
  vendas: VendaListItem[],
  idsContabilizados: Set<string>
): MetricasVendas {
  let totalFaturado = atual.totalFaturado
  let countVendasEfetivadas = atual.countVendasEfetivadas
  let countVendasCanceladas = atual.countVendasCanceladas
  let totalCancelado = atual.totalCancelado
  for (const venda of vendas) {
    if (idsContabilizados.has(venda.id)) continue
    idsContabilizados.add(venda.id)
    if (venda.dataCancelamento) {
      countVendasCanceladas += 1
      totalCancelado += Number(venda.valorFinal) || 0
      continue
    }
    if (venda.dataFinalizacao) {
      countVendasEfetivadas += 1
      totalFaturado += Number(venda.valorFinal) || 0
    }
  }
  return {
    totalFaturado,
    countVendasEfetivadas,
    countVendasCanceladas,
    countProdutosVendidos: null,
    totalCancelado,
  }
}

export function agregarMetricasVendasLista(vendas: VendaListItem[]): MetricasVendas {
  return acumularMetricasVendasLista(METRICAS_VENDAS_VAZIAS, vendas, new Set())
}
