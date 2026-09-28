import { describe, expect, it } from 'vitest'
import {
  MSG_PAGAMENTO_INCOMPLETO_PEDIDO_PUBLICO,
  MSG_PAGAMENTO_OBRIGATORIO_PEDIDO_PUBLICO,
  validarPagamentosPedidoPublico,
} from '@/src/domain/policies/PagamentoObrigatorioPedidoPublico'

describe('validarPagamentosPedidoPublico', () => {
  it('rejeita lista vazia', () => {
    expect(validarPagamentosPedidoPublico([], 40)).toEqual({
      ok: false,
      error: MSG_PAGAMENTO_OBRIGATORIO_PEDIDO_PUBLICO,
    })
  })

  it('rejeita soma abaixo do total', () => {
    expect(
      validarPagamentosPedidoPublico([{ meioPagamentoId: 'pix', valor: 10 }], 40)
    ).toEqual({
      ok: false,
      error: MSG_PAGAMENTO_INCOMPLETO_PEDIDO_PUBLICO,
    })
  })

  it('aceita cobertura exata', () => {
    expect(
      validarPagamentosPedidoPublico([{ meioPagamentoId: 'pix', valor: 40 }], 40)
    ).toEqual({ ok: true })
  })
})
