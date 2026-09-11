import { describe, expect, it } from 'vitest'
import {
  clienteAtingiuMaxEnderecosDelivery,
  MAX_ENDERECOS_CLIENTE_DELIVERY,
} from '@/src/domain/policies/LimiteEnderecosClienteDelivery'
import { isTokenCotacaoExpirado } from '@/src/domain/policies/ValidadeTokenCotacao'
import {
  isErroCoberturaEntregaPublica,
  MSG_FORA_COBERTURA_ENTREGA_PUBLICA,
} from '@/src/domain/policies/CoberturaEntregaPublica'
import { calcularTotalComplementos } from '@/src/domain/services/pedido/CalculadoraPedido'

describe('LimiteEnderecosClienteDelivery', () => {
  it('bloqueia a partir do máximo', () => {
    expect(clienteAtingiuMaxEnderecosDelivery(MAX_ENDERECOS_CLIENTE_DELIVERY - 1)).toBe(false)
    expect(clienteAtingiuMaxEnderecosDelivery(MAX_ENDERECOS_CLIENTE_DELIVERY)).toBe(true)
  })
})

describe('ValidadeTokenCotacao', () => {
  it('considera expirado quando expiresAt passou', () => {
    const now = Date.parse('2026-01-01T12:00:00.000Z')
    expect(isTokenCotacaoExpirado('2026-01-01T11:59:59.000Z', now)).toBe(true)
    expect(isTokenCotacaoExpirado('2026-01-01T12:00:01.000Z', now)).toBe(false)
  })

  it('considera inválido se expiresAt não parseia', () => {
    expect(isTokenCotacaoExpirado('nao-e-data')).toBe(true)
  })
})

describe('CoberturaEntregaPublica', () => {
  it('reconhece mensagem canônica e variações', () => {
    expect(isErroCoberturaEntregaPublica(MSG_FORA_COBERTURA_ENTREGA_PUBLICA)).toBe(true)
    expect(isErroCoberturaEntregaPublica('Endereço fora da cobertura')).toBe(true)
    expect(isErroCoberturaEntregaPublica('Telefone inválido')).toBe(false)
  })
})

describe('CalculadoraPedido', () => {
  it('soma complementos que aumentam preço', () => {
    const total = calcularTotalComplementos({
      produtoId: 'p1',
      nome: 'Produto',
      quantidade: 1,
      valorUnitario: 10,
      complementos: [
        {
          id: 'c1',
          grupoId: 'g1',
          nome: 'Extra',
          valor: 2,
          quantidade: 2,
          tipoImpactoPreco: 'aumenta',
        },
      ],
    })
    expect(total).toBe(4)
  })
})
