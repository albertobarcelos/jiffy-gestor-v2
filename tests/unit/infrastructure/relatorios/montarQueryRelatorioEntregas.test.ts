import { describe, expect, it } from 'vitest'
import { montarQueryRelatorioEntregas } from '@/src/infrastructure/relatorios/montarQueryRelatorioEntregas'

describe('montarQueryRelatorioEntregas', () => {
  it('repassa filtros válidos', () => {
    const sp = new URLSearchParams({
      q: 'João',
      offset: '10',
      limit: '20',
      dataFinalizacaoInicio: '2026-09-01T00:00:00.000Z',
      dataFinalizacaoFim: '2026-09-26T23:59:59.999Z',
      orderByField: 'somaTaxasEntrega',
      orderByDirection: 'desc',
    })
    const r = montarQueryRelatorioEntregas(sp)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.query.get('q')).toBe('João')
    expect(r.query.get('orderByField')).toBe('somaTaxasEntrega')
    expect(r.query.get('orderByDirection')).toBe('desc')
  })

  it('rejeita orderByField inválido', () => {
    const r = montarQueryRelatorioEntregas(new URLSearchParams({ orderByField: 'comissao' }))
    expect(r.ok).toBe(false)
  })
})
