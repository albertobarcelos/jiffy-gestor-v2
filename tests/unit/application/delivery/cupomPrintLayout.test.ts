import { describe, expect, it } from 'vitest'
import {
  columnsFromCupomTemplate,
  fonteEmpresaEscPosA11Px,
  printSizeFromFontePx,
  qrModuleSizeForWidth,
  barcodePedidoHtmlSize,
  barcodePedidoRasterSize,
  qrPedidoHtmlSizePx,
  qrPedidoModuleSizeForWidth,
  sectionFeedLines,
  telefoneWhatsappE164,
} from '@/src/application/delivery/cupomPrintLayout'
import { DEFAULT_DELIVERY_CUPOM_TEMPLATE } from '@/src/shared/types/deliveryCupomTemplate'

describe('cupomPrintLayout', () => {
  it('mapeia 80 mm para 48 colunas e 58 mm para 32', () => {
    expect(columnsFromCupomTemplate(DEFAULT_DELIVERY_CUPOM_TEMPLATE)).toBe(48)
    expect(columnsFromCupomTemplate({ ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, larguraMm: 58 })).toBe(32)
  })

  it('nome da empresa usa Font A 1/1 na escala do cupom', () => {
    expect(fonteEmpresaEscPosA11Px(80)).toBe(13)
    expect(fonteEmpresaEscPosA11Px(58)).toBeGreaterThanOrEqual(12)
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
    expect(qrPedidoModuleSizeForWidth(58)).toBe(6)
    expect(qrPedidoModuleSizeForWidth(80)).toBe(8)
    expect(qrPedidoHtmlSizePx(80)).toBe(220)
    expect(barcodePedidoHtmlSize(80)).toEqual({ widthPx: 260, heightPx: 56 })
    expect(barcodePedidoRasterSize(80)).toEqual({ widthPx: 520, heightPx: 80 })
  })
})
