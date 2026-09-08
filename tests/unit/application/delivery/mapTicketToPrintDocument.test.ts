import { describe, expect, it } from 'vitest'
import { mapTicketToPrintDocument } from '@/src/application/delivery/mapTicketToPrintDocument'
import { buildPrintJobId, ticketPrintKey } from '@/src/infrastructure/printing/agent/printJobId'
import { DEFAULT_DELIVERY_CUPOM_TEMPLATE } from '@/src/shared/types/deliveryCupomTemplate'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

const root: VendaGestorTicketsResponse = {
  vendaId: 'venda-1',
  numeroVenda: 9842,
  codigoVenda: 'ABC123',
  tipoVenda: 'entrega',
  dataPedido: '2026-06-15T10:00:00.000Z',
  dataPrevista: '2026-06-15T11:00:00.000Z',
  valorFinal: 50,
  cliente: { nome: 'Maria Silva', telefone: '65999998888' },
  observacaoPedido: 'Sem cebola',
  enderecoEntrega: {
    rua: 'Rua A',
    numero: '10',
    bairro: 'Centro',
    cidade: 'Campo Grande',
    cep: '79002000',
  },
  empresa: { nomeExibicao: 'Loja Teste' },
  pagamento: { status: 'pago', valorRecebido: 50, meioPagamento: 'PIX' },
  tickets: [],
}

const ticketExpedicao: VendaGestorTicket = {
  ticketId: 't-exp-1',
  tipoCupom: 'expedicao',
  impressoraId: 'imp-exp',
  impressoraNome: 'Expedição',
  copias: 1,
  itens: [
    {
      nomeProduto: 'X-Bacon',
      quantidade: 2,
      valorFinal: 40,
      observacao: 'Ponto médio',
      complementos: [{ nome: 'Bacon extra', quantidade: 1, impressao: { valorFinal: 4 } }],
    },
  ],
}

const ticketProducao: VendaGestorTicket = {
  ticketId: 't-prod-1',
  tipoCupom: 'producao',
  impressoraId: 'imp-cozinha',
  impressoraNome: 'Cozinha',
  copias: 1,
  itens: [{ nomeProduto: 'X-Bacon', quantidade: 2, valorFinal: 40 }],
}

describe('buildPrintJobId', () => {
  it('gera id estável para o mesmo ticket', () => {
    const a = buildPrintJobId({
      vendaId: 'venda-1',
      tipoCupom: 'expedicao',
      ticketKey: ticketPrintKey(ticketExpedicao),
    })
    const b = buildPrintJobId({
      vendaId: 'venda-1',
      tipoCupom: 'expedicao',
      ticketKey: ticketPrintKey(ticketExpedicao),
    })
    expect(a).toBe('venda-venda-1-expedicao-t-exp-1')
    expect(a).toBe(b)
  })

  it('reimpressão muda o jobId', () => {
    const a = buildPrintJobId({
      vendaId: 'venda-1',
      tipoCupom: 'expedicao',
      ticketKey: 't-exp-1',
      reimpressao: true,
    })
    const b = buildPrintJobId({
      vendaId: 'venda-1',
      tipoCupom: 'expedicao',
      ticketKey: 't-exp-1',
      reimpressao: true,
    })
    expect(a).not.toBe(b)
    expect(a).toContain('-reprint-')
  })
})

describe('mapTicketToPrintDocument', () => {
  it('monta cupom de expedição com cliente, itens, QR e corte', () => {
    const doc = mapTicketToPrintDocument(root, ticketExpedicao)
    expect(doc.type).toBe('ORDER')
    expect(doc.columns).toBe(48)
    expect(doc.content.length).toBeGreaterThan(5)
    expect(doc.content.some(b => b.type === 'text' && b.text.includes('Maria Silva'))).toBe(true)
    expect(
      doc.content.some(
        b =>
          (b.type === 'item' && b.name === 'X-Bacon' && b.quantity === 2) ||
          (b.type === 'row' && (b.left ?? '').includes('X-Bacon'))
      )
    ).toBe(true)
    expect(doc.content.some(b => b.type === 'text' && b.text.includes('Ponto médio'))).toBe(true)
    expect(doc.content.some(b => b.type === 'qrcode' && b.data.includes('wa.me'))).toBe(true)
    expect(doc.content.at(-1)?.type).toBe('cut')
  })

  it('cupom de produção omite valores, endereço e QR', () => {
    const doc = mapTicketToPrintDocument(root, ticketProducao)
    expect(doc.content.some(b => b.type === 'text' && b.text.includes('ENDERECO'))).toBe(false)
    expect(doc.content.some(b => b.type === 'text' && b.text === 'RESUMO PEDIDO')).toBe(false)
    expect(doc.content.some(b => b.type === 'qrcode')).toBe(false)
    expect(doc.content.some(b => b.type === 'item' && b.name === 'X-Bacon')).toBe(true)
  })

  it('58 mm reduz colunas', () => {
    const doc = mapTicketToPrintDocument(root, ticketExpedicao, {
      template: { ...DEFAULT_DELIVERY_CUPOM_TEMPLATE, larguraMm: 58 },
    })
    expect(doc.columns).toBe(32)
  })
})
