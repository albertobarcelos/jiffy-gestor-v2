import { describe, expect, it } from 'vitest'
import {
  horarioParaMinutos,
  intervaloCruzaMeiaNoite,
} from '@/src/shared/utils/intervaloHorario'

describe('intervaloHorario', () => {
  it('converte HH:mm em minutos', () => {
    expect(horarioParaMinutos('00:00')).toBe(0)
    expect(horarioParaMinutos('19:00')).toBe(19 * 60)
    expect(horarioParaMinutos('23:45')).toBe(23 * 60 + 45)
  })

  it('detecta virada de meia-noite sem arredondar', () => {
    expect(intervaloCruzaMeiaNoite('18:00', '23:30')).toBe(false)
    expect(intervaloCruzaMeiaNoite('19:00', '02:00')).toBe(true)
    expect(intervaloCruzaMeiaNoite('23:45', '00:00')).toBe(true)
    expect(intervaloCruzaMeiaNoite('00:00', '00:15')).toBe(false)
  })
})
