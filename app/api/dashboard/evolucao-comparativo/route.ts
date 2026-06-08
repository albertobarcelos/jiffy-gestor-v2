import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  calcularPeriodoNoFusoEmpresa,
  calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa,
  deslocarPeriodoEmDiasCorridosUtc,
} from '@/src/shared/utils/periodoNoFusoEmpresa'
import {
  Status,
  obterFusoAgregacaoDaEmpresaLogada,
  fetchEvolucaoPoints,
} from '../evolucao/evolucaoService'
import {
  buildEvolucaoComparativoCacheKey,
  getEvolucaoComparativoCache,
  setEvolucaoComparativoCache,
  type EvolucaoPoint,
  type LinhaComparacaoChartRow,
} from '@/src/infrastructure/dashboard/dashboardEvolucaoComparativoCache'

function enumerarDiasCalendario(inicio: Date, fim: Date): Date[] {
  const out: Date[] = []
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
  while (cursor.getTime() <= end.getTime()) {
    out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function chaveDiaISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function extrairChaveDia(data: string): string | null {
  const head = data.trim().split(/\s+/)[0]
  if (!head || !/^\d{4}-\d{2}-\d{2}$/.test(head)) return null
  return head
}

function indexarPorDia(pts: EvolucaoPoint[]): Map<string, { finalizadas: number; canceladas: number }> {
  const m = new Map<string, { finalizadas: number; canceladas: number }>()
  for (const p of pts) {
    const k = extrairChaveDia(p.data)
    if (!k) continue
    const curr = m.get(k) ?? { finalizadas: 0, canceladas: 0 }
    m.set(k, {
      finalizadas: curr.finalizadas + p.valorFinalizadas,
      canceladas: curr.canceladas + p.valorCanceladas,
    })
  }
  return m
}

function extrairSlotHHmm(data: string): string | null {
  const parts = data.trim().split(/\s+/)
  const tail = parts[parts.length - 1]
  if (!tail || !/^\d{2}:\d{2}$/.test(tail)) return null
  return tail
}

function indexarPorSlotHora(pts: EvolucaoPoint[]): Map<string, { finalizadas: number; canceladas: number }> {
  const m = new Map<string, { finalizadas: number; canceladas: number }>()
  for (const p of pts) {
    const slot = extrairSlotHHmm(p.data)
    if (!slot) continue
    const curr = m.get(slot) ?? { finalizadas: 0, canceladas: 0 }
    m.set(slot, {
      finalizadas: curr.finalizadas + p.valorFinalizadas,
      canceladas: curr.canceladas + p.valorCanceladas,
    })
  }
  return m
}

function uniaoSlotsOrdenada(
  a: Map<string, { finalizadas: number; canceladas: number }>,
  b: Map<string, { finalizadas: number; canceladas: number }>
): string[] {
  const s = new Set<string>([...a.keys(), ...b.keys()])
  return [...s].sort((x, y) => x.localeCompare(y))
}

function formatarDiaMesEixo(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function formatarSlotEixoHora(slot: string): string {
  const [hStr, minStr] = slot.split(':')
  const h = Number(hStr)
  const min = Number(minStr)
  if (min === 0) return `${h}h`
  return `${h}h${String(min).padStart(2, '0')}`
}

function mergePontosEvolucaoComparacao(
  atual: EvolucaoPoint[],
  anterior: EvolucaoPoint[],
  modo: 'hora' | 'dia',
  inicioAtual: Date,
  fimAtual: Date,
  inicioAnterior: Date,
  fimAnterior: Date
): LinhaComparacaoChartRow[] {
  const diasA = enumerarDiasCalendario(inicioAtual, fimAtual)
  const diasB = enumerarDiasCalendario(inicioAnterior, fimAnterior)
  const n = Math.min(diasA.length, diasB.length)

  if (modo === 'dia' && diasA.length === 1 && n === 1) {
    const soma = (pts: EvolucaoPoint[]) =>
      pts.reduce(
        (acc, p) => ({
          finalizadas: acc.finalizadas + p.valorFinalizadas,
          canceladas: acc.canceladas + p.valorCanceladas,
        }),
        { finalizadas: 0, canceladas: 0 }
      )
    const sAtual = soma(atual)
    const sAnterior = soma(anterior)
    return [
      {
        labelEixo: formatarDiaMesEixo(diasA[0]),
        finalizadasAtual: sAtual.finalizadas,
        canceladasAtual: sAtual.canceladas,
        finalizadasAnterior: sAnterior.finalizadas,
        canceladasAnterior: sAnterior.canceladas,
      },
    ]
  }

  if (modo === 'dia') {
    const mapA = indexarPorDia(atual)
    const mapB = indexarPorDia(anterior)
    const rows: LinhaComparacaoChartRow[] = []
    for (let i = 0; i < n; i++) {
      const dA = diasA[i]
      const dB = diasB[i]
      const ka = chaveDiaISO(dA)
      const kb = chaveDiaISO(dB)
      const valA = mapA.get(ka) ?? { finalizadas: 0, canceladas: 0 }
      const valB = mapB.get(kb) ?? { finalizadas: 0, canceladas: 0 }
      rows.push({
        labelEixo: formatarDiaMesEixo(dA),
        finalizadasAtual: valA.finalizadas,
        canceladasAtual: valA.canceladas,
        finalizadasAnterior: valB.finalizadas,
        canceladasAnterior: valB.canceladas,
      })
    }
    return rows
  }

  const mapA = indexarPorSlotHora(atual)
  const mapB = indexarPorSlotHora(anterior)
  const slots = uniaoSlotsOrdenada(mapA, mapB)
  return slots.map(slot => {
    const valA = mapA.get(slot) ?? { finalizadas: 0, canceladas: 0 }
    const valB = mapB.get(slot) ?? { finalizadas: 0, canceladas: 0 }
    return {
      labelEixo: formatarSlotEixoHora(slot),
      finalizadasAtual: valA.finalizadas,
      canceladasAtual: valA.canceladas,
      finalizadasAnterior: valB.finalizadas,
      canceladasAnterior: valB.canceladas,
    }
  })
}

function resolverIntervalos(searchParams: URLSearchParams, periodo: string, timezone: string) {
  let inicioAtual: Date | null = null
  let fimAtual: Date | null = null
  let inicioAnterior: Date | null = null
  let fimAnterior: Date | null = null

  if (periodo === 'personalizado') {
    const pIni = searchParams.get('dataFinalizacaoInicial')
    const pFim = searchParams.get('dataFinalizacaoFinal')
    if (pIni && pFim) {
      inicioAtual = new Date(pIni)
      fimAtual = new Date(pFim)
      const deslocado = deslocarPeriodoEmDiasCorridosUtc(inicioAtual, fimAtual, 30)
      inicioAnterior = deslocado.inicio
      fimAnterior = deslocado.fim
    }
  } else {
    const mapOpcao: Record<string, string> = {
      hoje: 'Hoje',
      ontem: 'Ontem',
      semana: 'Últimos 7 Dias',
      '30dias': 'Últimos 30 Dias',
    }
    const opcao = mapOpcao[periodo] || 'Hoje'
    const atual = calcularPeriodoNoFusoEmpresa(opcao, timezone)
    inicioAtual = atual.inicio
    fimAtual = atual.fim
    const anterior = calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa(opcao, timezone)
    if (anterior) {
      inicioAnterior = anterior.inicio
      fimAnterior = anterior.fim
    }
  }

  return { inicioAtual, fimAtual, inicioAnterior, fimAnterior }
}

async function buscarPontosPeriodo(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  inicio: Date
  fim: Date
  intervaloHora: number | null
  fusoAgregacao: string
}): Promise<EvolucaoPoint[]> {
  const selectedStatuses: Status[] = ['FINALIZADA', 'CANCELADA']
  return fetchEvolucaoPoints({
    apiClient: args.apiClient,
    headers: args.headers,
    periodoInicial: args.inicio.toISOString(),
    periodoFinal: args.fim.toISOString(),
    selectedStatuses,
    intervaloHora: args.intervaloHora,
    fusoAgregacao: args.fusoAgregacao,
  })
}

/**
 * GET /api/dashboard/evolucao-comparativo
 *
 * - Cache ~90s por empresa + período + agregação.
 * - `comparativo=0` (padrão na 1ª carga): só período atual.
 * - `somenteComparativo=1`: completa período anterior (reutiliza cache do atual).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'hoje'
    const timezone = searchParams.get('timezone') || 'America/Sao_Paulo'
    const intervaloHoraRaw = searchParams.get('intervaloHora')
    const intervaloHora = intervaloHoraRaw ? Number(intervaloHoraRaw) : null
    const somenteComparativo = searchParams.get('somenteComparativo') === '1'

    const { inicioAtual, fimAtual, inicioAnterior, fimAnterior } = resolverIntervalos(
      searchParams,
      periodo,
      timezone
    )

    const intervaloCustomKey =
      periodo === 'personalizado'
        ? `${searchParams.get('dataFinalizacaoInicial') ?? ''}|${searchParams.get('dataFinalizacaoFinal') ?? ''}`
        : ''

    const cacheKey = buildEvolucaoComparativoCacheKey({
      empresaId: tokenInfo.empresaId ?? '',
      periodo,
      timezone,
      intervaloCustomKey,
      intervaloHora,
    })

    const cached = getEvolucaoComparativoCache(cacheKey)
    if (cached) {
      if (somenteComparativo) {
        if (cached.comparativoPronto) {
          return NextResponse.json(cached.merged, {
            headers: { 'Cache-Control': 'private, max-age=30' },
          })
        }
      } else {
        return NextResponse.json(cached.merged, {
          headers: { 'Cache-Control': 'private, max-age=30' },
        })
      }
    }

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const fusoAgregacao = await obterFusoAgregacaoDaEmpresaLogada(apiClient, headers)
    const modo = typeof intervaloHora === 'number' && intervaloHora > 0 ? 'hora' : 'dia'

    if (!inicioAtual || !fimAtual || !inicioAnterior || !fimAnterior) {
      return NextResponse.json([])
    }

    let atual: EvolucaoPoint[] = cached?.atual ?? []
    let anterior: EvolucaoPoint[] = cached?.anterior ?? []

    if (somenteComparativo) {
      if (atual.length === 0) {
        atual = await buscarPontosPeriodo({
          apiClient,
          headers,
          inicio: inicioAtual,
          fim: fimAtual,
          intervaloHora,
          fusoAgregacao,
        })
      }
      anterior = await buscarPontosPeriodo({
        apiClient,
        headers,
        inicio: inicioAnterior,
        fim: fimAnterior,
        intervaloHora,
        fusoAgregacao,
      })
    } else {
      atual = await buscarPontosPeriodo({
        apiClient,
        headers,
        inicio: inicioAtual,
        fim: fimAtual,
        intervaloHora,
        fusoAgregacao,
      })
      anterior = []
    }

    const merged = mergePontosEvolucaoComparacao(
      atual,
      anterior,
      modo,
      inicioAtual,
      fimAtual,
      inicioAnterior,
      fimAnterior
    )

    setEvolucaoComparativoCache(cacheKey, {
      atual,
      anterior: somenteComparativo ? anterior : null,
      merged,
      comparativoPronto: Boolean(somenteComparativo),
    })

    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    })
  } catch (error) {
    console.error('Erro ao buscar evolução comparativo:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar evolução comparativo' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
