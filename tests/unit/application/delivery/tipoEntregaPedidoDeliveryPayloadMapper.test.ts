import { describe, expect, it } from 'vitest'
import { buildAlterarTipoEntregaPedidoDeliveryPatch } from '@/src/application/mappers/TipoEntregaPedidoDeliveryPayloadMapper'

describe('TipoEntregaPedidoDeliveryPayloadMapper', () => {
  describe('buildAlterarTipoEntregaPedidoDeliveryPatch', () => {
    it('retirada sem taxa ativa: apenas tipoEntrega', () => {
      const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
        tipoSelecionado: 'retirada',
        pedido: { taxasLancadas: [], cobrancas: [] },
      })

      expect(patch).toEqual({ tipoEntrega: 'retirada' })
    })

    it('retirada com taxa ativa e pedido não pago: remove taxa e ajusta cobrança na_entrega', () => {
      const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
        tipoSelecionado: 'retirada',
        pedido: {
          taxasLancadas: [{ taxaId: 'tx1', tipo: 'entrega', valor: 8 }],
          cobrancas: [
            {
              id: 'c1',
              status: 'pendente',
              momentoCobranca: 'na_entrega',
              valor: 58,
              meioPagamentoId: 'mp1',
            },
          ],
        },
      })

      expect(patch.tipoEntrega).toBe('retirada')
      expect(patch.taxas).toEqual({ remove: ['tx1'] })
      expect(patch.cobrancas).toEqual({
        cancel: [{ cobrancaId: 'c1' }],
        add: [{ meioPagamentoId: 'mp1', valor: 50, momentoCobranca: 'na_entrega' }],
      })
    })

    it('retirada com taxa ativa e pedido pago: não remove taxa', () => {
      const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
        tipoSelecionado: 'retirada',
        pedido: {
          taxasLancadas: [{ taxaId: 'tx1', tipo: 'entrega', valor: 8 }],
          cobrancas: [{ id: 'c1', status: 'paga', momentoCobranca: 'antecipado' }],
        },
      })

      expect(patch).toEqual({ tipoEntrega: 'retirada' })
    })

    it('entrega com morada salva: inclui enderecoDeliveryId', () => {
      const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
        tipoSelecionado: 'entrega',
        pedido: {},
        enderecoDeliveryId: 'morada-1',
      })

      expect(patch).toEqual({
        tipoEntrega: 'entrega',
        enderecoEntrega: { enderecoDeliveryId: 'morada-1' },
      })
    })

    it('entrega com correção manual: inclui snapshot do endereço', () => {
      const patch = buildAlterarTipoEntregaPedidoDeliveryPatch({
        tipoSelecionado: 'entrega',
        pedido: {},
        enderecoManual: {
          tipoEtiqueta: 'casa',
          endereco: {
            rua: 'RUA A',
            numero: '100',
            bairro: 'CENTRO',
            cep: '01310100',
            cidade: 'SAO PAULO',
            estado: 'SP',
          },
        },
      })

      expect(patch.tipoEntrega).toBe('entrega')
      expect(patch.enderecoEntrega?.endereco).toMatchObject({
        rua: 'RUA A',
        numero: '100',
        bairro: 'CENTRO',
        cep: '01310100',
      })
    })
  })
})
