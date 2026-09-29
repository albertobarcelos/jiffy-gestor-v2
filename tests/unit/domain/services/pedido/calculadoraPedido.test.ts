import { describe, expect, it } from 'vitest'
import {
  calcularTotalComplementos,
  formatarValorComplemento,
  obterTotalComplemento,
} from '@/src/domain/services/pedido/CalculadoraPedido'
import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'

function complemento(
  overrides: Partial<ComplementoSelecionado> & Pick<ComplementoSelecionado, 'tipoImpactoPreco'>
): ComplementoSelecionado {
  return {
    id: 'c-1',
    grupoId: 'g-1',
    nome: 'Alface',
    valor: 3.5,
    quantidade: 2,
    ...overrides,
  }
}

describe('CalculadoraPedido — tipoImpactoPreco', () => {
  it('tipo nenhum zera o total mesmo com valor de cadastro', () => {
    expect(obterTotalComplemento(complemento({ tipoImpactoPreco: 'nenhum' }))).toBe(0)
    expect(formatarValorComplemento(3.5, 'nenhum')).toBe('0,00')
  })

  it('tipo aumenta e diminui usam valor × quantidade', () => {
    expect(obterTotalComplemento(complemento({ tipoImpactoPreco: 'aumenta' }))).toBe(7)
    expect(obterTotalComplemento(complemento({ tipoImpactoPreco: 'diminui' }))).toBe(7)
    expect(formatarValorComplemento(3.5, 'aumenta')).toBe('+ 3,50')
    expect(formatarValorComplemento(3.5, 'diminui')).toBe('- 3,50')
  })

  it('total do produto ignora complemento nenhum e aplica aumenta/diminui', () => {
    const produto: ProdutoSelecionado = {
      produtoId: 'p-1',
      nome: 'Hambúrguer',
      quantidade: 1,
      valorUnitario: 20,
      valorCatalogo: 20,
      permiteAlterarPreco: false,
      complementos: [
        complemento({ id: 'alface', nome: 'Alface', tipoImpactoPreco: 'nenhum' }),
        complemento({ id: 'bacon', nome: 'Bacon', valor: 4, quantidade: 1, tipoImpactoPreco: 'aumenta' }),
        complemento({
          id: 'cebola',
          nome: 'Sem cebola',
          valor: 1,
          quantidade: 1,
          tipoImpactoPreco: 'diminui',
        }),
      ],
      tipoDesconto: null,
      valorDesconto: null,
      tipoAcrescimo: null,
      valorAcrescimo: null,
    }

    expect(calcularTotalComplementos(produto)).toBe(3)
  })
})
