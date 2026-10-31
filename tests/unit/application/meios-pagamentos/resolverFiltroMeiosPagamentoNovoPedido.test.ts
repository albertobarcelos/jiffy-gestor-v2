import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import {
  coletarMeiosDasPaginas,
  meioVisivelNoPedidoManual,
  meioVisivelParaTipoPedidoManual,
  unirMeiosPedidoManual,
} from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'

function meio(id: string, entrega: boolean, retirada: boolean) {
  return MeioPagamento.create(id, id, false, 'pix', true, false, null, entrega, retirada)
}

describe('meioVisivelNoPedidoManual', () => {
  it('mostra se entrega ou retirada estiver ligada', () => {
    expect(meioVisivelNoPedidoManual(meio('pix', true, false))).toBe(true)
    expect(meioVisivelNoPedidoManual(meio('pix', false, true))).toBe(true)
    expect(meioVisivelNoPedidoManual(meio('pix', true, true))).toBe(true)
  })

  it('esconde o meio só de POS, com as duas flags desligadas', () => {
    expect(meioVisivelNoPedidoManual(meio('pos', false, false))).toBe(false)
  })
})

describe('meioVisivelParaTipoPedidoManual', () => {
  it('em pedido de retirada só aceita canal retirada', () => {
    expect(meioVisivelParaTipoPedidoManual(meio('pix', true, false), 'retirada')).toBe(false)
    expect(meioVisivelParaTipoPedidoManual(meio('pix', false, true), 'retirada')).toBe(true)
    expect(meioVisivelParaTipoPedidoManual(meio('pix', true, true), 'retirada')).toBe(true)
  })

  it('em pedido de entrega só aceita canal entrega', () => {
    expect(meioVisivelParaTipoPedidoManual(meio('pix', true, false), 'entrega')).toBe(true)
    expect(meioVisivelParaTipoPedidoManual(meio('pix', false, true), 'entrega')).toBe(false)
  })

  it('sem tipo mantém a união dos canais', () => {
    expect(meioVisivelParaTipoPedidoManual(meio('pix', false, true), null)).toBe(true)
    expect(meioVisivelParaTipoPedidoManual(meio('pos', false, false), null)).toBe(false)
  })
})

describe('unirMeiosPedidoManual', () => {
  it('sem tipo junta entrega-only e retirada-only e ignora POS', () => {
    const soEntrega = meio('entrega', true, false)
    const soRetirada = meio('retirada', false, true)
    const soPos = meio('pos', false, false)
    const unidos = unirMeiosPedidoManual([[soEntrega, soPos], [soRetirada, soPos]])
    expect(unidos.map(item => item.getId()).sort()).toEqual(['entrega', 'retirada'])
  })

  it('com tipo retirada descarta meio só de entrega', () => {
    const soEntrega = meio('totem-pix', true, false)
    const soRetirada = meio('parcela', false, true)
    const unidos = unirMeiosPedidoManual([[soEntrega], [soRetirada]], 'retirada')
    expect(unidos.map(item => item.getId())).toEqual(['parcela'])
  })

  it('com tipo entrega descarta meio só de retirada', () => {
    const soEntrega = meio('totem-pix', true, false)
    const soRetirada = meio('parcela', false, true)
    const unidos = unirMeiosPedidoManual([[soEntrega], [soRetirada]], 'entrega')
    expect(unidos.map(item => item.getId())).toEqual(['totem-pix'])
  })

  it('não duplica meio que veio nas duas listas', () => {
    const ambos = meio('pix', true, true)
    const unidos = unirMeiosPedidoManual([[ambos], [ambos]])
    expect(unidos).toHaveLength(1)
    expect(unidos[0].getId()).toBe('pix')
  })

  it('esgota páginas antes de unir', () => {
    const page1 = { meiosPagamento: [meio('a', true, false)] }
    const page2 = { meiosPagamento: [meio('b', false, true)] }
    const unidos = unirMeiosPedidoManual([coletarMeiosDasPaginas([page1, page2])])
    expect(unidos.map(item => item.getId()).sort()).toEqual(['a', 'b'])
  })
})
