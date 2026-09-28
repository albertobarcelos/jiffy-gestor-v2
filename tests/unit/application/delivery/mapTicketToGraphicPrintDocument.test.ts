import { describe, expect, it } from 'vitest'
import {
  buildGraphicPrintDocument,
  headerEmpresaEscPos,
  headerIdentidadeComContorno,
  headerIdentidadeEscPos,
  LINHAS_ANTES_DO_CORTE_GRAFICO,
} from '@/src/application/delivery/mapTicketToGraphicPrintDocument'
import { fonteProdutoEscPosA22Px } from '@/src/application/delivery/cupomPrintLayout'
import { graphicRasterScale } from '@/src/infrastructure/printing/rasterizeCupomHtml'

describe('mapTicketToGraphicPrintDocument', () => {
  it('monta um job com a foto, avanço e corte', () => {
    const doc = buildGraphicPrintDocument('iVBORw0KGgo=', 48)
    expect(doc.type).toBe('ORDER')
    expect(doc.columns).toBe(48)
    expect(doc.content[0]).toEqual({ type: 'image', data: 'iVBORw0KGgo=', align: 'center' })
    expect(doc.content.at(-2)).toEqual({ type: 'feed', lines: LINHAS_ANTES_DO_CORTE_GRAFICO })
    expect(LINHAS_ANTES_DO_CORTE_GRAFICO).toBe(2)
    expect(doc.content.at(-1)).toEqual({ type: 'cut' })
  })

  it('nome da empresa vai em Font A 1/1 negrito, igual produção', () => {
    expect(headerEmpresaEscPos('  Espeto do Joaquim  ')).toEqual([
      { type: 'text', text: 'Espeto do Joaquim', align: 'center', bold: true, size: 'normal' },
    ])
    const doc = buildGraphicPrintDocument(
      'iVBORw0KGgo=',
      48,
      headerEmpresaEscPos('Espeto do Joaquim')
    )
    expect(doc.content[0]).toEqual({
      type: 'text',
      text: 'Espeto do Joaquim',
      align: 'center',
      bold: true,
      size: 'normal',
    })
    expect(doc.content[1]).toEqual({ type: 'image', data: 'iVBORw0KGgo=', align: 'center' })
  })

  it('identidade sem pílula cai em Font A 2/2', () => {
    expect(headerIdentidadeEscPos('RETIRADA#12 #SIXWMAWDD')).toEqual([
      { type: 'text', text: 'RETIRADA#12 #SIXWMAWDD', align: 'center', bold: true, size: 'double' },
    ])
  })

  it('contorno pontilhado emoldura o texto nativo, sem trocar a fonte', () => {
    expect(
      headerIdentidadeComContorno('RETIRADA#12 #SIXWMAWDD', parte =>
        parte === 'topo' ? 'png-topo' : 'png-base'
      )
    ).toEqual([
      { type: 'image', data: 'png-topo', align: 'center' },
      { type: 'text', text: 'RETIRADA#12 #SIXWMAWDD', align: 'center', bold: true, size: 'double' },
      { type: 'image', data: 'png-base', align: 'center' },
    ])
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
