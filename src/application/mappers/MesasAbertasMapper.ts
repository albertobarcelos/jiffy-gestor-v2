import type {
  MesaAbertaSummary,
  MesaAbertaTipoVenda,
  MesasAbertasMetricas,
  UsuarioPdvResumo,
} from '@/src/domain/types/mesasAbertas'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null
}

function asString(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  return undefined
}

function mapTipoVenda(value: unknown): MesaAbertaTipoVenda {
  const raw = asString(value)?.toLowerCase()
  if (raw === 'balcao' || raw === 'mesa' || raw === 'gestor') return raw
  return 'mesa'
}

export function mapMesaAbertaSummary(raw: unknown): MesaAbertaSummary | null {
  const item = asRecord(raw)
  if (!item) return null

  const id = asString(item.id)
  if (!id) return null

  return {
    id,
    numeroVenda: asNumber(item.numeroVenda) ?? 0,
    codigoVenda: asString(item.codigoVenda) ?? '',
    numeroMesa: asNumber(item.numeroMesa) ?? undefined,
    valorFinal: asNumber(item.valorFinal) ?? 0,
    tipoVenda: mapTipoVenda(item.tipoVenda),
    abertoPorId: asString(item.abertoPorId) ?? '',
    codigoTerminal: asString(item.codigoTerminal) ?? '',
    terminalId: asString(item.terminalId) ?? '',
    dataCriacao: asString(item.dataCriacao) ?? '',
    dataUltimaModificacao: asString(item.dataUltimaModificacao) ?? undefined,
    dataUltimoProdutoLancado: asString(item.dataUltimoProdutoLancado) ?? undefined,
    clienteId: asString(item.clienteId),
    clienteNome: asString(item.clienteNome),
    identificacao: asString(item.identificacao),
    vendaCompartilhada: asBoolean(item.vendaCompartilhada),
    rodizioAberto: asBoolean(item.rodizioAberto),
    dataCancelamento: asString(item.dataCancelamento) ?? undefined,
    dataFinalizacao: asString(item.dataFinalizacao) ?? undefined,
    senha: asString(item.senha),
    tipoDesconto: asString(item.tipoDesconto),
    valorDesconto: asNumber(item.valorDesconto),
    tipoAcrescimo: asString(item.tipoAcrescimo),
    valorAcrescimo: asNumber(item.valorAcrescimo),
    totalValorProdutosRemovidos: asNumber(item.totalValorProdutosRemovidos),
  }
}

export function mapMesasAbertasMetricas(raw: unknown): MesasAbertasMetricas | null {
  const metricas = asRecord(raw)
  if (!metricas) return null

  return {
    totalFaturado: asNumber(metricas.totalFaturado) ?? 0,
    countVendasEfetivadas: asNumber(metricas.countVendasEfetivadas) ?? 0,
    countVendasCanceladas: asNumber(metricas.countVendasCanceladas) ?? 0,
    countProdutosVendidos: asNumber(metricas.countProdutosVendidos) ?? 0,
  }
}

export function resolveTotalCountFromMesasResponse(data: UnknownRecord): number | null {
  const candidates = [data.count, data.total, data.totalCount]
  for (const c of candidates) {
    const n = asNumber(c)
    if (n !== null) return n
  }
  const metricas = asRecord(data.metricas)
  return asNumber(metricas?.countVendasEfetivadas)
}

export function resolveHasNextFromMesasResponse(
  data: UnknownRecord,
  currentPage: number,
  pageSize: number
): boolean {
  if (typeof data.hasNext === 'boolean') return data.hasNext

  const totalPages = asNumber(data.totalPages)
  if (totalPages !== null && totalPages > 0) {
    return currentPage + 1 < totalPages
  }

  const count = resolveTotalCountFromMesasResponse(data)
  const limit = asNumber(data.limit) ?? pageSize
  if (count !== null && count >= 0 && limit > 0) {
    return currentPage + 1 < Math.ceil(count / limit)
  }

  return false
}

export function mapUsuarioPdvResumo(raw: unknown): UsuarioPdvResumo | null {
  const item = asRecord(raw)
  if (!item) return null
  const id = asString(item.id)
  if (!id) return null
  return {
    id,
    nome: asString(item.nome) ?? asString(item.name) ?? 'Sem nome',
  }
}

export const METRICAS_MESAS_VAZIAS: MesasAbertasMetricas = {
  totalFaturado: 0,
  countVendasEfetivadas: 0,
  countVendasCanceladas: 0,
  countProdutosVendidos: 0,
}
