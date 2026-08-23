import { describe, expect, it } from 'vitest'
import { Superficie } from '@/src/domain/superficie/Superficie'

describe('Superficie', () => {
  it('aceita ERP e PORTAL_PEDIDOS', () => {
    expect(Superficie.create('erp').isErp()).toBe(true)
    expect(Superficie.create('PORTAL_PEDIDOS').isPortalPedidos()).toBe(true)
  })

  it('rejeita código inválido', () => {
    expect(() => Superficie.create('pdv')).toThrow(/inválida/)
  })

  it('tryCreate devolve null se vazio ou inválido', () => {
    expect(Superficie.tryCreate('')).toBeNull()
    expect(Superficie.tryCreate('x')).toBeNull()
  })
})
