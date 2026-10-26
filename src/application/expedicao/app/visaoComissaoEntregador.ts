import type { ComissaoEntregadorApp } from '@/src/application/expedicao/app/montarComissaoEntregadorApp'
import {
  chaveDiaLocalComissao,
  dataDeChaveDiaLocal,
  intervaloComissaoEntregador,
  intervaloSemanaQueContem,
  type IntervaloComissao,
  type PeriodoComissaoEntregador,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'
import { recortarComissaoNoDia } from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'

export type VisaoComissaoEntregador =
  | { tipo: 'periodo'; periodo: PeriodoComissaoEntregador }
  | { tipo: 'dia'; dia: string }

export function visaoComissaoEntregador(input: {
  periodo: PeriodoComissaoEntregador
  dataFiltro: string | null
}): VisaoComissaoEntregador {
  const dia = input.dataFiltro?.trim() ?? ''
  if (dia && dataDeChaveDiaLocal(dia)) return { tipo: 'dia', dia }
  return { tipo: 'periodo', periodo: input.periodo }
}

/**
 * Faixa da API. Hoje e um dia avulso buscam a semana — o gráfico compara os dias.
 */
export function intervaloBuscaComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): IntervaloComissao {
  if (visao.tipo === 'dia') {
    const data = dataDeChaveDiaLocal(visao.dia)
    if (!data) return intervaloComissaoEntregador('hoje', agora)
    return intervaloSemanaQueContem(data, agora)
  }
  if (visao.periodo === 'hoje') {
    return intervaloComissaoEntregador('semana', agora)
  }
  return intervaloComissaoEntregador(visao.periodo, agora)
}

export function chaveCacheBuscaComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): string {
  const { inicio, fim } = intervaloBuscaComissao(visao, agora)
  return `${chaveDiaLocalComissao(inicio)}_${chaveDiaLocalComissao(fim)}`
}

/** Dia para recortar a lista; null = usa o payload inteiro (semana/mês). */
export function chaveRecorteListaComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): string | null {
  if (visao.tipo === 'dia') return visao.dia
  if (visao.periodo === 'hoje') return chaveDiaLocalComissao(agora)
  return null
}

export function comissaoExibidaNaLista(
  bruto: ComissaoEntregadorApp | null,
  visao: VisaoComissaoEntregador,
  agora = new Date()
): ComissaoEntregadorApp | null {
  if (!bruto) return null
  const dia = chaveRecorteListaComissao(visao, agora)
  return dia ? recortarComissaoNoDia(bruto, dia) : bruto
}

export function diaDestaqueGraficoComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): string {
  if (visao.tipo === 'dia') return visao.dia
  return chaveDiaLocalComissao(agora)
}
