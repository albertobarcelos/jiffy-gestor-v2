/** Período imediatamente anterior à janela [inicio,fim]: mesma duração, deslocada para trás. */
export function periodoRelatorioSlidingAnterior(inicioUtc: Date, fimUtc: Date): {
  inicioUtc: Date
  fimUtc: Date
} {
  const a = inicioUtc.getTime()
  const b = fimUtc.getTime()
  const dur = Math.max(b - a, 0)
  const prevFim = new Date(a)
  const prevInicio = new Date(a - dur)
  return { inicioUtc: prevInicio, fimUtc: prevFim }
}

export function extrairIntervaloDataFinalizacaoParams(
  params: URLSearchParams
): { inicioUtc: Date; fimUtc: Date } | null {
  const inicial = params.get('dataFinalizacaoInicial')?.trim()
  const final = params.get('dataFinalizacaoFinal')?.trim()
  if (!inicial || !final) return null
  const d0 = new Date(inicial)
  const d1 = new Date(final)
  if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return null
  return { inicioUtc: d0, fimUtc: d1 }
}

export function novoParamsIntervaloPdv(isoInicio: string, isoFim: string): URLSearchParams {
  const p = new URLSearchParams()
  p.append('dataFinalizacaoInicial', isoInicio)
  p.append('dataFinalizacaoFinal', isoFim)
  return p
}
