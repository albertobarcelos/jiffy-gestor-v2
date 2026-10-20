import { describe, expect, it } from 'vitest'
import {
  formatarIntervaloGrupo,
  formatarIntervaloGrupoComVirada,
  intervaloCruzaMeiaNoite,
  proximoDiaDaSemana,
  textoHintViradaMeiaNoite,
} from '@/src/shared/utils/funcionamentoDelivery'

describe('intervaloCruzaMeiaNoite', () => {
  it('não cruza em expediente no mesmo dia', () => {
    expect(intervaloCruzaMeiaNoite('18:00', '23:30')).toBe(false)
  })

  it('cruza em 19:00–02:00', () => {
    expect(intervaloCruzaMeiaNoite('19:00', '02:00')).toBe(true)
  })

  it('não cruza em 00:00–00:15', () => {
    expect(intervaloCruzaMeiaNoite('00:00', '00:15')).toBe(false)
  })

  it('cruza em 23:45–00:00', () => {
    expect(intervaloCruzaMeiaNoite('23:45', '00:00')).toBe(true)
  })
})

describe('textoHintViradaMeiaNoite / proximoDiaDaSemana', () => {
  it('sem dia usa texto genérico', () => {
    expect(textoHintViradaMeiaNoite()).toBe('Fecha no dia seguinte')
    expect(textoHintViradaMeiaNoite(null)).toBe('Fecha no dia seguinte')
  })

  it('com um dia usa artigo e nome do dia seguinte', () => {
    expect(proximoDiaDaSemana('SEGUNDA')).toBe('TERCA')
    expect(textoHintViradaMeiaNoite('SEGUNDA')).toBe('Fecha na terça')
    expect(textoHintViradaMeiaNoite('SEXTA')).toBe('Fecha no sábado')
    expect(textoHintViradaMeiaNoite('SABADO')).toBe('Fecha no domingo')
  })
})

describe('formatarIntervaloGrupo*', () => {
  it('mantém só o intervalo quando não há virada', () => {
    expect(formatarIntervaloGrupo('18:00', '23:30')).toBe('18:00 – 23:30')
    expect(formatarIntervaloGrupoComVirada('18:00', '23:30')).toBe('18:00 – 23:30')
  })

  it('anexa hint genérico ou específico com virada', () => {
    expect(formatarIntervaloGrupoComVirada('19:00', '02:00')).toBe(
      '19:00 – 02:00 · Fecha no dia seguinte'
    )
    expect(formatarIntervaloGrupoComVirada('19:00', '02:00', 'SEGUNDA')).toBe(
      '19:00 – 02:00 · Fecha na terça'
    )
    expect(formatarIntervaloGrupoComVirada('23:45', '00:00')).toBe(
      '23:45 – 00:00 · Fecha no dia seguinte'
    )
    expect(formatarIntervaloGrupoComVirada('00:00', '00:15')).toBe('00:00 – 00:15')
  })
})
