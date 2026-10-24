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
