import { ufBrasilParaTimeZoneIANA } from '@/src/shared/utils/fusoHorarioBrasil'

/** Verifica se o identificador IANA é aceito pelo motor de datas do runtime. */
export function timeZoneIANAValido(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}

/**
 * Mesma prioridade da rota GET `/api/dashboard/evolucao`: bucket diário alinhado ao cadastro.
 * Ordem: `parametroEmpresa.timezone` → `timeZone` → `timezone` raiz → UF do endereço → Brasília.
 */
export function resolverTimezoneAgregacaoEmpresa(data: Record<string, unknown>): string {
  const parametro = data.parametroEmpresa as Record<string, unknown> | undefined
  const tzApi =
    (typeof parametro?.timezone === 'string' ? parametro.timezone : '') ||
    (typeof parametro?.timeZone === 'string' ? parametro.timeZone : '') ||
    (typeof data.timezone === 'string' ? data.timezone : '')
  const tzTrim = tzApi.trim()
  if (tzTrim.length > 0 && timeZoneIANAValido(tzTrim)) {
    return tzTrim
  }

  const endereco = (data.endereco ?? data.endereco_data) as Record<string, unknown> | undefined
  const estado =
    typeof endereco?.estado === 'string'
      ? endereco.estado
      : typeof data.uf === 'string'
        ? data.uf
        : ''
  return ufBrasilParaTimeZoneIANA(estado)
}

/**
 * yyyy-MM-DD da data civil no fuso IANA (mesma regra dos buckets da evolução no servidor).
 */
export function formatIsoDiaCivilEmFusoIANA(date: Date, timeZone: string): string {
  const tz = timeZone.trim()
  if (!tz) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Interpreta yyyy-MM-DD como meio-dia no fuso local (evita virada do dia por UTC). */
export function parseIsoParaDataLocalMeioDia(iso: string): Date {
  const trimmed = iso.trim()
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (!m) return new Date(trimmed)
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  return new Date(y, mo - 1, d, 12, 0, 0, 0)
}
