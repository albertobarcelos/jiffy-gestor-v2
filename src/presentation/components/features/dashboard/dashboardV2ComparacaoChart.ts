import type { DashboardEvolucaoPoint } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

/** Qual valor agregar nos pontos da API (uma métrica por vez no gráfico V2). */
export type MetricaEvolucaoComparativo = 'FINALIZADA' | 'CANCELADA'

/** Linha do gráfico comparativo (Recharts): eixo X + duas séries (atual × anterior). */
export type LinhaComparacaoChartRow = {
  labelEixo: string
  periodoAtual: number
  periodoAnterior: number
}

function valorMetricaPonto(p: DashboardEvolucaoPoint, metrica: MetricaEvolucaoComparativo): number {
  return metrica === 'FINALIZADA' ? p.valorFinalizadas : p.valorCanceladas
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

/** Chave YYYY-MM-DD a partir do campo `data` da API (dia ou início de chave horária). */
function extrairChaveDia(data: string): string | null {
  const head = data.trim().split(/\s+/)[0]
  if (!head || !/^\d{4}-\d{2}-\d{2}$/.test(head)) return null
  return head
}

/** Soma da métrica escolhida por dia (agregação diária). */
function indexarPorDia(
  pts: DashboardEvolucaoPoint[],
  metrica: MetricaEvolucaoComparativo
): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pts) {
    const k = extrairChaveDia(p.data)
    if (!k) continue
    m.set(k, (m.get(k) ?? 0) + valorMetricaPonto(p, metrica))
  }
  return m
}

/** Extrai "HH:mm" da chave horária da API (`YYYY-MM-DD HH:mm`). */
function extrairSlotHHmm(data: string): string | null {
  const parts = data.trim().split(/\s+/)
  const tail = parts[parts.length - 1]
  if (!tail || !/^\d{2}:\d{2}$/.test(tail)) return null
  return tail
}

function indexarPorSlotHora(
  pts: DashboardEvolucaoPoint[],
  metrica: MetricaEvolucaoComparativo
): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of pts) {
    const slot = extrairSlotHHmm(p.data)
    if (!slot) continue
    m.set(slot, (m.get(slot) ?? 0) + valorMetricaPonto(p, metrica))
  }
  return m
}

function uniaoSlotsOrdenada(a: Map<string, number>, b: Map<string, number>): string[] {
  const s = new Set<string>([...a.keys(), ...b.keys()])
  return [...s].sort((x, y) => x.localeCompare(y))
}

/** Data no eixo X (modo diário): `03/04`, `04/04`, … — dia/mês com dois dígitos. */
function formatarDiaMesEixo(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

/** Rótulo curto no eixo X para slot HH:mm (ex.: 8h, 8h30). */
function formatarSlotEixoHora(slot: string): string {
  const [hStr, minStr] = slot.split(':')
  const h = Number(hStr)
  const min = Number(minStr)
  if (min === 0) return `${h}h`
  return `${h}h${String(min).padStart(2, '0')}`
}

/**
 * Une duas séries da API de evolução (período atual vs período anterior) para o LineChart V2.
 * - `hora`: alinha por hora do dia (mesmo horário em dias diferentes).
 * - `dia`: por calendário; cada índice i = dia i do período atual vs dia i do período anterior.
 *   Um único dia cada: em `dia` soma todos os pontos (a API pode retornar faixas horárias).
 */
export function mergePontosEvolucaoComparacao(
  atual: DashboardEvolucaoPoint[],
  anterior: DashboardEvolucaoPoint[],
  args: {
    modo: 'hora' | 'dia'
    metrica: MetricaEvolucaoComparativo
    inicioAtual: Date
    fimAtual: Date
    inicioAnterior: Date
    fimAnterior: Date
  }
): LinhaComparacaoChartRow[] {
  const { modo, metrica, inicioAtual, fimAtual, inicioAnterior, fimAnterior } = args

  const diasA = enumerarDiasCalendario(inicioAtual, fimAtual)
  const diasB = enumerarDiasCalendario(inicioAnterior, fimAnterior)
  const n = Math.min(diasA.length, diasB.length)

  if (modo === 'dia' && diasA.length === 1 && n === 1) {
    const soma = (pts: DashboardEvolucaoPoint[]) =>
      pts.reduce((s, p) => s + valorMetricaPonto(p, metrica), 0)
    return [
      {
        labelEixo: formatarDiaMesEixo(diasA[0]),
        periodoAtual: soma(atual),
        periodoAnterior: soma(anterior),
      },
    ]
  }

  if (modo === 'dia') {
    const mapA = indexarPorDia(atual, metrica)
    const mapB = indexarPorDia(anterior, metrica)
    const rows: LinhaComparacaoChartRow[] = []
    for (let i = 0; i < n; i++) {
      const dA = diasA[i]
      const dB = diasB[i]
      const ka = chaveDiaISO(dA)
      const kb = chaveDiaISO(dB)
      rows.push({
        labelEixo: formatarDiaMesEixo(dA),
        periodoAtual: mapA.get(ka) ?? 0,
        periodoAnterior: mapB.get(kb) ?? 0,
      })
    }
    return rows
  }

  // modo hora: mesmo instante do dia em dias diferentes → eixo = slot HH:mm
  const mapA = indexarPorSlotHora(atual, metrica)
  const mapB = indexarPorSlotHora(anterior, metrica)
  const slots = uniaoSlotsOrdenada(mapA, mapB)
  return slots.map(slot => ({
    labelEixo: formatarSlotEixoHora(slot),
    periodoAtual: mapA.get(slot) ?? 0,
    periodoAnterior: mapB.get(slot) ?? 0,
  }))
}
