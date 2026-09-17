import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'

const base = {
  id: 'mp-1',
  nome: 'PIX',
  tefAtivo: true,
  formaPagamentoFiscal: 'pix',
  ativo: true,
}

describe('MeioPagamento.fromJSON isDelivery', () => {
  it('ausente → false', () => {
    expect(MeioPagamento.fromJSON(base).isDelivery()).toBe(false)
  })

  it('true → disponível no delivery', () => {
    expect(MeioPagamento.fromJSON({ ...base, isDelivery: true }).isDelivery()).toBe(true)
  })

  it('string "true" → disponível no delivery', () => {
    expect(MeioPagamento.fromJSON({ ...base, isDelivery: 'true' }).isDelivery()).toBe(true)
  })

  it('false permanece false', () => {
    expect(MeioPagamento.fromJSON({ ...base, isDelivery: false }).isDelivery()).toBe(false)
  })

  it('toJSON inclui isDelivery', () => {
    expect(MeioPagamento.fromJSON({ ...base, isDelivery: true }).toJSON().isDelivery).toBe(true)
  })
})
