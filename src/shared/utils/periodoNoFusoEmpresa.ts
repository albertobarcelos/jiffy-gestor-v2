type YMD = { year: number; month: number; day: number }

function ymdNoFuso(date: Date, timeZone: string): YMD {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = dtf.formatToParts(date)
  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  const year = Number(map.year)
  const month = Number(map.month)
  const day = Number(map.day)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
  }
  return { year, month, day }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
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
  /* Alguns motores representam meia-noite como hora 24. */
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

function rangeDiaNoFusoParaUtc(args: { year: number; month: number; day: number; timeZone: string }): {
  inicioUtc: Date
  fimUtc: Date
} {
  const { year, month, day, timeZone } = args
  const inicioUtc = zonedTimeToUtc(
    { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZone
  )
  const fimUtc = zonedTimeToUtc(
    { year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 },
    timeZone
  )
  return { inicioUtc, fimUtc }
}

function civilNoonUtcFromYmd(args: { year: number; month: number; day: number; timeZone: string }): Date {
  const { year, month, day, timeZone } = args
  return zonedTimeToUtc({ year, month, day, hour: 12, minute: 0, second: 0, millisecond: 0 }, timeZone)
}

export function assumirDateComoNoFusoEmpresaParaUtc(date: Date, timeZoneEmpresa: string): Date {
  const tz = timeZoneEmpresa.trim()
  if (!tz) return new Date(date.getTime())
  return zonedTimeToUtc(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      millisecond: date.getMilliseconds(),
    },
    tz
  )
}

export function deslocarPeriodoEmDiasCorridosUtc(
  inicioUtc: Date,
  fimUtc: Date,
  diasParaTras: number
): { inicio: Date; fim: Date } {
  const deltaMs = diasParaTras * 86_400_000
  return { inicio: new Date(inicioUtc.getTime() - deltaMs), fim: new Date(fimUtc.getTime() - deltaMs) }
}

export function calcularPeriodoNoFusoEmpresa(
  opcao: string,
  timeZoneEmpresa: string,
  agora: Date = new Date()
): { inicio: Date | null; fim: Date | null } {
  const tz = timeZoneEmpresa.trim()
  if (!tz) return { inicio: null, fim: null }

  const hojeYmd = ymdNoFuso(agora, tz)

  if (opcao === 'Hoje') {
    const { inicioUtc, fimUtc } = rangeDiaNoFusoParaUtc({ ...hojeYmd, timeZone: tz })
    return { inicio: inicioUtc, fim: fimUtc }
  }

  if (opcao === 'Ontem') {
    const noonHojeUtc = civilNoonUtcFromYmd({ ...hojeYmd, timeZone: tz })
    const noonOntem = new Date(noonHojeUtc.getTime() - 1 * 86_400_000)
    const ymdOntem = ymdNoFuso(noonOntem, tz)
    const { inicioUtc, fimUtc } = rangeDiaNoFusoParaUtc({ ...ymdOntem, timeZone: tz })
    return { inicio: inicioUtc, fim: fimUtc }
  }

  if (opcao === 'Últimos 7 Dias' || opcao === 'Últimos 30 Dias') {
    const n = opcao === 'Últimos 7 Dias' ? 7 : 30
    const noonHojeUtc = civilNoonUtcFromYmd({ ...hojeYmd, timeZone: tz })
    const noonInicio = new Date(noonHojeUtc.getTime() - (n - 1) * 86_400_000)
    const ymdInicio = ymdNoFuso(noonInicio, tz)
    const inicioUtc = rangeDiaNoFusoParaUtc({ ...ymdInicio, timeZone: tz }).inicioUtc
    const fimUtc = rangeDiaNoFusoParaUtc({ ...hojeYmd, timeZone: tz }).fimUtc
    return { inicio: inicioUtc, fim: fimUtc }
  }

  if (opcao === 'Mês Atual') {
    const inicioUtc = rangeDiaNoFusoParaUtc({
      year: hojeYmd.year,
      month: hojeYmd.month,
      day: 1,
      timeZone: tz,
    }).inicioUtc
    const fimUtc = rangeDiaNoFusoParaUtc({ ...hojeYmd, timeZone: tz }).fimUtc
    return { inicio: inicioUtc, fim: fimUtc }
  }

  return { inicio: null, fim: null }
}

export function calcularPeriodoAnteriorParaComparacaoNoFusoEmpresa(
  opcao: string,
  timeZoneEmpresa: string,
  agora: Date = new Date()
): { inicio: Date; fim: Date } | null {
  const atual = calcularPeriodoNoFusoEmpresa(opcao, timeZoneEmpresa, agora)
  if (!atual.inicio || !atual.fim) return null

  if (opcao === 'Hoje' || opcao === 'Ontem') {
    return deslocarPeriodoEmDiasCorridosUtc(atual.inicio, atual.fim, 1)
  }
  if (opcao === 'Últimos 7 Dias') {
    return deslocarPeriodoEmDiasCorridosUtc(atual.inicio, atual.fim, 7)
  }
  if (opcao === 'Últimos 30 Dias') {
    return deslocarPeriodoEmDiasCorridosUtc(atual.inicio, atual.fim, 30)
  }
  return null
}

export function permiteOpcoesIntervaloPorHoraNoFuso(
  inicioUtc: Date,
  fimUtc: Date,
  timeZoneEmpresa: string
): boolean {
  const tz = timeZoneEmpresa.trim()
  if (!tz) return false
  const a = ymdNoFuso(inicioUtc, tz)
  const b = ymdNoFuso(fimUtc, tz)
  const da = Date.UTC(a.year, a.month - 1, a.day)
  const db = Date.UTC(b.year, b.month - 1, b.day)
  if (db < da) return false
  const diasInclusivos = Math.round((db - da) / 86_400_000) + 1
  return diasInclusivos <= 2
}

