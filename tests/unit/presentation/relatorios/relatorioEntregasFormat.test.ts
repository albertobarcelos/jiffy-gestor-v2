import { describe, expect, it } from 'vitest'
import {
  formatarTempoMedioSegundos,
  intervaloExcedeMaximoDias,
} from '@/src/presentation/components/features/relatorios/relatorioEntregasFormat'

describe('relatorioEntregasFormat', () => {
  it('formata tempo médio', () => {
    expect(formatarTempoMedioSegundos(null)).toBe('—')
    expect(formatarTempoMedioSegundos(45)).toBe('45s')
    expect(formatarTempoMedioSegundos(90)).toBe('1 min 30s')
    expect(formatarTempoMedioSegundos(3661)).toBe('1h 01min')
  })

  it('bloqueia intervalo maior que 90 dias', () => {
    expect(intervaloExcedeMaximoDias('2026-01-01', '2026-04-02')).toBe(true)
    expect(intervaloExcedeMaximoDias('2026-01-01', '2026-03-31')).toBe(false)
  })
})
