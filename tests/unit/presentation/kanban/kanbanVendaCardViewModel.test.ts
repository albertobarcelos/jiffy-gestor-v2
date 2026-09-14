import { describe, expect, it } from 'vitest'
import { derivarTipoVendaCardKanban } from '@/src/presentation/components/features/kanban/utils/kanbanVendaCardViewModel'
import type { Venda } from '@/src/presentation/components/features/kanban/types'

function vendaGestor(tipoVenda: string | null): Venda {
  return { tabelaOrigem: 'venda_gestor', tipoVenda, origem: 'GESTOR' } as Venda
}

describe('derivarTipoVendaCardKanban', () => {
  it('mostra Entrega para tipo delivery do gestor', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('delivery'))
    expect(view.isDeliveryOuRetirada).toBe(true)
    expect(view.tipoVendaExibicao).toBe('entrega')
    expect(view.prefixoLinhaOrigemCard).toBe('Entrega')
  })

  it('mostra Balcão só para venda gestor que não é delivery', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('balcao'))
    expect(view.isDeliveryOuRetirada).toBe(false)
    expect(view.prefixoLinhaOrigemCard).toBe('Balcão')
  })
})
