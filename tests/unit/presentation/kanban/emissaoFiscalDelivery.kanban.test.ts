import { describe, expect, it } from 'vitest'
import { vendaKanbanPermiteEmissaoFiscalDelivery } from '@/src/presentation/components/features/kanban/rules/emissaoFiscalDelivery.kanban'

describe('vendaKanbanPermiteEmissaoFiscalDelivery', () => {
  it('bloqueia delivery ainda operacional mesmo se a coluna for fiscal', () => {
    expect(
      vendaKanbanPermiteEmissaoFiscalDelivery(
        {
          tabelaOrigem: 'venda_gestor',
          tipoVenda: 'delivery',
          statusEtapaOperacional: 'EM_PREPARO',
        },
        'PENDENTE_EMISSAO'
      )
    ).toBe(false)
  })

  it('libera delivery finalizado', () => {
    expect(
      vendaKanbanPermiteEmissaoFiscalDelivery({
        tabelaOrigem: 'venda_gestor',
        tipoVenda: 'delivery',
        statusEtapaOperacional: 'FINALIZADO',
      })
    ).toBe(true)
  })

  it('usa coluna fiscal quando a etapa operacional não veio na listagem', () => {
    expect(
      vendaKanbanPermiteEmissaoFiscalDelivery(
        {
          tabelaOrigem: 'venda_gestor',
          tipoVenda: 'delivery',
          statusEtapaOperacional: null,
        },
        'REJEITADAS'
      )
    ).toBe(true)
    expect(
      vendaKanbanPermiteEmissaoFiscalDelivery(
        {
          tabelaOrigem: 'venda_gestor',
          tipoVenda: 'delivery',
          statusEtapaOperacional: null,
        },
        'EM_PREPARO'
      )
    ).toBe(false)
  })
})
