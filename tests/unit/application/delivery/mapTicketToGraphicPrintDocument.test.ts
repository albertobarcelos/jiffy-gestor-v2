import { describe, expect, it } from 'vitest'
import { buildGraphicPrintDocument } from '@/src/application/delivery/mapTicketToGraphicPrintDocument'
import { fonteProdutoEscPosA22Px } from '@/src/application/delivery/cupomPrintLayout'
import { graphicRasterScale } from '@/src/infrastructure/printing/rasterizeCupomHtml'

describe('mapTicketToGraphicPrintDocument', () => {
  it('monta um job com a foto, avanço e corte', () => {
    const doc = buildGraphicPrintDocument('iVBORw0KGgo=', 48)
    expect(doc.type).toBe('ORDER')
    expect(doc.columns).toBe(48)
    expect(doc.content[0]).toEqual({ type: 'image', data: 'iVBORw0KGgo=', align: 'center' })
    expect(doc.content.at(-2)).toEqual({ type: 'feed', lines: 3 })
    expect(doc.content.at(-1)).toEqual({ type: 'cut' })
  })

  it('escala o HTML para a largura em dots da térmica', () => {
    expect(graphicRasterScale(58)).toBeCloseTo(384 / 220)
    expect(graphicRasterScale(80)).toBeCloseTo(576 / 300)
  })

  it('Font A 2/2 nos produtos equivale a 48 dots de altura', () => {
    expect(fonteProdutoEscPosA22Px(80)).toBe(25)
    expect(fonteProdutoEscPosA22Px(58)).toBe(28)
  })
})
