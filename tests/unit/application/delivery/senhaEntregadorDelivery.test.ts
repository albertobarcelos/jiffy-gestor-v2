import { describe, expect, it } from 'vitest'
import {
  normalizarSenhaEntregadorDelivery,
  senhaEntregadorDeliveryValida,
} from '@/src/application/delivery/senhaEntregadorDelivery'

describe('senhaEntregadorDelivery', () => {
  it('aceita exatamente 4 dígitos', () => {
    expect(senhaEntregadorDeliveryValida('1234')).toBe(true)
    expect(normalizarSenhaEntregadorDelivery('12a34')).toBe('1234')
  })

  it('recusa senha incompleta ou com letra', () => {
    expect(senhaEntregadorDeliveryValida('123')).toBe(false)
    expect(senhaEntregadorDeliveryValida('abcd')).toBe(false)
    expect(senhaEntregadorDeliveryValida('')).toBe(false)
  })
})
