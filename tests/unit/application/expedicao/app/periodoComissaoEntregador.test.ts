import { describe, expect, it } from 'vitest'
import {
  chaveDiaLocalComissao,
  dataDeChaveDiaLocal,
  intervaloComissaoEntregador,
  intervaloSemanaQueContem,
  isoIntervaloComissao,
  rotuloPeriodoComissao,
} from '@/src/application/expedicao/app/periodoComissaoEntregador'

describe('intervaloComissaoEntregador', () => {
  const agora = new Date(2026, 9, 23, 18, 12, 0)

  it('hoje cobre o dia local', () => {
    const { inicio, fim } = intervaloComissaoEntregador('hoje', agora)
    expect(inicio.getHours()).toBe(0)
    expect(fim.getDate()).toBe(23)
    expect(fim.getHours()).toBe(23)
  })

  it('semana começa no domingo', () => {
    const { inicio, fim } = intervaloComissaoEntregador('semana', agora)
    expect(inicio.getDay()).toBe(0)
    expect(inicio.getDate()).toBe(18)
    expect(fim.getDate()).toBe(23)
  })

  it('mês começa no dia 1', () => {
    const { inicio } = intervaloComissaoEntregador('mes', agora)
    expect(inicio.getDate()).toBe(1)
    expect(inicio.getMonth()).toBe(9)
  })

  it('isoIntervaloComissao devolve o mesmo instante', () => {
    const intervalo = intervaloComissaoEntregador('hoje', agora)
    const iso = isoIntervaloComissao(intervalo)
    expect(new Date(iso.dataFinalizacaoInicio).getTime()).toBe(intervalo.inicio.getTime())
    expect(new Date(iso.dataFinalizacaoFim).getTime()).toBe(intervalo.fim.getTime())
  })
})

describe('rotuloPeriodoComissao', () => {
  const agora = new Date(2026, 9, 23, 18, 12, 0)

  it('hoje mostra o dia da semana e a data', () => {
    expect(rotuloPeriodoComissao('hoje', agora).toLowerCase()).toMatch(/sexta/)
    expect(rotuloPeriodoComissao('hoje', agora)).toMatch(/23/)
  })

  it('semana mostra o intervalo', () => {
    expect(rotuloPeriodoComissao('semana', agora)).toMatch(/—/)
  })

  it('mês mostra o nome do mês', () => {
    expect(rotuloPeriodoComissao('mes', agora).toLowerCase()).toMatch(/outubro/)
  })
})

describe('intervaloSemanaQueContem', () => {
  it('abre no domingo e não passa de hoje', () => {
    const agora = new Date(2026, 9, 23, 18, 0, 0)
    const { inicio, fim } = intervaloSemanaQueContem(agora, agora)
    expect(inicio.getDay()).toBe(0)
    expect(inicio.getDate()).toBe(18)
    expect(fim.getDate()).toBe(23)
  })

  it('chave e parse do dia local', () => {
    expect(chaveDiaLocalComissao(new Date(2026, 9, 5, 9, 0))).toBe('2026-10-05')
    expect(dataDeChaveDiaLocal('2026-10-05')?.getDate()).toBe(5)
    expect(dataDeChaveDiaLocal('2026-13-40')).toBeNull()
  })
})
