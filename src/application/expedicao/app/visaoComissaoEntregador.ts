import type { ComissaoEntregadorApp } from '@/src/application/expedicao/app/montarComissaoEntregadorApp'
import {
  chaveDiaLocalComissao,
  intervaloComissaoEntregador,
  intervaloEntreChavesLocais,
  type IntervaloComissao,
  type PeriodoComissaoEntregador,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'
import { recortarComissaoNoDia } from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'

export type IntervaloFiltroComissao = {
  inicio: string
  fim: string
}

export type VisaoComissaoEntregador =
  | { tipo: 'periodo'; periodo: PeriodoComissaoEntregador }
  | { tipo: 'intervalo'; inicio: string; fim: string }

export function visaoComissaoEntregador(input: {
  periodo: PeriodoComissaoEntregador
  intervaloFiltro: IntervaloFiltroComissao | null
}): VisaoComissaoEntregador {
  const inicio = input.intervaloFiltro?.inicio?.trim() ?? ''
  const fim = input.intervaloFiltro?.fim?.trim() ?? ''
  const faixa = inicio && fim ? intervaloEntreChavesLocais(inicio, fim) : null
  if (!faixa) return { tipo: 'periodo', periodo: input.periodo }
  return {
    tipo: 'intervalo',
    inicio: chaveDiaLocalComissao(faixa.inicio),
    fim: chaveDiaLocalComissao(faixa.fim),
  }
}

/**
 * Faixa da API. Hoje busca a semana — o gráfico compara os dias.
 * Intervalo customizado busca exatamente o recorte escolhido.
 */
export function intervaloBuscaComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): IntervaloComissao {
  if (visao.tipo === 'intervalo') {
    return (
      intervaloEntreChavesLocais(visao.inicio, visao.fim, agora) ??
      intervaloComissaoEntregador('hoje', agora)
    )
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

/** Dia para recortar a lista; null = usa o payload inteiro. */
export function chaveRecorteListaComissao(
  visao: VisaoComissaoEntregador,
  agora = new Date()
): string | null {
  if (visao.tipo === 'intervalo') return null
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
  const hoje = chaveDiaLocalComissao(agora)
  if (visao.tipo === 'intervalo') {
    if (hoje >= visao.inicio && hoje <= visao.fim) return hoje
    return visao.fim
  }
  return hoje
}
