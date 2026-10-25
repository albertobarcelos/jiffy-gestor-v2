import { describe, expect, it } from 'vitest'
import { resolverFiltroMeiosPagamentoNovoPedido } from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'

describe('resolverFiltroMeiosPagamentoNovoPedido', () => {
  it('balcão e delivery manual usam os meios ativos do POS', () => {
    expect(resolverFiltroMeiosPagamentoNovoPedido()).toEqual({ ativo: true })
  })
})
