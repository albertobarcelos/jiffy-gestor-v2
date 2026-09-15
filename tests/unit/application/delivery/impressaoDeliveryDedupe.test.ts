import { afterEach, describe, expect, it } from 'vitest'
import {
  IMPRESSAO_DELIVERY_DEDUPE_TTL_MS,
  jaImprimiuDeliveryRecentemente,
  limparDedupeImpressaoDelivery,
  marcarImpressaoDeliveryRecente,
} from '@/src/application/delivery/impressaoDeliveryDedupe'

describe('impressaoDeliveryDedupe', () => {
  afterEach(() => {
    limparDedupeImpressaoDelivery()
  })

  it('marca e detecta impressão recente', () => {
    const now = 1_000_000
    expect(jaImprimiuDeliveryRecentemente('venda-1', now)).toBe(false)
    marcarImpressaoDeliveryRecente('venda-1', now)
    expect(jaImprimiuDeliveryRecentemente('venda-1', now + 1_000)).toBe(true)
  })

  it('expira após o TTL', () => {
    const now = 2_000_000
    marcarImpressaoDeliveryRecente('venda-2', now)
    expect(
      jaImprimiuDeliveryRecentemente('venda-2', now + IMPRESSAO_DELIVERY_DEDUPE_TTL_MS + 1)
    ).toBe(false)
  })

  it('ignora vendaId vazio', () => {
    marcarImpressaoDeliveryRecente('  ', 3_000_000)
    expect(jaImprimiuDeliveryRecentemente('  ', 3_000_000)).toBe(false)
  })
})
