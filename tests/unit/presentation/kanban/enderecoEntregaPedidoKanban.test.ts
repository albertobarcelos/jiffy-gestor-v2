import { describe, expect, it } from 'vitest'
import { deveExibirBotaoAlterarEnderecoEntregaKanban } from '@/src/presentation/components/features/nfe/kanban/enderecoEntregaPedidoKanban'
import type { Venda } from '@/src/presentation/components/features/nfe/kanban/types'

function vendaMock(partial: Partial<Venda> = {}): Venda {
  return {
    id: 'v1',
    numeroVenda: 1,
    tipoVenda: 'entrega',
    tabelaOrigem: 'venda_gestor',
    isDelivery: () => false,
    isPedidoEntregaGestor: () => true,
    ...partial,
  } as Venda
}

describe('deveExibirBotaoAlterarEnderecoEntregaKanban', () => {
  it('exibe em colunas operacionais antes de EM_ROTA', () => {
    const venda = vendaMock()
    expect(
      deveExibirBotaoAlterarEnderecoEntregaKanban('NOVOS_PEDIDOS', venda, 'delivery')
    ).toBe(true)
    expect(
      deveExibirBotaoAlterarEnderecoEntregaKanban('PRONTO_ENTREGA', venda, 'delivery')
    ).toBe(true)
  })

  it('oculta em EM_ROTA e retirada', () => {
    const venda = vendaMock()
    expect(deveExibirBotaoAlterarEnderecoEntregaKanban('EM_ROTA', venda, 'delivery')).toBe(
      false
    )
    expect(
      deveExibirBotaoAlterarEnderecoEntregaKanban(
        'NOVOS_PEDIDOS',
        vendaMock({ tipoVenda: 'retirada' }),
        'delivery'
      )
    ).toBe(false)
  })
})
