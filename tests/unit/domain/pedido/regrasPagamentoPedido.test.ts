import { describe, expect, it } from 'vitest'
import { divergenciaPagamentoVsTotalPedido, classificarDivergenciaPagamentoVsTotal } from '@/src/domain/services/pedido/RegrasPagamentoPedido'

describe('divergenciaPagamentoVsTotalPedido', () => {
  it('detecta falta quando o total sobe', () => {
    expect(divergenciaPagamentoVsTotalPedido(87.8, 79.8)).toEqual({
      divergente: true,
      diferenca: 8,
    })
  })

  it('detecta sobra quando o total desce', () => {
    expect(divergenciaPagamentoVsTotalPedido(49.9, 57.9)).toEqual({
      divergente: true,
      diferenca: -8,
    })
  })

  it('considera iguais dentro da tolerância', () => {
    expect(divergenciaPagamentoVsTotalPedido(87.8, 87.8).divergente).toBe(false)
    expect(divergenciaPagamentoVsTotalPedido(10, 10.005).divergente).toBe(false)
  })

  it('classifica falta, sobra e igualdade', () => {
    expect(classificarDivergenciaPagamentoVsTotal(87.8, 79.8)).toBe('faltando')
    expect(classificarDivergenciaPagamentoVsTotal(49.9, 57.9)).toBe('excedente')
    expect(classificarDivergenciaPagamentoVsTotal(87.8, 87.8)).toBe('ok')
  })
})
