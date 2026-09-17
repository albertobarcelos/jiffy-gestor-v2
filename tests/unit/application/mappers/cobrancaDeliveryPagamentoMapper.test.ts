import { describe, expect, it } from 'vitest'
import { mapCobrancaDeliveryToPagamento } from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'

describe('mapCobrancaDeliveryToPagamento', () => {
  it('preserva o ator da cobrança do cardápio para o rótulo Por', () => {
    const mapped = mapCobrancaDeliveryToPagamento({
      id: 'cob-1',
      valor: 47.8,
      meioPagamentoId: 'mp-debito',
      momentoCobranca: 'na_entrega',
      status: 'pendente',
      criadaPor: {
        id: 'cmt3cliente000000000000001',
        nome: 'Ana Souza',
        sourceReference: '65999745637',
      },
    })

    expect(mapped?.realizadoPorId).toBe('cmt3cliente000000000000001')
    expect(mapped?.realizadoPorNome).toBe('Ana Souza')
    expect(mapped?.realizadoPor).toEqual({
      id: 'cmt3cliente000000000000001',
      nome: 'Ana Souza',
      sourceReference: '65999745637',
    })
  })
})
