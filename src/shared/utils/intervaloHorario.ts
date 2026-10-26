/** Converte `HH:mm` em minutos desde 00:00. Horário inválido vira 0. */
export function horarioParaMinutos(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return 0
  const horas = Math.min(23, Math.max(0, Number(match[1])))
  const minutos = Math.min(59, Math.max(0, Number(match[2])))
  return horas * 60 + minutos
}

/**
 * True quando `fechaEm` é “antes” de `abreEm` no relógio (ex.: 19:00–02:00).
 * Sem arredondar — gestor aplica grade de 15 min no wrapper de agenda.
 */
export function intervaloCruzaMeiaNoite(abreEm: string, fechaEm: string): boolean {
  return horarioParaMinutos(fechaEm) < horarioParaMinutos(abreEm)
}
