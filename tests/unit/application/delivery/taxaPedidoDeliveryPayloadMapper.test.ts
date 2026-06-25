import { describe, expect, it } from 'vitest'
import {
  buildSalvarTaxaPedidoDeliveryPatch,
  extrairCobrancasPendentesNaEntregaPedidoDelivery,
  pedidoDeliveryEstaPago,
} from '@/src/application/mappers/TaxaPedidoDeliveryPayloadMapper'

describe('TaxaPedidoDeliveryPayloadMapper', () => {
  describe('pedidoDeliveryEstaPago', () => {
    it('considera pago quando há cobrança com status paga', () => {
      const pedido = {
        cobrancas: [{ id: 'c1', status: 'paga', momentoCobranca: 'antecipado' }],
      }
      expect(pedidoDeliveryEstaPago(pedido)).toBe(true)
    })

    it('considera pago quando há pagamentoEfetivado (sem status pendente/cancelada)', () => {
      const pedido = {
        cobrancas: [{ id: 'c1', pagamentoEfetivado: { confirmadoEm: 'x' } }],
      }
      expect(pedidoDeliveryEstaPago(pedido)).toBe(true)
    })

    it('não considera pago quando só há cobrança pendente na_entrega', () => {
      const pedido = {
        cobrancas: [{ id: 'c1', status: 'pendente', momentoCobranca: 'na_entrega' }],
      }
      expect(pedidoDeliveryEstaPago(pedido)).toBe(false)
    })

    it('ignora cobrança cancelada mesmo que paga', () => {
      const pedido = {
        cobrancas: [{ id: 'c1', status: 'cancelada', pagamentoEfetivado: {} }],
      }
      expect(pedidoDeliveryEstaPago(pedido)).toBe(false)
    })
  })

  describe('extrairCobrancasPendentesNaEntregaPedidoDelivery', () => {
    it('retorna apenas pendentes na_entrega com id e meioPagamentoId', () => {
      const pedido = {
        cobrancas: [
          {
            id: 'c1',
            status: 'pendente',
            momentoCobranca: 'na_entrega',
            valor: 30,
            meioPagamentoId: 'mp1',
          },
          { id: 'c2', status: 'paga', momentoCobranca: 'antecipado', valor: 50, meioPagamentoId: 'mp2' },
          { id: 'c3', status: 'cancelada', momentoCobranca: 'na_entrega', valor: 10, meioPagamentoId: 'mp3' },
        ],
      }
      expect(extrairCobrancasPendentesNaEntregaPedidoDelivery(pedido)).toEqual([
        { id: 'c1', valor: 30, meioPagamentoId: 'mp1' },
      ])
    })
  })

  describe('buildSalvarTaxaPedidoDeliveryPatch', () => {
    it('não muda quando a taxa selecionada é igual à atual', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 8,
        taxaSelecionadaId: 'tx1',
        taxaSelecionadaValor: 8,
        cobrancasPendentesNaEntrega: [],
      })
      expect(result.mudou).toBe(false)
      expect(result.patch).toEqual({})
    })

    it('adiciona taxa quando não havia nenhuma', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: null,
        taxaAtualValor: 0,
        taxaSelecionadaId: 'tx1',
        taxaSelecionadaValor: 8,
        cobrancasPendentesNaEntrega: [],
      })
      expect(result.mudou).toBe(true)
      expect(result.patch.taxas).toEqual({ add: [{ taxaId: 'tx1', quantidade: 1 }] })
      expect(result.patch.cobrancas).toBeUndefined()
    })

    it('remove a taxa atual ao selecionar "sem taxa"', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 8,
        taxaSelecionadaId: null,
        taxaSelecionadaValor: 0,
        cobrancasPendentesNaEntrega: [],
      })
      expect(result.patch.taxas).toEqual({ remove: ['tx1'] })
    })

    it('troca taxa: remove a antiga e adiciona a nova', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 8,
        taxaSelecionadaId: 'tx2',
        taxaSelecionadaValor: 12,
        cobrancasPendentesNaEntrega: [],
      })
      expect(result.patch.taxas).toEqual({
        remove: ['tx1'],
        add: [{ taxaId: 'tx2', quantidade: 1 }],
      })
    })

    it('reemite cobrança pendente na_entrega com valor ajustado pelo delta da taxa', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 8,
        taxaSelecionadaId: 'tx2',
        taxaSelecionadaValor: 12,
        cobrancasPendentesNaEntrega: [{ id: 'c1', valor: 58, meioPagamentoId: 'mp1' }],
      })
      expect(result.patch.cobrancas).toEqual({
        cancel: [{ cobrancaId: 'c1' }],
        add: [{ meioPagamentoId: 'mp1', valor: 62, momentoCobranca: 'na_entrega' }],
      })
    })

    it('ajusta cobrança para baixo ao remover a taxa', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 8,
        taxaSelecionadaId: null,
        taxaSelecionadaValor: 0,
        cobrancasPendentesNaEntrega: [{ id: 'c1', valor: 58, meioPagamentoId: 'mp1' }],
      })
      expect(result.patch.cobrancas?.add?.[0]?.valor).toBe(50)
    })

    it('não toca em cobrança quando o delta da taxa é zero', () => {
      const result = buildSalvarTaxaPedidoDeliveryPatch({
        taxaAtualId: 'tx1',
        taxaAtualValor: 10,
        taxaSelecionadaId: 'tx2',
        taxaSelecionadaValor: 10,
        cobrancasPendentesNaEntrega: [{ id: 'c1', valor: 60, meioPagamentoId: 'mp1' }],
      })
      expect(result.mudou).toBe(true)
      expect(result.patch.cobrancas).toBeUndefined()
    })
  })
})
