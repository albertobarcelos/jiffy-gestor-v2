import { describe, expect, it } from 'vitest'
import { deveEnviarValorUnitarioAlterado } from '@/src/domain/services/pedido/deveEnviarValorUnitarioAlterado'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

function linha(over: Partial<ProdutoSelecionado> = {}): ProdutoSelecionado {
  return {
    produtoId: 'p1',
    nome: 'Produto',
    quantidade: 1,
    valorUnitario: 10,
    valorCatalogo: 10,
    permiteAlterarPreco: true,
    complementos: [],
    ...over,
  }
}

describe('deveEnviarValorUnitarioAlterado', () => {
  it('retorna false quando preço é igual ao catálogo', () => {
    expect(deveEnviarValorUnitarioAlterado(linha())).toBe(false)
  })

  it('retorna true quando preço foi alterado e produto permite', () => {
    expect(
      deveEnviarValorUnitarioAlterado(
        linha({ valorUnitario: 15.5, valorCatalogo: 10, permiteAlterarPreco: true })
      )
    ).toBe(true)
  })

  it('retorna false quando produto não permite alterar preço', () => {
    expect(
      deveEnviarValorUnitarioAlterado(
        linha({ valorUnitario: 15.5, valorCatalogo: 10, permiteAlterarPreco: false })
      )
    ).toBe(false)
  })

  it('retorna false sem valorCatalogo de referência', () => {
    expect(
      deveEnviarValorUnitarioAlterado(
        linha({ valorUnitario: 15.5, valorCatalogo: undefined, permiteAlterarPreco: true })
      )
    ).toBe(false)
  })
})
