import { useQuery } from '@tanstack/react-query'

import type { DashboardEvolucaoPoint } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Extrai yyyy-MM-dd do campo `data` da evolução.
 * A rota `/api/dashboard/evolucao` pode devolver bucket diário (`2026-04-20`) ou por hora (`2026-04-20 14:30`).
 */
function extrairIsoDiaDoPontoEvolucao(data: string): string | null {
  const trimmed = data.trim()
  if (ISO_DIA.test(trimmed)) return trimmed
  const antesDoEspaco = trimmed.split(/\s+/)[0] ?? ''
  return ISO_DIA.test(antesDoEspaco) ? antesDoEspaco : null
}

/**
 * Converte pontos da evolução em mapa yyyy-MM-dd → faturamento (vendas finalizadas), somando buckets por hora no mesmo dia.
 */
export function pontosEvolucaoParaMapaFaturamentoPorDia(pontos: DashboardEvolucaoPoint[]): Record<string, number> {
  const mapa: Record<string, number> = {}
  for (const p of pontos) {
    if (typeof p.data !== 'string') continue
    const dia = extrairIsoDiaDoPontoEvolucao(p.data)
    if (!dia) continue
    const v =
      typeof p.valorFinalizadas === 'number' && Number.isFinite(p.valorFinalizadas) ? p.valorFinalizadas : 0
    mapa[dia] = (mapa[dia] ?? 0) + v
  }
  return mapa
}

type Params = {
  periodoInicial: Date
  periodoFinal: Date
  enabled?: boolean
  /** Fuso IANA da empresa (ex.: America/Sao_Paulo). */
  timeZoneEmpresa?: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  /**
   * Diferença entre a data/hora "vista" no timeZone e a mesma instância em UTC.
   * Implementação local para não depender de libs (date-fns-tz / luxon).
   */
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

function zonedTimeToUtc(
  dateParts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second?: number
    millisecond?: number
  },
  timeZone: string
): Date {
  const { year, month, day, hour, minute, second = 0, millisecond = 0 } = dateParts
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const off1 = getTimeZoneOffsetMinutes(new Date(guess), timeZone)
  const utc1 = guess - off1 * 60_000
  const off2 = getTimeZoneOffsetMinutes(new Date(utc1), timeZone)
  const utc2 = guess - off2 * 60_000
  return new Date(utc2)
}

function rangeDiaNoFusoEmpresaParaUtc(args: {
  year: number
  month: number
  day: number
  timeZoneEmpresa: string
}): { inicioUtc: Date; fimUtc: Date } {
  const { year, month, day, timeZoneEmpresa } = args
  const inicioUtc = zonedTimeToUtc(
    { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZoneEmpresa
  )
  const fimUtc = zonedTimeToUtc(
    { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    timeZoneEmpresa
  )
  return { inicioUtc, fimUtc }
}

async function fetchFaturamentoPorDia(params: Params): Promise<Record<string, number>> {
  const tz = (params.timeZoneEmpresa ?? '').trim()

  /**
   * IMPORTANTÍSSIMO: o calendário mostra "dias civis" no fuso da empresa.
   * Então o fetch do intervalo de 2 meses precisa pedir:
   * - início = 00:00 do primeiro dia (no fuso da empresa)
   * - fim = 23:59:59.999 do último dia (no fuso da empresa)
   * E só então converter para UTC (toISOString) pra enviar ao backend.
   */
  let inicio = params.periodoInicial
  let fim = params.periodoFinal
  if (tz) {
    const yIni = params.periodoInicial.getFullYear()
    const mIni = params.periodoInicial.getMonth() + 1
    const dIni = params.periodoInicial.getDate()
    const yFim = params.periodoFinal.getFullYear()
    const mFim = params.periodoFinal.getMonth() + 1
    const dFim = params.periodoFinal.getDate()
    const iniUtc = rangeDiaNoFusoEmpresaParaUtc({
      year: yIni,
      month: mIni,
      day: dIni,
      timeZoneEmpresa: tz,
    }).inicioUtc
    const fimUtc = rangeDiaNoFusoEmpresaParaUtc({
      year: yFim,
      month: mFim,
      day: dFim,
      timeZoneEmpresa: tz,
    }).fimUtc
    inicio = iniUtc
    fim = fimUtc
  }

  const search = new URLSearchParams()
  search.append('dataFinalizacaoInicial', inicio.toISOString())
  search.append('dataFinalizacaoFinal', fim.toISOString())
  search.append('status', 'FINALIZADA')

  const response = await fetch(`/api/dashboard/evolucao?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar faturamento por dia'
    throw new Error(msg)
  }

  const pontos = data as unknown as DashboardEvolucaoPoint[]
  if (!Array.isArray(pontos)) {
    return {}
  }
  return pontosEvolucaoParaMapaFaturamentoPorDia(pontos)
}

/**
 * Faturamento agregado por dia (vendas FINALIZADAS) para o calendário de intervalo.
 * Reutiliza GET /api/dashboard/evolucao; se a rota vier com buckets por hora, agregamos no cliente por yyyy-MM-dd.
 */
export function useDashboardFaturamentoPorDiaQuery({
  periodoInicial,
  periodoFinal,
  enabled = true,
  timeZoneEmpresa,
}: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'faturamento-por-dia',
      periodoInicial.toISOString(),
      periodoFinal.toISOString(),
      timeZoneEmpresa ?? '',
    ],
    queryFn: () => fetchFaturamentoPorDia({ periodoInicial, periodoFinal, timeZoneEmpresa }),
    enabled,
    staleTime: 30_000,
  })
}
