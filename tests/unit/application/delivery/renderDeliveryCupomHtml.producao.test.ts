import { describe, expect, it } from 'vitest'
import { renderDeliveryCupomHtml } from '@/src/application/delivery/renderDeliveryCupomHtml'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

const root: VendaGestorTicketsResponse = {
  vendaId: 'venda-1',
  numeroVenda: 9842,
  codigoVenda: 'ABC123',
  tipoVenda: 'entrega',
  dataPedido: '2026-06-15T10:00:00.000Z',
  dataPrevista: '2026-06-15T11:00:00.000Z',
  valorFinal: 50,
  tiradoPor: { nome: 'Carlos' },
  cliente: { nome: 'Joao da Silva Costa' },
  empresa: { nomeExibicao: 'Loja Teste' },
  observacaoPedido: 'Manda canudo',
  tickets: [],
}

const ticketProducao: VendaGestorTicket = {
  ticketId: 't-prod-1',
  tipoCupom: 'producao',
  impressoraId: 'imp-cozinha',
  impressoraNome: 'Cozinha',
  copias: 1,
  itens: [{ nomeProduto: 'X-Bacon', quantidade: 2, valorFinal: 40 }],
}

describe('renderDeliveryCupomHtml via de produção', () => {
  it('espelha o ticket 80 mm: pílula, item Font A e sem preço', () => {
    const html = renderDeliveryCupomHtml({ root, ticket: ticketProducao })
    expect(html).toContain('prod-80')
    expect(html).toContain('prod-pill')
    expect(html).toContain('.prod-pill { background:#fff; color:#000; border:3px dashed #000')
    expect(html).toContain('font-family:Arial, Tahoma, sans-serif; font-weight:800')
    expect(html).not.toContain('.prod-pill { background:#000')
    expect(html).toContain('2x X-BACON')
    expect(html).toContain('prod-brand')
    expect(html).toContain('Loja Teste')
    expect(html).toContain('ENTREGA#9842 #ABC123')
    expect(html).toContain('prod-pill-codigo')
    expect(html).toContain('JOAO DA SILVA COSTA')
    expect(html).not.toContain('ENTREGA #ABC123 | JOAO')
    expect(html).not.toContain('PEDIDO #9842')
    expect(html).not.toContain('ITENS DO PEDIDO')
    expect(html).not.toContain('Data Prevista:')
    expect(html).not.toContain('Feito com carinho')
    expect(html).toContain('.prod-80 .prod-extra + .prod-extra { margin-top:8px; }')
    expect(html).toContain('.prod-80 .prod-extra[data-grupo="neutro"] + .prod-extra[data-grupo="acao"]')
    expect(html).toContain('EscPosFontA')
    expect(html.indexOf('2x X-BACON')).toBeLessThan(html.indexOf('Atend: Carlos'))
    expect(html).toContain('prod-obs')
    expect(html).toContain('OBSERVACAO DO PEDIDO')
    expect(html).toContain('Manda canudo')
    expect(html.indexOf('2x X-BACON')).toBeLessThan(html.indexOf('OBSERVACAO DO PEDIDO'))
    expect(html.indexOf('OBSERVACAO DO PEDIDO')).toBeLessThan(html.indexOf('Atend: Carlos'))
    expect(html).toContain('prod-resumo')
    expect(html).toMatch(/Cozinha \| .*Atend: Carlos/)
  })

  it('via de expedição usa produto no tamanho do cupom, com preço na mesma linha', () => {
    const html = renderDeliveryCupomHtml({
      root,
      ticket: {
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
      },
    })
    expect(html).toContain('data-tipo="expedicao"')
    expect(html).toContain('Arial, Tahoma, sans-serif')
    expect(html).toContain('-webkit-font-smoothing:none')
    expect(html).toContain('.receipt[data-tipo="expedicao"] { -webkit-text-stroke:0.35px #000; }')
    expect(html).toContain('font-weight:500')
    expect(html).toContain('codigo-destaque')
    expect(html).toContain('background:#fff; color:#000; border:3px dashed #000')
    expect(html).toContain('.charge-box { box-sizing:border-box; padding:4px 8px 10px; background:#fff; color:#000; border:3px dashed #000')
    expect(html).not.toContain('background:#000; color:#fff')
    expect(html).not.toContain('.charge-box { box-sizing:border-box; padding:4px 8px 10px; border:2px solid #000')
    expect(html).toContain('ENTREGA#9842 #ABC123')
    expect(html).toContain('prod-brand')
    expect(html).toContain('Loja Teste')
    expect(html).toContain(".prod-brand { text-align:center; font-family:'EscPosFontA', ui-monospace, monospace; font-weight:400;")
    expect(html).toContain('text-shadow:none')
    expect(html).toContain('.receipt[data-tipo="expedicao"] .prod-brand { -webkit-text-stroke:0; text-shadow:none; }')
    expect(html).not.toContain('text-shadow:1px 0 0 #000')
    expect(html).not.toContain('Pedido #9842')
    expect(html).not.toMatch(/class="method">/)
    expect(html).toContain('2x X-BACON')
    expect(html).toContain('item-title')
    expect(html).toContain('.item-title, .item-title .label, .item-title .value { font-weight:500; font-size:13px;')
    expect(html).not.toContain('data-atendimento="retirada"')
    expect(html).toContain('BACON EXTRA')
    expect(html).toContain('item-comp-sign')
    expect(html).toContain('Obs: Ponto medio')
    expect(html).toMatch(/40,00/)
    expect(html).toContain('text-overflow:ellipsis')
    expect(html).not.toContain('2 X X-Bacon')
  })

  it('retirada não renderiza QR de WhatsApp na expedição', () => {
    const html = renderDeliveryCupomHtml({
      root: {
        ...root,
        tipoEntrega: 'retirada',
        cliente: { nome: 'Joao da Silva Costa', telefone: '65999998888' },
      },
      ticket: {
        ticketId: 't-exp-retirada',
        tipoCupom: 'expedicao',
        impressoraId: 'imp-exp',
        impressoraNome: 'Expedição',
        copias: 1,
        itens: [{ nomeProduto: 'X-Bacon', quantidade: 1, valorFinal: 20 }],
      },
    })
    expect(html).toContain('RETIRADA#9842 #ABC123')
    expect(html).toContain('data-atendimento="retirada"')
    expect(html).toContain('.item-title, .item-title .label, .item-title .value { font-weight:700; font-size:16px;')
    expect(html).not.toContain('class="whatsapp-qr"')
    expect(html).not.toContain('wa.me')
    expect(html).not.toContain('Scaneie e fale com o cliente')
  })

  it('impressão gráfica omite empresa e pílula no HTML para sair igual produção', () => {
    const html = renderDeliveryCupomHtml({
      root,
      ticket: {
        ticketId: 't-exp-2',
        tipoCupom: 'expedicao',
        impressoraId: 'imp-exp',
        impressoraNome: 'Expedição',
        copias: 1,
        itens: [{ nomeProduto: 'X-Bacon', quantidade: 1, valorFinal: 20 }],
      },
      omitirNomeEmpresa: true,
      omitirIdentidade: true,
    })
    expect(html).not.toContain('class="prod-brand"')
    expect(html).not.toContain('class="codigo-destaque"')
    expect(html).not.toContain('Loja Teste')
    expect(html).not.toContain('ENTREGA#9842 #ABC123')
  })

  it('via por unidade mostra o codigo e i DE N, sem a palavra PEDIDO', () => {
    const html = renderDeliveryCupomHtml({
      root,
      ticket: {
        ...ticketProducao,
        viaProducao: { kind: 'unit', unitIndex: 2, unitTotal: 4 },
      },
    })
    expect(html).toContain('#ABC123 - 2 DE 4')
    expect(html).toContain('prod-pill-codigo')
    expect(html).not.toContain('PEDIDO ABC123')
    expect(html).not.toContain('PEDIDO #9842')
    expect(html).not.toContain('ENTREGA #ABC123')
    expect(html).toContain('ENTREGA#9842')
    expect(html).toContain('JOAO DA SILVA COSTA')
    expect(html).not.toContain('ENTREGA | JOAO')
  })
})
