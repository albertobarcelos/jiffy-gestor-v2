import { describe, expect, it } from 'vitest'
import { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import {
  coletarMeiosDasPaginas,
  meioVisivelNoPedidoBalcao,
  meioVisivelParaTipoPedidoManual,
  unirMeiosPedidoManual,
} from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'

function meio(
  id: string,
  entrega: boolean,
  retirada: boolean,
  ativo = true
) {
  return MeioPagamento.create(id, id, false, 'pix', ativo, false, null, entrega, retirada)
}

describe('meioVisivelNoPedidoBalcao', () => {
  it('mostra meio com Terminal ativo, mesmo sem canal delivery', () => {
    expect(meioVisivelNoPedidoBalcao(meio('pos', false, false, true))).toBe(true)
  })

  it('esconde meio com Terminal desligado', () => {
    expect(meioVisivelNoPedidoBalcao(meio('off', true, true, false))).toBe(false)
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

  it('sem tipo (balcão) usa Terminal, não o canal delivery', () => {
    expect(meioVisivelParaTipoPedidoManual(meio('pos', false, false, true), null)).toBe(true)
    expect(meioVisivelParaTipoPedidoManual(meio('delivery-only', true, false, false), null)).toBe(
      false
    )
  })
})

describe('unirMeiosPedidoManual', () => {
  it('sem tipo (balcão) mantém só Terminal ativo', () => {
    const terminal = meio('terminal', false, false, true)
    const soEntregaInativo = meio('entrega-off', true, false, false)
    const unidos = unirMeiosPedidoManual([[terminal, soEntregaInativo]], null)
    expect(unidos.map(item => item.getId())).toEqual(['terminal'])
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
    const unidos = unirMeiosPedidoManual([[ambos], [ambos]], 'entrega')
    expect(unidos).toHaveLength(1)
    expect(unidos[0].getId()).toBe('pix')
  })

  it('esgota páginas antes de unir no balcão', () => {
    const page1 = { meiosPagamento: [meio('a', false, false, true)] }
    const page2 = { meiosPagamento: [meio('b', false, false, true)] }
    const unidos = unirMeiosPedidoManual([coletarMeiosDasPaginas([page1, page2])], null)
    expect(unidos.map(item => item.getId()).sort()).toEqual(['a', 'b'])
  })
})
