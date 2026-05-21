import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolverTimezoneAgregacaoEmpresa } from '@/src/shared/utils/timezoneAgregacaoEmpresa'

export type Status = 'FINALIZADA' | 'CANCELADA'

export type VendaLike = {
  dataFinalizacao?: string
  valorFinal?: number
  dataCancelamento?: string | null
}

export type VendasPage = {
  items?: VendaLike[]
  totalPages?: number
  count?: number
  limit?: number
}

export async function obterFusoAgregacaoDaEmpresaLogada(
  apiClient: ApiClient,
  headers: Record<string, string>
): Promise<string> {
  try {
    const response = await apiClient.request<Record<string, unknown>>('/api/v1/empresas/me', {
      method: 'GET',
      headers,
    })
    const data = response.data ?? {}
    const tz = resolverTimezoneAgregacaoEmpresa(data)
    return tz
  } catch {
    return 'America/Sao_Paulo'
  }
}

export function parseDateSafe(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Data para bucket do gráfico: finalização; canceladas sem finalização usam cancelamento (nunca data de criação). */
export function resolveVendaDate(v: VendaLike): Date | null {
  return parseDateSafe(v.dataFinalizacao) ?? parseDateSafe(v.dataCancelamento)
}

export function resolveVendaValor(v: VendaLike): number {
  return typeof v.valorFinal === 'number' && Number.isFinite(v.valorFinal) ? v.valorFinal : 0
}

export function formatDayLabelCivil(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

export function partesDataHoraNoFuso(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  let year = Number(map.year)
  let month = Number(map.month)
  let day = Number(map.day)
  let hour = Number(map.hour)
  let minute = Number(map.minute)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    year = date.getFullYear()
    month = date.getMonth() + 1
    day = date.getDate()
  }
  if (!Number.isFinite(hour)) hour = date.getHours()
  if (!Number.isFinite(minute)) minute = date.getMinutes()
  if (hour === 24) hour = 0
  return { year, month, day, hour, minute }
}

export function buildHourKey(
  date: Date,
  roundedMinutes: number,
  timeZone: string
): { key: string; label: string } {
  const p = partesDataHoraNoFuso(date, timeZone)
  const year = p.year
  const month = pad2(p.month)
  const day = pad2(p.day)
  const hour = pad2(p.hour)
  const minutes = pad2(roundedMinutes)
  const key = `${year}-${month}-${day} ${hour}:${minutes}`
  const label = `${day}/${month} ${hour}:${minutes}`
  return { key, label }
}

export function roundMinutesForInterval(minutes: number, intervaloMinutos: number): number {
  if (intervaloMinutos === 15) {
    const r = Math.round(minutes / 15) * 15
    return r === 60 ? 0 : r
  }
  if (intervaloMinutos === 30) {
    return minutes < 15 ? 0 : 30
  }
  if (intervaloMinutos === 60) return 0
  return minutes < 15 ? 0 : 30
}

export function limitesPadraoDiaInteiroNoFuso(inicio: Date, fim: Date, timeZone: string): boolean {
  const pi = partesDataHoraNoFuso(inicio, timeZone)
  const pf = partesDataHoraNoFuso(fim, timeZone)
  const inicioMeiaNoite = pi.hour === 0 && pi.minute === 0
  const fimUltimoMinuto = pf.hour === 23 && pf.minute >= 59
  return inicioMeiaNoite && fimUltimoMinuto
}

export function shouldGroupByHour(params: {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  isCustomDates: boolean
  intervaloHora?: number | null
  timeZoneAgregacao: string
}): boolean {
  const { periodoInicial, periodoFinal, isCustomDates, intervaloHora, timeZoneAgregacao } = params
  if (isCustomDates && periodoInicial && periodoFinal) {
    const diffMs = periodoFinal.getTime() - periodoInicial.getTime()
    const diffInHours = diffMs / (1000 * 60 * 60)

    if (diffInHours >= 48) {
      return false
    }

    if (typeof intervaloHora === 'number' && intervaloHora > 0) {
      return true
    }

    if (limitesPadraoDiaInteiroNoFuso(periodoInicial, periodoFinal, timeZoneAgregacao)) {
      return false
    }

    return true
  }
  return typeof intervaloHora === 'number' && intervaloHora > 0
}

export async function fetchAllVendasStatus(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  dataFinalizacaoInicial?: string
  dataFinalizacaoFinal?: string
  status: Status
}): Promise<VendaLike[]> {
  const { apiClient, headers, dataFinalizacaoInicial, dataFinalizacaoFinal, status } = args
  const limit = 100
  let offset = 0
  let totalPages = 1
  const all: VendaLike[] = []

  while (offset / limit < totalPages) {
    const params = new URLSearchParams()
    if (dataFinalizacaoInicial) params.append('dataFinalizacaoInicial', dataFinalizacaoInicial)
    if (dataFinalizacaoFinal) params.append('dataFinalizacaoFinal', dataFinalizacaoFinal)
    params.append('status', status)
    params.append('limit', String(limit))
    params.append('offset', String(offset))

    const resp = await apiClient.request<VendasPage>(
      `/api/v1/operacao-pdv/vendas?${params.toString()}`,
      {
        method: 'GET',
        headers,
      }
    )

    const page = resp.data ?? {}
    const items = Array.isArray(page.items) ? page.items : []
    all.push(...items)

    if (offset === 0) {
      if (typeof page.totalPages === 'number' && page.totalPages > 0) {
        totalPages = page.totalPages
      } else if (
        typeof page.count === 'number' &&
        typeof page.limit === 'number' &&
        page.limit > 0
      ) {
        totalPages = Math.ceil(page.count / page.limit)
      } else {
        totalPages = items.length < limit ? 1 : 200
      }
      totalPages = Math.max(1, Math.min(totalPages, 200))
    }

    if (items.length < limit) break
    offset += limit
  }

  return all
}

