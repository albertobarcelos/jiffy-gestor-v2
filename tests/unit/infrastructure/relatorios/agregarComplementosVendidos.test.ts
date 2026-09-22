import { describe, expect, it } from 'vitest'
import {
  agregarComplementosVendidos,
  filtrarEOrdenarComplementos,
  montarKpisComplementos,
} from '@/src/infrastructure/relatorios/agregarComplementosVendidos'
import type { VendaDetalheProdutos } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'

describe('agregarComplementosVendidos', () => {
  it('agrega por complementoId e ignora pizza / sem produtoId', () => {
    const detalhes: VendaDetalheProdutos[] = [
      {
        produtosLancados: [
          {
            produtoId: 'prod-1',
            tipoItem: 'padrao',
            removido: false,
            complementos: [
              {
                complementoId: 'comp-bacon',
                nomeComplemento: 'Bacon',
                quantidade: 2,
                valorUnitario: 3,
                tipoImpactoPreco: 'aumenta',
                grupoComplementoId: 'g1',
              },
              {
                complementoId: 'comp-bacon',
                nomeComplemento: 'Bacon',
                quantidade: 1,
                valorUnitario: 3,
                tipoImpactoPreco: 'aumenta',
              },
            ],
          },
          {
            produtoId: null,
            tipoItem: 'pizza',
            complementos: [
              {
                complementoId: 'comp-borda',
                nomeComplemento: 'Borda',
                quantidade: 1,
                valorUnitario: 8,
                tipoImpactoPreco: 'aumenta',
              },
            ],
          },
        ],
      },
    ]

    const linhas = agregarComplementosVendidos(detalhes)
    expect(linhas).toHaveLength(1)
    expect(linhas[0].complementoId).toBe('comp-bacon')
    expect(linhas[0].quantidade).toBe(3)
    expect(linhas[0].valorAumenta).toBe(9)
    expect(linhas[0].valorLiquido).toBe(9)
  })

  it('filtra por impacto nenhum e monta KPIs', () => {
    const detalhes: VendaDetalheProdutos[] = [
      {
        produtosLancados: [
          {
            produtoId: 'p1',
            complementos: [
              {
                complementoId: 'c1',
                nomeComplemento: 'Obs',
                quantidade: 5,
                valorUnitario: 0,
                tipoImpactoPreco: 'nenhum',
              },
              {
                complementoId: 'c2',
                nomeComplemento: 'Extra',
                quantidade: 1,
                valorUnitario: 2,
                tipoImpactoPreco: 'aumenta',
              },
            ],
          },
        ],
      },
    ]
    const all = agregarComplementosVendidos(detalhes)
    const soNenhum = filtrarEOrdenarComplementos(all, { impacto: 'nenhum' })
    expect(soNenhum).toHaveLength(1)
    expect(soNenhum[0].complementoId).toBe('c1')
    const kpis = montarKpisComplementos(all)
    expect(kpis.skusDistintos).toBe(2)
    expect(kpis.valorAumenta).toBe(2)
  })
})
