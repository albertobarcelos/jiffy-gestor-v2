import { describe, expect, it } from 'vitest'
import {
  montarCatalogoProdutoIndex,
  resolverCodigoMenuProduto,
  slimCatalogoProdutoIndexItem,
} from '@/src/shared/utils/catalogoProdutoIndex'

describe('slimCatalogoProdutoIndexItem', () => {
  it('extrai só id, código e flags', () => {
    expect(
      slimCatalogoProdutoIndexItem({
        id: 'p1',
        codigoProduto: 12,
        nome: 'X-Burger',
        valor: 25,
        permiteAcrescimo: true,
        permiteDesconto: 'true',
        abreComplementos: false,
        permiteAlterarPreco: true,
        incideTaxa: 0,
        impressoras: [{ id: 'x' }],
      })
    ).toEqual({
      id: 'p1',
      codigo: '12',
      permiteAcrescimo: true,
      permiteDesconto: true,
      abreComplementos: false,
      permiteAlterarPreco: true,
      incideTaxa: false,
    })
  })

  it('ignora item sem id', () => {
    expect(slimCatalogoProdutoIndexItem({ nome: 'Sem id' })).toBeNull()
  })
})

describe('montarCatalogoProdutoIndex', () => {
  it('monta mapas de códigos e permissões', () => {
    const index = montarCatalogoProdutoIndex([
      {
        id: 'a',
        codigo: '1',
        permiteAcrescimo: true,
        permiteDesconto: false,
        abreComplementos: false,
        permiteAlterarPreco: false,
        incideTaxa: false,
      },
      { id: 'b', codigoProduto: '2' },
    ])
    expect(index.codigos).toEqual({ a: '1', b: '2' })
    expect(index.permissoes.a?.permiteAcrescimo).toBe(true)
    expect(index.permissoes.b?.permiteAcrescimo).toBe(false)
  })
})

describe('resolverCodigoMenuProduto', () => {
  it('prefere o código do snapshot', () => {
    expect(
      resolverCodigoMenuProduto({ codigoProduto: '99' }, '1')
    ).toBe('99')
  })

  it('usa o cadastro quando o snapshot não tem código', () => {
    expect(resolverCodigoMenuProduto({}, '42')).toBe('42')
  })

  it('aceita alias codigo no snapshot', () => {
    expect(resolverCodigoMenuProduto({ codigo: '7' }, '1')).toBe('7')
  })
})
