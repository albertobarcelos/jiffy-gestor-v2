import { describe, expect, it } from 'vitest'
import { derivarTipoVendaCardKanban } from '@/src/presentation/components/features/kanban/utils/kanbanVendaCardViewModel'
import type { Venda } from '@/src/presentation/components/features/kanban/types'

function vendaGestor(
  tipoVenda: string | null,
  tipoEntrega?: 'entrega' | 'retirada' | null
): Venda {
  const atendimento =
    tipoEntrega ??
    (tipoVenda === 'entrega' || tipoVenda === 'retirada' ? tipoVenda : null)
  return {
    tabelaOrigem: 'venda_gestor',
    tipoVenda,
    tipoEntrega: atendimento,
    origem: 'GESTOR',
    tipoAtendimento: () => atendimento,
  } as Venda
}

describe('derivarTipoVendaCardKanban', () => {
  it('mostra Entrega para tipo delivery do gestor', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('delivery', 'entrega'))
    expect(view.isDeliveryOuRetirada).toBe(true)
    expect(view.tipoVendaExibicao).toBe('entrega')
    expect(view.prefixoLinhaOrigemCard).toBe('Entrega')
  })

  it('mostra Retirada quando tipoEntrega é retirada', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('delivery', 'retirada'))
    expect(view.tipoVendaExibicao).toBe('retirada')
    expect(view.prefixoLinhaOrigemCard).toBe('Retirada')
  })

  it('não inventa Entrega quando tipoEntrega não veio', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('delivery', null))
    expect(view.tipoVendaExibicao).toBe('delivery')
    expect(view.prefixoLinhaOrigemCard).toBe('Delivery')
  })

  it('mostra Balcão só para venda gestor que não é delivery', () => {
    const view = derivarTipoVendaCardKanban(vendaGestor('balcao'))
    expect(view.isDeliveryOuRetirada).toBe(false)
    expect(view.prefixoLinhaOrigemCard).toBe('Balcão')
  })
})
