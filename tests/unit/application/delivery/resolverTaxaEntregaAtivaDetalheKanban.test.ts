import { describe, expect, it } from 'vitest'
import { resolverTaxaEntregaAtivaDetalheKanban } from '@/src/application/mappers/VendaDetalheMapper'

describe('resolverTaxaEntregaAtivaDetalheKanban', () => {
  it('reconhece taxa automática de cobertura sem taxaId de catálogo', async () => {
    const detalhe = await resolverTaxaEntregaAtivaDetalheKanban(
      {
        taxasLancadas: [{ tipo: 'entrega', valorCalculado: 5, nomeTaxa: 'Automática' }],
      },
      'token-teste'
    )
    expect(detalhe).toEqual({
      taxaId: null,
      nome: 'Automática',
      valor: 5,
    })
  })

  it('lê a automática em resumoPedido.taxaEntrega quando não há taxasLancadas', async () => {
    const detalhe = await resolverTaxaEntregaAtivaDetalheKanban(
      { resumoPedido: { taxaEntrega: 5 } },
      'token-teste'
    )
    expect(detalhe).toEqual({
      taxaId: null,
      nome: 'Automática',
      valor: 5,
    })
  })

  it('não inventa taxa quando o pedido não tem cobertura nem catálogo', async () => {
    const detalhe = await resolverTaxaEntregaAtivaDetalheKanban(
      { taxasLancadas: [], valorFinal: 40, produtosLancados: [{ valorFinal: 35 }] },
      'token-teste'
    )
    expect(detalhe).toBeNull()
  })
})
