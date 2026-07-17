import { describe, expect, it } from 'vitest'
import {
  formatarFormaPagamentoKanbanCard,
  formatarPrevisaoEntregaKanbanCard,
  rotuloFormaCobrancaKanbanCard,
} from '@/src/presentation/components/features/kanban/utils/kanbanDeliveryCardDisplay'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

function criarVendaDelivery(partial: Partial<VendaUnificadaDTO> = {}): VendaUnificadaDTO {
  const base = new VendaUnificadaDTO(
    'ped-1',
    10,
    'V0010',
    'entrega',
    'GESTOR',
    'venda_gestor',
    80,
    0,
    0,
    '2026-06-15T10:00:00.000Z',
    null,
    null,
    { id: 'c1', nome: 'Cliente' },
    false,
    null,
    null,
    { id: '', nome: '—' }
  )
  return Object.assign(base, partial)
}

describe('kanbanDeliveryCardDisplay', () => {
  it('formata previsão por ISO ou minutos estimados', () => {
    const comIso = criarVendaDelivery({
      previsaoEntregaEm: '2026-06-15T10:45:00.000Z',
      tempoTotalEstimadoSegundos: 1800,
    })
    const iso = formatarPrevisaoEntregaKanbanCard(comIso)
    expect(iso?.kind).toBe('texto')
    if (iso?.kind === 'texto') {
      expect(iso.texto).toMatch(/\d{2}:\d{2}/)
    }

    const soMinutos = criarVendaDelivery({
      previsaoEntregaEm: null,
      tempoTotalEstimadoSegundos: 1800,
    })
    expect(formatarPrevisaoEntregaKanbanCard(soMinutos)).toEqual({
      kind: 'texto',
      texto: '30 min',
    })
  })

  it('formata badge de pedido agendado com data e janela no timezone da empresa', () => {
    // 22:00 UTC = 19:00 America/Sao_Paulo
    const agendado = criarVendaDelivery({
      pedidoAgendado: true,
      slotInicio: '2026-07-17T22:00:00.000Z',
      slotFim: '2026-07-17T22:15:00.000Z',
      previsaoEntregaEm: '2026-07-17T22:00:00.000Z',
    })
    const result = formatarPrevisaoEntregaKanbanCard(agendado, 'America/Sao_Paulo')
    expect(result).toEqual({
      kind: 'agendado',
      data: '17-07',
      horario: '19:00–19:15',
    })
  })

  it('rotula forma de cobrança por fluxo e tipo de atendimento', () => {
    expect(rotuloFormaCobrancaKanbanCard('entrega', 'ja_pago')).toBe('Já foi pago')
    expect(rotuloFormaCobrancaKanbanCard('entrega', 'cobrar_entregador')).toBe(
      'Cobrar na entrega'
    )
    expect(rotuloFormaCobrancaKanbanCard('retirada', 'cobrar_entregador')).toBe(
      'Cobrança na retirada'
    )
  })

  it('formata forma de pagamento pelos ids das cobranças', () => {
    const texto = formatarFormaPagamentoKanbanCard(
      [
        { meioPagamentoId: 'mp1', status: 'paga' },
        { meioPagamentoId: 'mp2', status: 'pendente' },
        { meioPagamentoId: 'mp1', status: 'paga' },
        { meioPagamentoId: 'mp3', status: 'cancelada' },
      ],
      { mp1: 'Dinheiro', mp2: 'PIX' }
    )
    expect(texto).toBe('Dinheiro, PIX')
  })
})
