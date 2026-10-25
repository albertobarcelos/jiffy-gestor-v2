import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import { meioVisivelNoPedidoManual } from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'

function meio(entrega: boolean, retirada: boolean) {
  return MeioPagamento.create('mp-1', 'PIX', false, 'pix', true, false, null, entrega, retirada)
}

describe('meioVisivelNoPedidoManual', () => {
  it('mostra se entrega ou retirada estiver ligada', () => {
    expect(meioVisivelNoPedidoManual(meio(true, false))).toBe(true)
    expect(meioVisivelNoPedidoManual(meio(false, true))).toBe(true)
    expect(meioVisivelNoPedidoManual(meio(true, true))).toBe(true)
  })

  it('esconde o meio só de POS, com as duas flags desligadas', () => {
    expect(meioVisivelNoPedidoManual(meio(false, false))).toBe(false)
  })
})
