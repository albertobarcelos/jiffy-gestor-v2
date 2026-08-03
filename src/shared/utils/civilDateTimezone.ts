/** Helpers de data civil em timezone IANA (sem dependência externa). */

export const TIMEZONE_BRASIL_PADRAO = 'America/Sao_Paulo'

export function formatCivilDateInTimeZone(
  date: Date,
  timeZone: string
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Alias usado nas UIs de checkout/pedido. */
export function civilDateInTz(date: Date, timeZone: string): string {
  return formatCivilDateInTimeZone(date, timeZone)
}

export function addCivilDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`
}

export function hojeCivilNoTimezone(
  timeZone: string = TIMEZONE_BRASIL_PADRAO,
  agora: Date = new Date()
): string {
  return formatCivilDateInTimeZone(agora, timeZone)
}
