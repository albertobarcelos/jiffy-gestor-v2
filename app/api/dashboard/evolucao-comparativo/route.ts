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

type DashboardEvolucaoPoint = {
  data: string
  label: string
  valorFinalizadas: number
  valorCanceladas: number
}

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

function indexarPorDia(pts: DashboardEvolucaoPoint[]): Map<string, { finalizadas: number; canceladas: number }> {
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

function indexarPorSlotHora(pts: DashboardEvolucaoPoint[]): Map<string, { finalizadas: number; canceladas: number }> {
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
  atual: DashboardEvolucaoPoint[],
  anterior: DashboardEvolucaoPoint[],
  modo: 'hora' | 'dia',
  inicioAtual: Date,
  fimAtual: Date,
  inicioAnterior: Date,
  fimAnterior: Date
) {
  const diasA = enumerarDiasCalendario(inicioAtual, fimAtual)
  const diasB = enumerarDiasCalendario(inicioAnterior, fimAnterior)
  const n = Math.min(diasA.length, diasB.length)

  if (modo === 'dia' && diasA.length === 1 && n === 1) {
    const soma = (pts: DashboardEvolucaoPoint[]) =>
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
    const rows = []
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

    const selectedStatuses: Status[] = ['FINALIZADA', 'CANCELADA']

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

    const apiClient = new ApiClient()
    const headers = {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    }

    const fusoAgregacao = await obterFusoAgregacaoDaEmpresaLogada(apiClient, headers)

    const [atual, anterior] = await Promise.all([
      inicioAtual && fimAtual ? fetchEvolucaoPoints({
        apiClient,
        headers,
        periodoInicial: inicioAtual.toISOString(),
        periodoFinal: fimAtual.toISOString(),
        selectedStatuses,
        intervaloHora,
        fusoAgregacao,
      }) : Promise.resolve([]),
      inicioAnterior && fimAnterior ? fetchEvolucaoPoints({
        apiClient,
        headers,
        periodoInicial: inicioAnterior.toISOString(),
        periodoFinal: fimAnterior.toISOString(),
        selectedStatuses,
        intervaloHora,
        fusoAgregacao,
      }) : Promise.resolve([])
    ])

    const modo = typeof intervaloHora === 'number' && intervaloHora > 0 ? 'hora' : 'dia'
    
    let merged: any[] = []
    if (inicioAtual && fimAtual && inicioAnterior && fimAnterior) {
      merged = mergePontosEvolucaoComparacao(
        atual,
        anterior,
        modo,
        inicioAtual,
        fimAtual,
        inicioAnterior,
        fimAnterior
      )
    }

    return NextResponse.json(merged)
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
