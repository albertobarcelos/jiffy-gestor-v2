import { describe, expect, it } from 'vitest'
import {
  buildAtualizarCobrancasPedidoDeliveryPatch,
  buildConfirmarCobrancasPendentesPedidoDeliveryPatch,
  cobrancasPatchTemOperacao,
  extrairIdsCobrancasPendentesPedidoDelivery,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

describe('CobrancaPedidoDeliveryPayloadMapper', () => {
  it('extrai cobranças pendentes mesmo com status explícito', () => {
    const pedido = {
      cobrancas: [
        {
          id: 'cob-1',
          status: 'pendente',
          momentoCobranca: 'na_entrega',
          pagamentoEfetivado: null,
        },
      ],
    }
    expect(extrairIdsCobrancasPendentesPedidoDelivery(pedido)).toEqual(['cob-1'])
  })

  it('não trata cobrança pendente como paga só por pagamentoEfetivado vazio', () => {
    const pedido = {
      cobrancas: [
        {
          id: 'cob-1',
          status: 'pendente',
          pagamentoEfetivado: null,
        },
      ],
    }
    expect(extrairIdsCobrancasPendentesPedidoDelivery(pedido)).toEqual(['cob-1'])
  })

  it('confirma cobrança pendente existente ao quitar (fluxo ja_pago)', () => {
    const pagamentos: PagamentoSelecionado[] = [
      {
        id: 'cob-1',
        meioPagamentoId: 'mp-1',
        valor: 24,
        cobrarNaEntrega: true,
      },
    ]

    const patch = buildAtualizarCobrancasPedidoDeliveryPatch({
      cobrancaIdsAtivas: ['cob-1'],
      cobrancaIdsPendentes: ['cob-1'],
      pagamentos,
      fluxoPagamentoEntrega: 'ja_pago',
    })

    expect(cobrancasPatchTemOperacao(patch)).toBe(true)
    expect(patch.cobrancas?.confirm).toEqual([{ cobrancaId: 'cob-1' }])
    expect(patch.cobrancas?.add).toBeUndefined()
    expect(patch.cobrancas?.cancel).toBeUndefined()
  })

  it('não confirma cobrança pendente quando fluxo é cobrar_entregador sem alterações', () => {
    const pagamentos: PagamentoSelecionado[] = [
      {
        id: 'cob-1',
        meioPagamentoId: 'mp-1',
        valor: 24,
        cobrarNaEntrega: true,
      },
    ]

    const patch = buildAtualizarCobrancasPedidoDeliveryPatch({
      cobrancaIdsAtivas: ['cob-1'],
      cobrancaIdsPendentes: ['cob-1'],
      pagamentos,
      fluxoPagamentoEntrega: 'cobrar_entregador',
    })

    expect(cobrancasPatchTemOperacao(patch)).toBe(false)
  })

  it('monta cancel + add ao trocar forma de pagamento (nova sem id)', () => {
    const pagamentos: PagamentoSelecionado[] = [
      {
        meioPagamentoId: 'mp-cartao',
        valor: 28,
      },
    ]

    const patch = buildAtualizarCobrancasPedidoDeliveryPatch({
      cobrancaIdsAtivas: ['cob-antiga'],
      cobrancaIdsPendentes: ['cob-antiga'],
      pagamentos,
      fluxoPagamentoEntrega: 'ja_pago',
    })

    expect(patch.cobrancas?.cancel).toEqual([{ cobrancaId: 'cob-antiga' }])
    expect(patch.cobrancas?.add).toEqual([
      {
        meioPagamentoId: 'mp-cartao',
        valor: 28,
        momentoCobranca: 'antecipado',
        pagamentoEfetivado: { confirmar: true },
      },
    ])
    expect(patch.cobrancas?.confirm).toBeUndefined()
  })

  it('buildConfirmarCobrancasPendentes monta confirm para ids pendentes', () => {
    const patch = buildConfirmarCobrancasPendentesPedidoDeliveryPatch(['cob-nova'])
    expect(patch.cobrancas?.confirm).toEqual([{ cobrancaId: 'cob-nova' }])
  })
})
