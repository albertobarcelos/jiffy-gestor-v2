import { RELATORIO_ENTREGAS_INTERVALO_MAX_DIAS } from '@/src/infrastructure/relatorios/montarQueryRelatorioEntregas'

const MS_DIA = 24 * 60 * 60 * 1000

export function dateToYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseYmdLocal(s: string): Date | null {
  const t = s.trim()
  if (!t) return null
  const [y, m, d] = t.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

/** Últimos 30 dias inclusive (hoje e 29 dias atrás), no fuso local. */
export function periodoPadraoUltimos30Dias(): { ini: string; fim: string } {
  const fim = new Date()
  const ini = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - 29, 12, 0, 0, 0)
  return { ini: dateToYmdLocal(ini), fim: dateToYmdLocal(fim) }
}

export function intervaloEmDiasYmd(ini: string, fim: string): number | null {
  const a = parseYmdLocal(ini)
  const b = parseYmdLocal(fim)
  if (!a || !b) return null
  return Math.round(Math.abs(b.getTime() - a.getTime()) / MS_DIA)
}

export function intervaloExcedeMaximoDias(ini: string, fim: string): boolean {
  const dias = intervaloEmDiasYmd(ini, fim)
  return dias != null && dias > RELATORIO_ENTREGAS_INTERVALO_MAX_DIAS
}

export function dateLocalToIsoInicio(day: string, hora = '00:00'): string {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0).toISOString()
}

export function dateLocalToIsoFim(day: string, hora = '23:59'): string {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  const ehFimDoDia = (hh || 0) === 23 && (mm || 0) === 59
  return new Date(y, m - 1, d, hh || 23, mm || 59, ehFimDoDia ? 59 : 0, ehFimDoDia ? 999 : 0).toISOString()
}

export function formatarTempoMedioSegundos(segundos: number | null): string {
  if (segundos == null || !Number.isFinite(segundos) || segundos < 0) return '—'
  const s = Math.round(segundos)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`
  if (m > 0) return `${m} min ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

export function formatarMoedaBrl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function formatarInteiroBr(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v)
}

export function formatarDataHoraBr(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
