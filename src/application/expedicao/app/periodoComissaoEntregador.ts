export type PeriodoComissaoEntregador = 'hoje' | 'semana' | 'mes'

export type IntervaloComissao = {
  inicio: Date
  fim: Date
}

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0)
}

function fimDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 23, 59, 59, 999)
}

/** Semana começa no domingo, alinhada ao calendário local. */
export function intervaloComissaoEntregador(
  periodo: PeriodoComissaoEntregador,
  agora = new Date()
): IntervaloComissao {
  if (periodo === 'hoje') {
    return { inicio: inicioDoDia(agora), fim: fimDoDia(agora) }
  }
  if (periodo === 'semana') {
    const inicio = inicioDoDia(agora)
    inicio.setDate(inicio.getDate() - inicio.getDay())
    return { inicio, fim: fimDoDia(agora) }
  }
  return {
    inicio: new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0),
    fim: fimDoDia(agora),
  }
}

export function isoIntervaloComissao(intervalo: IntervaloComissao): {
  dataFinalizacaoInicio: string
  dataFinalizacaoFim: string
} {
  return {
    dataFinalizacaoInicio: intervalo.inicio.toISOString(),
    dataFinalizacaoFim: intervalo.fim.toISOString(),
  }
}

export function chaveDiaLocalComissao(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function chaveDiaLocalDeIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return null
  return chaveDiaLocalComissao(data)
}

export function dataDeChaveDiaLocal(chave: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chave.trim())
  if (!m) return null
  const ano = Number(m[1])
  const mes = Number(m[2]) - 1
  const dia = Number(m[3])
  const data = new Date(ano, mes, dia, 12, 0, 0, 0)
  if (data.getFullYear() !== ano || data.getMonth() !== mes || data.getDate() !== dia) return null
  return data
}

export function intervaloComissaoNoDia(data: Date): IntervaloComissao {
  return { inicio: inicioDoDia(data), fim: fimDoDia(data) }
}

/** Domingo → sábado da semana do dia, sem passar de hoje. */
export function intervaloSemanaQueContem(data: Date, agora = new Date()): IntervaloComissao {
  const inicio = inicioDoDia(data)
  inicio.setDate(inicio.getDate() - inicio.getDay())
  const fimSemana = new Date(inicio)
  fimSemana.setDate(inicio.getDate() + 6)
  const teto = fimDoDia(agora)
  const fim = fimDoDia(fimSemana).getTime() > teto.getTime() ? teto : fimDoDia(fimSemana)
  return { inicio, fim }
}

export function rotuloDiaComissao(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
    .format(data)
    .replace('.', '')
}

function formatarDiaCurto(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
    .format(data)
    .replace('.', '')
}

/** Rótulo legível do período (ex.: "quinta-feira, 23 de out"). */
export function rotuloPeriodoComissao(
  periodo: PeriodoComissaoEntregador,
  agora = new Date()
): string {
  const { inicio, fim } = intervaloComissaoEntregador(periodo, agora)
  if (periodo === 'hoje') {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    })
      .format(agora)
      .replace('.', '')
  }
  if (periodo === 'semana') {
    return `${formatarDiaCurto(inicio)} — ${formatarDiaCurto(fim)}`
  }
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(inicio)
}
