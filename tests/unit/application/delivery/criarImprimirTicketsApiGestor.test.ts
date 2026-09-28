import { describe, expect, it, vi } from 'vitest'
import { criarImprimirTicketsApiGestor } from '@/src/application/delivery/imprimirTicketsApiGestor'
import type { VendaGestorTicket, VendaGestorTicketsResponse } from '@/src/shared/types/vendaGestorTickets'

describe('criarImprimirTicketsApiGestor', () => {
  it('usa as portas injetadas e não importa o agente', async () => {
    const enviarCupom = vi.fn().mockResolvedValue({ ok: true })
    const gerarJobId = vi.fn().mockReturnValue('job-test')
    const desenharPilula = vi.fn().mockReturnValue(null)
    const imprimir = criarImprimirTicketsApiGestor({
      desenharPilula,
      enviarCupom,
      gerarJobId,
    })

    const ticket = {
      tipoCupom: 'expedicao',
      copias: 1,
      impressoraId: 'imp-1',
      impressoraNome: 'Expedição',
      nomeImpressoraWindows: 'EPSON',
      impressora: { nomeImpressoraWindows: 'EPSON', nome: 'Expedição' },
      itens: [{ nome: 'X-Burger', quantidade: 1 }],
    } as unknown as VendaGestorTicket

    const response = {
      vendaId: 'venda-1',
      numeroVenda: 10,
      tickets: [ticket],
    } as VendaGestorTicketsResponse

    await imprimir({
      response,
      ticketsAImprimir: [ticket],
      jobNamePrefix: 'Delivery',
    })

    expect(gerarJobId).toHaveBeenCalledWith(
      expect.objectContaining({ vendaId: 'venda-1', tipoCupom: 'expedicao' })
    )
    expect(enviarCupom).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-test',
        printerName: 'EPSON',
        copies: 1,
      })
    )
  })

  it('avisa e não envia job quando o ticket não tem impressora deste PC', async () => {
    const enviarCupom = vi.fn()
    const onAviso = vi.fn()
    const imprimir = criarImprimirTicketsApiGestor({
      desenharPilula: vi.fn().mockReturnValue(null),
      enviarCupom,
      gerarJobId: vi.fn(),
    })

    const ticket = {
      tipoCupom: 'producao',
      copias: 1,
      impressoraId: 'imp-cozinha',
      impressoraNome: 'COZINHA',
      nomeImpressoraWindows: null,
      impressora: { nome: 'COZINHA', nomeImpressoraWindows: null },
      itens: [{ nomeProduto: 'X-Burger', quantidade: 1 }],
    } as unknown as VendaGestorTicket

    await imprimir({
      response: { vendaId: 'venda-1', numeroVenda: 12, tickets: [ticket] } as VendaGestorTicketsResponse,
      ticketsAImprimir: [ticket],
      jobNamePrefix: 'Reimpressão',
      onAviso,
    })

    expect(enviarCupom).not.toHaveBeenCalled()
    expect(onAviso).toHaveBeenCalledWith(expect.stringContaining('COZINHA'))
  })
})
