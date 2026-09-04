import { describe, expect, it } from 'vitest'
import {
  columnsFromCupomTemplate,
  printSizeFromFontePx,
  qrModuleSizeForWidth,
  sectionFeedLines,
  telefoneWhatsappE164,
} from '@/src/application/delivery/cupomPrintLayout'
import { DEFAULT_DELIVERY_CUPOM_TEMPLATE } from '@/src/shared/types/deliveryCupomTemplate'

describe('cupomPrintLayout', () => {
  it('mapeia 80 mm para 48 colunas e 58 mm para 32', () => {
    expect(columnsFromCupomTemplate(DEFAULT_DELIVERY_CUPOM_TEMPLATE)).toBe(48)
    expect(columnsFromCupomTemplate({ ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, larguraMm: 58 })).toBe(32)
  })

  it('converte fonte do preview em tamanho ESC/POS', () => {
    expect(printSizeFromFontePx(9)).toBe('small')
    expect(printSizeFromFontePx(13)).toBe('normal')
    expect(printSizeFromFontePx(16)).toBe('double')
  })

  it('densidade vira avanço de papel', () => {
    expect(sectionFeedLines('compacto')).toBe(0)
    expect(sectionFeedLines('normal')).toBe(1)
    expect(sectionFeedLines('espacoso')).toBe(2)
  })

  it('monta E.164 para WhatsApp', () => {
    expect(telefoneWhatsappE164('65999998888')).toBe('5565999998888')
    expect(qrModuleSizeForWidth(58)).toBe(3)
  })
})
