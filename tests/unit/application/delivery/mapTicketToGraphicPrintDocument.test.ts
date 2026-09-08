import { describe, expect, it } from 'vitest'
import { buildGraphicPrintDocument } from '@/src/application/delivery/mapTicketToGraphicPrintDocument'
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
})
