import { describe, expect, it } from 'vitest'
import {
  isOrigemAiqfome,
  isOrigemIfood,
  temSeloCanalMarketplace,
} from '@/src/domain/policies/pedido/origemCanalMarketplace'

describe('origemCanalMarketplace', () => {
  it('reconhece AIQFOME independente de caixa', () => {
    expect(isOrigemAiqfome('AIQFOME')).toBe(true)
    expect(isOrigemAiqfome('aiqfome')).toBe(true)
  })

  it('reconhece só o valor canônico IFOOD', () => {
    expect(isOrigemIfood('IFOOD')).toBe(true)
    expect(isOrigemIfood('DELIVERY_IFOOD')).toBe(false)
    expect(isOrigemIfood('AIQFOME')).toBe(false)
  })

  it('não marca Gestor, Delivery nem vazio', () => {
    expect(isOrigemAiqfome('GESTOR')).toBe(false)
    expect(isOrigemAiqfome('JIFFY_DELIVERY')).toBe(false)
    expect(isOrigemAiqfome('OUTROS')).toBe(false)
    expect(isOrigemAiqfome(null)).toBe(false)
    expect(temSeloCanalMarketplace('GESTOR')).toBe(false)
  })

  it('selo vale para iFood e Aiqfome canônicos', () => {
    expect(temSeloCanalMarketplace('IFOOD')).toBe(true)
    expect(temSeloCanalMarketplace('AIQFOME')).toBe(true)
    expect(temSeloCanalMarketplace('DELIVERY_IFOOD')).toBe(false)
  })
})
