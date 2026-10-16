import { describe, expect, it } from 'vitest'
import {
  isErroProdutoIndisponivelCheckout,
  resolverProdutoIndisponivelDoErro,
  resolverProdutosAusentesDoCatalogo,
} from '@/src/domain/policies/ProdutoIndisponivelCheckoutPublico'

describe('ProdutoIndisponivelCheckoutPublico', () => {
  const itens = [
    { produtoId: 'cmt78pfra00chpb01xoms3k05', produtoNome: 'X-BACON' },
    { produtoId: 'outro-id', produtoNome: 'Água' },
  ]

  it('detecta produto inativo no base pelo id', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto não está ativo: cmt78pfra00chpb01xoms3k05',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('detecta produto pausado no menu', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto não está ativo no menu: cmt78pfra00chpb01xoms3k05',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('detecta soft delete (não encontrado no menu)', () => {
    expect(
      resolverProdutoIndisponivelDoErro(
        'Produto cmt78pfra00chpb01xoms3k05 não encontrado no menu menu-1',
        itens
      )
    ).toEqual({
      produtoIds: ['cmt78pfra00chpb01xoms3k05'],
      nomes: ['X-BACON'],
    })
  })

  it('retorna null para outros erros', () => {
    expect(resolverProdutoIndisponivelDoErro('Telefone inválido', itens)).toBeNull()
    expect(isErroProdutoIndisponivelCheckout('Telefone inválido')).toBe(false)
  })

  it('lista itens do carrinho ausentes do catálogo', () => {
    expect(
      resolverProdutosAusentesDoCatalogo(
        [
          { produtoId: 'ativo-1', produtoNome: 'Burger' },
          { produtoId: 'pausado-2', produtoNome: 'X-BACON' },
        ],
        new Set(['ativo-1'])
      )
    ).toEqual({
      produtoIds: ['pausado-2'],
      nomes: ['X-BACON'],
    })
  })

  it('retorna null quando todos estão no catálogo', () => {
    expect(
      resolverProdutosAusentesDoCatalogo(
        [{ produtoId: 'ativo-1', produtoNome: 'Burger' }],
        new Set(['ativo-1'])
      )
    ).toBeNull()
  })
})
