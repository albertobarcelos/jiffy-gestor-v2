import { describe, expect, it } from 'vitest'
import { mapTicketToProducaoHibridoDocument } from '@/src/application/delivery/mapTicketToProducaoHibridoDocument'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

const root: VendaGestorTicketsResponse = {
  vendaId: 'venda-1',
  numeroVenda: 1842,
  codigoVenda: '1842',
  tipoVenda: 'entrega',
  dataPedido: '2026-09-18T15:41:00-04:00',
  dataPrevista: '2026-09-18T16:10:00-04:00',
  valorFinal: 50,
  tiradoPor: { nome: 'Carlos' },
  cliente: { nome: 'Joao' },
  codigoTerminal: '7K2P',
  observacaoPedido: 'Manda canudo',
  tickets: [],
}

const ticket: VendaGestorTicket = {
  ticketId: 't-prod-1',
  tipoCupom: 'producao',
  impressoraId: 'imp-cozinha',
  impressoraNome: 'Cozinha',
  copias: 1,
  itens: [
    {
      nomeProduto: 'X-Burger',
      quantidade: 2,
      observacao: 'sem cebola',
      complementos: [
        { nome: 'Alface', quantidade: 1, tipoImpactoPreco: 'nenhum' },
        { nome: 'Queijo', quantidade: 1, tipoImpactoPreco: 'aumenta' },
        { nome: 'Bacon', quantidade: 1, tipoImpactoPreco: 'aumenta' },
      ],
    },
    { nomeProduto: 'Coca Lata', quantidade: 1 },
  ],
}

function textos(doc: ReturnType<typeof mapTicketToProducaoHibridoDocument>): string[] {
  return doc.content.filter(b => b.type === 'text').map(b => b.text)
}

describe('mapTicketToProducaoHibridoDocument', () => {
  it('usa Font A 2x2 no produto e Font B 2x2 no complemento', () => {
    const doc = mapTicketToProducaoHibridoDocument(root, ticket)
    expect(doc.columns).toBe(48)
    expect(doc.content.some(b => b.type === 'text' && b.text === '  2x X-BURGER' && b.size === 'double')).toBe(
      true
    )
    expect(
      doc.content.some(b => b.type === 'text' && b.text.includes('+ 1 QUEIJO') && b.size === 'double-b')
    ).toBe(true)
    const idxAlface = doc.content.findIndex(b => b.type === 'text' && b.text.includes('* 1 ALFACE'))
    const idxQueijo = doc.content.findIndex(b => b.type === 'text' && b.text.includes('+ 1 QUEIJO'))
    expect(doc.content[idxAlface + 1]).toEqual({ type: 'feed', dots: 32 })
    expect(doc.content[idxQueijo + 1]).toEqual({ type: 'feed', dots: 16 })
    expect(doc.content[idxQueijo + 2]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('+ 1 BACON'),
    })
    expect(doc.content.at(-2)).toEqual({ type: 'feed', lines: 4 })
    expect(doc.content.at(-1)?.type).toBe('cut')
    const textosDoc = textos(doc)
    const idxItem = textosDoc.indexOf('  2x X-BURGER')
    const idxObs = textosDoc.indexOf('OBSERVACAO DO PEDIDO')
    const idxResumo = textosDoc.findIndex(
      t => t.includes('Cozinha') && t.includes('Atend: Carlos')
    )
    expect(idxObs).toBeGreaterThan(idxItem)
    expect(idxResumo).toBeGreaterThan(idxObs)
    expect(textosDoc).toContain('Manda canudo')
    expect(doc.content.some(b => b.type === 'text' && b.text.includes('Atend: Carlos') && b.align === 'center')).toBe(
      true
    )
  })

  it('não inclui preço, pagamento, logo nem slogan', () => {
    const doc = mapTicketToProducaoHibridoDocument(root, ticket)
    const all = textos(doc).join('\n')
    expect(all).not.toMatch(/R\$|PIX|PAGO|Jiffy POS|ITENS DO PEDIDO/)
  })

  it('coloca conferência e via unitária na ordem do print order', () => {
    const conferencia = mapTicketToProducaoHibridoDocument(root, {
      ...ticket,
      viaProducao: { kind: 'conference' },
    })
    expect(textos(conferencia)[0]).toBe('*** VIA DE CONFERENCIA ***')

    const unidade = mapTicketToProducaoHibridoDocument(root, {
      ...ticket,
      viaProducao: { kind: 'unit', unitIndex: 2, unitTotal: 5 },
    })
    expect(
      unidade.content.some(
        b =>
          (b.type === 'text' && b.text === '#1842 - 2 DE 5') ||
          b.type === 'image'
      )
    ).toBe(true)
    expect(textos(unidade).some(t => t.includes('ENTREGA #1842'))).toBe(false)
  })

  it('usa PNG tracejado entre produtos, sem linha acima do primeiro', () => {
    const doc = mapTicketToProducaoHibridoDocument(root, ticket, {
      desenharSeparador: () => 'png-tracejado',
    })
    const idxItem = doc.content.findIndex(b => b.type === 'text' && b.text === '  2x X-BURGER')
    const idxSep = doc.content.findIndex(b => b.type === 'image' && b.data === 'png-tracejado')
    expect(idxItem).toBeGreaterThanOrEqual(0)
    expect(idxSep).toBeGreaterThan(idxItem)
    expect(doc.content.filter(b => b.type === 'image' && b.data === 'png-tracejado').length).toBeGreaterThanOrEqual(2)
    expect(doc.content.some(b => b.type === 'divider')).toBe(false)
  })

  it('marca reimpressão no topo', () => {
    const doc = mapTicketToProducaoHibridoDocument(root, ticket, { reimpressao: true })
    expect(textos(doc)[0]).toBe('** REIMPRESSAO **')
    expect(doc.content[0]).toMatchObject({ type: 'text', bold: true, size: 'normal', align: 'center' })
  })
})
