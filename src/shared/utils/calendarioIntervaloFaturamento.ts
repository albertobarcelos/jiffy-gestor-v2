import { addMonths, endOfDay, endOfMonth, min, startOfMonth, subMonths } from 'date-fns'

/**
 * Primeiro mês do DayPicker em modo 2 colunas: à esquerda o mês anterior à data de referência,
 * à direita o mês que contém a referência (ex.: “hoje”).
 */
export function primeiroMesQuadroDuploCalendario(dataRef: Date): Date {
  return startOfMonth(subMonths(dataRef, 1))
}

/**
 * Intervalo [inicio, fim] para buscar vendas dos dois meses visíveis no calendário.
 * O fim não ultrapassa o final do dia atual (consulta só retroativa).
 */
export function periodoFetchFaturamentoCalendarioDoisMeses(
  mesPrimeiroPainel: Date,
  agora: Date = new Date()
): { inicio: Date; fim: Date } {
  const inicio = startOfMonth(mesPrimeiroPainel)
  const fimMesSegundo = endOfMonth(addMonths(mesPrimeiroPainel, 1))
  const fim = min([fimMesSegundo, endOfDay(agora)])
  return { inicio, fim }
}
