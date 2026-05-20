import { formatarMoeda } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'

export { formatarMoeda }

/** Rótulo curto dia `YYYY-MM-DD` → DD/MM para eixo X. */
export function formatarDiaDm(isoDay: string): string {
  const m = isoDay.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return isoDay
  return `${m[3]}/${m[2]}`
}

export function formatarVariacaoPct(p: number | null | undefined, digits = 1): string {
  if (p == null || !Number.isFinite(p)) return '—'
  const rounded = digits === 0 ? Math.round(p) : Math.round(p * 10 ** digits) / 10 ** digits
  const sig = rounded > 0 ? '+' : ''
  return `${sig}${rounded.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`
}

/** Participação no total filtrado (sem sinal +/−). */
export function formatarPercentualParticipacao(p: number | null | undefined, digits = 1): string {
  if (p == null || !Number.isFinite(p)) return '—'
  const rounded = digits === 0 ? Math.round(p) : Math.round(p * 10 ** digits) / 10 ** digits
  return `${rounded.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`
}

export function formatoTickYReais(v: number): string {
  const arred = Math.round(v)
  if (arred >= 1000) {
    const k = arred / 1000
    if (Math.abs(k - Math.round(k)) < 1e-6) return `R$ ${Math.round(k)}k`
    return `R$ ${k.toFixed(2).replace('.', ',')}k`
  }
  return `R$ ${arred.toLocaleString('pt-BR')}`
}
