import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { ufBrasilParaTimeZoneIANA } from '@/src/shared/utils/fusoHorarioBrasil'

type Status = 'FINALIZADA' | 'CANCELADA'

type VendaLike = {
  dataFinalizacao?: string
  dataCriacao?: string
  valorFinal?: number
  dataCancelamento?: string | null
}

type VendasPage = {
  items?: VendaLike[]
  totalPages?: number
  count?: number
  limit?: number
}

/** Lê UF do cadastro da empresa autenticada e converte para IANA (fallback: Brasília). */
async function obterFusoAgregacaoDaEmpresaLogada(
  apiClient: ApiClient,
  headers: Record<string, string>
): Promise<string> {
  try {
    const response = await apiClient.request<Record<string, unknown>>('/api/v1/empresas/me', {
      method: 'GET',
      headers,
    })
    const data = response.data ?? {}
    const endereco = (data.endereco ?? data.endereco_data) as Record<string, unknown> | undefined
    const estado =
      typeof endereco?.estado === 'string'
        ? endereco.estado
        : typeof data.uf === 'string'
          ? data.uf
          : ''
    return ufBrasilParaTimeZoneIANA(estado)
  } catch {
    return 'America/Sao_Paulo'
  }
}

function parseDateSafe(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function resolveVendaDate(v: VendaLike): Date | null {
  return parseDateSafe(v.dataFinalizacao) ?? parseDateSafe(v.dataCriacao)
}

function resolveVendaValor(v: VendaLike): number {
  return typeof v.valorFinal === 'number' && Number.isFinite(v.valorFinal) ? v.valorFinal : 0
}

/** Rótulo curto consistente para uma data civil (ano/mês/dia), sem depender do TZ do servidor. */
function formatDayLabelCivil(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

/** Partes de calendário + relógio da instância `date` quando vista no fuso informado. */
function partesDataHoraNoFuso(date: Date, timeZone: string) {
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
  /* Alguns motores representam meia-noite como hora 24. */
  if (hour === 24) hour = 0
  return { year, month, day, hour, minute }
}

function buildHourKey(
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

function roundMinutesForInterval(minutes: number, intervaloMinutos: number): number {
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

function shouldGroupByHour(params: {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  isCustomDates: boolean
  intervaloHora?: number | null
}): boolean {
  const { periodoInicial, periodoFinal, isCustomDates, intervaloHora } = params
  if (isCustomDates && periodoInicial && periodoFinal) {
    const diffInHours = (periodoFinal.getTime() - periodoInicial.getTime()) / (1000 * 60 * 60)
    const hasSpecificHours =
      periodoInicial.getHours() !== 0 ||
      periodoInicial.getMinutes() !== 0 ||
      periodoFinal.getHours() !== 23 ||
      periodoFinal.getMinutes() !== 59
    return diffInHours < 48 || hasSpecificHours
  }
  // Caso "Hoje" no frontend: o client já manda intervaloHora quando quer agrupar.
  return typeof intervaloHora === 'number' && intervaloHora > 0
}

async function fetchAllVendasStatus(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  periodoInicial?: string
  periodoFinal?: string
  status: Status
}): Promise<VendaLike[]> {
  const { apiClient, headers, periodoInicial, periodoFinal, status } = args
  const limit = 100
  let offset = 0
  let totalPages = 1
  const all: VendaLike[] = []

  while (offset / limit < totalPages) {
    const params = new URLSearchParams()
    if (periodoInicial) params.append('periodoInicial', periodoInicial)
    if (periodoFinal) params.append('periodoFinal', periodoFinal)
    params.append('status', status)
    params.append('limit', String(limit))
    params.append('offset', String(offset))

    const resp = await apiClient.request<VendasPage>(`/api/v1/operacao-pdv/vendas?${params.toString()}`, {
      method: 'GET',
      headers,
    })

    const page = resp.data ?? {}
    const items = Array.isArray(page.items) ? page.items : []
    all.push(...items)

    if (offset === 0) {
      if (typeof page.totalPages === 'number' && page.totalPages > 0) {
        totalPages = page.totalPages
      } else if (typeof page.count === 'number' && typeof page.limit === 'number' && page.limit > 0) {
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

/**
 * GET /api/dashboard/evolucao
 *
 * Retorna pontos já agregados para o gráfico, evitando múltiplos fetches e agregação no client.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const periodoInicial = searchParams.get('periodoInicial') || ''
    const periodoFinal = searchParams.get('periodoFinal') || ''
    const statuses = searchParams.getAll('status').filter(Boolean) as Status[]
    const intervaloHoraRaw = searchParams.get('intervaloHora')
    const intervaloHora = intervaloHoraRaw ? Number(intervaloHoraRaw) : null
    const isCustomDates = Boolean(periodoInicial && periodoFinal)

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const selectedStatuses: Status[] =
      statuses.length > 0 ? statuses.filter(s => s === 'FINALIZADA' || s === 'CANCELADA') : ['FINALIZADA']

    const [fusoAgregacao, finalizadas, canceladas] = await Promise.all([
      obterFusoAgregacaoDaEmpresaLogada(apiClient, headers),
      selectedStatuses.includes('FINALIZADA')
        ? fetchAllVendasStatus({
            apiClient,
            headers,
            periodoInicial: periodoInicial || undefined,
            periodoFinal: periodoFinal || undefined,
            status: 'FINALIZADA',
          })
        : Promise.resolve([]),
      selectedStatuses.includes('CANCELADA')
        ? fetchAllVendasStatus({
            apiClient,
            headers,
            periodoInicial: periodoInicial || undefined,
            periodoFinal: periodoFinal || undefined,
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
    })

    const mapFinalizadas = new Map<string, { label: string; valor: number }>()
    const mapCanceladas = new Map<string, { label: string; valor: number }>()

    const addToMap = (m: Map<string, { label: string; valor: number }>, key: string, label: string, value: number) => {
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

    // Montar um eixo de datas consistente entre os dois mapas
    const keys = Array.from(new Set([...mapFinalizadas.keys(), ...mapCanceladas.keys()])).sort()

    const points = keys.map(key => {
      const f = mapFinalizadas.get(key)
      const c = mapCanceladas.get(key)
      return {
        data: key,
        label: f?.label ?? c?.label ?? key,
        valorFinalizadas: f?.valor ?? 0,
        valorCanceladas: c?.valor ?? 0,
      }
    })

    return NextResponse.json(points)
  } catch (error) {
    console.error('Erro ao buscar evolução do dashboard:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar evolução do dashboard' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

