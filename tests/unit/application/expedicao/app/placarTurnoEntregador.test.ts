import { describe, expect, it } from 'vitest'
import {
  aplicarRecordeTurnoEntregador,
  chaveDiaLocalTurno,
  chaveStorageRecordeTurno,
  montarEstouroFinalizarEntrega,
  montarPlacarTurnoEntregador,
  parseRecordeTurnoEntregador,
} from '@/src/application/expedicao/app/placarTurnoEntregador'

describe('placarTurnoEntregador', () => {
  it('grava recorde só quando o dia atual supera o melhor', () => {
    expect(aplicarRecordeTurnoEntregador(null, { quantidade: 0, dia: '2026-10-25' })).toEqual({
      quantidade: 0,
      dia: '2026-10-25',
    })
    expect(aplicarRecordeTurnoEntregador({ quantidade: 12, dia: '2026-10-24' }, { quantidade: 7, dia: '2026-10-25' })).toEqual({
      quantidade: 12,
      dia: '2026-10-24',
    })
    expect(aplicarRecordeTurnoEntregador({ quantidade: 12, dia: '2026-10-24' }, { quantidade: 13, dia: '2026-10-25' })).toEqual({
      quantidade: 13,
      dia: '2026-10-25',
    })
  })

  it('monta a linha do recorde sem ranking', () => {
    expect(
      montarPlacarTurnoEntregador({
        quantidadeHoje: 0,
        totalTaxasHoje: 0,
        recorde: { quantidade: 12, dia: '2026-10-24' },
        diaHoje: '2026-10-25',
      }).linhaRecorde
    ).toBe('Recorde · 12')
    expect(
      montarPlacarTurnoEntregador({
        quantidadeHoje: 9,
        totalTaxasHoje: 80,
        recorde: { quantidade: 12, dia: '2026-10-24' },
        diaHoje: '2026-10-25',
      }).linhaRecorde
    ).toBe('Faltam 3 p/ o recorde (12)')
    expect(
      montarPlacarTurnoEntregador({
        quantidadeHoje: 12,
        totalTaxasHoje: 90,
        recorde: { quantidade: 12, dia: '2026-10-24' },
        diaHoje: '2026-10-25',
      }).linhaRecorde
    ).toBe('Igualou o recorde · 12')
    expect(
      montarPlacarTurnoEntregador({
        quantidadeHoje: 13,
        totalTaxasHoje: 100,
        recorde: { quantidade: 13, dia: '2026-10-25' },
        diaHoje: '2026-10-25',
      }).linhaRecorde
    ).toBe('Recorde de hoje · 13')
  })

  it('monta o estouro da finalização e o ordinal', () => {
    const estouro = montarEstouroFinalizarEntrega({
      taxa: 8,
      quantidadeHoje: 8,
      recordeAntes: { quantidade: 12, dia: '2026-10-24' },
      recordeDepois: { quantidade: 12, dia: '2026-10-24' },
    })
    expect(estouro).toMatchObject({ taxa: 8, ordinal: '8ª', novoRecorde: false, recorde: 12 })
    expect(
      montarEstouroFinalizarEntrega({
        taxa: 8,
        quantidadeHoje: 13,
        recordeAntes: { quantidade: 12, dia: '2026-10-24' },
        recordeDepois: { quantidade: 13, dia: '2026-10-25' },
      }).novoRecorde
    ).toBe(true)
  })

  it('parseia recorde e chave de storage por entregador', () => {
    expect(parseRecordeTurnoEntregador('{"quantidade":12,"dia":"2026-10-24"}')).toEqual({
      quantidade: 12,
      dia: '2026-10-24',
    })
    expect(parseRecordeTurnoEntregador('{')).toBeNull()
    expect(chaveStorageRecordeTurno(' abc ')).toBe('jiffy.expedicao.app.recorde-turno:abc')
    expect(chaveDiaLocalTurno(new Date(2026, 9, 5))).toBe('2026-10-05')
  })
})
