import { describe, expect, it } from 'vitest'
import {
  normalizeOrigemApi,
  rotuloOrigemParaExibicao,
} from '@/src/application/mappers/VendaApiNormalizer'

describe('normalizeOrigemApi / rotuloOrigemParaExibicao', () => {
  it('mapeia JIFFY_DELIVERY para Delivery (não Outros)', () => {
    expect(normalizeOrigemApi('JIFFY_DELIVERY')).toBe('DELIVERY')
    expect(rotuloOrigemParaExibicao(normalizeOrigemApi('JIFFY_DELIVERY'))).toBe('Delivery')
  })

  it('mantém Gestor e fallback Outros', () => {
    expect(rotuloOrigemParaExibicao(normalizeOrigemApi('GESTOR'))).toBe('Gestor')
    expect(normalizeOrigemApi('CANAL_DESCONHECIDO')).toBe('OUTROS')
    expect(rotuloOrigemParaExibicao('OUTROS')).toBe('Outros')
  })

  it('mapeia AIQFOME para Aiqfome (não Outros)', () => {
    expect(normalizeOrigemApi('AIQFOME')).toBe('AIQFOME')
    expect(rotuloOrigemParaExibicao(normalizeOrigemApi('AIQFOME'))).toBe('Aiqfome')
  })

  it('mapeia o alias DELIVERY_IFOOD para IFOOD', () => {
    expect(normalizeOrigemApi('DELIVERY_IFOOD')).toBe('IFOOD')
    expect(rotuloOrigemParaExibicao(normalizeOrigemApi('DELIVERY_IFOOD'))).toBe('iFood')
  })
})