export async function fetchEvolucaoPoints(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  periodoInicial: string
  periodoFinal: string
  selectedStatuses: Status[]
  intervaloHora: number | null
  fusoAgregacao: string
}) {
  const { apiClient, headers, periodoInicial, periodoFinal, selectedStatuses, intervaloHora, fusoAgregacao } = args
  
  const isCustomDates = Boolean(periodoInicial && periodoFinal)

  const [finalizadas, canceladas] = await Promise.all([
    selectedStatuses.includes('FINALIZADA')
      ? fetchAllVendasStatus({
          apiClient,
          headers,
          dataFinalizacaoInicial: periodoInicial || undefined,
          dataFinalizacaoFinal: periodoFinal || undefined,
          status: 'FINALIZADA',
        })
      : Promise.resolve([]),
    selectedStatuses.includes('CANCELADA')
      ? fetchAllVendasStatus({
          apiClient,
          headers,
          dataFinalizacaoInicial: periodoInicial || undefined,
          dataFinalizacaoFinal: periodoFinal || undefined,
          status: 'CANCELADA',
        })
      : Promise.resolve([]),
  ])

  const intervaloMinutos = intervaloHora && Number.isFinite(intervaloHora) ? intervaloHora : 30
  const groupByHour = shouldGroupByHour({
    periodoInicial: isCustomDates ? new Date(periodoInicial) : null,
    periodoFinal: isCustomDates ? new Date(periodoFinal) : null,
    isCustomDates,
    intervaloHora,
    timeZoneAgregacao: fusoAgregacao,
  })

  const mapFinalizadas = new Map<string, { label: string; valor: number }>()
  const mapCanceladas = new Map<string, { label: string; valor: number }>()

  const addToMap = (
    m: Map<string, { label: string; valor: number }>,
    key: string,
    label: string,
    value: number
  ) => {
    const current = m.get(key)
    if (current) {
      m.set(key, { label: current.label, valor: current.valor + value })
    } else {
      m.set(key, { label, valor: value })
    }
  }

  const addVenda = (v: VendaLike, target: 'FINALIZADA' | 'CANCELADA') => {
    const date = resolveVendaDate(v)
    if (!date) return
    const valor = resolveVendaValor(v)

    if (groupByHour) {
      const { minute } = partesDataHoraNoFuso(date, fusoAgregacao)
      const rounded = roundMinutesForInterval(minute, intervaloMinutos)
      const { key, label } = buildHourKey(date, rounded, fusoAgregacao)
      if (target === 'FINALIZADA') addToMap(mapFinalizadas, key, label, valor)
      else addToMap(mapCanceladas, key, label, valor)
    } else {
      const p = partesDataHoraNoFuso(date, fusoAgregacao)
      const year = p.year
      const month = pad2(p.month)
      const day = pad2(p.day)
      const key = `${year}-${month}-${day}`
      const label = formatDayLabelCivil(p.year, p.month, p.day)
      if (target === 'FINALIZADA') addToMap(mapFinalizadas, key, label, valor)
      else addToMap(mapCanceladas, key, label, valor)
    }
  }

  finalizadas.forEach(v => addVenda(v, 'FINALIZADA'))
  canceladas.forEach(v => addVenda(v, 'CANCELADA'))

  const keys = Array.from(new Set([...mapFinalizadas.keys(), ...mapCanceladas.keys()])).sort()

  return keys.map(key => {
    const f = mapFinalizadas.get(key)
    const c = mapCanceladas.get(key)
    return {
      data: key,
      label: f?.label ?? c?.label ?? key,
      valorFinalizadas: f?.valor ?? 0,
      valorCanceladas: c?.valor ?? 0,
    }
  })
}
