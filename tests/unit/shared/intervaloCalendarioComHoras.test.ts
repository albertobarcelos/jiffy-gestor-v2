import { describe, expect, it } from 'vitest'
import {
  combinarIntervaloCalendarParaDatas,
  formatarResumoPeriodoSelecionado,
  intervaloPersonalizadoEhValido,
  parseHoraHhMm,
} from '@/src/shared/utils/intervaloCalendarioComHoras'

describe('intervaloCalendarioComHoras', () => {
  it('parseHoraHhMm rejeita valores inválidos', () => {
    expect(parseHoraHhMm('')).toBeNull()
    expect(parseHoraHhMm('25:00')).toBeNull()
    expect(parseHoraHhMm('12:60')).toBeNull()
    expect(parseHoraHhMm('09:30')).toEqual({ hours: 9, minutes: 30 })
  })

  it('aceita mesmo dia com hora fim >= início', () => {
    const dia = new Date(2026, 7, 2)
    const range = { from: dia, to: dia }
    expect(intervaloPersonalizadoEhValido(range, '00:00', '23:59')).toBe(true)
    expect(intervaloPersonalizadoEhValido(range, '10:00', '10:00')).toBe(true)
  })

  it('rejeita mesmo dia com hora fim < início', () => {
    const dia = new Date(2026, 7, 2)
    const range = { from: dia, to: dia }
    expect(intervaloPersonalizadoEhValido(range, '14:00', '10:00')).toBe(false)
  })

  it('aceita dias diferentes mesmo com hora fim menor no relógio', () => {
    const range = {
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 2),
    }
    expect(intervaloPersonalizadoEhValido(range, '14:00', '10:00')).toBe(true)
  })

  it('combinarIntervaloCalendarParaDatas aplica horas no instante', () => {
    const range = {
      from: new Date(2026, 7, 2),
      to: new Date(2026, 7, 2),
    }
    const { dataInicial, dataFinal } = combinarIntervaloCalendarParaDatas(
      range,
      '08:15',
      '18:45'
    )
    expect(dataInicial?.getHours()).toBe(8)
    expect(dataInicial?.getMinutes()).toBe(15)
    expect(dataFinal?.getHours()).toBe(18)
    expect(dataFinal?.getMinutes()).toBe(45)
  })

  it('formatarResumoPeriodoSelecionado evita repetir a data no mesmo dia', () => {
    const ini = new Date(2026, 7, 2, 0, 0)
    const fim = new Date(2026, 7, 2, 23, 59)
    const texto = formatarResumoPeriodoSelecionado(ini, fim)
    expect(texto).toContain('02/08/2026')
    expect(texto).toMatch(/00:00/)
    expect(texto).toMatch(/23:59/)
    expect(texto.split('02/08/2026').length - 1).toBe(1)
  })
})
